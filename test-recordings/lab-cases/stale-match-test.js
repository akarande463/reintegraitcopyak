// Lab case 5: does the Step 2 ranking warn when the top match rests on stale, thin data?
// 1. In app/step1-client-note: python3 -m http.server 8000   2. node stale-match-test.js
// Changes Teamwork Englewood's Housing listing in the browser only: openings updated 2026-10-01 (41 days before
// the prototype's date, Nov 11) and 2 of 2 referrals accepted, 1 rating. The repo files are not changed.
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.PROTO_URL || 'http://localhost:8000/';
const OUT = __dirname + '/results';
const pickWhy = async p => { for (const s of await p.$$('[data-why]')) { if (!(await s.inputValue())) await s.selectOption({ index: 1 }); } };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.route('**/simulated_responses.json', async r => {
    const j = await (await r.fetch()).json();
    const t = j.matched_services.needs.Housing.candidates.find(s => s.id === 'hou-teamwork');
    t.availability.updated = '2026-10-01';
    t.history = { accepted: 2, total: 2, reply_days: 1, rating: 5, raters: 1, simulated: true };
    await r.fulfill({ json: j });
  });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#btn-new');
  await p.click('#btn-new'); await p.click('#sample');
  await p.waitForSelector('#mgo:not([disabled])'); await p.click('#mgo');
  await p.waitForSelector('#seenote:not([hidden])', { timeout: 10000 }); await p.click('#seenote');
  await p.selectOption('#fx-f1', 'Male'); await p.selectOption('#fxs-f1', 'Asked client'); await p.click('[data-fix="f1"]');
  await p.fill('#fx-f2', '773-555-0186'); await p.click('[data-fix="f2"]'); await pickWhy(p);
  await p.check('#rv1'); await p.click('#btn-save');
  const ok = await p.waitForSelector('#fast-ok', { timeout: 800 }).catch(() => null); if (ok) await ok.click();
  await p.waitForSelector('#ms-board');
  await p.click('.ms-bucket:has(.ms-bopen b:text-is("Housing")) .ms-bopen'); await p.waitForSelector('#ms-cards');
  const cards = await p.$$eval('#ms-cards .ms-card', cs => cs.map(c => ({ name: c.querySelector('h3').textContent, text: c.innerText.replace(/\s+/g, ' ') })));
  fs.mkdirSync(OUT, { recursive: true });
  await p.screenshot({ path: OUT + '/5-stale-match-cards.png', fullPage: true });
  await p.click('.ms-card[data-svc="hou-teamwork"] [data-ms="refer"]');
  const refer = (await p.textContent('#ms-refer')).replace(/\s+/g, ' ');
  await p.check('#ms-consent');
  const canSend = !(await p.isDisabled('#ms-send'));
  await p.screenshot({ path: OUT + '/5-stale-match-refer.png', fullPage: true });
  const out = { order: cards.map(c => c.name), cards, refer_panel: refer, can_send_after_consent_only: canSend };
  fs.writeFileSync(OUT + '/5-failure-stale-match.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
