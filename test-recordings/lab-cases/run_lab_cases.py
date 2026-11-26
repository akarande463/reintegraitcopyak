"""Run lab cases 1-4 through the app's note-drafting model (prompts/draft-note.md) and save the notes.

    python3 run_lab_cases.py            # needs ANTHROPIC_API_KEY in app/step1-client-note/backend/.env
    python3 run_lab_cases.py --dump     # writes the exact system prompt and input for each case to prompts/, no API call

Case 5 (stale match) runs in the browser: node stale-match-test.js
Results go to results/<case>.json. Keys are never printed or saved.
"""
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent.parent / "app" / "step1-client-note" / "backend"
sys.path.insert(0, str(BACKEND))
import ai_client as A   # noqa: E402

CASES = json.loads((HERE / "cases.json").read_text())
SIM = json.loads((BACKEND.parent / "simulated_responses.json").read_text())
T = SIM["templates"]
LISTS = {"key_fields": [{"key": f["key"], "label": f["label"], "type": f.get("type", "text"), "options": f.get("options", [])}
                        for f in T["intake_notes"]["Standard intake note"]["key_fields"]],
         "categories": SIM["matched_services"]["categories"], "service_types": T["service_types"],
         "meeting_types": T["meeting_types"]}
CFG = json.loads((BACKEND / "ai-config.json").read_text())["note"]
CFG = dict(CFG, location=CASES["location"], meeting_date=CASES["meeting_date"])


def lines_of(c):
    return [{"id": f"rt{i+1}", "time": t, "text": x} for i, (t, x) in enumerate(c["lines"])]


def user_message(lines):
    # Same text draft_note() sends (ai_client.py).
    day = A.meeting_date(CFG["meeting_date"])
    transcript = "\n".join(f"[{l['id']} {l['time']}] {l['text']}" for l in lines)
    return (f"The agency works in: {CFG['location']}\n"
            f"Meeting date (today, unless the recording says otherwise): {day.strftime('%A %Y-%m-%d')}\n"
            f"Calendar around it: {A.calendar_lines(day)}\n" +
            "Key fields:\n" + "\n".join(A._describe(f) for f in LISTS["key_fields"]) + "\n"
            f"Need categories: {', '.join(LISTS['categories'])}\n"
            f"Service types: {', '.join(LISTS['service_types'])}\n\n"
            f"Transcript:\n{transcript}")


note_cases = [c for c in CASES["cases"] if "lines" in c]
if "--dump" in sys.argv:
    out = HERE / "prompts"; out.mkdir(exist_ok=True)
    (out / "system.md").write_text((BACKEND / "prompts" / "draft-note.md").read_text())
    (out / "schema.json").write_text(json.dumps(A.note_schema(LISTS), indent=1))
    for c in note_cases:
        (out / f"{c['id']}.txt").write_text(user_message(lines_of(c)))
    print("Wrote", len(note_cases), "inputs to", out)
    sys.exit()

sys.path.insert(0, str(BACKEND)); import server   # noqa: E402
key = server.read_env().get("ANTHROPIC_API_KEY", "")
print("Anthropic key found:", "yes" if key else "NO")
res = HERE / "results"; res.mkdir(exist_ok=True)
for c in note_cases:
    r = A.draft_note(lines_of(c), LISTS, CFG, key)
    (res / f"{c['id']}.json").write_text(json.dumps({"case": c["id"], "model": r["request"]["model"], "note": r["note"],
                                                       "seconds": r["seconds"], "good": c["good"]}, indent=2))
    print("✓", c["id"], r["seconds"], "s")
