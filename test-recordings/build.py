"""Build the scripts, the voice manifest and the test plan from cases.py.

    python3 build.py            writes scripts/, lines.tsv and TEST-PLAN.md
    python3 build.py --mix DIR  mixes the per-line WAVs in DIR (made by render-lines.sh
                                on a Mac) into audio/<case>.m4a with crosstalk, noise
                                and phone effects. Needs numpy and ffmpeg.
"""
import os, subprocess, sys, wave
from pathlib import Path
from cases import CASES, TYPED_UPDATES

HERE = Path(__file__).parent
RATE = 22050
GAP = 0.35           # seconds of silence between turns

# macOS voices that may not be installed get fallbacks; render-lines.sh uses the first one found.
FALLBACK = {
    "Samantha": ["Samantha", "Kathy", "Sandy (English (US))"],
    "Paulina": ["Paulina", "Mónica", "Monica", "Samantha"],
    "Allison": ["Sandy (English (US))", "Kathy", "Victoria"],
    "Fred": ["Fred", "Reed (English (US))", "Alex"],
    "Kate": ["Flo (English (UK))", "Moira", "Karen"],
    "Daniel": ["Daniel", "Rocko (English (UK))", "Reed (English (UK))"],
    "Alex": ["Alex", "Eddy (English (US))", "Fred"],
    "Ralph": ["Ralph", "Rocko (English (US))", "Fred"],
    "Albert": ["Albert", "Reed (English (US))", "Fred"],
    "Nicky": ["Kathy", "Shelley (English (US))", "Samantha"],
    "Karen": ["Karen", "Tessa", "Moira"],
    "Linh": ["Linh", "Samantha"],
    "Grandpa": ["Grandpa (English (US))", "Grandpa", "Ralph"],
    "Aaron": ["Eddy (English (US))", "Rishi", "Alex"],
    "Shelley": ["Shelley (English (US))", "Grandma (English (US))", "Victoria"],
    "Amélie": ["Amélie", "Amelie", "Thomas", "Samantha"],
}


def spoken(text):
    return text.replace("\t", " ").replace("\n", " ")


def build():
    (HERE / "scripts").mkdir(exist_ok=True)
    tsv = ["case\tline\tspeaker\tvoices\ttext"]
    for c in CASES:
        lines = c["lines"]
        # Plain transcript, one turn per line, like andre-intake.txt
        (HERE / "scripts" / f"{c['id']}.txt").write_text("\n".join(spoken(t) for _, t, _ in lines) + "\n", encoding="utf-8")
        for i, (who, text, _) in enumerate(lines, 1):
            voices = FALLBACK.get(c["speakers"][who], [c["speakers"][who]])
            tsv.append(f"{c['id']}\t{i:02d}\t{who}\t{'|'.join(voices)}\t{spoken(text)}")
        md = [f"# {c['title']}", "",
              f"**Mode:** {'Existing-client update' if c['mode']=='update' else 'New intake'} · **Meeting:** {c['meeting']} · "
              f"**Date:** {c['date']} · **Set agency location to:** {c['location']}", "",
              "Every person and phone number here is made up.", "",
              "## Why this case", "", c["background"], "",
              "Sources: " + ", ".join(f"<{u}>" for u in c["sources"]), "",
              "## Voices", ""]
        md += [f"- {who}: macOS `{c['speakers'][who]}`" for who in c["speakers"]]
        eff = c.get("effects", {})
        md += ["", "Audio: " + ", ".join(filter(None, [
            "phone-line quality" if eff.get("phone") else "room recording",
            "light background noise" if eff.get("noise") else ""])) + ".", ""]
        if c.get("open_needs"):
            md += ["## Client's open needs before this call", ""] + [f"- {n}" for n in c["open_needs"]] + [""]
        md += ["## Script", ""]
        for who, text, o in lines:
            tags = [k for k in ("overlap", "bg", "mumble") if o.get(k)]
            tag = f" *[{', '.join({'overlap':'talks over the last speaker','bg':'in the background','mumble':'muffled'}[t] for t in tags)}]*" if tags else ""
            md.append(f"**{who}:** {text}{tag}\n")
        if c["id"] in TYPED_UPDATES:
            md += ["## Typed version (for the typed-update box)", "", "```", TYPED_UPDATES[c["id"]], "```", ""]
        md += ["## What it probes", ""] + [f"- {p}" for p in c["probes"]] + ["",
               "## Expected correct behavior", ""] + [f"- {e}" for e in c["expected"]] + [""]
        (HERE / "scripts" / f"{c['id']}.md").write_text("\n".join(md), encoding="utf-8")
    for cid, text in TYPED_UPDATES.items():
        (HERE / "scripts" / f"{cid}-typed.txt").write_text(text + "\n", encoding="utf-8")
    (HERE / "lines.tsv").write_text("\n".join(tsv) + "\n", encoding="utf-8")
    write_plan()


