"""Build app/step1-client-note/data/chicago-services.json for the Matched services tab.

Inputs (in raw/, pulled from the City of Chicago Data Portal on 2026-11-25, see README.md):
  areas_ind.json      77 community areas with need indicators (ACS 2023, 2008-2012 hardship census, arrests)
  areas_shape.json    simplified community area outlines [area number, [rings]]
  providers_raw.json  service locations from seven portal datasets, already tagged with their community area

The script adds a few hand-checked listings (Re-Entry Support Centers, 211, Secretary of State, ABE),
the organization's own partner list (simulated), and a simulated referral history so the
pipeline and outcome numbers have something to show. The history uses a fixed seed, so the
output is the same every run.

Run:  python3 tools/network-data/build.py
"""
import json, math, random, hashlib, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "..", "app", "step1-client-note", "data", "chicago-services.json")

ind = json.load(open(os.path.join(RAW, "areas_ind.json")))
shapes = dict((n, s) for n, s in json.load(open(os.path.join(RAW, "areas_shape.json"))))
raw = json.load(open(os.path.join(RAW, "providers_raw.json")))

PORTAL = "https://data.cityofchicago.org/d/"
SOURCES = {}
for sid, m in raw["meta"].items():
    SOURCES[sid] = {"name": m["name"], "url": PORTAL + sid, "updated": m["updated"], "kind": "public"}
SOURCES["t68z-cikk"]["use"] = "Population and household income by community area (ACS 2019-2023)"
SOURCES["kn9c-c2s2"]["use"] = "Poverty, unemployment, no high school diploma and hardship index (2008-2012)"
SOURCES["ijzp-q8t2"]["use"] = "Arrests in each community area, Nov 17 2025 to Nov 17 2026"
SOURCES["igwz-8jzy"]["use"] = "Community area outlines for the map"
SOURCES["city-reentry"] = {"name": "City of Chicago reentry resource guide", "updated": "2026-10-17", "kind": "public",
                           "url": "https://www.chicago.gov/content/dam/city/sites/reentry/pdfs/CityServiceGuide_Reentry%20Resources-English.pdf",
                           "use": "Re-Entry Support Centers, 211 and state ID and benefits offices, checked by hand on Oct 17 2026"}
SOURCES["partner"] = {"name": "Your organization's partner list", "updated": "2026-11-01", "kind": "simulated",
                      "use": "Partners Denise's team already refers to. Simulated for the prototype"}
SOURCES["network-sim"] = {"name": "Referral outcomes from the ReintegrAIt network", "updated": "2026-11-10", "kind": "simulated",
                          "use": "Pooled referral outcomes from partner organizations. Simulated for the prototype"}

CATEGORIES = ["Reentry hub", "Housing", "Employment", "Health", "Mental health", "Food", "Benefits",
              "ID & documents", "Digital access", "Legal", "Transportation", "Family"]

# ---- areas ----
def centroid(rings):
    ring = max(rings, key=len)
    xs = [p[0] for p in ring[:-1]]; ys = [p[1] for p in ring[:-1]]
    return [round(sum(xs) / len(xs), 4), round(sum(ys) / len(ys), 4)]

areas = []
for a in ind:
    name = a["name"].replace("Mckinley", "McKinley").replace("Ohare", "O'Hare")
    rings = shapes[a["n"]]
    areas.append({**a, "name": name, "center": centroid(rings), "shape": rings})

# ---- providers ----
keys = raw["keys"]
providers = []
for row in raw["rows"]:
    p = dict(zip(keys, row))
    if not p["area"]:
        continue  # outside the city limits
    p["name"] = " ".join(p["name"].split())
    p["cat"] = p["cat"]
    providers.append(p)

def pip(x, y, ring):
    ins = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins

def area_of(lon, lat):
    for a in areas:
        if any(pip(lon, lat, r) for r in a["shape"]):
            return a["n"]
    return None

curated = [
    {"id": "crsc-teamwork", "name": "Teamwork Englewood Community Re-Entry Support Center", "cat": ["Reentry hub", "Housing", "Employment", "ID & documents"],
     "addr": "815 W. 63rd St., 2nd floor", "zip": "60621", "phone": "(773) 488-6600", "hours": "Mon-Fri 9:00-5:00", "lat": 41.7797, "lon": -87.6455,
     "src": "city-reentry", "note": "City-funded reentry center. Open to any Chicago resident with a prior conviction. Case management, housing navigation, job readiness, ID help"},
    {"id": "crsc-cnh", "name": "Centers for New Horizons Community Re-Entry Support Center", "cat": ["Reentry hub", "Employment", "Benefits"],
     "addr": "949 W. 69th St. (the city web page says 945)", "zip": "60621", "phone": "(773) 373-5700", "hours": "Mon-Fri 9:00-5:00", "lat": 41.7687, "lon": -87.6488,
     "src": "city-reentry", "note": "City-funded reentry center. Open to any Chicago resident with a prior conviction"},
    {"id": "sos-king", "name": "Illinois Secretary of State facility (state ID)", "cat": ["ID & documents"],
     "addr": "9901 S. King Dr.", "zip": "60628", "phone": "(800) 252-8980", "hours": "Mon-Fri 8:00-5:00", "lat": 41.7135, "lon": -87.6146,
     "src": "city-reentry", "note": "State ID cards. People released from IDOC can bring release papers"},
    {"id": "city-211", "name": "211 Metro Chicago", "cat": ["Housing", "Food", "Benefits", "Health", "Mental health"],
     "addr": "Call 2-1-1 or text your ZIP to 898-211", "zip": "", "phone": "2-1-1", "hours": "24 hours", "lat": None, "lon": None,
     "src": "city-reentry", "note": "Citywide helpline and directory run with Cook County. Use when nothing nearby fits", "citywide": True},
    {"id": "il-abe", "name": "Illinois ABE (SNAP and Medicaid applications)", "cat": ["Benefits", "Food"],
     "addr": "abe.illinois.gov (online)", "zip": "", "phone": "(800) 843-6154", "hours": "Online, any time", "lat": None, "lon": None,
     "src": "city-reentry", "note": "Apply for SNAP, Medicaid and cash help online", "citywide": True},
    {"id": "partner-cara", "name": "Cara Collective", "cat": ["Employment"], "addr": "Address not entered yet", "zip": "", "phone": "",
     "hours": "", "lat": None, "lon": None, "src": "partner", "note": "Job readiness. On your partner list", "citywide": True},
    {"id": "partner-safer", "name": "Safer Foundation", "cat": ["Employment"], "addr": "Address not entered yet", "zip": "", "phone": "",
     "hours": "", "lat": None, "lon": None, "src": "partner", "note": "Job training for people with records. On your partner list", "citywide": True},
]
for c in curated:
    c["area"] = area_of(c["lon"], c["lat"]) if c["lat"] else None
