# Test recordings

Ten synthetic intake and follow-up conversations built to find where ReintegrAIt's transcript and note drafting fail.
Start with [TEST-PLAN.md](TEST-PLAN.md). Each case has a script with expected behavior in `scripts/<case>.md`,
the spoken text in `scripts/<case>.txt`, and audio in `audio/<case>.m4a`.

- `cases.py` is the source of truth for all ten cases. Edit it, then run `python3 build.py`.
- `render-lines.sh` (Mac) speaks every line with a `say` voice into `wav/`.
- `python3 build.py --mix wav` mixes those lines into `audio/` with crosstalk, background voices, noise and phone quality (needs numpy and ffmpeg).

All people and phone numbers are fictional.
