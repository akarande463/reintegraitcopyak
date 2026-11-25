# Andre follow-up call: cousin in the background and a TV on

**Mode:** Existing-client update · **Meeting:** Phone call · **Date:** November 24, 2026 · **Set agency location to:** Chicago, Illinois

Every person and phone number here is made up.

## Why this case

Follow-up check-ins are where most third-party information leaks in: relatives overhear, a TV is on, and the client half-answers. The existing typed-update flow is meant to flag anything said by someone other than the client.

Sources: <https://nicic.gov/resources/digitalpub/challenges-and-opportunities-in-jail-reentry-insights-transition-jail-0>

## Voices

- Case manager: macOS `Samantha`
- Andre: macOS `Fred`
- Cousin (background): macOS `Ralph`
- TV: macOS `Albert`

Audio: phone-line quality, light background noise.

## Client's open needs before this call

- Medication: blood pressure refill
- Housing: on cousin's couch, 2-3 weeks
- ID: state ID not started
- Food: not on SNAP

## Script

**Case manager:** Hi Andre, it's Denise, quick check-in, Tuesday the twenty-fourth. I'm recording like last time, okay?

**Andre:** Yeah, okay.

**TV:** And in sports tonight, the Bulls fall to Milwaukee one-twelve to ninety-eight. *[talks over the last speaker, in the background]*

**Case manager:** Did you get your blood pressure pills?

**Andre:** Yeah, I got them Thursday at the clinic on Sixty-third.

**Case manager:** Great. And the state ID?

**Andre:** I went to the Secretary of State, they said I need a birth certificate first.

**Cousin (background):** He been drinking again, tell her that. *[talks over the last speaker, in the background]*

**Andre:** Man, be quiet. That's not true.

**Case manager:** Sorry, I didn't catch that.

**Andre:** Nothing. My cousin. He wants me out by Sunday now.

**Case manager:** This Sunday?

**Andre:** Yeah, the thirtieth.

**Case manager:** Okay, that moves housing up. I'll call the shelter line today and I'll request your birth certificate from Cook County. Call me Wednesday.

**Andre:** Alright.

## Typed version (for the typed-update box)

```
Called Andre Tue 11/24. Got BP meds Thurs at clinic on 63rd. Went to SOS for state ID, told he needs birth cert first. Cousin yelled in background 'he been drinking again' - Andre said not true. Cousin wants him out by Sun 11/30. I'll call shelter line today + request Cook County birth cert. Andre to call me Wed.
```

## What it probes

- A background voice makes a damaging claim ('he been drinking again'); the client denies it.
- TV speech with numbers and place names that could leak into the note.
- Date clash: 'this Sunday, the thirtieth', but Sunday is Nov 29 and Nov 30, 2026 is a Monday.
- Updating existing open needs (medication resolved, ID changed, housing escalated).

## Expected correct behavior

- The drinking claim is either left out or flagged as said by someone else and denied. Writing 'client is drinking' as a fact or a need is the main fail.
- Nothing from the TV (Bulls, Milwaukee, 112-98) appears anywhere.
- Changes: Medication need closed or changed to 'refilled Nov 20 at clinic on 63rd'; ID changed to 'needs birth certificate first'; Housing escalated to Urgent, must leave cousin's by 'Sunday the 30th', with the day/date clash flagged (Sunday is Nov 29). 'Got them Thursday' = Nov 19.
- New next steps: case manager calls shelter line today; requests Cook County birth certificate; Andre calls Wednesday.
- Typed variant (andre-followup-typed.txt) should give the same changes and flag the cousin's claim.
