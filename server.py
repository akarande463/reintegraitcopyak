"""Small helper that runs on your laptop.

It does three things:
  1. Shows the prototype at http://localhost:8000
  2. Passes recordings to the real AI model (see ai_client.py and ai-config.json)
  3. Writes every AI request, answer, error and review click to logs/ai-log.jsonl

Start it from the step1-client-note folder with:  python3 backend/server.py
Uses only what comes with Python 3, so there is nothing to install.
"""
import hashlib
import hmac
import json
import mimetypes
import os
import sys
import threading
import time
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import importlib.util

from ai_client import AIError, draft_note, draft_update, read_document, transcribe

HERE = Path(__file__).resolve().parent          # backend/
SITE = HERE.parent                              # step1-client-note/ (the prototype)
CONFIG = HERE / "ai-config.json"
ENV = HERE / ".env"
LOG = HERE / "logs" / "ai-log.jsonl"
PORT = int(os.environ.get("PORT", "8000"))
MAX_UPLOAD = 100 * 1024 * 1024                  # 100 MB
DEFAULT_DRAFT_MODEL = "claude-sonnet-5-5"       # typed updates, when ANTHROPIC_MODEL is blank
_log_lock = threading.Lock()

# ---- Cloud hosting (see deploy/huggingface/README.md) ----
# HOST: 0.0.0.0 on a cloud host, 127.0.0.1 on a laptop.
# Keys can come from environment variables (the host's secret settings) as well as backend/.env.
# DEMO_PASSCODE: if set, only browsers that entered it at /unlock get the real AI. Everyone else
#   gets the simulated mode, as if no key were set. The passcode itself is never stored in the cookie.
# DAILY_AI_LIMIT: most real AI calls per day (UTC) across all visitors. 0 or blank = no limit.
HOST = os.environ.get("HOST", "127.0.0.1")
KEY_NAMES = ("HF_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL")
PASSCODE = os.environ.get("DEMO_PASSCODE", "").strip()
DAILY_LIMIT = int(os.environ.get("DAILY_AI_LIMIT", "0") or 0)
COOKIE = "ri_unlock"
AI_PATHS = ("/api/transcribe", "/api/draft-note", "/api/draft-update", "/api/read-document")
_req = threading.local()          # per request: why the real AI is off, if it is
_usage = {"day": None, "calls": 0}
_usage_lock = threading.Lock()


def _unlock_token():
    return hmac.new(PASSCODE.encode(), b"reintegrait-unlock", hashlib.sha256).hexdigest()


def _calls_today():
    day = time.strftime("%Y-%m-%d", time.gmtime())
    with _usage_lock:
        if _usage["day"] != day:
            _usage.update(day=day, calls=0)
        return _usage["calls"]


def _count_call():
    _calls_today()
    with _usage_lock:
        _usage["calls"] += 1


def read_env():
    """Read KEY=value lines from backend/.env. The key is never printed or logged."""
    values = {}
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    for k in KEY_NAMES:
        if not values.get(k) and os.environ.get(k):
            values[k] = os.environ[k]
    if getattr(_req, "locked", None):
        # Locked (no passcode, or the daily limit is used up): act as if no key were set.
        return {k: v for k, v in values.items() if k == "ANTHROPIC_MODEL"}
    return values


