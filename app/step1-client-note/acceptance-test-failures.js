// Class demo: what the product does when things go wrong. Runs every case on the Demo menu.
// 1. python3 -m http.server 8000 (in this folder)   2. NODE_PATH=$(npm root -g) node acceptance-test-failures.js
const { chromium } = require('playwright');
const URL = process.env.PROTO_URL || 'http://localhost:8000/';
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : '  → ' + extra}`); };
const txt = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ');
const keyFacts = async p => { for (const k of await p.$$('[data-keyfact]:not(:checked)')) await k.check(); };
const pickWhy = async p => { for (const s of await p.$$('[data-why]')) { if (!(await s.inputValue())) await s.selectOption({ index: 1 }); } };
async function fresh(b) {
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#demo-pick');
  await p.waitForFunction(() => NET.data);
  return p;
}
async function demo(p, v) { await p.selectOption('#demo-pick', v); await p.waitForSelector('#seenote:not([hidden])', { timeout: 15000 }); await p.click('#seenote'); await p.waitForSelector('#btn-save'); }
async function approve(p) {
  await p.check('#rv1'); await keyFacts(p);
  await p.click('#btn-save');
  const ok = await p.waitForSelector('#fast-ok', { timeout: 1500 }).catch(() => null); if (ok) await ok.click();
  await p.waitForSelector('#ms-board');
}
const logHas = (p, ev) => p.evaluate(ev => ACTIVITY.some(a => a.event === ev), ev);

(async () => {
  const b = await chromium.launch();

  /* ---- Demo menu ---- */
  let p = await fresh(b);
  const opts = await p.$$eval('#demo-pick option', os => os.map(o => o.textContent));
  check('1. The top bar has a Class demo menu: happy path, misheard intake, shaky Urgent, stale match', ['Happy path', 'Misheard', 'Urgent', 'Stale'].every(w => opts.some(o => o.includes(w))), opts.join(' | '));
  check('1. Without the helper the bar says real AI is not running and the demo cases replay saved runs', /not running.*replay saved real-AI runs/.test(await txt(p, '.mockbar')));

  /* ---- Happy path ---- */
  await demo(p, 'happy');
  check('1. Happy path opens Andre\'s sample note with only its two usual flags', (await p.$$('#flags .flagitem')).length === 2 && (await p.textContent('h1')).includes('Andre Williams'));
  await p.selectOption('#fx-f1', 'Male'); await p.selectOption('#fxs-f1', 'Asked client'); await p.click('[data-fix="f1"]');
  await p.fill('#fx-f2', '773-555-0186'); await p.click('[data-fix="f2"]'); await pickWhy(p);
  await p.check('#rv1');
  check('2. Approve stays disabled until the key facts are confirmed', await p.isDisabled('#btn-save'));
  const facts = await txt(p, '#keyfacts');
  check('2. Key facts box shows name, release date and top need', /Name: Andre Williams/.test(facts) && /Release date: Nov 2, 2026/.test(facts) && /Top need: Urgent · Medication/.test(facts), facts);
  await keyFacts(p);
  check('2. Ticking all three enables Approve', !(await p.isDisabled('#btn-save')));
  await p.click('#btn-save'); const ok1 = await p.waitForSelector('#fast-ok', { timeout: 1500 }).catch(() => null); if (ok1) await ok1.click();
  await p.waitForSelector('#ms-board');
  await p.click('.ms-bucket:has(.ms-bopen b:text-is("Housing")) .ms-bopen'); await p.waitForSelector('#ms-cards');
  const top = await txt(p, '#ms-cards .ms-card');
  check('3. Happy path: Teamwork is #1 with a green confidence line', /#1/.test(top) && /Teamwork/.test(top) && /Confidence: openings updated 1 day ago · based on 11 referrals/.test(top), top.slice(0, 300));
  await p.click('#ms-cards .ms-card [data-ms="refer"]'); await p.check('#ms-consent');
  check('4. A high-confidence card has no call-first gate and Send works after consent', !(await p.$('#ms-gate')) && !(await p.isDisabled('#ms-send')));
  await p.click('[data-ms="refer-cancel"]');
  const nt = await p.$('#ms-newtoyou');
  const ntText = nt ? await txt(p, '#ms-newtoyou') : '';
  check('6. Each need has one "New to you" card from the public directory, low confidence', !!nt && /New to you/.test(ntText) && /Low confidence/.test(ntText) && /not one of your partners yet/.test(ntText) && /mi from Englewood/.test(ntText), ntText.slice(0, 300));
  await p.click('#ms-newtoyou [data-ms="refer"]');
  check('6. Referring a new-to-you service needs a call first', !!(await p.$('#ms-gate')));
  await p.check('#ms-consent'); await p.check('input[name="ms-gate"][value="called"]'); await p.click('#ms-send');
  const ref = await p.evaluate(() => Store.all('Referral').slice(-1)[0]);
  check('6. The referral is saved with its directory id, marked new to you, and the call is stored', ref.NewToYou === true && !!ref.ProviderId && ref.CallFirst && /Called/.test(ref.CallFirst.Choice), JSON.stringify(ref).slice(0, 300));
  check('6. Activity log records "New-to-you shown" and "Call-first gate"', await logHas(p, 'New-to-you shown') && await logHas(p, 'Call-first gate'));
  check('1. Happy path: no script errors', p.errors.length === 0, p.errors.join('; '));
  await p.close();

  /* ---- Misheard intake (Rosa) ---- */
  p = await fresh(b);
  await demo(p, 'misheard');
  const banner = await txt(p, '#draft-note-info');
  check('1. Misheard intake replays a saved real-AI run and says so', /Saved real-AI run/.test(banner), banner);
  const flags = await txt(p, '#flags');
  check('2. The unsure date ("Tuesday I think") is a Check flag on the probation step', /Check · Next step “Report to probation/.test(flags) && /said “I think”/.test(flags) && /Tue Nov 17/.test(flags), flags.slice(0, 400));
  check('2. "La Villita" is flagged as not a community area, with Little Village suggested', /“La Villita” is not one of Chicago's 77 community areas/.test(flags) && /Use Little Village \(South Lawndale\)/.test(flags));
  check('2. The neighborhood field shows an amber Check tag', /Check/.test(await txt(p, 'label.flagged:has(#k-locality)')));
  check('2. The step shows "Check due date"', /Check due date/.test(await txt(p, '#steps')));
  check('2. Approve is blocked while checks are open', await p.isDisabled('#btn-save'));
  await p.click('[data-ck="use"]');
  check('2. Using the suggestion sets the neighborhood to Little Village', (await p.inputValue('#k-locality')) === 'Little Village');
  await p.click('[data-ck="blank"][data-id^="c-step"]');
  check('2. "Not confirmed" clears the step\'s due date', /Left blank until confirmed/.test(await txt(p, '#flags')) && /Report to probation[^]*?Due: not said/.test(await txt(p, '#steps')));
  const gid = await p.$eval('#flags [id^="fxs-"]', e => e.id.slice(4));
  await p.selectOption('#fxs-' + gid, 'Not known'); await p.click(`[data-fix="${gid}"]`); await pickWhy(p);
  await approve(p);
  await p.click('.ms-bucket:has(.ms-bopen b:text-is("Food")) .ms-bopen'); await p.waitForSelector('#ms-cards');
  const card = await txt(p, '#ms-need');
  check('2. After the fix Rosa counts as a Chicago resident and distances are from Little Village for the new-to-you card', /Little Village/.test(card) && /mi from South Lawndale/.test(card), card.slice(0, 400));
  check('2. Activity log records "Check resolved" and "Key facts confirmed"', await logHas(p, 'Check resolved') && await logHas(p, 'Key facts confirmed'));
  check('1. Misheard intake: no script errors', p.errors.length === 0, p.errors.join('; '));
  await p.close();

  /* ---- Shaky Urgent (Darius) ---- */
  p = await fresh(b);
  await demo(p, 'urgent');
  const df = await txt(p, '#flags');
  check('2. An Urgent need with 10 days of pills asks "Keep Urgent / Change to Soon"', /Check · Urgent: Medication/.test(df) && /about 10 days left/.test(df) && /Keep Urgent/.test(df) && /Change to Soon/.test(df), df.slice(0, 400));
  await p.click('[data-ck="soon"]');
  check('2. "Change to Soon" changes the need\'s priority', /Soon[^]*?About ten days of blood pressure pills/.test(await txt(p, '#needs')) && /Changed Urgent → Soon/.test(await txt(p, '#flags')));
  check('1. Shaky Urgent: no script errors', p.errors.length === 0, p.errors.join('; '));
  await p.close();

  /* ---- Stale match ---- */
  p = await fresh(b);
  await demo(p, 'stale');
  check('1. The bar shows the stale-match demo is on', !!(await p.$('#demo-stale-on')));
  await p.selectOption('#fx-f1', 'Male'); await p.selectOption('#fxs-f1', 'Asked client'); await p.click('[data-fix="f1"]');
  await p.fill('#fx-f2', '773-555-0186'); await p.click('[data-fix="f2"]'); await pickWhy(p);
  await approve(p);
  await p.click('.ms-bucket:has(.ms-bopen b:text-is("Housing")) .ms-bopen'); await p.waitForSelector('#ms-cards');
  const names = await p.$$eval('#ms-cards .ms-card h3', hs => hs.map(h => h.textContent));
  const tw = await txt(p, '.ms-card[data-svc="hou-teamwork"]').catch(() => '');
  check('3. With 41-day-old openings and 2 referrals, Teamwork is no longer #1', names[0] !== 'Teamwork Englewood CRSC', names.join(' | '));
  check('3. Its card says "Low confidence: openings updated 41 days ago · based on 2 referrals"', /Low confidence: openings updated 41 days ago · based on 2 referrals/.test(tw), tw.slice(0, 300));
  check('3. Its availability says it is old and treated as unknown, not as current openings', /Last reported Oct 1: .*41 days old, so the ranking treats openings as unknown/.test(tw));
  await p.click('.ms-card[data-svc="hou-teamwork"] [data-ms="refer"]'); await p.check('#ms-consent');
  check('4. Consent alone no longer sends: the call-first gate blocks Send', !!(await p.$('#ms-gate')) && await p.isDisabled('#ms-send'));
  await p.check('input[name="ms-gate"][value="unreached"]');
  check('4. "Couldn\'t reach them" needs a reason', await p.isDisabled('#ms-send'));
  await p.fill('#ms-gatewhy', 'Housing ends Friday, will call again tomorrow');
  check('4. With a reason, Send is enabled', !(await p.isDisabled('#ms-send')));
  await p.click('#ms-send');
  const r2 = await p.evaluate(() => Store.all('Referral').slice(-1)[0]);
  check('4. The choice and reason are stored on the Referral', r2.CallFirst && /Couldn't reach/.test(r2.CallFirst.Choice) && /Friday/.test(r2.CallFirst.Why), JSON.stringify(r2.CallFirst));
  check('1. Stale match: no script errors', p.errors.length === 0, p.errors.join('; '));
  await p.close();

  /* ---- Close the loop ---- */
  p = await fresh(b);
  const od = await txt(p, '#outcomes-due');
  check('5. Home asks "Did Marcus show up?" for the Cara Collective appointment on Tue Nov 10', /Did they show up\?/.test(od) && /Did Marcus show up\?/.test(od) && /Cara Collective · Tue Nov 10/.test(od), od);
  await p.click('[data-attend="text"]');
  check('5. Texting Marcus shows the simulated "Reply 1 yes, 2 no" text', /Reply 1 yes, 2 no/.test(await txt(p, '#outcomes-due')));
  await p.click('[data-attend="reply2"]');
  const mr = await p.evaluate(() => Store.all('Referral').find(r => r.Partner === 'Cara Collective'));
  check('5. A "2" reply records a no-show on the referral', mr.Attendance === 'No-show' && mr.Stage === 'No-show', JSON.stringify(mr));
  check('5. The question leaves Home and a follow-up call is added', !(await p.$('#outcomes-due')) && await p.evaluate(() => Store.all('Goal').some(g => g.Type === 'Follow-up call' && /Marcus/.test(g.Text))));
  check('5. Activity log records the text, the reply and the attendance', await logHas(p, 'Outcome text sent') && await logHas(p, 'Client replied') && await logHas(p, 'Attendance recorded'));
  await p.click('#nav-network'); await p.waitForSelector('[data-net-tab="pipeline"]'); await p.click('[data-net-tab="pipeline"]'); await p.waitForSelector('#net-pipe');
  check('5. The pipeline shows the no-show', /No-show/.test(await txt(p, '#net-pipe')));
  check('5. Close the loop: no script errors', p.errors.length === 0, p.errors.join('; '));
  await p.close();

  await b.close();
  console.log(`\n${pass} of ${pass + fail} checks pass`);
  process.exit(fail ? 1 : 0);
})();
