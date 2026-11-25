# Deshawn, Atlanta: 19, fast talk, his mom contradicts him, spelled-out name

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 24, 2026 · **Set agency location to:** Atlanta, Georgia

Every person and phone number here is made up.

## Why this case

Young adults leaving custody often come with a parent who corrects them. They talk fast, use slang, and may ask staff to record things that are not true yet ('just put that I have a job').

Sources: <https://openoregon.pressbooks.pub/mentalcrimjustsys1e/chapter/oo8-7/>

## Voices

- Case manager: macOS `Samantha`
- Deshawn: macOS `Aaron`
- Mother: macOS `Shelley`

Audio: room recording, light background noise.

## Script

**Case manager:** This is intake for, can you spell your name for me?

**Deshawn:** D, E, S, H, A, W, N. Deshawn. Last name Pryor, P, R, Y, O, R.

**Case manager:** And today's the twenty-fourth. I'm going to record, cool?

**Deshawn:** Bet.

**Case manager:** How old are you?

**Deshawn:** Nineteen.

**Mother:** Eighteen. He's eighteen till February. *[talks over the last speaker]*

**Deshawn:** Ma, I'm finna be nineteen, it's the same thing.

**Case manager:** Where'd you come home from?

**Deshawn:** Rice Street. Fulton County jail. Like a week ago.

**Mother:** Last Saturday. The fifteenth. *[talks over the last speaker]*

**Case manager:** Are you on probation?

**Deshawn:** Yeah, first offender probation, two years. I got community service, eighty hours.

**Case manager:** Do you have a job?

**Deshawn:** Just put that I got a job, my PO gonna see this. I'm starting at the warehouse in like two weeks.

**Mother:** He applied. He doesn't have it yet.

**Case manager:** Phone number?

**Deshawn:** Four oh four, five five five, oh one six one.

**Mother:** That phone is off. Use the house, four oh four, five five five, oh one nine three.

**Case manager:** Okay. I'll help you with the warehouse application follow-up and find a place to do the community service hours. See you next Monday.

## What it probes

- Name spelled letter by letter. Whisper may write 'D E S H A W N' or 'the shawn'.
- Age contradiction between client (19) and mother (18 till February).
- Release date: client says 'like a week ago', mother says 'last Saturday, the fifteenth'. Last Saturday was Nov 21 and Nov 15, 2026 was a Sunday: the mother's date is inconsistent either way.
- Pressure to record something untrue ('just put that I got a job').
- Two phone numbers; the mother says the client's is off.
- Slang (bet, finna) and Georgia terms (Rice Street, first offender probation).

## Expected correct behavior

- name = Deshawn Pryor.
- age: flagged 'partly heard' with a comment that client said 19 and mother said 18 until February. Choosing either without a comment is a fail.
- release_date: empty or flagged; heard_as should note 'last Saturday, the fifteenth' (last Saturday was Nov 21; the 15th was a Sunday). Writing 2026-11-15 without a flag is a fail.
- facility = Fulton County Jail (Rice Street). supervision_type = Probation. conditions = 80 hours community service, 2 years first offender probation.
- Employment must NOT be written as 'has a job'. Work need: warehouse application pending.
- contact = 404-555-0193 (house phone, via mother) with a comment, or both numbers with the client's marked off. Picking 0161 with no comment is a fail.
- Agreed: follow up on warehouse application, find community service site, next Monday.
