# Test plan: 20 synthetic recordings

Cases 1-10 come from around the US, the UK and Canada. Cases IL-1 to IL-10 are Illinois residents coming home from IDOC prisons, Cook County Jail and IDJJ, with the agency set to Chicago, Peoria, Rockford, Springfield or Joliet. The Illinois set also covers the key fields the first set rarely touched: IDOC number, date of birth, household, emergency contact, referral source, and the consent and release-of-information forms.

These recordings are built to find where the pipeline (Whisper transcript, then Claude's draft note or typed update) goes wrong, not to show it working. Every person and phone number is made up; facilities and programs are real so place-name correction gets a real test.

## How to run a case

1. In `backend/ai-config.json`, set `note.location` to the case's agency location (then repeat the cases outside Chicago with `Chicago, Illinois` to see whether out-of-area places get 'corrected' to Chicago). `python3 run_tests.py` does all of this for you.
2. Upload `audio/<case>.m4a` in the app as a new intake (case 5: the existing-client update, and also paste `scripts/05-andre-followup-call-typed.txt` into the typed-update box).
3. Check the transcript against `scripts/<case>.txt`, then check the note against the **Expected** list in `scripts/<case>.md`. Log each check as a row in `test-log.md` (same columns as the Andre rows).
4. Each case run costs one Whisper call and one Claude call. The AI log (`backend/logs/`) keeps the raw outputs.

## About "fine-tuning"

Claude and Whisper-large-v3 are not fine-tuned here. The practical loop is: run all 10, log every miss, change the prompt (`prompts/draft-note.md`), the Whisper word list or the app's rules, and run the 10 again to see the miss rate drop without new misses. Keep the cases fixed so runs are comparable. Real fine-tuning would need hundreds of labelled real transcripts; these 10 are the regression set that comes first.

## Cases at a glance

| # | Case | Location | Main things it tries to break |
|---|---|---|---|
| 1 | [Maria, Los Angeles: code-switching and a daughter who answers for her](scripts/01-maria-los-angeles.md) | Los Angeles, California | Agency location is set to Chicago in ai-config; Spanish inside English sentences; A third person answers for the client |
| 2 | [Darnell, Houston: vague dates, ankle monitor, and two answers for the same thing](scripts/02-darnell-houston.md) | Houston, Texas | Vague, self-corrected release date ('Tuesday before last, maybe the tenth? No, a Wednesday'); Parole vs mandatory supervision; Age said as 29, then 30, then corrected back to 29 |
| 3 | [Liam, Manchester UK: licence, approved premises and British dates](scripts/03-liam-manchester.md) | Manchester, England | Day-first dates; 'On licence' is not Probation or Parole in the US sense; UK words |
| 4 | [Joseph, Gallup NM: federal supervised release, no phone, rural places](scripts/04-joseph-gallup.md) | Gallup, New Mexico | Federal 'supervised release' with a 'probation officer'; No street address, mail via chapter house; no phone of his own; number never completed; Rural tribal place names (Tohatchi, chapter house, IHS, CIB) that Whisper and a Chicago-tuned prompt may mangle |
| 5 | [Andre follow-up call: cousin in the background and a TV on](scripts/05-andre-followup-call.md) | Chicago, Illinois | A background voice makes a damaging claim ('he been drinking again'); the client denies it; TV speech with numbers and place names that could leak into the note; Date clash |
| 6 | [Keisha, Chicago: Cook County Jail, a sensitive disclosure and 'please don't write that'](scripts/06-keisha-chicago-confidential.md) | Chicago, Illinois | The client asks that a disclosure not be written down, and the recording pauses; 'Austin' could be the Chicago neighborhood or Texas; the client says which; 'Humbolt Park' (misspelling the prompt itself uses as its example) and '26th and Cal' (Cook County criminal courthouse shorthand) |
| 7 | [Minh, Seattle: Vietnamese with an interpreter and an immigration hold worry](scripts/07-minh-seattle-interpreter.md) | Seattle, Washington | Three speakers, two languages; Vietnamese name order (family name first; Whisper may output Vietnamese text, an English translation, or nonsense for the Vietnamese lines |
| 8 | [Robert, Pittsburgh: 28 years inside, a list of medications and buprenorphine](scripts/08-robert-pittsburgh-meds.md) | Pittsburgh, Pennsylvania | Drug names and doses that Whisper may mishear (lisinopril, metformin, atorvastatin, Suboxone, Narcan); Urgency; Hearing-impaired client |
| 9 | [Deshawn, Atlanta: 19, fast talk, his mom contradicts him, spelled-out name](scripts/09-deshawn-atlanta-mother.md) | Atlanta, Georgia | Name spelled letter by letter; Age contradiction between client (19) and mother (18 till February); Release date |
| 10 | [Nadia, Toronto: Canadian terms, French words, and corrections that should win](scripts/10-nadia-toronto-corrections.md) | Toronto, Ontario | The case manager states a wrong age and place; the client corrects both; Canadian programs and IDs; French filler and words (oui, euh, parfait) |
| IL-1 | [Marcus, Chatham: Stateville, MSR, an IDOC number spelled out, and a state ID with the wrong address](scripts/il-01-marcus-stateville-chatham.md) | Chicago, Illinois | IDOC number spelled with a phonetic letter ('Y as in yellow') and repeated; MSR is Illinois' word for parole-style supervision; the agent is a 'parole agent'; Two facilities |
| IL-2 | [Luis, Little Village: Dixon, ankle monitor on MSR, and his mother in Spanish](scripts/il-02-luis-dixon-little-village.md) | Chicago, Illinois | A Spanish-speaking parent interjects twice; once the client translates, once he only denies; Mother claims he has not been taking his medicine; Luis denies it (hearsay in Spanish); EM 'movement' hours are a condition that blocks a specific job |
| IL-3 | [Tanya, Peoria: Logan Correctional, kids in DCFS care, and a list of psych meds](scripts/il-03-tanya-logan-peoria.md) | Peoria, Illinois | Agency is downstate (Peoria), not Chicago; Three psychiatric meds with doses; supply about two days left (Urgent); Referral source named twice (Logan counselor and DCFS caseworker) |
| IL-4 | [Terrence, Rockford: 22 years at Menard, registration deadline and host-site rules](scripts/il-04-terrence-menard-rockford.md) | Rockford, Illinois | A legal deadline within days (registration by Monday Nov 23) that must be an Urgent need or agreed step; Conditions are sensitive; the note must state them accurately and neutrally, not add the offense; 'Three years to life' MSR and 'sat past my out date' (violated at the door) |
| IL-5 | [Jamal, Roseland: Cook County Jail, probation, and his girlfriend answers for him](scripts/il-05-jamal-cook-county-roseland.md) | Chicago, Illinois | Jail, not prison; Release date contested; Girlfriend volunteers sensitive third-party claims |
| IL-6 | [Marcus follow-up call: the agent's visit, a lease problem and a threatened violation](scripts/il-06-marcus-followup-agent.md) | Chicago, Illinois | All three open needs are resolved; the update must close or change them, not add new ones for them; A new phone number for the client (a change to contact); Housing threat with a deadline ('end of the month' = Nov 30) and a violation risk |
| IL-7 | [Gloria, Springfield: 64, insulin, a wheelchair, and her daughter on speakerphone](scripts/il-07-gloria-decatur-springfield.md) | Springfield, Illinois | Vague date ('around Halloween, a day or two before') corrected by the daughter; client agrees; Medication supply disagreement; Durable medical equipment that will be taken back (wheelchair belongs to IDOC) |
| IL-8 | [Ray, Uptown: Vienna, a Marine veteran with PTSD, methadone and Hines VA](scripts/il-08-ray-vienna-uptown-veteran.md) | Chicago, Illinois | Methadone continuity with a deadline (paperwork by Friday Nov 27, the day after Thanksgiving) = overdose risk; Money for housing runs out in four nights; VA names |
| IL-9 | [Dante, North Lawndale: 19, out of IYC St. Charles on aftercare, with his grandmother](scripts/il-09-dante-iyc-north-lawndale.md) | Chicago, Illinois | Juvenile 'aftercare' is not adult parole or probation; Release date contested; Grandmother pushes a school the client refuses; the agreed step follows the client |
| IL-10 | [Kevin, Joliet: Kewanee re-entry center, forms, a late consent question and a busy drop-in room](scripts/il-10-kevin-kewanee-consent.md) | Joliet, Illinois | Recording consent is asked late, after recording began; the client agrees; Consent form signed but release-of-information declined for now; A background stranger says a bathroom code (a number that must not become data) |

## Failure points to watch, by area

| Area | Cases | Pass looks like |
|---|---|---|
| Speaker labels with 3+ voices, interpreters, crosstalk | 1, 5, 7, 9 | Third party marked 'someone else'; their claims not written as the client's facts |
| Hearsay and pressure to record untrue things | 1, 5, 9 | Daughter's insulin claim, cousin's drinking claim and 'put that I got a job' flagged or left out |
| Contradictions and self-corrections | 2, 9, 10 | The correction wins (10) or the field is flagged with both answers (2, 9) |
| Vague or inconsistent dates | 2, 4, 5, 9 | Dates worked out from the meeting date; day/date clashes flagged, never guessed |
| Day-first dates | 3 | 04/11 = 4 November; 12/3/91 = 12 March 1991 |
| Supervision types outside Probation/Parole/None | 2, 3, 4, 6, 7 | Nearest choice or empty, with a comment (mandatory supervision, licence, supervised release, pretrial EM, community custody) |
| Partial and multiple phone numbers | 2, 4, 9 | Corrected number used; incomplete number not completed; whose phone it is noted |
| Place names outside Chicago | 1, 3, 4, 7, 10 | Real local spelling, never moved to a Chicago place |
| Non-English speech (Spanish, Vietnamese, French) | 1, 7, 10 | Whisper output checked; no invented translations |
| Medication names and urgency | 2, 6, 8 | Correct drug names or flagged; buprenorphine gap Urgent |
| Sensitive disclosures, privacy requests | 6, 7, 10 | DV detail kept out after 'please don't write that'; immigration and no-contact orders handled carefully |
| Non-US systems | 3, 10 | No SNAP/Medicaid invented for UK or Ontario clients |
| TV and background speech | 5 | Nothing from the TV in the note |
| Illinois supervision: MSR, EM movement hours, host sites, registration deadlines, IDJJ aftercare, Cook County probation | IL-1 to IL-10 | MSR mapped to Parole with a comment; aftercare flagged; jail + probation kept apart from prison + MSR |
| IDOC numbers, dates of birth, emergency contacts, referral source | IL-1, 3, 7, 10 | Y42017 captured; month-first DOB; emergency contact kept separate from the client's own phone |
| Consent and release-of-information forms | IL-3, IL-10 | ROI Yes only when signed; 'let me think about it' is not Yes; late recording consent noted |
| Downstate Illinois places with a downstate agency | IL-3, 4, 7, 10 | Peoria/Rockford/Springfield/Joliet places never moved to Chicago |
| Family members on speakerphone, partners, guardians | IL-2, 5, 7, 9 | Their claims and choices kept apart from the client's |

## Known gaps these cases will likely expose

- The note prompt has no rule for a client asking that something not be recorded (case 6), and the note has no confidentiality level yet (see notes/data-to-capture.md).
- `supervision_type` only offers Probation / Parole / None, which does not fit 5 of the 10 cases.
- The prompt and Whisper word list are tuned to Chicago; non-Chicago cases test whether `location` is enough.
- The typed-update prompt says 'a Chicago reentry organization' in its first line.

## Audio

Each line was spoken by a macOS `say` voice (rate 165, like andre-intake.m4a), then mixed: turns marked 'talks over' start before the previous one ends, background voices are about 14 dB quieter, muffled lines are low-passed and quiet, phone cases are band-limited to 300-3400 Hz at 8 kHz, and light noise is added. Synthetic voices are easier than real people, so a pass here is necessary but not sufficient: re-record the worst cases with two real voices.

To regenerate: on a Mac run `bash render-lines.sh` (writes `wav/`), then `python3 build.py --mix wav` (add a case id prefix such as `il-` to mix only those). Mixing needs numpy and either ffmpeg or the Mac's built-in afconvert.
