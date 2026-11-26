// Plays lab cases 1-4 through the prototype's real-AI screens, as Denise would see them.
// The laptop helper's three endpoints are answered in the browser: api/status says real AI is on,
// api/transcribe returns the case's transcript lines, and api/draft-note returns the model's note
// from results/<case>.raw.json (or results/<case>.json from run_lab_cases.py, if present).
// 1. In app/step1-client-note: python3 -m http.server 8000   2. node run-in-prototype.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.PROTO_URL || 'http://localhost:8000/';
const HERE = __dirname, OUT = path.join(HERE, 'results');
const AUDIO = path.join(HERE, '..', 'audio', '05-andre-followup-call.m4a');   // any audio file; its words are not used
const cases = JSON.parse(fs.readFileSync(path.join(HERE, 'cases.json'))).cases.filter(c => c.lines);
const secs = t => t.split(':').reduce((a, x) => a * 60 + Number(x), 0);

function noteFor(id) {
  const real = path.join(OUT, `${id}.json`), raw = path.join(OUT, `${id}.raw.json`);
  if (fs.existsSync(real)) { const j = JSON.parse(fs.readFileSync(real)); return { note: j.note, model: j.model, from: 'run_lab_cases.py' }; }
  const n = JSON.parse(fs.readFileSync(raw));
  if (Array.isArray(n.key_info)) n.key_info = Object.fromEntries(n.key_info.map(f => [f.key, f]));   // same as ai_client.draft_note
  return { note: n, model: 'claude-opus-5-5', from: 'raw run' };
}

(async () => {
  const b = await chromium.launch();
  const all = {};
  for (const c of cases) {
    const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const d = noteFor(c.id);
    await p.route('**/api/status', r => r.fulfill({ json: { helper: true, mode: 'real', provider: 'hf-inference', model: 'openai/whisper-large-v3', key_found: true, draft_key_found: true, draft_model: 'claude-sonnet-5-5',
      note: { enabled: true, model: d.model, key_found: true, sdk_installed: true }, document: { enabled: false } } }));
    await p.route('**/api/log', r => r.fulfill({ json: { ok: true } }));
    await p.route('**/api/transcribe', r => r.fulfill({ json: { ok: true, mode: 'real', model: 'openai/whisper-large-v3', seconds: 4.2,
      text: c.lines.map(l => l[1]).join(' '), segments: c.lines.map(([t, x], i) => ({ start: secs(t), end: c.lines[i + 1] ? secs(c.lines[i + 1][0]) : secs(t) + 20, text: x })) } }));
    await p.route('**/api/draft-note', r => r.fulfill({ json: { ok: true, model: d.model, note: d.note, seconds: 30 } }));
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#btn-new');
    await p.waitForTimeout(300);
    await p.click('#btn-new'); await p.setInputFiles('#file', AUDIO);
    await p.waitForSelector('#mgo:not([disabled])'); await p.click('#mgo');
    await p.waitForSelector('#seenote:not([hidden])', { timeout: 20000 }); await p.click('#seenote');
    await p.waitForSelector('#btn-save');
    const flags = await p.$$eval('#flags .flagitem', fs => fs.map(f => f.innerText.replace(/\s+/g, ' ').trim()));
    const screen = (await p.innerText('#app')).replace(/\n{2,}/g, '\n');
    await p.screenshot({ path: path.join(OUT, `${c.id}-prototype.png`), fullPage: true });
    all[c.id] = { note_from: d.from, flags, screen, errors };
    fs.writeFileSync(path.join(OUT, `${c.id}-prototype.txt`), `FLAGS\n${flags.join('\n')}\n\nSCREEN\n${screen}`);
    console.log(`✓ ${c.id}: ${flags.length} flags${errors.length ? ' · errors: ' + errors.join('; ') : ''}`);
    await p.close();
  }
  await b.close();
})();
