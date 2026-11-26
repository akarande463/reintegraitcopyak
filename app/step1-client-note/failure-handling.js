/* ReintegrAIt: what the product does when things go wrong (class demo build).
   Loaded last in index.html and uses the helpers of the main script, matched-services.js and matched-network.js.
   1. Demo menu in the top bar: Happy path, Misheard intake, Shaky Urgent, Stale match. The two real-AI cases replay a saved
      run of the real note model (SIM.demo_cases), through the same applyDraft code as a live run, so they work without the helper.
   2. Note checks on what the model writes: an unsure date ("Tuesday I think") saved as certain, a neighborhood that is not one of
      Chicago's 77 community areas, an Urgent need with a week or more of supply. Each is a "Check" flag Denise must resolve,
      and "Confirm key facts" (name, release date, top need) must be ticked before Approve.
   5. Close the loop: "Did they show up?" after an appointment date passes, with a simulated text to the client.
   6. New to you: one nearby service per need from the public directory that is not on the partner list.
   3 and 4 (honest ranking, call first) live in matched-services.js. */

const FH = { stalePatch: null, texts: {}, resched: null };

/* ---------- 1. Demo menu ---------- */
const FH_DEMOS = [["", "Class demo…"], ["happy", "Happy path (Andre, sample)"], ["misheard", "Misheard intake (Rosa, saved real-AI run)"],
  ["urgent", "Shaky Urgent (Darius, saved real-AI run)"], ["stale", "Stale match (Andre, old housing listing)"]];
function demoBar() {
  const live = AI.helper && AI.on;
  return `<span class="fh-demo"><select id="demo-pick" aria-label="Class demo">${FH_DEMOS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select>`
    + (live ? "" : `<span class="small fh-aistate" id="ai-state">${AI.helper ? "Real AI is switched off." : "Real AI is not running (no helper), so uploads use the sample."} The demo cases replay saved real-AI runs.</span>`)
    + (FH.stalePatch ? `<span class="tag warn" id="demo-stale-on">Stale-match demo on</span>` : "") + `</span>`;
}
document.addEventListener("change", e => {
  if (e.target.id !== "demo-pick") return;
  const v = e.target.value; e.target.value = "";
  if (v) fhStartDemo(v);
});
function fhStartDemo(v) {
  fhStale(v === "stale");
  logEvent("", "Demo started", FH_DEMOS.find(d => d[0] === v)[1]);
  if (v === "misheard" || v === "urgent") return fhReplay(v);
  fhSampleIntake();
}
/* Same clicks as Denise: New client, Use the sample recording, Process with AI. */
function fhSampleIntake() {
  openUpload({ mode: "new" });
  document.getElementById("sample").click();
  const t = setInterval(() => { const g = document.getElementById("mgo"); if (!g) return clearInterval(t); if (!g.disabled) { clearInterval(t); g.click(); } }, 100);
}
/* Stale match: Teamwork Englewood's Housing listing was last updated Oct 1 (41 days before Nov 11) and rests on 2 referrals. */
function fhStale(on) {
  const t = SIM.matched_services.needs.Housing.candidates.find(s => s.id === "hou-teamwork");
  if (on && !FH.stalePatch) {
    FH.stalePatch = { availability: clone(t.availability), history: clone(t.history) };
    t.availability = { ...t.availability, updated: "2026-10-01" };
    t.history = { accepted: 2, total: 2, reply_days: 1, rating: 5, raters: 1, simulated: true };
  }
  if (!on && FH.stalePatch) { Object.assign(t, FH.stalePatch); FH.stalePatch = null; }
}
function fhNetReady() {
  if (typeof NET === "undefined" || NET.data || NET.failed) return Promise.resolve();
  netLoad();
  return new Promise(ok => { const t = setInterval(() => { if (NET.data || NET.failed) { clearInterval(t); ok(); } }, 50); setTimeout(() => { clearInterval(t); ok(); }, 4000); });
}
/* Replays a saved real-AI run: the lab transcript, then the note the model wrote for it, through applyDraft. */
async function fhReplay(key) {
  const D = SIM.demo_cases[key], sim = clone(SIM.new_client_intake), sec = t => String(t).split(":").reduce((a, x) => a * 60 + Number(x), 0);
  await fhNetReady();
  nextRun();
  const source = { kind: "audio", name: D.file_name, mb: D.size_mb, dur: D.duration, file: null, replay: true };
  const n = { ...sim.note, processing: sim.processing, reminder: sim.reminder, source, rv1: false, startedAt: Date.now(), edits: 0, tsOpened: 0 };
  n.log = { meeting_type: sim.note.meeting.type, minutes: durToMin(D.duration), services: [] };
  const total = sec(D.duration);
  n.transcript = D.lines.map(([t, x], i) => ({ id: "rt" + (i + 1), time: t, start: sec(t), end: D.lines[i + 1] ? sec(D.lines[i + 1][0]) : total, speaker: "Recording", text: x, real: true }));
  n.real = { status: "done", model: "speech-to-text (saved run)", seconds: 4 }; n.realTx = Promise.resolve();
  n.realDraft = { status: "done", model: "the real note model (saved run)", seconds: 31, replay: true }; n.realDraftTx = Promise.resolve();
  const d = clone(D.note);
  if (Array.isArray(d.key_info)) d.key_info = Object.fromEntries(d.key_info.map(f => [f.key, f]));
  applyDraft(n, d);
  state.note = n; state.editing = false;
  logEvent(n.key_info.name.value, "Upload", `Demo: ${D.label} · saved real-AI run replayed · ${n.flags.length} to confirm`);
  mroot.innerHTML = ""; startProcess("note");
}

