# Liam, Manchester UK: licence, approved premises and British dates

**Mode:** New intake · **Meeting:** In-person visit · **Date:** 25 November 2026 · **Set agency location to:** Manchester, England

Every person and phone number here is made up.

## Why this case

In England people leave prison 'on licence' supervised by the Probation Service, may be placed in Approved Premises (probation hostels), get a discharge grant (raised to about £100), and claim Universal Credit with an advance payment. Dates are said day-first.

Sources: <https://www.gov.uk/government/publications/universal-credit-and-prison-leavers/supporting-prison-leavers-a-guide-to-universal-credit>, <https://prisonreformtrust.org.uk/adviceguide/getting-help-with-resettlement-in-prison/>, <https://england.shelter.org.uk/housing_advice/homelessness/help_if_youre_homeless_ex_prisoners>

## Voices

- Case manager: macOS `Kate`
- Liam: macOS `Daniel`

Audio: room recording, light background noise.

## Script

**Case manager:** Right, this is Liam Doyle's first appointment, twenty-fifth of November. I'll record it if that's alright with you.

**Liam:** Yeah, no bother.

**Case manager:** When were you released?

**Liam:** Oh-four, eleven. The fourth. Out of Forest Bank.

**Case manager:** And you're on licence?

**Liam:** On licence till next August, yeah. I'm in the AP on Bury New Road for now, curfew eleven till seven, signing in every night.

**Case manager:** Who's your probation officer?

**Liam:** Sian. Sian Pritchard. She's sound.

**Case manager:** Have you got Universal Credit sorted?

**Liam:** I've put the claim in, got the advance, but the first proper payment's not till the twelfth of December. Discharge grant's long gone.

**Case manager:** Any ID on you?

**Liam:** Just the discharge papers and me old provisional. It's expired, mind.

**Case manager:** Date of birth?

**Liam:** Twelve, three, ninety-one.

**Case manager:** And a number for you?

**Liam:** Oh-seven-seven-hundred, nine hundred, two-one-six.

**Case manager:** Lovely. So I'll ring the council housing options team about move-on from the AP, and you'll bring your bank details Thursday so we can sort a food bank voucher in the meantime.

**Liam:** Sound, cheers.

## What it probes

- Day-first dates: '04/11' is 4 November, '12/3/91' is 12 March 1991, not December 3.
- 'On licence' is not Probation or Parole in the US sense.
- UK words: AP (Approved Premises), discharge grant, Universal Credit, provisional (driving licence), council, food bank voucher.
- UK phone number format.
- Agency location set to Chicago: Bury New Road and Forest Bank must not be 'corrected' to Chicago places.

## Expected correct behavior

- release_date = 2026-11-04. birth_date = 1991-03-12 (a fail if 1991-12-03). age: not said (could be computed but was not stated; computing it is a minor fail).
- supervision_type: empty or Parole with a comment 'on licence (UK)'. Inventing 'Probation' with no comment is a fail. conditions = Approved Premises, curfew 11 pm to 7 am, sign in nightly; licence ends next August.
- supervision_officer = Sian Pritchard. facility = HMP Forest Bank. locality: Approved Premises on Bury New Road (Manchester).
- contact = 07700 900216.
- Needs: Housing (move-on from AP), Food/Money (UC gap until 12 Dec, Urgent is defensible), ID (provisional licence expired).
- Agreed: case manager rings council housing options; Liam brings bank details Thursday; food bank voucher.
