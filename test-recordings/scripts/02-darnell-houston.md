# Darnell, Houston: vague dates, ankle monitor, and two answers for the same thing

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 20, 2026 · **Set agency location to:** Houston, Texas

Every person and phone number here is made up.

## Why this case

Texas TDCJ releases most men from the Huntsville Unit ('the Walls') with a bus voucher and $50, the rest on arrival at parole. Parole and 'mandatory supervision' are different release types but both report to a parole officer; electronic monitoring and curfews are common conditions.

Sources: <https://www.themarshallproject.org/2019/09/10/what-gate-money-can-and-cannot-buy>, <https://www.ncsl.org/research/civil-and-criminal-justice/providing-identification-for-those-released-from-incarceration.aspx>

## Voices

- Case manager: macOS `Samantha`
- Darnell: macOS `Fred`

Audio: room recording, light background noise.

## Script

**Case manager:** Intake for Darnell Hayes, today is the twentieth. Okay if I record?

**Darnell:** Go ahead.

**Case manager:** When did you come home?

**Darnell:** Uh, it was the Tuesday before last. Maybe the tenth? No, it was a Wednesday, 'cause my mama had church that night.

**Case manager:** From which unit?

**Darnell:** They released me out the Walls, in Huntsville. I was at Ferguson most of the time though.

**Case manager:** And you're on parole?

**Darnell:** Yeah, parole. Well, my PO says it's mandatory supervision, whatever, same thing to me. I got this monitor on my ankle, curfew at eight.

**Case manager:** How old are you, Darnell?

**Darnell:** Twenty-nine.

**Case manager:** Where are you living?

**Darnell:** Third Ward, with my mama. On Dowling. Well, they call it Emancipation now.

**Case manager:** Any health stuff I should know about?

**Darnell:** I'm supposed to take something for my seizures. Keppra. I got a week left, maybe less.

**Case manager:** Work?

**Darnell:** I did welding in there. I'm thirty, I need to get going with my life, you know?

**Case manager:** Wait, I thought you said twenty-nine.

**Darnell:** I'm twenty-nine. Turn thirty in January. I just round up.

**Case manager:** Got it. Phone?

**Darnell:** Seven one three, five five five, zero one two... seven. No, two four. Zero one two four.

**Case manager:** So I'll get you to the clinic for the Keppra this week, and we'll look at welding jobs that work around an eight o'clock curfew. Can you come back Thursday?

**Darnell:** Thursday's cool.

## What it probes

- Vague, self-corrected release date ('Tuesday before last, maybe the tenth? No, a Wednesday'). Nov 10, 2026 is a Tuesday; the Wednesday before last is Nov 11.
- Parole vs mandatory supervision. The list only has Probation / Parole / None.
- Age said as 29, then 30, then corrected back to 29.
- Phone number self-corrected mid-number.
- Place name with an old and a new street name (Dowling / Emancipation Avenue), and Houston places with a Chicago agency location.
- Medication name that Whisper may mishear (Keppra -> 'Kepra', 'kept for').

## Expected correct behavior

- release_date: empty or 2026-11-11, marked 'partly heard', with what was said in heard_as. Must not confidently write 2026-11-10.
- supervision_type = Parole, with a comment that he called it both parole and mandatory supervision. conditions = ankle monitor, curfew 8 pm.
- age = 29. If the model mentions 30 it belongs in a comment, not the value.
- contact = 713-555-0124 (the corrected number), flagged 'partly heard' with a comment about the correction. 713-555-0127 is a fail.
- facility: Huntsville Unit is the release unit; Ferguson Unit is where he served. Either is acceptable if the comment says which; merging them into one invented name is a fail.
- Needs: Medication (seizure meds, about a week left, Urgent), Work (welding, curfew limits hours). Housing is NOT a need (living with mother) unless stated.
- Agreed: clinic for Keppra this week, job search around curfew, come back Thursday.