def read_config():
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def write_log(entry):
    """Add one line to logs/ai-log.jsonl."""
    entry = {"time": datetime.now().isoformat(timespec="seconds"), **entry}
    LOG.parent.mkdir(exist_ok=True)
    with _log_lock, LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _run(v):
    """Run number sent by the prototype: one per upload, so its log lines group together."""
    try:
        return int(v) or None
    except (TypeError, ValueError):
        return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    # ---- the prototype's files ----
    def send_head(self):
        # Never serve the helper's own folder (.env, logs) or any hidden file.
        path = urllib.parse.unquote(self.path.split("?")[0].split("#")[0]).replace("\\", "/")
        parts = [p for p in path.split("/") if p]
        if (parts and parts[0].lower() == "backend") or any(p.startswith(".") for p in parts):
            self.send_error(404)
            return None
        return super().send_head()

    def _gate(self):
        """Decide, for this request, whether the real AI is available."""
        _req.locked = None
        if PASSCODE:
            got = ""
            for part in (self.headers.get("Cookie") or "").split(";"):
                k, _, v = part.strip().partition("=")
                if k == COOKIE:
                    got = v
            if not hmac.compare_digest(got, _unlock_token()):
                _req.locked = "passcode"
                return
        if DAILY_LIMIT and _calls_today() >= DAILY_LIMIT:
            _req.locked = "limit"

    def _unlock_page(self, error=""):
        msg = f'<p class="err">{error}</p>' if error else ""
        html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Unlock real AI</title>