def write_plan():
    p = ["# Test plan: 10 synthetic recordings", "",
         "These recordings are built to find where the pipeline (Whisper transcript, then Claude's draft note or typed update) "
         "goes wrong, not to show it working. Every person and phone number is made up; facilities and programs are real "
         "so place-name correction gets a real test.", "",
         "## How to run a case", "",
         "1. In `backend/ai-config.json`, set `note.location` to the case's agency location (then repeat cases 1-4, 7 and 10 "
         "with `Chicago, Illinois` to see whether out-of-area places get 'corrected' to Chicago).",
         "2. Upload `audio/<case>.m4a` in the app as a new intake (case 5: the existing-client update, and also paste "
         "`scripts/05-andre-followup-call-typed.txt` into the typed-update box).",
         "3. Check the transcript against `scripts/<case>.txt`, then check the note against the **Expected** list in "
         "`scripts/<case>.md`. Log each check as a row in `test-log.md` (same columns as the Andre rows).",
         "4. Each case run costs one Whisper call and one Claude call. The AI log (`backend/logs/`) keeps the raw outputs.", "",
         "## About \"fine-tuning\"", "",
         "Claude and Whisper-large-v3 are not fine-tuned here. The practical loop is: run all 10, log every miss, change the "
         "prompt (`prompts/draft-note.md`), the Whisper word list or the app's rules, and run the 10 again to see the miss "
         "rate drop without new misses. Keep the cases fixed so runs are comparable. Real fine-tuning would need hundreds "
         "of labelled real transcripts; these 10 are the regression set that comes first.", "",
         "## Cases at a glance", "",
         "| # | Case | Location | Main things it tries to break |", "|---|---|---|---|"]
    for i, c in enumerate(CASES, 1):
        p.append(f"| {i} | [{c['title']}](scripts/{c['id']}.md) | {c['location']} | " +
                 "; ".join(x.split('.')[0].split(':')[0] for x in c["probes"][:3]) + " |")
    p += ["", "## Failure points to watch, by area", "",
          "| Area | Cases | Pass looks like |", "|---|---|---|",
          "| Speaker labels with 3+ voices, interpreters, crosstalk | 1, 5, 7, 9 | Third party marked 'someone else'; their claims not written as the client's facts |",
          "| Hearsay and pressure to record untrue things | 1, 5, 9 | Daughter's insulin claim, cousin's drinking claim and 'put that I got a job' flagged or left out |",
          "| Contradictions and self-corrections | 2, 9, 10 | The correction wins (10) or the field is flagged with both answers (2, 9) |",
          "| Vague or inconsistent dates | 2, 4, 5, 9 | Dates worked out from the meeting date; day/date clashes flagged, never guessed |",
          "| Day-first dates | 3 | 04/11 = 4 November; 12/3/91 = 12 March 1991 |",
          "| Supervision types outside Probation/Parole/None | 2, 3, 4, 6, 7 | Nearest choice or empty, with a comment (mandatory supervision, licence, supervised release, pretrial EM, community custody) |",
          "| Partial and multiple phone numbers | 2, 4, 9 | Corrected number used; incomplete number not completed; whose phone it is noted |",
          "| Place names outside Chicago | 1, 3, 4, 7, 10 | Real local spelling, never moved to a Chicago place |",
          "| Non-English speech (Spanish, Vietnamese, French) | 1, 7, 10 | Whisper output checked; no invented translations |",
          "| Medication names and urgency | 2, 6, 8 | Correct drug names or flagged; buprenorphine gap Urgent |",
          "| Sensitive disclosures, privacy requests | 6, 7, 10 | DV detail kept out after 'please don't write that'; immigration and no-contact orders handled carefully |",
          "| Non-US systems | 3, 10 | No SNAP/Medicaid invented for UK or Ontario clients |",
          "| TV and background speech | 5 | Nothing from the TV in the note |", "",
          "## Known gaps these cases will likely expose", "",
          "- The note prompt has no rule for a client asking that something not be recorded (case 6), and the note has no confidentiality level yet (see notes/data-to-capture.md).",
          "- `supervision_type` only offers Probation / Parole / None, which does not fit 5 of the 10 cases.",
          "- The prompt and Whisper word list are tuned to Chicago; non-Chicago cases test whether `location` is enough.",
          "- The typed-update prompt says 'a Chicago reentry organization' in its first line.", "",
          "## Audio", "",
          "Each line was spoken by a macOS `say` voice (rate 165, like andre-intake.m4a), then mixed: turns marked "
          "'talks over' start before the previous one ends, background voices are about 14 dB quieter, muffled lines are "
          "low-passed and quiet, phone cases are band-limited to 300-3400 Hz at 8 kHz, and light noise is added. Synthetic "
          "voices are easier than real people, so a pass here is necessary but not sufficient: re-record the worst cases "
          "with two real voices.", "",
          "To regenerate: on a Mac run `bash render-lines.sh` (writes `wav/`), then `python3 build.py --mix wav`.", ""]
    (HERE / "TEST-PLAN.md").write_text("\n".join(p), encoding="utf-8")


