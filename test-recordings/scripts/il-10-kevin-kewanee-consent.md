# Kevin, Joliet: Kewanee re-entry center, forms, a late consent question and a busy drop-in room

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 23, 2026 · **Set agency location to:** Joliet, Illinois

Every person and phone number here is made up.

## Why this case

Kewanee Life Skills Re-Entry Center prepares men for release. Agencies ask for intake consent and release-of-information (ROI) forms at the first meeting, often in a busy drop-in room. Sometimes recording starts before consent is asked.

Sources: <https://idoc.illinois.gov/parole/conditionsofsupervision.html>, <https://prb.illinois.gov/op-and-hearing-info/mandatory-supervised-release--msr-.html>

## Voices

- Case manager: macOS `Kathy`
- Kevin: macOS `Reed`
- Other client (background): macOS `Albert`

Audio: room recording, light background noise.

## Script

**Case manager:** Okay, Kevin Novak, November twenty-third. Let's start with the address you're staying at.

**Kevin:** Wait, are you recording this?

**Case manager:** I am. Sorry, I should've asked first. Is that okay?

**Kevin:** Yeah, it's okay. Just asking.

**Other client (background):** Hey, is the bathroom code still four four one two? *[talks over the last speaker, in the background]*

**Case manager:** Okay. Where are you staying?

**Kevin:** My mom's house, on the east side of Joliet. Off Cass Street.

**Case manager:** Who sent you to us?

**Kevin:** The re-entry coordinator at Kewanee. I was at Kewanee the last eight months. Before that Pontiac.

**Case manager:** When did you get out?

**Kevin:** Fourteenth. Saturday the fourteenth.

**Case manager:** MSR?

**Kevin:** MSR, a year. Agent Patel.

**Case manager:** Date of birth?

**Kevin:** Eleven, two, ninety-five.

**Case manager:** Okay. I have two forms. This one says you agree to work with us, and this one lets me talk to your agent. Can you sign both?

**Kevin:** I'll sign the first one. The agent one, let me think about it.

**Case manager:** That's fine. Emergency contact?

**Kevin:** My mom, Linda Novak. Eight one five, five five five, zero one two... um, zero one two zero.

**Case manager:** And what do you need most?

**Kevin:** A CDL. I want to drive trucks. My license is suspended, I owe tickets from like twenty eighteen.

**Case manager:** Okay. I'll look up what you owe with the Secretary of State this week, and we'll look at the CDL program at Joliet Junior College. Come back Monday the thirtieth.

**Kevin:** Monday. Okay.

## What it probes

- Recording consent is asked late, after recording began; the client agrees.
- Consent form signed but release-of-information declined for now.
- A background stranger says a bathroom code (a number that must not become data).
- Two facilities (Kewanee last, Pontiac before); referral source is the Kewanee re-entry coordinator.
- Date of birth said month-first in the US (11/2/95 = November 2, 1995). Agency in the US, so month first.
- Emergency contact phone with a hesitation; client gives no number of his own.
- 'Twenty eighteen' is a year (2018), not an amount.

## Expected correct behavior

- consent_signed = Yes. roi_signed = No (or empty with a comment 'wants to think about it'). Marking roi_signed Yes is a fail.
- Nothing about the bathroom code (4412) anywhere in the note.
- facility = Kewanee Life Skills Re-Entry Center (comment: Pontiac before). referral_source = re-entry coordinator at Kewanee. release_date = 2026-11-14 (Saturday the 14th matches the calendar). supervision_type = Parole (MSR 1 year). supervision_officer = Patel.
- birth_date = 1995-11-02. locality = east side of Joliet (off Cass Street); household: lives with his mother.
- emergency_contact = Linda Novak (mother), 815-555-0120. contact: not said.
- Needs: Work (CDL, wants to drive trucks), ID/Transportation: suspended license from unpaid 2018 tickets.
- Agreed: look up what is owed with the Secretary of State this week; CDL program at Joliet Junior College; come back Monday Nov 30.