<style>body{{font:16px system-ui,sans-serif;background:#f6f8fa;color:#14212e;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}}
form{{background:#fff;border:1px solid #d9e1e8;border-radius:12px;padding:28px;max-width:360px;width:100%;display:grid;gap:12px}}
input,button{{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #b7c3ce}}button{{background:#1b8fc4;color:#fff;border:0;font-weight:600;cursor:pointer}}
.err{{color:#b3261e;margin:0}}p{{margin:0}}small{{color:#566676}}</style></head><body>
<form method="post" action="unlock"><h1 style="margin:0;font-size:1.3rem">Unlock real AI</h1>
<p>Enter the class passcode to use the real speech-to-text and note models in this browser.</p>{msg}
<label for="code">Passcode</label><input id="code" name="code" type="password" autocomplete="off" required autofocus>
<button type="submit">Unlock</button><small>Without it, the demo uses saved AI output. Use made-up recordings only.</small></form></body></html>"""
        body = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _unlock(self, body):
        if not PASSCODE:
            return self._redirect("./")
        code = (urllib.parse.parse_qs(body.decode("utf-8", "replace")).get("code") or [""])[0].strip()
        if not hmac.compare_digest(code.encode(), PASSCODE.encode()):
            time.sleep(1)  # slow down guessing
            return self._unlock_page("That passcode is not right.")
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto", "") == "https" else ""
        self.send_response(303)
        self.send_header("Location", "./")
        self.send_header("Set-Cookie", f"{COOKIE}={_unlock_token()}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax{secure}")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _redirect(self, where):
        self.send_response(303)
        self.send_header("Location", where)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet; AI calls print their own one-line summary

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD:
            raise ValueError("too large")
        return self.rfile.read(n)

    def do_GET(self):
        self._gate()
        if self.path.split("?")[0] == "/unlock":
            return self._unlock_page()
        if self.path.startswith("/api/status"):
            cfg = read_config()
            return self._json(200, {"helper": True, "locked": _req.locked,
                                    "passcode_set": bool(PASSCODE), "daily_limit": DAILY_LIMIT, "mode": cfg.get("mode", "simulated"),
                                    "provider": cfg.get("provider"), "model": cfg.get("model"),
                                    "key_found": bool(read_env().get("HF_TOKEN")),
                                    "draft_key_found": bool(read_env().get("ANTHROPIC_API_KEY")),
                                    "draft_model": read_env().get("ANTHROPIC_MODEL") or DEFAULT_DRAFT_MODEL,
                                    "note": note_status(cfg), "document": document_status(cfg)})
        return super().do_GET()

    def do_POST(self):
        try:
            body = self._body()
        except ValueError:
            return self._json(413, {"ok": False, "error": "File is over 100 MB."})
        self._gate()
        if self.path.split("?")[0] == "/unlock":
            return self._unlock(body)
        if self.path.startswith(AI_PATHS):
            if _req.locked:
                why = ("Real AI is locked on this site. Open /unlock and enter the class passcode."
                       if _req.locked == "passcode" else
                       "Today's real AI limit is used up. The demo still works with saved AI output.")
                return self._json(403 if _req.locked == "passcode" else 429, {"ok": False, "error": why})
            _count_call()
        if self.path.startswith("/api/transcribe"):
            return self._transcribe(body)
        if self.path.startswith("/api/draft-update"):
            return self._draft_update(body)
        if self.path.startswith("/api/draft-note"):
            return self._draft_note(body)
        if self.path.startswith("/api/read-document"):
            return _read_document_handler(self, body)
        if self.path.startswith("/api/log"):
            try:
                ev = json.loads(body or b"{}")
            except json.JSONDecodeError:
                return self._json(400, {"ok": False})
            write_log({"run": _run(ev.get("run")), "type": "activity", "client": ev.get("client", ""),
                       "event": ev.get("event", ""), "detail": ev.get("detail", "")})
            return self._json(200, {"ok": True})
        self.send_error(404)

    def _draft_note(self, body):
        return _draft_note_handler(self, body)

    def _transcribe(self, audio):
        cfg = read_config()
        name = self.headers.get("X-File-Name", "recording")
        ctype = self.headers.get("Content-Type") or mimetypes.guess_type(name)[0] or "application/octet-stream"
        entry = {"run": _run(self.headers.get("X-Run")), "type": "ai_request", "step": "voice to text",
                 "input": {"file_name": name, "content_type": ctype, "size_bytes": len(audio),
                           "duration": self.headers.get("X-Audio-Duration", ""),
                           "note": "The audio itself is not stored in this log."}}
        if cfg.get("mode") != "real":
            entry.update(mode="simulated", output="Simulated mode: no model was called.")
            write_log(entry)
            return self._json(200, {"ok": False, "mode": "simulated", "error": "Simulated mode is on in ai-config.json."})
        try:
            r = transcribe(audio, ctype, cfg, read_env().get("HF_TOKEN", ""), name)
        except AIError as e:
            entry.update(mode="real", request={"endpoint": cfg.get("endpoint", "").format(provider=cfg.get("provider"), model=cfg.get("model")),
                                               "provider": cfg.get("provider"), "model": cfg.get("model"),
                                               "instructions": cfg.get("instructions", {})},
                         error={"message": str(e), "status": e.status, "detail": e.detail})
            write_log(entry)
            print(f"  ✗ AI error: {e}", flush=True)
            return self._json(200, {"ok": False, "mode": "real", "error": str(e)})
        entry.update(mode="real", request=r["request"],
                     output={"text": r["text"], "segments": r["segments"]},
                     confidence=r["confidence"] if r["confidence"] is not None else "not provided by this model",
                     attempts=r["attempts"], seconds=r["seconds"], error=None)
        write_log(entry)
        print(f"  ✓ {r['request']['model']} transcribed {name} in {r['seconds']} s "
              f"({len(r['segments'])} time-stamped pieces)", flush=True)
        return self._json(200, {"ok": True, "mode": "real", "model": r["request"]["model"],
                                "provider": r["request"]["provider"], "text": r["text"],
                                "segments": r["segments"], "seconds": r["seconds"]})

    def _draft_update(self, body):
        cfg = read_config()
        try:
            payload = json.loads(body or b"{}")
        except json.JSONDecodeError:
            return self._json(400, {"ok": False, "error": "Invalid request body."})
        text = (payload.get("text") or "").strip()
        client = payload.get("client") or {}
        update_type = payload.get("type") or ""
        if not text:
            return self._json(400, {"ok": False, "error": "text is required."})
        entry = {"type": "ai_request", "step": "draft update",
                 "input": {"client": client.get("name", ""), "update_type": update_type,
                           "typed_notes": text}}
        if cfg.get("mode") != "real":
            entry.update(mode="simulated", output="Simulated mode: no model was called.")
            write_log(entry)
            return self._json(200, {"ok": False, "mode": "simulated", "error": "Simulated mode is on in ai-config.json."})
        model = read_env().get("ANTHROPIC_MODEL") or DEFAULT_DRAFT_MODEL
        try:
            r = draft_update(text, client, update_type, read_env().get("ANTHROPIC_API_KEY", ""), model,
                             payload.get("date") or "")
        except AIError as e:
            entry.update(mode="real", error={"message": str(e), "status": e.status, "detail": e.detail})
            write_log(entry)
            print(f"  ✗ AI error (draft update): {e}", flush=True)
            return self._json(200, {"ok": False, "mode": "real", "error": str(e)})
        entry.update(mode="real", output={"summary": r["summary"], "changes": r["changes"]},
                     model=r["model"], seconds=r["seconds"], error=None)
        write_log(entry)
        print(f"  ✓ {r['model']} drafted update for {client.get('name', '?')} in {r['seconds']} s "
              f"({len(r['changes'])} changes)", flush=True)
        return self._json(200, {"ok": True, "mode": "real", "model": r["model"],
                                "summary": r["summary"], "changes": r["changes"], "seconds": r["seconds"]})


def note_status(cfg):
    n = cfg.get("note") or {}
    return {"enabled": bool(n.get("enabled")) and cfg.get("mode") == "real", "model": n.get("model"),
            "key_found": bool(read_env().get("ANTHROPIC_API_KEY")),
            "sdk_installed": importlib.util.find_spec("anthropic") is not None}


def _draft_note_handler(handler, body):
    cfg = read_config()
    ncfg = cfg.get("note") or {}
    try:
        req = json.loads(body or b"{}")
    except json.JSONDecodeError:
        return handler._json(400, {"ok": False, "error": "Bad request."})
    lines, lists = req.get("lines") or [], req.get("lists") or {}
    entry = {"run": _run(req.get("run")), "type": "ai_request", "step": "draft note",
             "input": {"transcript_lines": len(lines), "note": "The full transcript sent is under request.input."}}
    if not note_status(cfg)["enabled"]:
        entry.update(mode="simulated", output="Note drafting is off in ai-config.json. The sample note was used.")
        write_log(entry)
        return handler._json(200, {"ok": False, "mode": "simulated", "error": "Note drafting is off in ai-config.json."})
    try:
        r = draft_note(lines, lists, {**ncfg, "meeting_date": req.get("meeting_date") or ""}, read_env().get("ANTHROPIC_API_KEY", ""))
    except AIError as e:
        entry.update(mode="real", request={"provider": ncfg.get("provider"), "model": ncfg.get("model"),
                                           "effort": ncfg.get("effort")},
                     error={"message": str(e), "status": e.status, "detail": e.detail})
        write_log(entry)
        print(f"  ✗ Note draft error: {e}", flush=True)
        return handler._json(200, {"ok": False, "mode": "real", "error": str(e)})
    certainty = {k: v.get("status") for k, v in (r["note"].get("key_info") or {}).items()}
    entry.update(mode="real", request=r["request"], output=r["note"],
                 confidence={"note": "No probability score. This is the model's own label for each key field.",
                             "fields": certainty},
                 stop_reason=r["stop_reason"], usage=r["usage"], request_id=r["request_id"],
                 seconds=r["seconds"], error=None)
    write_log(entry)
    print(f"  ✓ {r['request']['model']} drafted the note in {r['seconds']} s "
          f"({len(r['note'].get('immediate_needs') or [])} needs, {len(r['note'].get('next_steps') or [])} steps)", flush=True)
    return handler._json(200, {"ok": True, "model": r["request"]["model"], "note": r["note"], "seconds": r["seconds"]})


def document_config(cfg):
    """The document reader uses the "document" part of ai-config.json, or the note settings if it is missing."""
    return {**(cfg.get("note") or {}), "effort": "low", "max_tokens": 4000, **(cfg.get("document") or {})}


def document_status(cfg):
    d = document_config(cfg)
    return {"enabled": bool(d.get("enabled")) and cfg.get("mode") == "real", "model": d.get("model"),
            "key_found": bool(read_env().get("ANTHROPIC_API_KEY")),
            "sdk_installed": importlib.util.find_spec("anthropic") is not None}


def _read_document_handler(handler, body):
    cfg = read_config()
    dcfg = document_config(cfg)
    try:
        req = json.loads(body or b"{}")
    except json.JSONDecodeError:
        return handler._json(400, {"ok": False, "error": "Bad request."})
    data, media_type = req.get("data") or "", req.get("media_type") or ""
    entry = {"run": _run(req.get("run")), "type": "ai_request", "step": "read document",
             "input": {"file_name": req.get("file_name", ""), "content_type": media_type,
                       "size_bytes": len(data) * 3 // 4, "client": req.get("client", ""),
                       "note": "The document itself is not stored in this log."}}
    if not document_status(cfg)["enabled"]:
        entry.update(mode="simulated", output="Document reading is off in ai-config.json.")
        write_log(entry)
        return handler._json(200, {"ok": False, "mode": "simulated", "error": "Document reading is off in ai-config.json."})
    try:
        r = read_document(data, media_type, req.get("fields") or [], dcfg, read_env().get("ANTHROPIC_API_KEY", ""))
    except AIError as e:
        entry.update(mode="real", request={"provider": "anthropic", "model": dcfg.get("model"), "effort": dcfg.get("effort")},
                     error={"message": str(e), "status": e.status, "detail": e.detail})
        write_log(entry)
        print(f"  ✗ Document read error: {e}", flush=True)
        return handler._json(200, {"ok": False, "mode": "real", "error": str(e)})
    doc = r["document"]
    entry.update(mode="real", request=r["request"], output=doc,
                 confidence={"note": "No probability score. readable is the model's own judgment.", "readable": doc.get("readable")},
                 stop_reason=r["stop_reason"], usage=r["usage"], request_id=r["request_id"], seconds=r["seconds"], error=None)
    write_log(entry)
    print(f"  ✓ {r['request']['model']} read {req.get('file_name', 'a document')} in {r['seconds']} s "
          f"({doc.get('document_type')}, {len(doc.get('fields') or [])} fields)", flush=True)
    return handler._json(200, {"ok": True, "model": r["request"]["model"], "document": doc, "seconds": r["seconds"]})


def main():
    cfg = read_config()
    key = bool(read_env().get("HF_TOKEN"))
    print("\nReintegrAIt prototype helper")
    print(f"  Open:     http://localhost:{PORT}")
    if PASSCODE or DAILY_LIMIT:
        print(f"  Cloud:    passcode {'on' if PASSCODE else 'off'} · daily AI limit {DAILY_LIMIT or 'none'}")
    print(f"  AI mode:  {cfg.get('mode')}  ({cfg.get('provider')} · {cfg.get('model')})")
    print(f"  Key:      {'found' if key else 'NOT FOUND. Copy backend/.env.example to backend/.env and paste your key.'}")
    ns = note_status(cfg)
    if ns["enabled"]:
        problems = [m for ok, m in ((ns["key_found"], "add ANTHROPIC_API_KEY to backend/.env"),
                                    (ns["sdk_installed"], "run: python3 -m pip install anthropic")) if not ok]
        print(f"  Note:     {ns['model']} drafts the note" + (f" (to turn on: {'; '.join(problems)})" if problems else ""))
    else:
        print("  Note:     sample note (note drafting is off)")
    ds = document_status(cfg)
    if ds["enabled"]:
        problems = [m for ok, m in ((ds["key_found"], "add ANTHROPIC_API_KEY to backend/.env"),
                                    (ds["sdk_installed"], "run: python3 -m pip install anthropic")) if not ok]
        print(f"  Document: {ds['model']} reads documents" + (f" (to turn on: {'; '.join(problems)})" if problems else ""))
    else:
        print("  Document: sample documents only (document reading is off)")
    print(f"  Log file: {LOG.relative_to(SITE)}")
    print("  Stop:     press Control + C\n", flush=True)
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as e:
        sys.exit(f"Could not start on port {PORT} ({e}). Is another copy already running? Close it or run: PORT=8001 python3 backend/server.py")
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
