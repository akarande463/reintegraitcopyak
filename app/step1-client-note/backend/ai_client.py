"""The one place the prototype talks to a real AI model.

transcribe() sends one audio recording to the speech-to-text model named in
ai-config.json and returns the text with time stamps. To try another model or
provider, edit ai-config.json. Nothing here needs to change for that.
"""
import base64
import json
import time
import urllib.error
import urllib.request

FRIENDLY_HTTP_ERRORS = {
    400: "The model could not read this request. The audio format may not be supported. Try MP3 or WAV.",
    401: "Hugging Face did not accept the key. Check HF_TOKEN in backend/.env.",
    403: "The key is missing the 'Make calls to Inference Providers' permission. Create a new token with it ticked.",
    404: "Hugging Face does not know this provider or model. Check provider and model in ai-config.json.",
    402: "Your Hugging Face account is out of credits for this month.",
    413: "The recording is too large for this model. Try a shorter clip.",
    429: "Too many requests. Wait a minute and try again.",
    503: "The model is starting up or busy. Wait a minute and try again.",
}


class AIError(Exception):
    """A failed AI call, with a message a non-technical tester can act on."""

    def __init__(self, message, status=None, detail=""):
        super().__init__(message)
        self.status = status
        self.detail = detail


def _post(url, token, body, content_type, timeout):
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": content_type,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise AIError(FRIENDLY_HTTP_ERRORS.get(e.code, f"Hugging Face returned error {e.code}."), e.code, detail)
    except urllib.error.URLError as e:
        raise AIError("Could not reach Hugging Face. Check the internet connection.", None, str(e.reason))
    except TimeoutError:
        raise AIError(f"The model took longer than {timeout} seconds. Try a shorter clip.", None, "timeout")
    except json.JSONDecodeError:
        raise AIError("Hugging Face sent back something that is not JSON.", None, "")


def transcribe(audio_bytes, content_type, config, token):
    """Send one recording to the configured model.

    Returns a dict:
      request  what was sent (endpoint, provider, model, instructions), without the audio itself
      text     the full transcript
      segments [{start, end, text}] time-stamped pieces (empty if the model gave none)
      confidence  the model's confidence score, or None (Whisper does not return one)
      attempts how many calls were made (a second one happens only if timestamps were refused)
      seconds  how long the model took
    Raises AIError on failure.
    """
    if not token:
        raise AIError("No key found. Copy backend/.env.example to backend/.env and paste your Hugging Face key.")
    provider, model = config["provider"], config["model"]
    url = config["endpoint"].format(provider=provider, model=model)
    instructions = config.get("instructions", {})
    timeout = int(config.get("timeout_seconds", 180))
    request = {"endpoint": url, "provider": provider, "model": model, "instructions": instructions}

    started = time.time()
    attempts = 1
    if instructions:
        # JSON form: the audio as base64 text, plus the instructions (e.g. return_timestamps).
        body = json.dumps({"inputs": base64.b64encode(audio_bytes).decode("ascii"), "parameters": instructions}).encode()
        try:
            out = _post(url, token, body, "application/json", timeout)
        except AIError as e:
            if e.status not in (400, 415, 422):
                raise
            # Some providers only take plain audio. Try once more without instructions.
            attempts = 2
            request["retried_without_instructions"] = f"first try refused ({e.status}): {e.detail[:200]}"
            out = _post(url, token, audio_bytes, content_type, timeout)
    else:
        out = _post(url, token, audio_bytes, content_type, timeout)

    if not isinstance(out, dict) or "text" not in out:
        raise AIError("The model answered, but without a transcript.", None, json.dumps(out)[:500])
    segments = []
    for c in out.get("chunks") or []:
        ts = c.get("timestamp") or [None, None]
        segments.append({"start": ts[0], "end": ts[1], "text": (c.get("text") or "").strip()})
    return {
        "request": request,
        "text": out["text"].strip(),
        "segments": segments,
        "confidence": out.get("score") or out.get("confidence"),
        "attempts": attempts,
        "seconds": round(time.time() - started, 1),
    }