/* ---------- 2. Note checks ---------- */
const FH_HEDGE = /\b(i think|i guess|maybe|probably|i'?m not sure|not sure|something like|or so|i believe|if i remember|don'?t remember)\b/i;
const FH_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30 };
const FH_SUPPLY = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\s+(day|week)s?(?:['’]s?)?\s+(?:of|worth|left|supply)\b/i;
const FH_OUT = /\b(ran out|have run out|out of (?:pills|meds|medication)|none left)\b/i;
/* Local names people use that are not community area names. */
const FH_AREA_HINTS = { "la villita": "Little Village", "villita": "Little Village", "inglewood": "Englewood", "west inglewood": "West Englewood", "k town": "K-Town", "the gage": "Gage Park" };
const fhDay = v => { const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseDate(v) : null; return d ? `${MS_DAYS[d.getDay()]} ${fmt(d)}` : v; };
function fhLev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function fhSuggestArea(loc) {
  const s = loc.toLowerCase().replace(/[^a-z' -]/g, "").trim();
  if (FH_AREA_HINTS[s]) return FH_AREA_HINTS[s];
  if (s.length < 5) return null;
  const names = [...NET.data.areas.map(a => a.name), ...Object.keys(NET_ALIAS).map(k => k.replace(/\b\w/g, c => c.toUpperCase()))];
  let best = null, bd = 3;
  names.forEach(nm => { const d = fhLev(s, nm.toLowerCase()); if (d < bd) { bd = d; best = nm; } });
  return best;
}
function fhAreaLabel(name) {
  const a = netAreaOf(name), an = a ? netArea(a).name : "";
  return an && an.toLowerCase() !== name.toLowerCase() ? `${name} (${an})` : name;
}
/* Runs after every drafted note (live or replayed). The neighborhood check also runs on the sample note. */
function addNoteChecks(n) {
  n.flags = n.flags.filter(f => f.kind !== "Check");
  const turn = id => (n.transcript.find(l => l.id === id) || {}).text || "";
  const first = String((n.key_info.name || {}).value || "the client").split(" ")[0];
  if (n.drafted) {
    keyDefs(n.template).filter(d => d.type === "date").forEach(d => {
      const f = n.key_info[d.key], q = f && f.value && f.source ? turn(f.source) : "", m = q.match(FH_HEDGE);
      if (m) n.flags.push({ id: "c-" + d.key, field: d.key, kind: "Check", fix: "hedge", value: f.value, source: f.source, quote: q, hedge: m[0],
        text: `${first} said “${m[0]}”, but the note saved ${fhDay(f.value)} as certain.` });
    });
    n.next_steps.forEach((x, i) => {
      if (x.kind !== "agreed" || !x.due || !x.source) return;
      const q = turn(x.source), m = q.match(FH_HEDGE);
      if (m) n.flags.push({ id: "c-step" + i, field: "next_steps", step: x.text, kind: "Check", fix: "hedge", value: x.due, source: x.source, quote: q, hedge: m[0],
        text: `${first} said “${m[0]}”, but the step is due ${fhDay(x.due)} as if it were certain.` });
    });
    n.immediate_needs.forEach((x, i) => {
      if (x.priority !== "Urgent") return;
      const q = x.text + " " + turn(x.source);
      if (FH_OUT.test(q)) return;
      const m = q.match(FH_SUPPLY); if (!m) return;
      const k = /^\d+$/.test(m[1]) ? +m[1] : FH_NUM[m[1].toLowerCase()], days = k * (/week/i.test(m[2]) ? 7 : 1);
      if (days >= 7) n.flags.push({ id: "c-need" + i, field: "immediate_needs", need: x.text, kind: "Check", fix: "urgent", days, source: x.source, quote: turn(x.source) || x.text,
        text: `${needCat(x.text)} is marked Urgent, but ${first} has about ${days} days left (“${m[0]}”). Urgent means this week.` });
    });
  }
  const loc = String((n.key_info.locality || {}).value || "").trim();
  if (loc && typeof NET !== "undefined" && NET.data && netAreaOf(loc) == null) {
    const sug = fhSuggestArea(loc);
    n.flags.push({ id: "c-locality", field: "locality", kind: "Check", fix: "area", value: loc, suggest: sug, source: (n.key_info.locality || {}).source,
      text: `“${loc}” is not one of Chicago's 77 community areas, so matching can't place ${first} or confirm a Chicago address.${sug ? ` Did ${first} mean ${fhAreaLabel(sug)}?` : " Pick the community area by hand."}` });
  }
}
const fhCheckTitle = (n, f) => f.fix === "urgent" ? `Urgent: ${needCat(f.need)}` : f.field === "next_steps" ? `Next step “${f.step}”` : fieldLabel(n, f.field);
function fhFlag(n, f) {
  if (f.resolved) return `<div class="flagitem res fh-check" data-check="${f.id}"><div><b><span class="ic" aria-hidden="true">✓</span> Checked · ${esc(fhCheckTitle(n, f))}</b> ${esc(f.result)} · ${ME}</div></div>`;
  const src = f.source ? srcBtn(f.source, n.transcript, n.source) : "";
  const quote = f.quote ? `<div class="small">Heard: “${esc(f.quote)}” ${src}</div>` : "";
  let row = "";
  if (f.fix === "hedge") row = `<input id="cx-${f.id}" ${f.field !== "next_steps" ? 'type="date"' : ""} value="${esc(f.value)}" aria-label="${esc(fhCheckTitle(n, f))}"><button class="btn" type="button" data-ck="keep" data-id="${f.id}">Client confirmed this</button><button class="btn" type="button" data-ck="blank" data-id="${f.id}">Not confirmed, leave blank</button>`;
  if (f.fix === "urgent") row = `<button class="btn" type="button" data-ck="keep" data-id="${f.id}">Keep Urgent</button><button class="btn" type="button" data-ck="soon" data-id="${f.id}">Change to Soon</button>`;
  if (f.fix === "area") row = `${f.suggest ? `<button class="btn" type="button" data-ck="use" data-id="${f.id}">Use ${esc(fhAreaLabel(f.suggest))}</button>` : ""}<button class="btn" type="button" data-ck="keep" data-id="${f.id}">Keep “${esc(f.value)}”</button>`;
  return `<div class="flagitem fh-check" data-check="${f.id}"><div><b><span class="ic" aria-hidden="true">⚠</span> Check · ${esc(fhCheckTitle(n, f))}</b> ${esc(f.text)}</div>${quote}<div class="row">${row}</div></div>`;
}
function fhWireNote(n, canSave) {
  app.querySelectorAll("[data-ck]").forEach(b => b.onclick = () => {
    syncNote();
    const f = n.flags.find(x => x.id === b.dataset.id), k = n.key_info, a = b.dataset.ck;
    if (f.fix === "hedge") {
      const v = a === "blank" ? "" : document.getElementById("cx-" + f.id).value.trim();
      if (a === "keep" && !v) { toast("Enter what the client confirmed, or choose Not confirmed."); return; }
      if (f.field === "next_steps") { const s = n.next_steps.find(x => x.text === f.step); if (s) s.due = v; }
      else { k[f.field].value = v; k[f.field].by = ME; k[f.field].how = a === "keep" ? "Confirmed with client" : "Not confirmed"; }
      f.result = a === "blank" ? "Left blank until confirmed" : v === f.value ? `Kept ${fhDay(v)}, confirmed with client` : `Changed ${fhDay(f.value)} → ${fhDay(v)}, confirmed with client`;
    }
    if (f.fix === "urgent") { const x = n.immediate_needs.find(y => y.text === f.need); if (a === "soon" && x) x.priority = "Soon"; f.result = a === "soon" ? "Changed Urgent → Soon" : "Kept Urgent"; }
    if (f.fix === "area") {
      if (a === "use") { k.locality.value = f.suggest; k.locality.by = ME; k.locality.heard_as = f.value; }
      f.result = a === "use" ? `Set to ${fhAreaLabel(f.suggest)} (heard as “${f.value}”)` : `Kept “${f.value}”. Distances will be from the office`;
    }
    f.resolved = true; n.edits++;
    logEvent(k.name.value, "Check resolved", `${fhCheckTitle(n, f)}: ${f.result} · ${ME}`);
    renderNote();
  });
  app.querySelectorAll("[data-keyfact]").forEach(cb => cb.onchange = () => {
    const fact = fhKeyFacts(n).find(x => x[0] === cb.dataset.keyfact);
    n.keyfacts = n.keyfacts || {}; n.keyfacts[fact[0]] = cb.checked ? fact[2] : null;
    logEvent(n.key_info.name.value, cb.checked ? "Key fact confirmed" : "Key fact unconfirmed", `${fact[1]}: ${fact[2]}`);
    document.getElementById("btn-save").disabled = !canSave();
  });
}
/* Name, release date and top need: a mistake in any of these sends every later step the wrong way. */
function fhKeyFacts(n) {
  const k = n.key_info, pr = { Urgent: 0, Soon: 1, Later: 2 };
  const top = n.immediate_needs.slice().sort((a, b) => (pr[a.priority] ?? 3) - (pr[b.priority] ?? 3))[0];
  const rd = k.release_date && k.release_date.value, d = rd ? parseDate(rd) : null;
  return [["name", "Name", k.name.value || "Not said"], ["release", "Release date", d && !isNaN(d) ? `${fmt(d)}, ${d.getFullYear()}` : "Not said"], ["need", "Top need", top ? `${top.priority} · ${top.text}` : "None"]];
}
const fhKeyFactsOk = n => fhKeyFacts(n).every(([id, , v]) => n.keyfacts && n.keyfacts[id] === v);
function fhKeyFactsBox(n) {
  const first = String(n.key_info.name.value || "the client").split(" ")[0], ok = fhKeyFactsOk(n);
  return `<div class="fh-keyfacts ${ok ? "y" : "n"}" id="keyfacts"><b><span aria-hidden="true">${ok ? "✓" : "⚠"} </span>Confirm the key facts with ${esc(first)}</b>
   <span class="small muted">A wrong name, release date or top need sends every referral the wrong way.</span>
   ${fhKeyFacts(n).map(([id, l, v]) => `<label class="chk"><input type="checkbox" data-keyfact="${id}" ${n.keyfacts && n.keyfacts[id] === v ? "checked" : ""}> <span>${l}: <b>${esc(v)}</b></span></label>`).join("")}</div>`;
}

/* ---------- 5. Close the loop: did they show up? ---------- */
const fhDue = () => Store.where("Referral", r => r.Status === "Accepted" && r.Appointment && r.Appointment.date < TODAY_ISO && !r.Attendance);
function fhOutcomesBox() {
  const due = fhDue();
  if (!due.length) return "";
  return `<div class="pane" id="outcomes-due"><h2>Did they show up? <span class="tag warn">${due.length}</span></h2>
   <p class="small muted" style="margin-bottom:8px">Appointments that have passed. One tap records it, and the provider's show-up rate in the network updates.</p>
   ${due.map(fhAttendRow).join("")}</div>`;
}
function fhAttendRow(r) {
  const c = Store.get("Client", r.ClientId) || {}, first = String(c.Name || "the client").split(" ")[0], T = FH.texts[r.Id];
  return `<div class="fh-attend" data-ref="${r.Id}">
   <p><b>Did ${esc(first)} show up?</b> ${esc(r.Partner)} · ${esc(msWhen(r.Appointment.date, r.Appointment.time))}</p>
   <div class="btns"><button class="btn" type="button" data-attend="showed" data-ref="${r.Id}">Showed up</button><button class="btn" type="button" data-attend="noshow" data-ref="${r.Id}">No-show</button><button class="btn" type="button" data-attend="resched" data-ref="${r.Id}">Reschedule</button>${T ? "" : `<button class="btn ghost" type="button" data-attend="text" data-ref="${r.Id}">Text ${esc(first)} to ask</button>`}</div>
   ${FH.resched === r.Id ? `<div class="ms-inline" style="margin-top:8px"><input type="date" id="fh-rdate" min="${TODAY_ISO}" aria-label="New date"><input type="time" id="fh-rtime" value="${esc(r.Appointment.time || "")}" aria-label="New time"><button class="btn primary" type="button" data-attend="resched-save" data-ref="${r.Id}">Save new date</button><button class="btn ghost" type="button" data-attend="resched-cancel" data-ref="${r.Id}">Cancel</button></div>` : ""}
   ${T ? `<div class="ms-phone fh-text" aria-label="Text to ${esc(first)}"><div class="to">To ${esc(first)} · ${esc(c.Phone || "")}</div><div class="ms-bubble out">${esc(T.msg)}</div><span class="st">Sent (simulated)</span>
     ${T.reply ? `<div class="ms-bubble in" id="fh-reply">${esc(T.reply)}</div>` : `<div class="ms-sim" role="group" aria-label="Simulate the client's reply"><span class="tag sim">Prototype</span><b class="small">Simulate ${esc(first)}'s reply</b><button class="btn" type="button" data-attend="reply1" data-ref="${r.Id}">1 (yes)</button><button class="btn" type="button" data-attend="reply2" data-ref="${r.Id}">2 (no)</button></div>`}</div>` : ""}
  </div>`;
}
function fhShowRate(r) {
  if (typeof NET === "undefined" || !NET.data) return "";
  const pid = netRefPid(r); if (!pid) return "";
  const s = netStats(netRefs("both").filter(x => x.pid === pid));
  return s.placed ? ` ${r.Partner}: ${s.showed} of ${s.placed} placed clients showed up (${pct(s.showed, s.placed)}).` : "";
}
function fhRecordAttend(r, showed, via) {
  const c = Store.get("Client", r.ClientId) || {}, first = String(c.Name || "").split(" ")[0], d = parseDate(r.Appointment.date);
  Store.update("Referral", r.Id, { Attendance: showed ? "Showed up" : "No-show", Stage: showed ? "Attended" : "No-show", AttendanceDate: TODAY_ISO, AttendanceVia: via });
  Store.insert("Interaction", { ClientId: r.ClientId, Date: TODAY_ISO, Type: "Attendance", Channel: /text/i.test(via) ? "SMS (simulated)" : "Case manager", Template: "Outcome check", SourceName: null,
    Summary: `${first} ${showed ? "showed up at" : "did not show up at"} ${r.Partner} on ${fmt(d)}. Recorded from ${via}.` });
  Store.where("Goal", g => g.ClientId === r.ClientId && g.Status === "Open" && (g.ReferralId === r.Id || String(g.Text).includes(r.Partner))).forEach(g => Store.update("Goal", g.Id, { Status: "Done" }));
  if (!showed) {
    const t = new Date(TODAY); t.setDate(t.getDate() + 1);
    Store.insert("Goal", { ClientId: r.ClientId, ReferralId: r.Id, Type: "Follow-up call", Text: `Call ${first} about the missed ${r.Partner} appointment and rebook.`, DueDate: iso(t), Status: "Open", InteractionId: null });
    Store.update("Client", r.ClientId, { Status: "Needs follow-up" });
  } else Store.update("Client", r.ClientId, { Status: "Active" });
  Store.save();
  const rate = fhShowRate(Store.get("Referral", r.Id));
  logEvent(c.Name, "Attendance recorded", `"${r.Partner}" · ${fmt(d)} · ${showed ? "Showed up" : "No-show"} · from ${via}${rate ? " ·" + rate : ""}`);
  toast(`${showed ? "Showed up" : "No-show"} recorded.${rate}`);
}
app.addEventListener("click", e => {
  const b = e.target.closest("[data-attend]"); if (!b) return;
  const r = Store.get("Referral", b.dataset.ref); if (!r) return;
  const c = Store.get("Client", r.ClientId) || {}, first = String(c.Name || "").split(" ")[0], a = b.dataset.attend;
  if (a === "showed" || a === "noshow") fhRecordAttend(r, a === "showed", ME);
  if (a === "resched") FH.resched = r.Id;
  if (a === "resched-cancel") FH.resched = null;
  if (a === "resched-save") {
    const date = document.getElementById("fh-rdate").value, time = document.getElementById("fh-rtime").value || r.Appointment.time;
    if (!date) { document.getElementById("fh-rdate").focus(); return; }
    const before = msWhen(r.Appointment.date, r.Appointment.time), after = new Date(parseDate(date)); after.setDate(after.getDate() + 1);
    Store.update("Referral", r.Id, { Appointment: { date, time }, Stage: "Accepted", Rescheduled: (r.Rescheduled || 0) + 1 });
    Store.insert("Goal", { ClientId: r.ClientId, ReferralId: r.Id, Type: "Attendance check", Text: `Check with ${r.Partner} that ${first} attended on ${fmt(parseDate(date))}.`, DueDate: iso(after), Status: "Open", InteractionId: null });
    Store.save(); FH.resched = null;
    logEvent(c.Name, "Appointment rescheduled", `"${r.Partner}" · ${before} → ${msWhen(date, time)}`);
    toast("New date saved. A check-in reminder was added.");
  }
  if (a === "text") {
    FH.texts[r.Id] = { msg: `Hi ${first}, it's ${ME}. Did you make it to ${r.Partner} on ${msWhen(r.Appointment.date, r.Appointment.time).split(",")[0]}? Reply 1 yes, 2 no.` };
    logEvent(c.Name, "Outcome text sent", `"${r.Partner}" · ${FH.texts[r.Id].msg} · simulated`);
  }
  if (a === "reply1" || a === "reply2") {
    const yes = a === "reply1";
    FH.texts[r.Id].reply = yes ? "1" : "2";
    logEvent(c.Name, "Client replied", `"${r.Partner}" · ${yes ? "1 (yes)" : "2 (no)"} · simulated`);
    fhRecordAttend(r, yes, "client's text reply (simulated)");
  }
  render();
});

/* ---------- 6. New to you ---------- */
const FH_NET_CAT = { Housing: "Housing", Medication: "Health", ID: "ID & documents", Food: "Food", Work: "Employment", Transportation: "Transportation" };
function fhSvcFromProv(p, home, cat) {
  const hist = NET.data.history.filter(h => h.p === p.id), placed = hist.filter(h => NET_PLACED.includes(h.s)).length;
  const d = p.lat ? netMiles(netArea(home).center, [p.lon, p.lat]) : null, src = netSource(p);
  const s = { id: "net-" + p.id, netPid: p.id, newToYou: true, name: p.name, type: "External", real: !src.sim, listing_source: src.label + (src.updated ? `, updated ${src.updated}` : ""),
    address: p.addr, distance_mi: d == null ? 0 : Math.round(d * 10) / 10, distance_from: netArea(home).name, phone: p.phone || "Phone not listed", hours: p.hours || "Hours not listed",
    availability: { kind: "unknown", text: "Unknown, call to check", updated: null, simulated: false }, rules: [],
    history: { accepted: placed, total: hist.length, reply_days: null, rating: null, raters: 0 },
    why: `The nearest ${String(cat || "service").toLowerCase()} listing to ${netArea(home).name} in the public directory that you have not used yet.${p.note ? " " + String(p.note).replace(/\.?$/, ".") : ""}`, bring: "your release papers" };
  (MS.newSvc = MS.newSvc || {})[s.id] = s;
  return s;
}
function fhNewSvc(c, n) {
  if (typeof NET === "undefined" || !NET.data) return null;
  const cat = FH_NET_CAT[n.cat]; if (!cat) return null;
  const home = netAreaOf(c.locality) || MS_HOME_AREA, center = netArea(home).center;
  const counts = {}; NET.data.history.forEach(h => counts[h.p] = (counts[h.p] || 0) + 1);
  const turned = msBoard(c).turned[n.rec.Id] || {};
  const sent = new Set(Store.where("Referral", r => r.NeedId === n.rec.Id).map(r => r.ServiceId));
  const pool = NET.data.providers.filter(p => p.lat && (p.cat || []).includes(cat) && !netIsPartner(p) && (counts[p.id] || 0) <= 3 && !turned["net-" + p.id] && !sent.has("net-" + p.id))
    .map(p => ({ p, d: netMiles(center, [p.lon, p.lat]) })).sort((a, b) => a.d - b.d);
  return pool.length ? fhSvcFromProv(pool[0].p, home, cat) : null;
}
function fhSvcById(id) {
  if (!String(id).startsWith("net-")) return null;
  if (MS.newSvc && MS.newSvc[id]) return MS.newSvc[id];
  if (typeof NET === "undefined" || !NET.data || !NET.data.provBy[id.slice(4)]) return null;
  const c = clients().find(x => x.id === state.sel);
  const p = NET.data.provBy[id.slice(4)];
  return fhSvcFromProv(p, (c && netAreaOf(c.locality)) || MS_HOME_AREA, (p.cat || [])[0]);
}
function fhNewCard(c, n) {
  if (typeof NET === "undefined") return "";
  if (!NET.data) { if (!NET.failed) fhNetReady().then(() => { if (state.view === "services" && NET.data) renderServices(); }); return ""; }
  const s = fhNewSvc(c, n); if (!s) return "";
  const B = msBoard(c), e = msEval(s, c, msFacts(c));
  B.newShown = B.newShown || {};
  if (B.newShown[n.rec.Id] !== s.id) { B.newShown[n.rec.Id] = s.id; logEvent(c.name, "New-to-you shown", `${n.cat} · "${s.name}" · ${s.distance_mi} mi from ${s.distance_from} · ${s.history.total} network referrals`); }
  return `<div class="fh-new" id="ms-newtoyou"><h2>New to you <span class="small muted" style="text-transform:none;letter-spacing:0;font-weight:400">One nearby service from the public directory that isn't on your partner list</span></h2>
   <article class="ms-card fh-newcard" data-svc="${s.id}" aria-label="${esc(s.name)}">
    <header><span class="tag warn">New to you</span>${msRealTag(s)}<h3>${esc(s.name)}</h3></header>
    <p class="meta">${esc(s.address)}${s.distance_mi ? ` · ${s.distance_mi} mi from ${esc(s.distance_from)}` : ""}<br>${esc(s.phone)} · ${esc(s.hours)}</p>
    ${msConfLine(e)}
    <div class="blk"><b>Availability</b>${esc(s.availability.text)}</div>
    <p class="ms-why"><b>Why it's suggested:</b> ${esc(s.why)}</p>
    <p class="ms-prov">Listing: ${esc(s.listing_source)}.</p>
    ${B.declining === s.id ? `<div class="ms-reasons" role="group" aria-label="Why not this one?"><p>Why not this one?</p>${msCfg().turn_down_reasons.map(r => `<button type="button" class="btn" data-ms="turn" data-svc="${s.id}" data-reason="${esc(r)}">${esc(r)}</button>`).join("")}<button type="button" class="btn ghost" data-ms="turn-cancel">Cancel</button></div>`
      : `<div class="btns"><button type="button" class="btn primary" data-ms="refer" data-svc="${s.id}">Refer</button><button type="button" class="btn" data-ms="decline" data-svc="${s.id}">Not this one</button></div>`}
   </article></div>`;
}

/* Load the Chicago directory at start, for the neighborhood check and the new-to-you card. */
if (typeof netLoad === "function") netLoad();
