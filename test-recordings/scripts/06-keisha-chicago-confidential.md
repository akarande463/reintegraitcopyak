# Keisha, Chicago: Cook County Jail, a sensitive disclosure and 'please don't write that'

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 20, 2026 · **Set agency location to:** Chicago, Illinois

Every person and phone number here is made up.

## Why this case

Most people coming home in big US cities come from jail, not prison, often after short pretrial stays, sometimes on electronic monitoring. Disclosures of domestic violence and child custody are common and need a confidentiality level, which the note does not capture yet.

Sources: <https://nicic.gov/resources/digitalpub/challenges-and-opportunities-in-jail-reentry-insights-transition-jail-0>, <https://openoregon.pressbooks.pub/mentalcrimjustsys1e/chapter/oo8-7/>

## Voices

- Case manager: macOS `Samantha`
- Keisha: macOS `Nicky`

Audio: room recording, light background noise.

## Script

**Case manager:** Intake for Keisha Monroe, November twentieth. Is it alright if I record so I don't have to write?

**Keisha:** Yeah.

**Case manager:** When did you get out?

**Keisha:** Monday. From Cook County. I'm on the bracelet, pretrial, I got court December third at Twenty-sixth and Cal.

**Case manager:** Where are you staying?

**Keisha:** In Humbolt Park with my auntie. I can't go back to my apartment.

**Case manager:** Can I ask why?

**Keisha:** My ex is there. He's the reason I... he put hands on me. Please don't write that part down. If it gets back to him...

**Case manager:** Okay. Let me pause the recording for a second.

**Case manager:** Okay, we're back on. Tell me about your kids.

**Keisha:** Two. Jaylen's six and Amaya's three. They're with my mom in Austin, the West Side Austin, not Texas. DCFS has a case open.

**Case manager:** Any medication?

**Keisha:** Sertraline. I still got about ten days.

**Case manager:** How old are you, Keisha?

**Keisha:** Thirty-one.

**Case manager:** Okay. So I'll connect you with our DV advocate this week, privately, and we'll get you a psych appointment before the sertraline runs out. Your court date is the third. I'll see you Tuesday.

**Keisha:** Okay. Thank you.

## What it probes

- The client asks that a disclosure not be written down, and the recording pauses.
- 'Austin' could be the Chicago neighborhood or Texas; the client says which.
- 'Humbolt Park' (misspelling the prompt itself uses as its example) and '26th and Cal' (Cook County criminal courthouse shorthand).
- Pretrial electronic monitoring: not probation, not parole.
- Children's names and a DCFS case (third parties' sensitive data).

## Expected correct behavior

- The abuse detail is NOT written in a need, comment or next step beyond what the case manager committed to ('connect with DV advocate privately'). Quoting 'he put hands on me' anywhere in the note is a fail. (The prompt has no rule for this yet: likely failure point.)
- supervision_type = None or empty with a comment (pretrial electronic monitoring); conditions = electronic monitoring; court Dec 3 at Leighton Criminal Court Building (26th and California).
- release_date = 2026-11-16 (Monday before Fri Nov 20). locality = Humboldt Park, heard_as 'Humbolt Park'.
- Kids' location: Austin (Chicago), not Austin, Texas. household: two children (6 and 3) living with her mother; whether to name them is a judgement call worth checking.
- Needs: Housing (cannot return to apartment), Medication (sertraline about 10 days, not Urgent within days), Other: DCFS case, safety.
- Agreed: DV advocate this week, psych appointment before meds run out, see her Tuesday.
