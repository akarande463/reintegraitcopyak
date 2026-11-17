"""Small helper that runs on your laptop.

It does three things:
  1. Shows the prototype at http://localhost:8000
  2. Passes recordings to the real AI model (see ai_client.py and ai-config.json)
  3. Writes every AI request, answer, error and review click to logs/ai-log.jsonl

Start it from the step1-client-note folder with:  python3 backend/server.py
Uses only what comes with Python 3, so there is nothing to install.
"""
import json
import mimetypes
import os
import sys
import threading
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from ai_client import AIError, transcribe

HERE = Path(__file__).resolve().parent          # backend/
SITE = HERE.parent                              # step1-client-note/ (the prototype)
CONFIG = HERE / "ai-config.json"
ENV = HERE / ".env"
LOG = HERE / "logs" / "ai-log.jsonl"
PORT = int(os.environ.get("PORT", "8000"))
MAX_UPLOAD = 100 * 1024 * 1024                  # 100 MB
_log_lock = threading.Lock()


def read_env():
    """Read KEY=value lines from backend/.env. The key is never printed or logged."""
    values = {}
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def read_config():
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def write_log(entry):
    """Add one line to logs/ai-log.jsonl."""
    entry = {"time": datetime.now().isoformat(timespec="seconds"), **entry}
    LOG.parent.mkdir(exist_ok=True)
    with _log_lock, LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


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
        if self.path.startswith("/api/status"):
            cfg = read_config()
            return self._json(200, {"helper": True, "mode": cfg.get("mode", "simulated"),
                                    "provider": cfg.get("provider"), "model": cfg.get("model"),
                                    "key_found": bool(read_env().get("HF_TOKEN"))})
        return super().do_GET()

    def do_POST(self):
        try:
            body = self._body()
        except ValueError:
            return self._json(413, {"ok": False, "error": "File is over 100 MB."})
        if self.path.startswith("/api/transcribe"):
            return self._transcribe(body)
        if self.path.startswith("/api/log"):
            try:
                ev = json.loads(body or b"{}")
            except json.JSONDecodeError:
                return self._json(400, {"ok": False})
            write_log({"type": "activity", "client": ev.get("client", ""),
                       "event": ev.get("event", ""), "detail": ev.get("detail", "")})
            return self._json(200, {"ok": True})
        self.send_error(404)

    def _transcribe(self, audio):
        cfg = read_config()
        name = self.headers.get("X-File-Name", "recording")
        ctype = self.headers.get("Content-Type") or mimetypes.guess_type(name)[0] or "application/octet-stream"
        entry = {"type": "ai_request", "step": "voice to text",
                 "input": {"file_name": name, "content_type": ctype, "size_bytes": len(audio),
                           "duration": self.headers.get("X-Audio-Duration", ""),
                           "note": "The audio itself is not stored in this log."}}
        if cfg.get("mode") != "real":
            entry.update(mode="simulated", output="Simulated mode: no model was called.")
            write_log(entry)
            return self._json(200, {"ok": False, "mode": "simulated", "error": "Simulated mode is on in ai-config.json."})
        try:
            r = transcribe(audio, ctype, cfg, read_env().get("HF_TOKEN", ""))
        except AIError as e:
            entry.update(mode="real", request={"provider": cfg.get("provider"), "model": cfg.get("model"),
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


def main():
    cfg = read_config()
    key = bool(read_env().get("HF_TOKEN"))
    print("\nReintegrAIt prototype helper")
    print(f"  Open:     http://localhost:{PORT}")
    print(f"  AI mode:  {cfg.get('mode')}  ({cfg.get('provider')} · {cfg.get('model')})")
    print(f"  Key:      {'found in backend/.env' if key else 'NOT FOUND. Copy backend/.env.example to backend/.env and paste your key.'}")
    print(f"  Log file: {LOG.relative_to(SITE)}")
    print("  Stop:     press Control + C\n", flush=True)
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except OSError as e:
        sys.exit(f"Could not start on port {PORT} ({e}). Is another copy already running? Close it or run: PORT=8001 python3 backend/server.py")
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
