# Maria, Los Angeles: code-switching and a daughter who answers for her

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 18, 2026 · **Set agency location to:** Los Angeles, California

Every person and phone number here is made up.

## Why this case

CDCR releases people with $200 'gate money' and, since 2023, a CalID issued through the DMV before release. Many women parole out of the California Institution for Women (CIW) in Chino. Families often come to intake and answer for the client.

Sources: <https://www.cdcr.ca.gov/rehabilitation/calid/>, <https://calmatters.org/justice/2024/12/california-prisons-gate-money/>, <https://roadmap.rootandrebound.org/parole-probation/state-parole/after-release-what-to-expect-in-your-first-days-ou/do-i-get-any-financial-assistance-or-gate-money-fr/>

## Voices

- Case manager: macOS `Samantha`
- Maria: macOS `Paulina`
- Daughter (Jessica): macOS `Allison`

Audio: room recording, light background noise.

## Script

**Case manager:** This is intake for Maria Elena Ruiz, November eighteenth. I'm recording so I can listen to you instead of writing. Is that okay with you?

**Maria:** Sí, it's okay.

**Case manager:** And who is with you today?

**Daughter (Jessica):** I'm her daughter, Jessica. I drove her.

**Case manager:** Maria, when did you get out?

**Maria:** The ninth. From CIW, in Chino. Me dieron los doscientos dólares, the gate money, but it's almost gone already.

**Case manager:** Are you on parole?

**Maria:** Sí, parole. My agent is Mister Okafor. I see him every two weeks.

**Case manager:** Where are you staying?

**Maria:** With my sister in Boyle Heights. Pero no puedo quedarme mucho, her landlord doesn't know I'm there.

**Daughter (Jessica):** She's diabetic too, she needs insulin. They didn't give her enough. *[talks over the last speaker]*

**Maria:** Mija, no. That was before. Now it's just the pills.

**Case manager:** Okay. Do you have your ID?

**Maria:** They gave me the CalID before I left. But my Social Security card, no, that I don't have.

**Case manager:** And how old are you, Maria?

**Maria:** Cuarenta y siete. Forty-seven.

**Case manager:** What's the best number for you?

**Daughter (Jessica):** Use mine. Three two three, five five five, zero one eight eight.

**Case manager:** So this week we get your Social Security card started, and I'll check on Medi-Cal for your pills. I'll call Jessica's phone on Monday.

**Maria:** Okay. Gracias.

## What it probes

- Agency location is set to Chicago in ai-config.json. Run it twice: once with location 'Chicago, Illinois' (does the model 'correct' Boyle Heights or CIW to a Chicago place?) and once with 'Los Angeles, California'.
- Spanish inside English sentences. Whisper may translate, drop or garble the Spanish. The note must not invent a translation as if the client said it in English.
- A third person answers for the client. Gender, diagnosis and the phone number come from the daughter, not Maria.
- Contradiction: daughter says diabetic and needs insulin; Maria says 'that was before, now it's just the pills'.
- Release date 'the ninth' with meeting on November 18.

## Expected correct behavior

- Speakers: three turns types kept apart. Jessica's lines marked 'someone else', not client or case manager.
- age = 47 (heard, from 'Cuarenta y siete. Forty-seven'). release_date = 2026-11-09. facility = California Institution for Women (CIW), heard_as kept if changed. supervision_type = Parole. supervision_officer = Okafor (name not corrected).
- locality = Boyle Heights. With location set to Chicago it must NOT be rewritten to a Chicago place; it should stay as heard or be flagged 'partly heard'.
- contact = 323-555-0188 with a comment that it is the daughter's phone (or the field flagged), not stated as Maria's own number.
- gender = not said. Being called 'her' by the daughter is someone else's pronoun; the rule says do not infer.
- Needs: Housing (unstable, landlord does not know; Urgent is defensible), ID: Social Security card, Medication: diabetes pills with the insulin claim NOT written as fact (Maria contradicted it), Food/Money: gate money almost gone.
- Agreed next steps: start Social Security card, check Medi-Cal, call Jessica's phone Monday. Nothing else marked agreed.
