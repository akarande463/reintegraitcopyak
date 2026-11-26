# Chicago service data for the Matched services tab

`build.py` turns the files in `raw/` into `app/step1-client-note/data/chicago-services.json`.

```
python3 tools/network-data/build.py
```

## What's in raw/

Pulled from the City of Chicago Data Portal (Socrata API, no key needed) on 2026-11-25.

| File | Datasets |
|---|---|
| `areas_ind.json` | [ACS 5 Year Data by Community Area](https://data.cityofchicago.org/d/t68z-cikk) (acs_year 2023): population, households under $25k. [Selected socioeconomic indicators 2008-2012](https://data.cityofchicago.org/d/kn9c-c2s2): poverty, unemployment, no diploma, hardship index. [Crimes 2001 to present](https://data.cityofchicago.org/d/ijzp-q8t2): `count(*)` where `arrest=true AND date>'2025-11-17'`, grouped by community_area |
| `areas_shape.json` | [Boundaries - Community Areas](https://data.cityofchicago.org/d/igwz-8jzy), simplified (Douglas-Peucker, tolerance 0.0012°, 4 decimals) |
| `providers_raw.json` | [Primary care community health centers](https://data.cityofchicago.org/d/cjg8-dbka), [CDPH mental health resources](https://data.cityofchicago.org/d/wust-ytyg), [CDPH clinic locations](https://data.cityofchicago.org/d/kcki-hnch), [DFSS community service centers](https://data.cityofchicago.org/d/bspy-6mw8), [Workforce centers](https://data.cityofchicago.org/d/cs4s-nsna), [Library locations](https://data.cityofchicago.org/d/x8fc-8rcq), [Affordable rental housing developments](https://data.cityofchicago.org/d/s6ha-ppgi) (senior, artist, youth and kinship housing left out). Each row is tagged with the community area it falls in (point in polygon), and `meta` has each dataset's name and last update date |

To refresh, query the same endpoints, for example `https://data.cityofchicago.org/resource/s6ha-ppgi.json?$limit=1000`, and rebuild the three files in the same shape. The cloud environment that built this could not reach the portal directly, so the data was pulled through a browser.

## What build.py adds

- Hand-checked listings from the city's reentry guide: Teamwork Englewood and Centers for New Horizons re-entry centers, the Secretary of State ID facility at 9901 S. King Dr., 211 Metro Chicago and Illinois ABE.
- The organization's partner list (simulated): Cara Collective and Safer Foundation, which the sample clients were referred to.
- A simulated referral history of 900 referrals with a fixed seed, weighted toward areas with more arrests and hardship. Each provider gets a fixed made-up reliability from a hash of its id.
