// Review safeguards added after the Nov 17 test log. Run with the prototype served on :8000.
const { chromium } = require('playwright');
const URL = process.env.PROTO_URL || 'http://localhost:8000/';
let fails = 0;
const check = (name, ok) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + name); if (!ok) fails++; };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-new');
  await p.click('[data-reset]');
  await p.click('#btn-new'); await p.click('#sample');
  await p.waitForSelector('#mgo:not([disabled])'); await p.click('#mgo');
  await p.waitForSelector('#seenote:not([hidden])', { timeout: 10000 }); await p.click('#seenote');

  // 1. Banner when the real transcript failed, and the stricter review box
  check('1. No sample-transcript banner when nothing failed', !(await p.$('#sample-banner')));
  await p.evaluate(() => { state.note.real = { status: 'failed', error: 'Out of credits.' }; renderNote(); });
  check('1. Banner says the draft is from the sample transcript', (await p.textContent('#sample-banner')).includes('not your recording'));
  check('1. Review box asks for a check against the recording', (await p.textContent('#review')).includes('I checked this note against the recording myself'));

  // 3. Phone fix checks
  check('3. Unclear phone shows what was heard', (await p.textContent('#flags')).includes('Heard in recording: 773-555-01__'));
  await p.fill('#fx-f2', '773555555'); await p.click('[data-fix="f2"]');
  check('3. A 9-digit phone is rejected', (await p.textContent('#fxe-f2')).includes('10 digits'));
  await p.fill('#fx-f2', '773-551-0987'); await p.click('[data-fix="f2"]');
  check('3. A fix that changes the heard digits gets a warning', (await p.textContent('#fxe-f2')).includes('changes the part that was heard') && !!(await p.$('[data-fixforce="f2"]')));
  await p.fill('#fx-f2', '773-555-0186'); await p.click('[data-fix="f2"]');
  check('3. A matching 10-digit phone is saved and marked "Entered by Denise"', (await p.textContent('#note')).includes('Entered by Denise'));

  // 4. Source for unstated facts
  await p.click('[data-fix="f1"]');
  check('4. Gender fix needs a source', (await p.textContent('#fxe-f1')).includes('where this came from'));
  await p.selectOption('#fxs-f1', 'Not known'); await p.click('[data-fix="f1"]');
  check('4. "Not known" resolves the flag without guessing', (await p.textContent('#flags')).includes('Set to Not stated · Not known'));

  // 5. Declined urgent suggestion needs a reason
  await p.check('#rv1');
  check('5. Approval blocked until the declined urgent suggestion has a reason',
    await p.isDisabled('#btn-save') && (await p.textContent('#chk-why')).includes('declined without a reason'));
  await p.selectOption('[data-why]', 'Not now, revisit next visit');
  check('5. Choosing a reason unblocks approval', !(await p.isDisabled('#btn-save')));

  // 2. Fast approval
  await p.click('#btn-save');
  await p.waitForSelector('#fast-ok', { timeout: 2000 });
  check('2. Approving faster than the recording asks "Approve without listening?"', (await p.textContent('#fastwarn')).includes('Approve without listening?'));
  await p.click('#fast-back');
  check('2. "Go back and check" keeps the note open', !(await p.$('#fastwarn')) && !!(await p.$('#btn-save')));
  await p.click('#btn-save'); await p.click('#fast-ok');
  await p.waitForSelector('.ms-bucket');

  // 5. Step 2 shows the open urgent need in red with the intake reason
  const housing = await p.$$eval('.ms-bucket', ls => ls.map(l => ({ t: l.textContent, red: l.classList.contains('urgent-open') })).find(x => x.t.includes('Housing')));
  check('5. Step 2 marks the open urgent Housing need with the intake reason',
    housing && housing.red && housing.t.includes('Urgent, no referral yet') && housing.t.includes('Not now, revisit next visit'));

  // Activity log captured the safeguards
  await p.click('#nav-activity');
  const log = await p.textContent('#activity');
  for (const ev of ['Fix rejected', 'Fix contradicts recording', 'Fast approval warning', 'Fast approval confirmed', 'Decline reason chosen'])
    check(`6. Activity log records "${ev}"`, log.includes(ev));
  check('6. Note approval records the banner state', log.includes('sample transcript banner: showing'));

  check('No script errors', errors.length === 0);
  if (errors.length) console.log(errors);
  await b.close();
  process.exit(fails ? 1 : 0);
})();
