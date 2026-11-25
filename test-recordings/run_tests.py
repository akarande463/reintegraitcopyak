"""Run the 10 test recordings through the real pipeline (Whisper, then Claude) and save every output.

    python3 run_tests.py [AUDIO_DIR] [RESULTS_FOLDER] [CASE_ID ...]

Uses the app's own backend code and keys: app/step1-client-note/backend/.env and ai-config.json.
Writes results/<case>.json (transcript lines, the drafted note, timings). Keys are never printed or saved.
Cases set outside Chicago are drafted twice: with their own location and with Chicago, Illinois.
"""
import datetime, json, sys, time, traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent / "app" / "step1-client-note" / "backend"
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(HERE))
import server                      # noqa: E402  (read_env, read_config)
from ai_client import transcribe, draft_note, draft_update, AIError   # noqa: E402
from cases import CASES, TYPED_UPDATES                                  # noqa: E402

AUDIO = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "audio"
OUT = HERE / (sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2][:2].isdigit() else "results")
OUT.mkdir(exist_ok=True)
SIM = json.loads((BACKEND.parent / "simulated_responses.json").read_text(encoding="utf-8"))
T = SIM["templates"]
LISTS = {"key_fields": [{"key": f["key"], "label": f["label"], "type": f.get("type", "text"), "options": f.get("options", [])}
                        for f in T["intake_notes"]["Standard intake note"]["key_fields"]],
         "categories": SIM["matched_services"]["categories"], "service_types": T["service_types"],
         "meeting_types": T["meeting_types"]}

env, cfg = server.read_env(), server.read_config()
HF = env.get("HF_TOKEN") or env.get("HUGGINGFACE_API_KEY") or env.get("HF_API_KEY") or ""
if not HF:
    HF = next((v for k, v in env.items() if "HF" in k.upper() or "HUGGING" in k.upper()), "")
AK = env.get("ANTHROPIC_API_KEY", "")
print(f"Keys found: Hugging Face {'yes' if HF else 'NO'}, Anthropic {'yes' if AK else 'NO'}", flush=True)


def mmss(t):
    return "–" if t is None else f"{int(t // 60)}:{round(t % 60):02d}"


def case_date(c):
    for fmt in ("%B %d, %Y", "%d %B %Y"):
        try:
            return datetime.datetime.strptime(c["date"], fmt).date().isoformat()
        except ValueError:
            pass
    return ""


def run_case(c):
    res = {"case": c["id"], "location": c["location"], "transcript": None, "notes": {}, "updates": {}, "errors": []}
    try:
        audio = (AUDIO / f"{c['id']}.m4a").read_bytes()
        t = transcribe(audio, "audio/mp4", cfg, HF, f"{c['id']}.m4a")   # the app converts m4a to WAV itself
        segs = t["segments"] or [{"start": 0, "text": t["text"]}]
        lines = [{"id": f"rt{i+1}", "time": mmss(g["start"]), "text": g["text"]} for i, g in enumerate(segs)]
        res["transcript"] = {"text": t["text"], "lines": lines, "seconds": t["seconds"], "model": t["request"]["model"]}
        print(f"  {c['id']}: transcript in {t['seconds']} s, {len(lines)} lines", flush=True)
    except Exception as e:
        res["errors"].append(f"transcribe: {e} {getattr(e, 'detail', '')}"[:600])
        return res
    locations = [c["location"]] + (["Chicago, Illinois"] if c["location"] != "Chicago, Illinois" else [])
    if c["mode"] == "update":
        model = env.get("ANTHROPIC_MODEL") or server.DEFAULT_DRAFT_MODEL
        client = {"name": "Andre Williams", "age": 34, "needs": c.get("open_needs", []), "openNeeds": c.get("open_needs", [])}
        for label, text in [("from_transcript", res["transcript"]["text"]), ("from_typed", TYPED_UPDATES.get(c["id"], ""))]:
            try:
                r = draft_update(text, client, c["meeting"], AK, model, case_date(c))
                res["updates"][label] = {"model": r["model"], "summary": r["summary"], "changes": r["changes"], "seconds": r["seconds"]}
            except Exception as e:
                res["errors"].append(f"update {label}: {e} {getattr(e, 'detail', '')}"[:600])
    for loc in locations:
        ncfg = dict(cfg.get("note") or {}, location=loc, meeting_date=case_date(c))
        try:
            r = draft_note(lines, LISTS, ncfg, AK)
            res["notes"][loc] = {"note": r["note"], "seconds": r["seconds"], "model": r["request"]["model"], "usage": r["usage"]}
            print(f"  {c['id']}: note ({loc}) in {r['seconds']} s", flush=True)
        except Exception as e:
            res["errors"].append(f"note {loc}: {e} {getattr(e, 'detail', '')}"[:600])
    return res


def save(c):
    started = time.time()
    try:
        r = run_case(c)
    except Exception:
        r = {"case": c["id"], "errors": [traceback.format_exc()[-1500:]]}
    r["total_seconds"] = round(time.time() - started, 1)
    (OUT / f"{c['id']}.json").write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {c['id']} saved ({len(r.get('errors', []))} errors)", flush=True)


only = {a for a in sys.argv[2:] if a[:2].isdigit()}
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(save, [c for c in CASES if not only or c["id"] in only]))
print("Done. Results are in", OUT)
