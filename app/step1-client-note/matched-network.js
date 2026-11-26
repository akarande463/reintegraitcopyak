/* ReintegrAIt: Matched services tab (home screen).
   The network view of services, across all clients:
   - Neighborhoods: Chicago's 77 community areas, their needs from public data, which services are there and where the gaps are.
   - Directory: every provider, real public listings first, tagged as your partner or new to you. Refer any client from a card.
   - Referral pipeline: every referral from Sent to Outcome, plus each provider's acceptance and show-up rates.
   Loaded after index.html's main script and matched-services.js, and uses their helpers
   (Store, state, app, go, render, logEvent, toast, esc, fmt, parseDate, iso, TODAY, TODAY_ISO, clients, mockbar).
   Data: data/chicago-services.json (built by tools/network-data/build.py). Provider locations and neighborhood
   numbers are real public data. The partner list and the network referral history are simulated. */

const NET = {
  data: null, failed: false,
  tab: "areas", area: 68, metric: "hard",
  q: "", cat: "", near: "", src: "all", hist: false, limit: 25,
  refer: null, referDraft: {}, adding: false, sent: null,
  editing: null, scope: "both", pcat: "", parea: "",
};
const NET_STAGES = ["Sent", "Accepted", "Attended", "Closed"];
const NET_PLACED = ["Accepted", "Attended", "No-show", "Closed"];
const NET_SHOWED = ["Attended", "Closed"];
const NET_DECLINE = ["Full", "Not eligible", "Program closed", "Other"];
const NET_OUTCOMES = ["Goal met", "Partly met", "Not met"];
const NET_ALIAS = { "little village": 30, "pilsen": 31, "back of the yards": 61, "bronzeville": 38, "chinatown": 34, "wicker park": 24, "bucktown": 22, "garfield park": 26, "k-town": 29, "south loop": 33, "streeterville": 8, "river north": 8, "gold coast": 8, "ukrainian village": 24, "andersonville": 77, "lakeview": 6, "old town": 7, "ohare": 76, "o'hare": 76, "englewood": 68, "west englewood": 67 };
const NET_METRICS = {
  hard: { label: "Hardship index", unit: "", desc: "1 to 100, higher means more hardship (2008-2012)", get: a => a.hard },
  arrests: { label: "Arrests per 1,000 residents", unit: "", desc: "Last 12 months, Chicago Police data", get: a => a.pop ? Math.round(a.arrests / a.pop * 10000) / 10 : 0 },
  lowInc: { label: "Households under $25k", unit: "%", desc: "Share of households, ACS 2019-2023", get: a => a.lowInc },
  unemp: { label: "Unemployment", unit: "%", desc: "Age 16 and over (2008-2012)", get: a => a.unemp },
  clients: { label: "Your clients", unit: "", desc: "Clients on your caseload who live here", get: a => netClientsIn(a.n).length },
};
const NET_STALE_YEARS = 3;