# ---------------------------------------------------------------- mixing
def read_wav(path):
    import numpy as np
    with wave.open(str(path)) as w:
        assert w.getsampwidth() == 2 and w.getnchannels() == 1, path
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype("float32") / 32768
        if w.getframerate() != RATE:
            raise SystemExit(f"{path}: expected {RATE} Hz")
    return data


def ffilter(x, af):
    """Run a mono float buffer through an ffmpeg audio filter."""
    import numpy as np
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                          "-af", af, "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-"],
                         input=x.astype("float32").tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype="float32").copy()


def mix(wavdir):
    import numpy as np
    wavdir = Path(wavdir)
    (HERE / "audio").mkdir(exist_ok=True)
    rng = np.random.default_rng(7)
    for c in CASES:
        eff = c.get("effects", {})
        segs, t = [], 0.0
        for i, (who, text, o) in enumerate(c["lines"], 1):
            x = read_wav(wavdir / c["id"] / f"{i:02d}.wav")
            x = x[: max(1, len(x))]
            if o.get("mumble"):
                x = ffilter(x, "lowpass=f=700,volume=-10dB")
            if o.get("bg"):
                x = ffilter(x, "lowpass=f=2500,aecho=0.8:0.6:40:0.3,volume=-14dB")
            if o.get("gain"):
                x = x * (10 ** (o["gain"] / 20))
            start = t - o["overlap"] if o.get("overlap") else t + (GAP if segs else 0.3)
            start = max(0.0, start)
            segs.append((int(start * RATE), x))
            if not o.get("bg"):           # background lines don't hold the floor
                t = start + len(x) / RATE
            else:
                t = max(t, start)
        n = max(s + len(x) for s, x in segs) + int(0.6 * RATE)
        out = np.zeros(n, dtype="float32")
        for s, x in segs:
            out[s:s + len(x)] += x
        if eff.get("noise"):
            noise = np.cumsum(rng.standard_normal(n)).astype("float32")
            noise = ffilter(noise - np.convolve(noise, np.ones(400) / 400, "same"), "highpass=f=80,lowpass=f=4000")
            noise = noise / (np.abs(noise).max() or 1)
            out += noise[:n] * eff["noise"] * 4
        peak = np.abs(out).max() or 1
        out = out / peak * 0.89
        af = "highpass=f=300,lowpass=f=3400,aresample=8000" if eff.get("phone") else "anull"
        dest = HERE / "audio" / f"{c['id']}.m4a"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                        "-af", af, "-c:a", "aac", "-b:a", "64k", str(dest)],
                       input=out.tobytes(), check=True)
        print(f"{dest.name}: {n / RATE:.0f} s")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--mix":
        mix(sys.argv[2])
    else:
        build()