providers = curated + providers

PARTNERS = ["crsc-teamwork", "crsc-cnh", "city-211", "partner-cara", "partner-safer"]

# ---- simulated network history ----
rng = random.Random(20261125)
def mi(a, b):
    R = 3958.8
    la1, lo1, la2, lo2 = map(math.radians, [a[1], a[0], b[1], b[0]])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

def quality(pid):
    """A fixed, made-up reliability per provider so some are reliably good and some are not."""
    h = int(hashlib.md5(pid.encode()).hexdigest()[:6], 16) / 0xFFFFFF
    return 0.35 + 0.6 * h

stale = {"cs4s-nsna": 0.35, "bspy-6mw8": 0.75, "cjg8-dbka": 0.8, "kcki-hnch": 0.85}
cat_weights = {"Housing": 26, "Employment": 22, "Health": 12, "Mental health": 10, "Food": 8, "Benefits": 9,
               "ID & documents": 8, "Reentry hub": 10, "Digital access": 4}
areas_by_n = {a["n"]: a for a in areas}
area_w = [(a["n"], a["arrests"] * (a["hard"] or 1) ** 1.5) for a in areas]
tot = sum(w for _, w in area_w)

def pick_area():
    r = rng.random() * tot
    for n, w in area_w:
        r -= w
        if r <= 0:
            return n
    return area_w[-1][0]

def pick_cat():
    cats = list(cat_weights); w = [cat_weights[c] for c in cats]
    return rng.choices(cats, w)[0]

located = [p for p in providers if p["lat"]]
REASONS = ["Full", "Not eligible", "Program closed", "Other"]
start = datetime.date(2026, 5, 4); end = datetime.date(2026, 11, 10)
history = []
for i in range(900):
    n = pick_area(); cat = pick_cat(); ctr = areas_by_n[n]["center"]
    cands = [p for p in located if cat in p["cat"] and not (p["src"] == "s6ha-ppgi" and "Supportive" not in p["note"] and "SRO" not in p["note"] and rng.random() < 0.7)]
    cands.sort(key=lambda p: mi(ctr, [p["lon"], p["lat"]]))
    pool = cands[:5] + [p for p in providers if p.get("citywide") and cat in p["cat"]]
    if not pool:
        continue
    weights = [5, 4, 3, 2, 1, 2, 2, 2][:len(pool)]
    p = rng.choices(pool, weights)[0]
    q = quality(p["id"]) * stale.get(p["src"], 1.0)
    if p["id"].startswith("crsc"):
        q = max(q, 0.82)
    d = start + datetime.timedelta(days=rng.randrange((end - start).days))
    rec = {"d": d.isoformat(), "a": n, "c": cat, "p": p["id"]}
    age = (end - d).days
    r = rng.random()
    if age < 4 and r < 0.6:
        rec["s"] = "Sent"
    elif r > q + 0.12:
        rec["s"] = "No response" if rng.random() < 0.45 else "Declined"
        if rec["s"] == "Declined":
            rec["why"] = rng.choices(REASONS, [5, 3, 1 if p["src"] not in stale else 4, 1])[0]
        rec["days"] = rng.choice([3, 5, 7, 10, 14]) if rec["s"] == "No response" else rng.randint(1, 6)
    else:
        rec["days"] = max(1, int(rng.expovariate(1 / (1.2 + (1 - q) * 5))) + 1)
        if age < 9 and rng.random() < 0.5:
            rec["s"] = "Accepted"
        elif rng.random() < 0.55 + q * 0.4:
            rec["s"] = "Attended"
            if age > 30:
                o = rng.random()
                rec["s"] = "Closed"
                rec["o"] = "Goal met" if o < 0.35 + q * 0.4 else "Partly met" if o < 0.85 else "Not met"
        else:
            rec["s"] = "No-show"
    history.append(rec)

history.sort(key=lambda r: r["d"])
out = {
    "generated": "2026-11-25",
    "about": "Built by tools/network-data/build.py. Provider locations and neighborhood indicators are real public data; partner list and referral history are simulated.",
    "sources": SOURCES,
    "categories": CATEGORIES,
    "public_categories": ["Reentry hub", "Housing", "Employment", "Health", "Mental health", "Food", "Benefits", "ID & documents", "Digital access"],
    "partners": PARTNERS,
    "areas": areas,
    "providers": providers,
    "history": history,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump(out, f, separators=(",", ":"))
print(len(areas), "areas,", len(providers), "providers,", len(history), "simulated referrals ->", os.path.relpath(OUT))
from collections import Counter
print(Counter(r["s"] for r in history))
print(Counter(c for p in providers for c in p["cat"]))
