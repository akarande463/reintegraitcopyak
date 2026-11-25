"""The one place the prototype talks to a real AI model.

transcribe() sends one audio recording to the speech-to-text model named in
ai-config.json and returns the text with time stamps. To try another model or
provider, edit ai-config.json. Nothing here needs to change for that.

draft_update() sends a case manager's typed notes for an existing client to a
real language model and gets back a summary and a list of case-file changes,
so the output is grounded in what was actually typed instead of a canned
sample. It flags anything said by someone other than the client, or anything
unclear, instead of writing it in as a confirmed fact.
"""
import base64
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

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


ANTHROPIC_HTTP_ERRORS = {
    400: "The model could not read this request.",
    401: "Anthropic did not accept the key. Check ANTHROPIC_API_KEY in backend/.env.",
    403: "This key does not have access to that model.",
    404: "Unknown model. Check ANTHROPIC_MODEL in backend/.env.",
    413: "The notes are too long for one request.",
    429: "Too many requests. Wait a minute and try again.",
    529: "Anthropic is overloaded. Wait a minute and try again.",
}

DRAFT_SYSTEM_PROMPT = """You are helping a case manager at a Chicago reentry organization keep a client's case file accurate. You are given the case manager's own typed notes from a check-in call or visit, plus the client's current open needs. Summarize only what is in the notes. You never invent facts that are not in the notes.

List the changes this update makes to the case file. For each change: if it updates an existing open need, set "from" to that need's exact current text (match it from the list given) and "to" to the new text; if it's a new need or a next step, leave "from" empty.

If a sentence is clearly said by someone other than the client (a family member, someone overheard in the background) or is unclear or inaudible, set "flagged": true on that change and give a one-phrase "flag_reason" explaining why it needs confirming, instead of writing it in as a confirmed fact about the client. Never flag something as true that is only hearsay.

Respond with ONLY valid JSON (no markdown fences, no commentary), matching exactly this shape:
{
  "summary": "one or two plain sentences summarizing the update",
  "changes": [
    {
      "kind": "add" | "change",
      "field": "need" | "note",
      "label": "short label, e.g. Medication or Next step",
      "from": "",
      "to": "the new value",
      "flagged": false,
      "flag_reason": ""
    }
  ]
}
If nothing changed, return an empty changes array."""


def draft_update(text, client, update_type, token, model):
    """Send a case manager's typed update to a real language model.

    Returns a dict: model, summary, changes (list of dicts matching the
    shape in DRAFT_SYSTEM_PROMPT), seconds. Raises AIError on failure.
    """
    if not token:
        raise AIError("No key found. Copy backend/.env.example to backend/.env and paste your Anthropic key.")
    needs = client.get("openNeeds") or []
    user_content = (
        f"Client: {client.get('name', 'Unknown')}, age {client.get('age', 'unknown')}. "
        f"Update type: {update_type}.\n"
        f"Current open needs: {', '.join(needs) if needs else 'none on file'}.\n\n"
        f"Case manager's typed notes:\n{text}"
    )
    body = json.dumps({
        "model": model,
        "max_tokens": 1024,
        "system": DRAFT_SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_content}],
    }).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, method="POST", headers={
        "x-api-key": token,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            out = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise AIError(ANTHROPIC_HTTP_ERRORS.get(e.code, f"Anthropic returned error {e.code}."), e.code, detail)
    except urllib.error.URLError as e:
        raise AIError("Could not reach Anthropic. Check the internet connection.", None, str(e.reason))
    except TimeoutError:
        raise AIError("The model took longer than 60 seconds.", None, "timeout")
    except json.JSONDecodeError:
        raise AIError("Anthropic sent back something that is not JSON.", None, "")

    raw = "".join(b.get("text", "") for b in out.get("content", []) if b.get("type") == "text")
    candidate = raw.split("```")[1] if "```" in raw else raw
    if candidate.lstrip().startswith("json"):
        candidate = candidate.lstrip()[4:]
    try:
        parsed = json.loads(candidate.strip())
    except json.JSONDecodeError:
        raise AIError("The model answered, but not in the expected format.", None, raw[:500])

    if not isinstance(parsed.get("summary"), str) or not isinstance(parsed.get("changes"), list):
        raise AIError("The model's answer was missing summary or changes.", None, json.dumps(parsed)[:500])

    return {
        "model": model,
        "summary": parsed["summary"],
        "changes": parsed["changes"],
        "seconds": round(time.time() - started, 1),
    }
