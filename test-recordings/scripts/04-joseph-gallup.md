# Joseph, Gallup NM: federal supervised release, no phone, rural places

**Mode:** New intake · **Meeting:** Phone call · **Date:** November 19, 2026 · **Set agency location to:** Gallup, New Mexico

Every person and phone number here is made up.

## Why this case

People leaving federal prison (BOP) go on 'supervised release' with a US Probation Officer, not parole. Rural tribal areas often lack cell coverage and street addresses; mail goes to a chapter house or PO box, and IDs may be tribal (Certificate of Indian Blood, tribal ID).

Sources: <https://www.justice.gov/file/1115291/dl>, <https://heller.brandeis.edu/community-living-policy/clec/research/publications/pdfs/incarceration-reentry.pdf>

## Voices

- Case manager: macOS `Samantha`
- Joseph: macOS `Alex`

Audio: phone-line quality, light background noise.

## Script

**Case manager:** Hi Joseph, this is the intake call, the nineteenth. I'm going to record it so I get things right. Is that okay?

**Joseph:** That's fine.

**Case manager:** When did you get out?

**Joseph:** Last Friday. From the federal place in Arizona, Phoenix. They put me on a bus to Gallup.

**Case manager:** Are you on probation or parole?

**Joseph:** Supervised release. Three years. My probation officer is in Albuquerque. I have to call him every Monday and do the drug testing.

**Case manager:** Where are you staying?

**Joseph:** With my grandma, out past Tohatchi. There's no address really. Mail goes to the chapter house.

**Joseph:** The signal is bad out there, I'm in town now at the laundromat.

**Case manager:** What's the best way to reach you?

**Joseph:** I don't have a phone. You can leave a message with my auntie. Her number is five oh five, five five five... *[muffled]*

**Case manager:** Sorry, you cut out. Five oh five, five five five, what?

**Joseph:** I'll text it to you when I get the phone. My auntie's getting me one.

**Case manager:** Do you have ID?

**Joseph:** My tribal ID, yeah. And the CIB. No driver's license, it got suspended before I went in.

**Case manager:** Anything for your health?

**Joseph:** Not really. I go to IHS if I need to.

**Case manager:** Okay. I'll mail the release form to the chapter house, and you call me back next Monday after you check in with your PO.

**Joseph:** Okay. Monday.

## What it probes

- Federal 'supervised release' with a 'probation officer'.
- No street address, mail via chapter house; no phone of his own; number never completed.
- Rural tribal place names (Tohatchi, chapter house, IHS, CIB) that Whisper and a Chicago-tuned prompt may mangle.
- Phone-call audio quality (band-limited) plus a cut-out.
- 'Last Friday' relative to Thursday November 19 = November 13.

## Expected correct behavior

- supervision_type = Probation (federal supervised release is run by US Probation) with a comment, or empty and partly heard. 'Parole' is a fail. conditions = call PO every Monday, drug testing, 3 years.
- facility: 'federal place in Phoenix' -> FCI Phoenix only if flagged partly heard; the client never named it. release_date = 2026-11-13 (or flagged).
- contact: empty and partly heard ('505-555-' only, auntie's number). Writing any full number is a fail.
- locality = near Tohatchi (as heard, maybe flagged). Must not be changed to a Chicago neighborhood.
- ID is NOT a need (has tribal ID and CIB) but driver's license suspended may be a Transportation/ID note. Housing: no fixed address could be a need; the client did not ask for it, so 'suggested' not Urgent.
- Agreed: case manager mails release form to chapter house; Joseph calls back Monday after PO check-in. 'Text the number' is Joseph's commitment and can be an agreed step.
