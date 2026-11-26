# Matched services tab (home screen)

The network view of services. Step 2's **Matched services** tab in a case file answers "which services fit this client?". This tab answers the questions behind it, across every client:

- **Which services exist block by block?** All 77 Chicago community areas, with their needs from public data and the services in and near each one.
- **Where are the gaps?** Needs with no listing in the area and none within 1.5 miles.
- **What happened to each referral?** Every referral moves through Sent, Accepted, Showed up and an outcome, or ends as Declined, No response or No-show.
- **Which services actually work, and for people from where?** Acceptance, show-up and goal-met rates per provider, filtered by need and by the neighborhood the client lives in.

User research showed that case managers rely on the partners they already know and that no one tracks referrals after they are sent. Public directories list services but never record whether a referral worked. Each status update in this tab adds that missing data. That pooled history is the moat.

## Open it

```
cd app/step1-client-note
python3 -m http.server 8000
```

Open http://localhost:8000 and click **Matched services** on the home screen or in the top bar.

## The three views

| View | What you see | What you can do |
|---|---|---|
| **Neighborhoods** | A map of the 77 community areas, shaded by hardship index, arrests per 1,000 residents, households under $25k, unemployment or your clients. Red dots mark where your clients live. For the chosen area: indicators against the city median, likely needs, your clients there, a coverage table per need (in the area, within 1.5 mi, nearest, referrals from here) with **Gap** and **Thin** flags, and the services that worked for people from the area | Click an area or pick it from the list. **List** on a need opens the Directory filtered to that need near the area |
| **Directory** | 918 services, each tagged **Your partner** or **New to you**, with distance, phone, hours, referral history, and the data source with its update date. Data over 3 years old is flagged "Call to check" | Search, filter by need, area (within 3 miles, nearest first), source, or "only with referral history". **Refer a client** (Send stays disabled until consent is ticked). **Add to my partners**. **Add a service you use** for services missing from public data, such as legal clinics or pantries |
| **Referral pipeline** | Your referrals grouped by stage, with days waiting and a "follow up" flag after 3 days. A funnel (Sent, Answered, Accepted, Showed up, Goal met) and a by-provider table | **Update** a referral: Accepted (with appointment), Declined (with reason), No response, Showed up, No-show, or Closed with an outcome (Goal met, Partly met, Not met) and a note. Filter outcomes by need, by where the client lives, and by yours, the network's, or both |

Referrals made in a client's Step 2 tab show up in the pipeline too. Andre's Housing matches link to "every housing service near Englewood" in the Directory.

## Records

Everything saves to the same record store as Step 1 and Step 2 (this browser only).

- **Referral** gains `ProviderId`, `Category`, `Stage` (Sent, Accepted, Declined, No response, Attended, No-show, Closed), `Outcome`, `DeclineReason`, `Appointment`, `AttendedDate`, `ClosedDate`, `Origin` and `History` (one entry per status change with date and note). `Status` stays in step with Step 2 (Sent, Accepted, Declined).
- **Interaction**: "Referral sent" and "Referral update" entries appear in the client's case file.
- **Provider** (new record type): services added by hand (`Kind: "added"`) and partner marks on directory services (`Kind: "partner"`).
- The client's status changes to "Referral pending" on a new referral and back to "Active" when nothing is open.
- The activity log records areas opened, services browsed, consent, referrals, status changes, partners and services added.

## Real and simulated data

| Real (public) | Simulated |
|---|---|
| Community area outlines, population and income (ACS 2019-2023), poverty, unemployment, education and hardship index (2008-2012), arrests by area (Nov 2025 to Nov 2026) | The partner list (Cara Collective, Safer Foundation, plus the re-entry centers and 211) |
| 119 community health centers, 204 mental health services, 24 city clinics, 6 DFSS community service centers, 5 workforce centers, 82 library branches, 471 affordable rental buildings (senior-only and artist housing left out) | 900 referrals from May to November 2026 that stand in for pooled outcomes from partner organizations. Each provider gets a fixed made-up reliability, and old datasets get lower acceptance |
| 2 Community Re-Entry Support Centers, the Secretary of State ID facility, 211 and Illinois ABE, checked by hand from the city's reentry guide | |

**Where this data comes from**, at the bottom of the tab, lists every source with a link and its update date. Several portal datasets are old (workforce centers 2011, health centers 2014), which is why cards show the date and flag anything over 3 years old. No public dataset covers legal aid, food pantries, transportation or referral outcomes.

Data is built by `tools/network-data/build.py` (see its README).

## Acceptance test

```
python3 -m http.server 8000        # in this folder
node acceptance-test-network.js    # in another terminal
```

27 of 27 checks pass. The Step 1, Step 2, safeguards and documents tests still pass.
