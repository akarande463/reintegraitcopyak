# Marcus, Chatham: Stateville, MSR, an IDOC number spelled out, and a state ID with the wrong address

**Mode:** New intake · **Meeting:** In-person visit · **Date:** November 16, 2026 · **Set agency location to:** Chicago, Illinois

Every person and phone number here is made up.

## Why this case

Most people leaving Illinois prisons go on Mandatory Supervised Release (MSR), set by the Prisoner Review Board and supervised by an IDOC parole agent. They must live at an approved 'host site'. Since 2024 IDOC and the Secretary of State issue a state ID on release, but it carries the address on file, which is often wrong.

Sources: <https://prb.illinois.gov/op-and-hearing-info/mandatory-supervised-release--msr-.html>, <https://idoc.illinois.gov/parole/conditionsofsupervision.html>, <https://capitolnewsillinois.com/news/new-illinois-law-aims-to-give-free-id-cards-to-citizens-leaving-correctional-facilities>

## Voices

- Case manager: macOS `Samantha`
- Marcus: macOS `Fred`

Audio: room recording, light background noise.

## Script

**Case manager:** Intake for Marcus Bell, Monday November sixteenth. I'd like to record this so I can listen instead of write. Is that okay?

**Marcus:** That's cool.

**Case manager:** Can I get your IDOC number?

**Marcus:** Y as in yellow, four two zero one seven. Y four two zero one seven.

**Case manager:** And your date of birth?

**Marcus:** June ninth, eighty-four.

**Case manager:** When did you get out?

**Marcus:** The sixth. Out of Stateville. I did eleven years, the last two at Sheridan though, they moved me for the drug program.

**Case manager:** Okay. You're on MSR?

**Marcus:** Yeah, MSR, one year. My agent is Agent Dominguez. He came by the house already Thursday.

**Case manager:** And the host site is where?

**Marcus:** My sister's, in Chatham. Eighty-third and Cottage. She approved it, it's her lease.

**Case manager:** Do you have your ID?

**Marcus:** They gave me the state ID when I walked out, but it got my old address on it, from before. In Englewood.

**Case manager:** Are you on LINK?

**Marcus:** Not yet. I don't know how to do the online thing.

**Case manager:** Who should we call in an emergency?

**Marcus:** My sister, Denise Bell. Seven seven three, five five five, zero one four six.

**Case manager:** And your number?

**Marcus:** Same as hers for now. I ain't got a phone yet.

**Case manager:** Okay. Today I'll do the LINK application with you on the computer here. Wednesday we go to the Secretary of State on King Drive to fix the address on your ID. And I'll get you a phone through the Lifeline program.

**Marcus:** Bet. Wednesday.

## What it probes

- IDOC number spelled with a phonetic letter ('Y as in yellow') and repeated.
- MSR is Illinois' word for parole-style supervision; the agent is a 'parole agent'.
- Two facilities: released from Stateville, but the last two years were at Sheridan.
- The emergency contact's phone is also the client's phone.
- Illinois terms: LINK (SNAP), host site, Secretary of State facility, Lifeline phone.
- Englewood appears as an old address, not where he lives now.

## Expected correct behavior

- client_number = Y42017. birth_date = 1984-06-09. release_date = 2026-11-06. supervision_type = Parole (MSR, one year), with the comment naming MSR. supervision_officer = Dominguez.
- facility = Stateville Correctional Center, with a comment that he spent the last two years at Sheridan Correctional Center. Writing Sheridan as the release facility is a fail.
- locality = Chatham (83rd and Cottage Grove). Englewood must NOT be the locality.
- household: lives with his sister (her lease, approved host site). emergency_contact = Denise Bell, 773-555-0146. contact = 773-555-0146 with a comment that it is his sister's phone.
- Needs: Food (LINK not started), ID (state ID shows old address), Other or Transportation: no phone.
- Agreed: LINK application today; Secretary of State on King Drive Wednesday to fix the ID address; Lifeline phone.