/* ---------- Data ---------- */
function netLoad() {
  if (NET.data || NET.loading) return;
  NET.loading = true;
  fetch("data/chicago-services.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => {
      j.areaBy = {}; j.areas.forEach(a => j.areaBy[a.n] = a);
      j.provBy = {}; j.providers.forEach(p => j.provBy[p.id] = p);
      NET.data = j; NET.loading = false; if (state.view === "network") renderNetwork();
    })
    .catch(() => { NET.failed = true; NET.loading = false; if (state.view === "network") renderNetwork(); });
}
const netArea = n => NET.data.areaBy[n];
function netAreaOf(locality) {
  const s = String(locality || "").trim().toLowerCase();
  if (!s) return null;
  if (NET_ALIAS[s]) return NET_ALIAS[s];
  const a = NET.data.areas.find(x => x.name.toLowerCase() === s);
  return a ? a.n : null;
}
const netClientsIn = n => clients().filter(c => netAreaOf(c.locality) === n);
function netMiles(a, b) {
  const R = 3958.8, r = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * r / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin((b[0] - a[0]) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const netDist = (p, n) => p.lat ? netMiles(netArea(n).center, [p.lon, p.lat]) : null;

/* Providers: the public directory plus the ones Denise added. Partner marks are Provider records too. */
function netProviders() {
  const added = Store.where("Provider", r => r.Kind === "added").map(r => ({
    id: r.Id, name: r.Name, cat: r.Categories, addr: r.Address || "Address not entered", zip: "", phone: r.Phone || "", hours: r.Hours || "",
    lat: null, lon: null, area: r.Area ? Number(r.Area) : null, src: "added", note: r.Note || "", added: r,
  }));
  return NET.data.providers.concat(added);
}
const netProv = id => NET.data.provBy[id] || netProviders().find(p => p.id === id);
function netIsPartner(p) {
  if (NET.data.partners.includes(p.id) || p.src === "added") return true;
  if (Store.where("Provider", r => r.Kind === "partner" && r.DirectoryId === p.id).length) return true;
  return Store.where("Referral", r => netRefPid(r) === p.id).length > 0;
}
function netSource(p) {
  if (p.src === "added") return { label: "Added by you", cls: "info", sim: false };
  const s = NET.data.sources[p.src];
  const yrs = (TODAY - parseDate(s.updated)) / 3.156e10;
  return { label: s.kind === "simulated" ? s.name : (p.src === "city-reentry" ? "City reentry guide" : "Chicago Data Portal"), updated: s.updated, url: s.url, stale: s.kind !== "simulated" && yrs > NET_STALE_YEARS, sim: s.kind === "simulated", name: s.name };
}

/* ---------- Referrals: yours (records) and the network's (simulated history), in one shape ---------- */
const NET_STEP2_IDS = { "hou-teamwork": "crsc-teamwork", "work-cnh": "crsc-cnh", "hou-211": "city-211", "id-sos": "sos-king", "food-abe": "il-abe" };
function netRefPid(r) {
  if (r.ProviderId) return r.ProviderId;
  if (r.ServiceId && NET_STEP2_IDS[r.ServiceId]) return NET_STEP2_IDS[r.ServiceId];
  const nm = String(r.Partner || "").toLowerCase();
  const p = NET.data.providers.find(x => x.name.toLowerCase() === nm || (nm.length > 6 && x.name.toLowerCase().startsWith(nm.replace(/ crsc$/, ""))));
  return p ? p.id : null;
}
function netCatOf(s) {
  const t = String(s || "").toLowerCase();
  if (/job|work|employ|training/.test(t)) return "Employment";
  if (/house|housing|shelter/.test(t)) return "Housing";
  if (/medic|clinic|health|diabet/.test(t)) return /mental|counsel|therapy/.test(t) ? "Mental health" : "Health";
  if (/mental|counsel/.test(t)) return "Mental health";
  if (/\bid\b|document|license/.test(t)) return "ID & documents";
  if (/food|snap|pantry/.test(t)) return "Food";
  if (/benefit/.test(t)) return "Benefits";
  if (/legal|court|expunge|seal/.test(t)) return "Legal";
  return NET.data.categories.find(c => c.toLowerCase() === t) || "Other";
}
function netStage(r) { return r.Stage || (r.Status === "Accepted" ? "Accepted" : r.Status === "Declined" ? "Declined" : "Sent"); }
function netMine() {
  return Store.all("Referral").map(r => {
    const c = Store.get("Client", r.ClientId);
    const days = r.AnswerDate && r.SentDate ? Math.max(1, Math.round((parseDate(r.AnswerDate) - parseDate(r.SentDate)) / 864e5)) : null;
    return { mine: true, rec: r, id: r.Id, pid: netRefPid(r), pname: r.Partner, client: c ? c.Name : "", clientId: r.ClientId,
      area: c ? netAreaOf(c.Locality) : null, cat: r.Category || netCatOf(r.Service), stage: netStage(r), outcome: r.Outcome || null,
      why: r.DeclineReason || null, date: r.SentDate || TODAY_ISO, days };
  });
}
function netNetwork() {
  return NET.data.history.map((h, i) => ({ mine: false, id: "h" + i, pid: h.p, area: h.a, cat: h.c, stage: h.s, outcome: h.o || null, why: h.why || null, date: h.d, days: h.days || null }));
}
function netRefs(scope) { return scope === "mine" ? netMine() : scope === "network" ? netNetwork() : netNetwork().concat(netMine()); }
function netStats(list) {
  const n = list.length, answered = list.filter(r => r.stage !== "Sent").length;
  const placed = list.filter(r => NET_PLACED.includes(r.stage)).length;
  const showed = list.filter(r => NET_SHOWED.includes(r.stage)).length;
  const met = list.filter(r => r.outcome === "Goal met").length;
  const ds = list.filter(r => r.days && NET_PLACED.includes(r.stage)).map(r => r.days).sort((a, b) => a - b);
  return { n, answered, placed, showed, met, closed: list.filter(r => r.stage === "Closed").length, median: ds.length ? ds[Math.floor(ds.length / 2)] : null };
}
const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "–";
function netStatLine(p) {
  const s = netStats(netRefs("both").filter(r => r.pid === p.id));
  if (!s.n) return `<span class="muted">No referrals yet. Yours will be the first data point.</span>`;
  return `Accepted <b>${s.placed} of ${s.answered || s.n}</b> answered${s.answered < s.n ? ` (${s.n - s.answered} waiting)` : ""} · <b>${s.showed}</b> showed up${s.median ? ` · replies in about ${s.median} day${s.median > 1 ? "s" : ""}` : ""}`;
}

/* ---------- Page ---------- */
function renderNetwork() {
  if (!NET.data) {
    netLoad();
    app.innerHTML = mockbar() + (NET.failed
      ? `<div class="pane"><h3>Couldn't load data/chicago-services.json</h3><p class="small" style="margin-top:6px">Run <code>python3 -m http.server 8000</code> in app/step1-client-note and open http://localhost:8000.</p></div>`
      : `<div class="pane"><p class="muted">Loading Chicago services…</p></div>`);
    return;
  }
  const D = NET.data, tabs = [["areas", "Neighborhoods"], ["directory", "Directory"], ["pipeline", "Referral pipeline"]];
  const mine = netMine(), waiting = mine.filter(r => r.stage === "Sent").length;
  app.innerHTML = mockbar() + `
  <div class="notehead"><div><h1>Matched services</h1>
   <p class="small muted">${D.providers.length} services across Chicago's 77 community areas, from public data. Every referral you track here adds to what the network knows about which services take people, who shows up, and what works block by block.</p></div></div>
  <div class="ms-tabs net-tabs" role="tablist" aria-label="Matched services sections">${tabs.map(([k, l]) => `<button type="button" role="tab" id="net-tab-${k}" aria-selected="${NET.tab === k}" data-net-tab="${k}">${l}${k === "pipeline" && waiting ? ` <span class="tag warn">${waiting}</span>` : ""}</button>`).join("")}</div>
  <div id="net-body">${NET.tab === "areas" ? netAreasView() : NET.tab === "directory" ? netDirectoryView() : netPipelineView()}</div>
  ${netSourcesBox()}`;
}

function netSourcesBox() {
  const S = NET.data.sources;
  return `<details class="pane net-sources" id="net-sources"><summary><b>Where this data comes from</b></summary>
   <table class="small"><thead><tr><th>Source</th><th>Used for</th><th>Last updated</th></tr></thead><tbody>
   ${Object.entries(S).map(([k, s]) => `<tr><td>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)} ${s.kind === "simulated" ? `<span class="tag sim">Simulated</span>` : `<span class="tag ok">Real</span>`}</td><td>${esc(s.use || netSrcUse(k))}</td><td class="mono">${esc(s.updated)}${s.kind !== "simulated" && (TODAY - parseDate(s.updated)) / 3.156e10 > NET_STALE_YEARS ? ` <span class="tag warn">Old</span>` : ""}</td></tr>`).join("")}
   </tbody></table>
   <p class="small muted">No public dataset covers legal aid, expungement help, food pantries or transportation, and none record whether a referral worked. That is the data this tab collects.</p></details>`;
}
function netSrcUse(k) {
  return { "cjg8-dbka": "Community health centers (Health)", "wust-ytyg": "Mental health services (Mental health)", "kcki-hnch": "City clinics: mental health, WIC, STI (Health, Food)",
    "bspy-6mw8": "City community service centers: rent and utility help, emergency food (Benefits, Housing, Food)", "cs4s-nsna": "Workforce centers (Employment)",
    "x8fc-8rcq": "Library branches: free computers and internet (Digital access)", "s6ha-ppgi": "Affordable rental buildings (Housing)" }[k] || "";
}

/* ---------- Neighborhoods ---------- */
function netQuint(vals) { const s = vals.slice().sort((a, b) => a - b); return [0.2, 0.4, 0.6, 0.8].map(q => s[Math.floor(q * (s.length - 1))]); }
function netMap() {
  const D = NET.data, M = NET_METRICS[NET.metric], kx = Math.cos(41.84 * Math.PI / 180);
  const X = lon => ((lon + 87.945) * kx * 1000).toFixed(1), Y = lat => ((42.03 - lat) * 1000).toFixed(1);
  const vals = D.areas.map(M.get), br = NET.metric === "clients" ? [0, 1, 2, 3] : netQuint(vals);
  const cls = v => NET.metric === "clients" ? Math.min(4, v) : br.filter(b => v > b).length;
  const fmtv = v => (Math.round(v * 10) / 10) + M.unit;
  const legend = NET.metric === "clients" ? ["0", "1", "2", "3", "4+"]
    : [`≤ ${fmtv(br[0])}`, `${fmtv(br[0])}–${fmtv(br[1])}`, `${fmtv(br[1])}–${fmtv(br[2])}`, `${fmtv(br[2])}–${fmtv(br[3])}`, `> ${fmtv(br[3])}`];
  return `<div class="net-mapwrap">
   <svg class="net-map" id="net-map" viewBox="0 0 315 395" role="img" aria-label="Map of Chicago community areas shaded by ${esc(M.label.toLowerCase())}">
   ${D.areas.map(a => `<path class="q${cls(M.get(a))}${a.n === NET.area ? " sel" : ""}" data-area="${a.n}" tabindex="-1" d="${a.shape.map(r => "M" + r.map(p => X(p[0]) + "," + Y(p[1])).join("L") + "Z").join("")}"><title>${esc(a.name)}: ${fmtv(M.get(a))}</title></path>`).join("")}
   ${D.areas.filter(a => netClientsIn(a.n).length).map(a => `<circle class="net-dot" cx="${X(a.center[0])}" cy="${Y(a.center[1])}" r="3"><title>Your clients live in ${esc(a.name)}</title></circle>`).join("")}
   </svg>
   <div class="net-legend" aria-hidden="true">${legend.map((l, i) => `<span><i class="q${i}"></i>${esc(l)}</span>`).join("")}<span><i class="dot"></i>Your clients</span></div>
   <p class="small muted" id="net-hover">${esc(M.label)}: ${esc(M.desc.charAt(0).toLowerCase() + M.desc.slice(1))}. Click an area.</p></div>`;
}
function netLikelyNeeds(a) {
  const med = k => { const s = NET.data.areas.map(x => x[k]).filter(v => v != null).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const out = [];
  if (a.unemp > med("unemp") * 1.3 || a.noHS > med("noHS") * 1.3) out.push(["Employment", `unemployment ${a.unemp}%, ${a.noHS}% without a diploma`]);
  if (a.lowInc > med("lowInc") * 1.3 || a.pov > med("pov") * 1.3) out.push(["Housing", `${a.lowInc}% of households under $25k`], ["Benefits", `${a.pov}% below poverty`]);
  if (a.pop && a.arrests / a.pop > (NET.data.areas.reduce((s, x) => s + x.arrests, 0) / NET.data.areas.reduce((s, x) => s + (x.pop || 0), 0)) * 1.3) out.push(["Reentry hub", `${NET_METRICS.arrests.get(a)} arrests per 1,000 residents last year`]);
  return out;
}
function netCoverage(a) {
  const P = netProviders();
  return NET.data.public_categories.map(cat => {
    const ps = P.filter(p => p.cat.includes(cat) && p.lat);
    const inside = ps.filter(p => p.area === a.n).length;
    const near = ps.map(p => netDist(p, a.n)).sort((x, y) => x - y);
    const within = near.filter(d => d <= 1.5).length, nearest = near[0];
    const refs = netRefs("both").filter(r => r.area === a.n && r.cat === cat), s = netStats(refs);
    const status = inside === 0 && within === 0 ? "gap" : within <= 1 ? "thin" : "ok";
    return { cat, inside, within, nearest, s, status };
  });
}
function netAreasView() {
  const D = NET.data, a = netArea(NET.area), cl = netClientsIn(a.n), cov = netCoverage(a), needs = netLikelyNeeds(a);
  const med = k => { const s = D.areas.map(NET_METRICS[k] ? NET_METRICS[k].get : x => x[k]).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const rank = k => 1 + D.areas.filter(x => NET_METRICS[k].get(x) > NET_METRICS[k].get(a)).length;
  const worked = (() => {
    const by = {}; netRefs("both").filter(r => r.area === a.n && r.pid).forEach(r => (by[r.pid] = by[r.pid] || []).push(r));
    return Object.entries(by).map(([pid, l]) => ({ p: netProv(pid), s: netStats(l) })).filter(x => x.p && x.s.answered >= 2)
      .sort((x, y) => (y.s.showed + 1) / (y.s.n + 3) - (x.s.showed + 1) / (x.s.n + 3) || y.s.n - x.s.n).slice(0, 5);
  })();
  const gaps = cov.filter(c => c.status === "gap");
  return `<div class="net-areas">
  <div class="pane"><div class="net-maphead"><label class="field"><span>Shade the map by</span><select id="net-metric">${Object.entries(NET_METRICS).map(([k, m]) => `<option value="${k}" ${k === NET.metric ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>
   <label class="field"><span>Community area</span><select id="net-area">${D.areas.slice().sort((x, y) => x.name.localeCompare(y.name)).map(x => `<option value="${x.n}" ${x.n === a.n ? "selected" : ""}>${esc(x.name)}${netClientsIn(x.n).length ? " ●" : ""}</option>`).join("")}</select></label></div>
   ${netMap()}</div>
  <div class="pane net-profile" id="net-profile">
   <div class="ms-head" style="margin:0 0 4px"><h2 style="margin:0" id="net-area-name">${esc(a.name)}</h2><span class="tag info">Area ${a.n}</span></div>
   <p class="small muted">${a.pop ? a.pop.toLocaleString() + " residents" : ""}${cl.length ? ` · your clients here: ${cl.map(c => `<button class="linkbtn" type="button" data-net-client="${c.id}">${esc(c.name)}</button>`).join(", ")}` : " · none of your clients live here yet"}</p>
   <div class="metrics net-ind">
    <div><b>${a.hard}</b><span>Hardship index (city median ${med("hard")}) · #${rank("hard")} of 77</span></div>
    <div><b>${NET_METRICS.arrests.get(a)}</b><span>Arrests per 1,000 residents, last 12 months (median ${med("arrests")})</span></div>
    <div><b>${a.lowInc}%</b><span>Households under $25k (median ${med("lowInc")}%)</span></div>
    <div><b>${a.unemp}%</b><span>Unemployment (median ${med("unemp")}%)</span></div>
   </div>
   ${needs.length ? `<p class="small" id="net-needs"><b>Likely needs here:</b> ${needs.map(([c, why]) => `<span class="tag warn">${esc(c)}</span> <span class="muted">${esc(why)}</span>`).join(" · ")}</p>` : `<p class="small muted" id="net-needs">No indicator is far above the city median here.</p>`}
   <p class="small muted" style="margin-top:2px">A rule of thumb from public data: an indicator 30% above the city median. Your notes say what each client actually needs.</p>
   <h3 style="margin-top:14px">Services in and near ${esc(a.name)} ${gaps.length ? `<span class="tag bad">${gaps.length} gap${gaps.length > 1 ? "s" : ""}</span>` : ""}</h3>
   <div class="tablewrap"><table class="net-cov" id="net-cov"><thead><tr><th>Need</th><th>In the area</th><th>Within 1.5 mi</th><th>Nearest</th><th>Referrals from here</th><th></th></tr></thead><tbody>
   ${cov.map(c => `<tr class="${c.status}"><td><b>${esc(c.cat)}</b> ${c.status === "gap" ? `<span class="tag bad">Gap</span>` : c.status === "thin" ? `<span class="tag warn">Thin</span>` : ""}</td><td>${c.inside}</td><td>${c.within}</td><td>${c.nearest != null ? c.nearest.toFixed(1) + " mi" : "–"}</td><td>${c.s.n ? `${c.s.n} · ${pct(c.s.placed, c.s.answered)} accepted · ${pct(c.s.showed, c.s.placed)} showed up` : `<span class="muted">none yet</span>`}</td><td><button class="btn ghost small" type="button" data-net-browse="${esc(c.cat)}" aria-label="List ${esc(c.cat)} services">List</button></td></tr>`).join("")}
   </tbody></table></div>
   <p class="small muted">Gap: no listing in the area and none within 1.5 miles. Thin: one or none within 1.5 miles. Public listings only, plus 211 and the partners you add. Legal aid, food pantries and transportation have no public dataset yet: add the ones you use.</p>
   <h3 style="margin-top:14px">What worked for people from ${esc(a.name)}</h3>
   ${worked.length ? `<ol class="net-worked" id="net-worked">${worked.map(w => `<li><button class="linkbtn" type="button" data-net-prov="${w.p.id}">${esc(w.p.name)}</button> <span class="small muted">${esc(w.p.cat[0])} · ${w.s.n} referrals · ${pct(w.s.placed, w.s.answered)} accepted · ${pct(w.s.showed, w.s.n)} showed up${w.s.closed ? ` · ${pct(w.s.met, w.s.closed)} met the goal` : ""}</span></li>`).join("")}</ol>
   <p class="small muted">From your referrals and the network's referral history (simulated in this prototype).</p>`
     : `<p class="small muted" id="net-worked">No referral outcomes from this area yet. Each one you track adds to this list.</p>`}
   <div class="btns" style="margin-top:10px"><button class="btn primary" type="button" data-net-browse="">See all services near ${esc(a.name)}</button></div>
  </div></div>`;
}

/* ---------- Directory ---------- */
function netFiltered() {
  const q = NET.q.trim().toLowerCase(), near = NET.near ? Number(NET.near) : null;
  let list = netProviders().filter(p =>
    (!NET.cat || p.cat.includes(NET.cat)) &&
    (!q || (p.name + " " + p.addr + " " + p.note + " " + (p.area ? netArea(p.area).name : "")).toLowerCase().includes(q)) &&
    (NET.src === "all" || (NET.src === "partner" ? netIsPartner(p) : NET.src === "new" ? !netIsPartner(p) : NET.src === "added" ? p.src === "added" : NET.src === "real" ? !netSource(p).sim && p.src !== "added" : true)));
  const refs = netRefs("both"), cnt = {}; refs.forEach(r => { if (r.pid) cnt[r.pid] = (cnt[r.pid] || 0) + 1; });
  if (NET.hist) list = list.filter(p => cnt[p.id]);
  list = list.map(p => ({ p, d: near ? netDist(p, near) : null, n: cnt[p.id] || 0, partner: netIsPartner(p) }));
  if (near) list = list.filter(x => x.d == null ? x.p.citywide || x.p.area === near : x.d <= 3);
  list.sort((x, y) => near ? ((x.d ?? (x.p.area === near ? 0 : 2.9)) - (y.d ?? (y.p.area === near ? 0 : 2.9))) : (y.n - x.n || (y.partner - x.partner) || x.p.name.localeCompare(y.p.name)));
  return list;
}
function netCard(x) {
  const p = x.p, s = netSource(p), a = p.area ? netArea(p.area) : null;
  const R = NET.refer === p.id ? netReferForm(p) : "";
  return `<article class="net-card${x.partner ? " partner" : ""}" data-net-card="${p.id}">
   <div class="net-cardhead"><h3>${esc(p.name)}</h3>
    <div class="net-tags">${x.partner ? `<span class="tag ok">Your partner</span>` : `<span class="tag info">New to you</span>`}${p.cat.map(c => `<span class="tag">${esc(c)}</span>`).join("")}</div></div>
   <p class="small">${esc(p.addr)}${a ? ` · ${esc(a.name)}` : p.citywide ? " · Citywide" : ""}${x.d != null ? ` · <b>${x.d.toFixed(1)} mi</b>` : ""}${p.phone ? ` · ${esc(p.phone)}` : ""}${p.hours ? ` · ${esc(p.hours)}` : ""}</p>
   ${p.note ? `<p class="small muted">${esc(p.note)}</p>` : ""}
   <p class="small net-stat">${netStatLine(p)}</p>
   <p class="small net-src">${s.sim ? `<span class="tag sim">Simulated</span> ${esc(s.name)}` : p.src === "added" ? `<span class="tag info">Added by you</span> ${esc(fmt(parseDate(p.added.AddedDate)))}` : `<span class="tag ok">Real listing</span> ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}, updated ${esc(s.updated)}${s.stale ? ` <span class="tag warn">Data is over ${NET_STALE_YEARS} years old. Call to check</span>` : ""}`}</p>
   <div class="btns"><button class="btn" type="button" data-net-refer="${p.id}" aria-expanded="${NET.refer === p.id}">Refer a client</button>${x.partner ? "" : `<button class="btn ghost" type="button" data-net-partner="${p.id}">Add to my partners</button>`}</div>
   ${R}</article>`;
}
function netReferForm(p) {
  const F = NET.referDraft, cs = clients(), c = cs.find(x => x.id === F.client);
  const first = c ? c.name.split(" ")[0] : "The client";
  const ok = c && F.consent && F.cat;
  return `<div class="net-refer" id="net-refer">
   <h4>Refer to ${esc(p.name)}</h4>
   <div class="net-row"><label class="field"><span>Client</span><select id="net-rclient"><option value="">Choose a client…</option>${cs.map(x => `<option value="${x.id}" ${x.id === F.client ? "selected" : ""}>${esc(x.name)} · ${esc(x.locality)}</option>`).join("")}</select></label>
    <label class="field"><span>Need</span><select id="net-rcat">${p.cat.map(k => `<option ${k === F.cat ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
    <label class="field"><span>How</span><select id="net-rmethod"><option value="message" ${F.method !== "call" ? "selected" : ""}>Message</option><option value="call" ${F.method === "call" ? "selected" : ""}>Call${p.phone ? " " + esc(p.phone) : ""}</option></select></label></div>
   <label class="field"><span>Note to the provider (optional)</span><textarea id="net-rnote" rows="2" placeholder="What the client needs and when">${esc(F.note || "")}</textarea></label>
   <label class="chk"><input type="checkbox" id="net-rconsent" ${F.consent ? "checked" : ""} ${c ? "" : "disabled"}> ${esc(first)} agreed to share their information with ${esc(p.name)}</label>
   <div class="btns"><button class="btn primary" type="button" id="net-rsend" ${ok ? "" : "disabled"}>${F.method === "call" ? "Log call and track" : "Send and track"}</button><button class="btn" type="button" id="net-rcancel">Cancel</button></div>
   <p class="small muted">Nothing is sent from this prototype. The referral goes into ${c ? esc(first) + "'s" : "the client's"} case file and the Referral pipeline.</p></div>`;
}
function netAddForm() {
  const D = NET.data;
  return `<div class="pane net-add" id="net-add"><h3>Add a service you use</h3>
   <p class="small muted">Services you know that aren't in public data, like a church pantry or a legal clinic. They go on your partner list.</p>
   <div class="net-row"><label class="field"><span>Name</span><input id="net-aname"></label>
    <label class="field"><span>Need</span><select id="net-acat">${D.categories.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Community area</span><select id="net-aarea"><option value="">Citywide / not sure</option>${D.areas.slice().sort((x, y) => x.name.localeCompare(y.name)).map(a => `<option value="${a.n}">${esc(a.name)}</option>`).join("")}</select></label></div>
   <div class="net-row"><label class="field"><span>Address</span><input id="net-aaddr"></label><label class="field"><span>Phone</span><input id="net-aphone"></label></div>
   <label class="field"><span>What they do, who they take</span><input id="net-anote" placeholder="For example: men 18+, walk-in Tuesdays"></label>
   <div class="btns"><button class="btn primary" type="button" id="net-asave" disabled>Add service</button><button class="btn" type="button" id="net-acancel">Cancel</button></div></div>`;
}
function netDirectoryView() {
  const D = NET.data, list = netFiltered(), shown = list.slice(0, NET.limit);
  return `<div class="pane net-filters" id="net-filters">
   <div class="net-row">
    <label class="field net-q"><span>Search</span><input id="net-q" type="search" value="${esc(NET.q)}" placeholder="Name, street or neighborhood"></label>
    <label class="field"><span>Need</span><select id="net-cat"><option value="">All needs</option>${D.categories.map(c => `<option ${c === NET.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Near</span><select id="net-near"><option value="">Anywhere in Chicago</option>${D.areas.slice().sort((x, y) => x.name.localeCompare(y.name)).map(a => `<option value="${a.n}" ${String(a.n) === String(NET.near) ? "selected" : ""}>${esc(a.name)}${netClientsIn(a.n).length ? " ●" : ""}</option>`).join("")}</select></label>
    <label class="field"><span>Show</span><select id="net-src">${[["all", "All services"], ["partner", "Your partners"], ["new", "New to you"], ["real", "Real public listings"], ["added", "Added by you"]].map(([v, l]) => `<option value="${v}" ${v === NET.src ? "selected" : ""}>${l}</option>`).join("")}</select></label>
   </div>
   <div class="net-row net-row2"><label class="chk"><input type="checkbox" id="net-hist" ${NET.hist ? "checked" : ""}> Only services with referral history</label>
    <span class="small muted" id="net-count">${list.length} service${list.length === 1 ? "" : "s"}${NET.near ? ` within 3 miles of ${esc(netArea(Number(NET.near)).name)}, nearest first` : ", most referred first"}</span>
    <button class="btn ghost" type="button" id="net-addbtn">+ Add a service you use</button></div></div>
  ${NET.adding ? netAddForm() : ""}
  ${NET.sent ? `<div class="flagitem res" role="status" id="net-sentnote"><div><b>✓ Referral tracked.</b> ${esc(NET.sent)} <button class="linkbtn" type="button" data-net-tab="pipeline">Open the Referral pipeline</button></div></div>` : ""}
  <div class="net-list" id="net-list">${shown.map(netCard).join("") || `<p class="muted pane">Nothing matches. Try another need or area, or add a service you use.</p>`}</div>
  ${list.length > shown.length ? `<div class="btns" style="justify-content:center;margin-top:10px"><button class="btn" type="button" id="net-more">Show ${Math.min(25, list.length - shown.length)} more of ${list.length - shown.length}</button></div>` : ""}`;
}

/* ---------- Referral pipeline ---------- */
function netNext(stage) {
  return { Sent: ["Accepted", "Declined", "No response"], Accepted: ["Attended", "No-show"], "No-show": ["Accepted", "Closed"], Attended: ["Closed"] }[stage] || [];
}
const NET_STAGE_LABEL = { Sent: "Waiting for an answer", Accepted: "Accepted, appointment set", Attended: "Showed up", Closed: "Closed with an outcome", "Not placed": "Not placed" };
function netEditForm(r) {
  const E = NET.editing, opts = netNext(r.stage), to = E.to || opts[0];
  return `<tr class="net-edit"><td colspan="7"><div class="net-row" id="net-editform">
   <label class="field"><span>New status</span><select id="net-eto">${opts.map(o => `<option ${o === to ? "selected" : ""}>${o === "Accepted" && r.stage === "No-show" ? "Accepted (rebooked)" : o === "Closed" ? "Closed with an outcome" : o}</option>`).join("")}</select></label>
   ${to === "Accepted" ? `<label class="field"><span>Appointment</span><input id="net-edate" type="date" value="${esc(E.date || iso(new Date(TODAY.getTime() + 3 * 864e5)))}"></label>` : ""}
   ${to === "Declined" ? `<label class="field"><span>Reason</span><select id="net-ewhy">${NET_DECLINE.map(o => `<option ${o === E.why ? "selected" : ""}>${o}</option>`).join("")}</select></label>` : ""}
   ${to === "Closed" ? `<label class="field"><span>Outcome</span><select id="net-eout">${(r.stage === "No-show" ? ["Not met"] : NET_OUTCOMES).map(o => `<option ${o === E.outcome ? "selected" : ""}>${o}</option>`).join("")}</select></label>` : ""}
   <label class="field net-q"><span>Note (optional)</span><input id="net-enote" value="${esc(E.note || "")}" placeholder="${to === "Closed" ? "For example: moved into an SRO unit Dec 2" : "What the provider said"}"></label>
   <div class="btns" style="align-self:flex-end"><button class="btn primary" type="button" id="net-esave">Save</button><button class="btn" type="button" id="net-ecancel">Cancel</button></div></div></td></tr>`;
}
function netPipelineView() {
  const D = NET.data, mine = netMine();
  const scopeRefs = netRefs(NET.scope).filter(r => (!NET.pcat || r.cat === NET.pcat) && (!NET.parea || String(r.area) === String(NET.parea)));
  const s = netStats(scopeRefs);
  const group = st => ["Declined", "No response", "No-show"].includes(st) ? "Not placed" : st;
  const groups = ["Sent", "Accepted", "Attended", "Closed", "Not placed"].map(g => ({ g, list: mine.filter(r => group(r.stage) === g).sort((a, b) => a.date.localeCompare(b.date)) }));
  const waitDays = r => Math.round((TODAY - parseDate(r.date)) / 864e5);
  const row = r => {
    const p = r.pid ? netProv(r.pid) : null, a = r.area ? netArea(r.area) : null, w = waitDays(r), hist = r.rec.History || [];
    const last = hist.length ? hist[hist.length - 1] : null;
    return `<tr data-net-ref="${r.id}"><td><b>${esc(r.client)}</b>${a ? `<span class="sub">${esc(a.name)}</span>` : ""}</td><td>${p ? `<button class="linkbtn" type="button" data-net-prov="${p.id}">${esc(p.name)}</button>` : esc(r.pname || "")}<span class="sub">${esc(r.cat)}</span></td>
     <td>${esc(fmt(parseDate(r.date)))}${r.stage === "Sent" ? `<span class="sub ${w >= 3 ? "due over" : ""}">${w >= 3 ? `${w} days, follow up` : w ? `${w} day${w > 1 ? "s" : ""} waiting` : "today"}</span>` : ""}</td>
     <td>${netStageTag(r)}${r.rec.Appointment ? `<span class="sub">Appt ${esc(typeof r.rec.Appointment === "string" ? fmt(parseDate(r.rec.Appointment)) : fmt(parseDate(r.rec.Appointment.date)) + (r.rec.Appointment.time ? ", " + r.rec.Appointment.time : ""))}</span>` : ""}${r.why ? `<span class="sub">${esc(r.why)}</span>` : ""}</td>
     <td class="small">${last ? `${esc(fmt(parseDate(last.date)))}${last.note ? ": " + esc(last.note) : ""}` : `<span class="muted">–</span>`}</td>
     <td>${netNext(r.stage).length ? `<button class="btn small" type="button" data-net-edit="${r.id}">Update</button>` : ""}</td><td></td></tr>${NET.editing && NET.editing.id === r.id ? netEditForm(r) : ""}`;
  };
  const byProv = {}; scopeRefs.filter(r => r.pid).forEach(r => (byProv[r.pid] = byProv[r.pid] || []).push(r));
  const board = Object.entries(byProv).map(([pid, l]) => ({ p: netProv(pid), s: netStats(l) })).filter(x => x.p).sort((x, y) => y.s.n - x.s.n).slice(0, 15);
  return `<div class="pane"><div class="ms-head" style="margin:0 0 8px"><h2 style="margin:0">Your referrals <span class="tag info">${mine.length}</span></h2>
    <span class="small muted">Update each one as you hear back. The status you record is the data.</span></div>
   ${mine.length ? `<div class="tablewrap"><table class="net-pipe" id="net-pipe"><thead><tr><th>Client</th><th>Service</th><th>Sent</th><th>Status</th><th>Last update</th><th></th><th></th></tr></thead>
   ${groups.filter(x => x.list.length).map(x => `<tbody><tr class="net-group"><th colspan="7">${esc(NET_STAGE_LABEL[x.g])} <span class="tag ${x.g === "Sent" ? "warn" : x.g === "Not placed" ? "bad" : "ok"}">${x.list.length}</span></th></tr>${x.list.map(row).join("")}</tbody>`).join("")}</table></div>`
     : `<p class="muted small">No referrals yet. Refer a client from the Directory or from a client's case file.</p>`}
  </div>
  <div class="pane" style="margin-top:14px"><div class="ms-head" style="margin:0 0 8px"><h2 style="margin:0">Outcomes</h2>
   <div class="net-row net-row2"><label class="field"><span>Referrals</span><select id="net-scope">${[["both", "Yours and the network's"], ["mine", "Yours only"], ["network", "Network only (simulated)"]].map(([v, l]) => `<option value="${v}" ${v === NET.scope ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field"><span>Need</span><select id="net-pcat"><option value="">All needs</option>${D.categories.map(c => `<option ${c === NET.pcat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Client lives in</span><select id="net-parea"><option value="">Anywhere</option>${D.areas.slice().sort((x, y) => x.name.localeCompare(y.name)).map(a => `<option value="${a.n}" ${String(a.n) === String(NET.parea) ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label></div></div>
   <div class="net-funnel" id="net-funnel">${[["Sent", s.n, ""], ["Answered", s.answered, pct(s.answered, s.n) + " of sent"], ["Accepted", s.placed, pct(s.placed, s.answered) + " of answered"], ["Showed up", s.showed, pct(s.showed, s.placed) + " of accepted"], ["Goal met", s.met, pct(s.met, s.closed) + " of closed"]]
     .map(([l, v, sub], i) => `<div><b>${v}</b><span>${l}</span><small>${sub || (s.median ? `answer in about ${s.median} days` : "")}</small></div>`).join("")}</div>
   ${NET.scope !== "mine" ? `<p class="small muted"><span class="tag sim">Simulated</span> The network history (${D.history.length} referrals, May to November 2026) stands in for pooled outcomes from partner organizations.</p>` : ""}
   <h3 style="margin-top:12px">By provider</h3>
   ${board.length ? `<div class="tablewrap"><table class="net-board" id="net-board"><thead><tr><th>Service</th><th>Referrals</th><th>Accepted</th><th>Showed up</th><th>Goal met</th><th>Answers in</th></tr></thead><tbody>
   ${board.map(b => `<tr><td><button class="linkbtn" type="button" data-net-prov="${b.p.id}">${esc(b.p.name)}</button><span class="sub">${esc(b.p.cat.slice(0, 2).join(", "))}${b.p.area ? " · " + esc(netArea(b.p.area).name) : ""}</span></td><td>${b.s.n}</td><td>${pct(b.s.placed, b.s.answered)}<span class="sub">${b.s.placed} of ${b.s.answered}</span></td><td>${pct(b.s.showed, b.s.placed)}</td><td>${b.s.closed ? pct(b.s.met, b.s.closed) : "–"}</td><td>${b.s.median ? b.s.median + " d" : "–"}</td></tr>`).join("")}
   </tbody></table></div>` : `<p class="muted small">No referrals match.</p>`}
  </div>`;
}
function netStageTag(r) {
  const c = { Sent: "warn", Accepted: "info", Attended: "ok", Closed: "ok", Declined: "bad", "No response": "bad", "No-show": "bad" }[r.stage] || "info";
  return `<span class="tag ${c}">${esc(r.stage === "Closed" ? r.outcome || "Closed" : r.stage)}</span>`;
}

/* ---------- Actions ---------- */
function netSaveReferral(p) {
  const F = NET.referDraft, c = clients().find(x => x.id === F.client), first = c.name.split(" ")[0];
  const it = Store.insert("Interaction", { ClientId: c.id, Date: TODAY_ISO, Type: "Referral sent", Channel: F.method === "call" ? "Phone" : "Message", Template: "Referral request", SourceName: null,
    Summary: `Referred to ${p.name} for ${F.cat.toLowerCase()}${F.note ? ". " + F.note : ""}. ${first} agreed to share information.`, MeetingType: F.method === "call" ? "Phone call" : "Text message", Minutes: 5 });
  Store.insert("Referral", { ClientId: c.id, InteractionId: it.Id, ProviderId: p.id, Partner: p.name, Service: F.cat, Category: F.cat, Status: "Sent", Stage: "Sent", SentDate: TODAY_ISO,
    Method: F.method || "message", Consent: true, Note: F.note || "", Origin: "Matched services tab", History: [{ stage: "Sent", date: TODAY_ISO, note: F.note || "" }] });
  Store.update("Client", c.id, { Status: "Referral pending" }); Store.save();
  const partnerBefore = netIsPartner(p);
  logEvent(c.name, "Referral sent", `${F.cat} · "${p.name}" · from Matched services · by ${F.method === "call" ? "call" : "message"} · ${partnerBefore ? "partner" : "new to you"}`);
  NET.sent = `${c.name} → ${p.name} (${F.cat}).`; NET.refer = null; NET.referDraft = {};
}
function netSaveUpdate(r) {
  const E = NET.editing, to = document.getElementById("net-eto").value.replace(" (rebooked)", "").replace(" with an outcome", "");
  const note = document.getElementById("net-enote").value.trim(), rec = r.rec, patch = { Stage: to };
  const h = { stage: to, date: TODAY_ISO, note };
  if (to === "Accepted") { const d = document.getElementById("net-edate").value; patch.Status = "Accepted"; patch.Appointment = { date: d, time: "" }; if (!rec.AnswerDate) patch.AnswerDate = TODAY_ISO; h.note = (note ? note + ". " : "") + "Appointment " + fmt(parseDate(d)); }
  if (to === "Declined") { patch.Status = "Declined"; patch.DeclineReason = document.getElementById("net-ewhy").value; patch.AnswerDate = TODAY_ISO; h.note = patch.DeclineReason + (note ? ". " + note : ""); }
  if (to === "No response") { patch.DeclineReason = "No response"; }
  if (to === "Attended") patch.AttendedDate = TODAY_ISO;
  if (to === "Closed") { patch.Outcome = document.getElementById("net-eout").value; patch.ClosedDate = TODAY_ISO; h.note = patch.Outcome + (note ? ". " + note : ""); }
  patch.History = (rec.History || [{ stage: netStage(rec), date: rec.SentDate || TODAY_ISO, note: "" }]).concat([h]);
  Store.update("Referral", rec.Id, patch);
  const words = { Accepted: "accepted", Declined: "declined", "No response": "did not answer about", Attended: "confirmed attendance for", "No-show": "reported a no-show for", Closed: "closed" }[to];
  Store.insert("Interaction", { ClientId: rec.ClientId, Date: TODAY_ISO, Type: "Referral update", Channel: "Note", Template: "Referral status", SourceName: null,
    Summary: `${rec.Partner} ${words} the ${String(rec.Category || rec.Service || "").toLowerCase()} referral.${h.note ? " " + h.note + "." : ""}`.replace(/\.\./g, "."), MeetingType: "Note", Minutes: 0 });
  if (to === "Closed" || to === "Declined" || to === "No response") {
    const open = Store.where("Referral", x => x.ClientId === rec.ClientId && ["Sent", "Accepted"].includes(netStage(x)) && x.Id !== rec.Id).length;
    if (!open) Store.update("Client", rec.ClientId, { Status: "Active" });
  }
  Store.save();
  logEvent(r.client, "Referral status", `"${rec.Partner}" · ${netStage(rec)} after ${r.stage}${h.note ? " · " + h.note : ""}`);
  NET.editing = null; toast("Referral updated. It now counts toward " + rec.Partner + "'s outcomes.");
}

/* ---------- Events ---------- */
app.addEventListener("click", e => {
  if (state.view !== "network") return;
  const b = e.target.closest("button, path[data-area]");
  if (!b) return;
  const d = b.dataset;
  if (d.netTab) { NET.tab = d.netTab; NET.editing = null; logEvent("", "Matched services tab", d.netTab); return renderNetwork(); }
  if (d.area) { NET.area = Number(d.area); logEvent("", "Area opened", netArea(NET.area).name + " (map)"); renderNetwork(); return; }
  if (d.netBrowse != null) { NET.tab = "directory"; NET.near = String(NET.area); NET.cat = d.netBrowse; NET.src = "all"; NET.q = ""; NET.limit = 25; logEvent("", "Services browsed", `${netArea(NET.area).name} · ${d.netBrowse || "all needs"}`); return renderNetwork(); }
  if (d.netProv) { const p = netProv(d.netProv); NET.tab = "directory"; NET.q = p.name; NET.cat = ""; NET.near = ""; NET.src = "all"; NET.hist = false; return renderNetwork(); }
  if (d.netClient) { state.sel = d.netClient; return go("clients"); }
  if (d.netRefer) {
    if (NET.refer === d.netRefer) { NET.refer = null; return renderNetwork(); }
    const p = netProv(d.netRefer); NET.refer = p.id; NET.sent = null;
    const near = NET.near ? Number(NET.near) : p.area, guess = clients().find(c => netAreaOf(c.locality) === near);
    NET.referDraft = { client: guess ? guess.id : "", cat: NET.cat && p.cat.includes(NET.cat) ? NET.cat : p.cat[0], method: "message", consent: false, note: "" };
    renderNetwork(); const f = document.getElementById("net-refer"); if (f) f.scrollIntoView({ block: "nearest", behavior: "smooth" }); return;
  }
  if (b.id === "net-rcancel") { NET.refer = null; return renderNetwork(); }
  if (b.id === "net-rsend") { netSaveReferral(netProv(NET.refer)); return renderNetwork(); }
  if (d.netPartner) {
    const p = netProv(d.netPartner); Store.insert("Provider", { Kind: "partner", DirectoryId: p.id, Name: p.name, AddedDate: TODAY_ISO }); Store.save();
    logEvent("", "Partner added", `"${p.name}" · ${p.cat.join(", ")}`); toast(p.name + " is on your partner list."); return renderNetwork();
  }
  if (b.id === "net-more") { NET.limit += 25; return renderNetwork(); }
  if (b.id === "net-addbtn") { NET.adding = !NET.adding; renderNetwork(); const n = document.getElementById("net-aname"); if (n) n.focus(); return; }
  if (b.id === "net-acancel") { NET.adding = false; return renderNetwork(); }
  if (b.id === "net-asave") {
    const v = id => document.getElementById(id).value.trim();
    const rec = Store.insert("Provider", { Kind: "added", Name: v("net-aname"), Categories: [v("net-acat")], Area: v("net-aarea") || null, Address: v("net-aaddr"), Phone: v("net-aphone"), Note: v("net-anote"), AddedBy: "Denise", AddedDate: TODAY_ISO });
    Store.save(); NET.adding = false; NET.q = rec.Name; NET.cat = ""; NET.near = ""; NET.src = "all";
    logEvent("", "Service added", `"${rec.Name}" · ${rec.Categories[0]}${rec.Area ? " · " + netArea(Number(rec.Area)).name : ""}`); toast(rec.Name + " added to your services.");
    return renderNetwork();
  }
  if (d.netEdit) { NET.editing = { id: d.netEdit }; return renderNetwork(); }
  if (b.id === "net-ecancel") { NET.editing = null; return renderNetwork(); }
  if (b.id === "net-esave") { const r = netMine().find(x => x.id === NET.editing.id); netSaveUpdate(r); return renderNetwork(); }
});
/* From a client's case file (Step 2 tab): open the directory near where the client lives. */
const NET_STEP2_CATS = { Medication: "Health", Work: "Employment", ID: "ID & documents" };
app.addEventListener("click", e => {
  const b = e.target.closest("[data-net-goarea]");
  if (!b || state.view === "network") return;
  const go2 = () => { const n = netAreaOf(b.dataset.netGoarea), cat = NET_STEP2_CATS[b.dataset.netGocat] || b.dataset.netGocat;
    NET.tab = "directory"; NET.near = n ? String(n) : ""; NET.cat = NET.data.categories.includes(cat) ? cat : ""; NET.q = ""; NET.src = "all"; NET.hist = false; NET.limit = 25;
    logEvent("", "Services browsed", `${b.dataset.netGoarea} · ${NET.cat || "all needs"} · from case file`); go("network"); };
  if (NET.data) go2(); else { netLoad(); const t = setInterval(() => { if (NET.data) { clearInterval(t); go2(); } else if (NET.failed) { clearInterval(t); go("network"); } }, 50); }
});
app.addEventListener("mouseover", e => {
  if (state.view !== "network") return;
  const t = e.target.closest("path[data-area]"), h = document.getElementById("net-hover");
  if (!t || !h) return;
  const a = netArea(Number(t.dataset.area)), M = NET_METRICS[NET.metric];
  h.innerHTML = `<b>${esc(a.name)}</b>: ${esc(M.label.toLowerCase())} ${Math.round(M.get(a) * 10) / 10}${M.unit}${netClientsIn(a.n).length ? ` · ${netClientsIn(a.n).length} of your clients` : ""}`;
});
app.addEventListener("input", e => {
  if (state.view !== "network") return;
  const t = e.target;
  if (t.id === "net-q") {
    NET.q = t.value; NET.limit = 25; const pos = t.selectionStart; renderNetwork();
    const q = document.getElementById("net-q"); q.focus(); q.setSelectionRange(pos, pos);
  }
  if (t.id === "net-rnote") NET.referDraft.note = t.value;
  if (t.id === "net-enote") NET.editing.note = t.value;
  if (t.id === "net-aname") document.getElementById("net-asave").disabled = !t.value.trim();
});
app.addEventListener("change", e => {
  if (state.view !== "network") return;
  const t = e.target;
  const set = { "net-metric": () => NET.metric = t.value, "net-area": () => { NET.area = Number(t.value); logEvent("", "Area opened", netArea(NET.area).name + " (list)"); },
    "net-cat": () => { NET.cat = t.value; NET.limit = 25; }, "net-near": () => { NET.near = t.value; NET.limit = 25; }, "net-src": () => { NET.src = t.value; NET.limit = 25; }, "net-hist": () => NET.hist = t.checked,
    "net-rclient": () => { NET.referDraft.client = t.value; NET.referDraft.consent = false; }, "net-rcat": () => NET.referDraft.cat = t.value, "net-rmethod": () => NET.referDraft.method = t.value,
    "net-rconsent": () => { NET.referDraft.consent = t.checked; const c = clients().find(x => x.id === NET.referDraft.client); logEvent(c ? c.name : "", t.checked ? "Consent ticked" : "Consent unticked", `"${netProv(NET.refer).name}"`); },
    "net-scope": () => NET.scope = t.value, "net-pcat": () => NET.pcat = t.value, "net-parea": () => NET.parea = t.value,
    "net-eto": () => NET.editing.to = t.value.replace(" (rebooked)", "").replace(" with an outcome", ""), "net-edate": () => NET.editing.date = t.value, "net-ewhy": () => NET.editing.why = t.value, "net-eout": () => NET.editing.outcome = t.value };
  if (set[t.id]) { if (t.id === "net-rnote") return; NET.referDraft.note = (document.getElementById("net-rnote") || {}).value ?? NET.referDraft.note; set[t.id](); renderNetwork(); }
});
