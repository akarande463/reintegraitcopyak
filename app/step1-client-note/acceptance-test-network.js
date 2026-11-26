// Acceptance test for the Matched services tab on the home screen (MATCHED-SERVICES.md).
// 1. In this folder: python3 -m http.server 8000
// 2. In another terminal: node acceptance-test-network.js   (needs Playwright)
// Screenshots are saved to ./screenshots (network-*.png).
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.PROTO_URL || 'http://localhost:8000/';
const SHOTS = __dirname + '/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, pass) => results.push((pass ? 'PASS  ' : 'FAIL  ') + name);
const shot = (p, name) => p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const pickWhy = async p => { for (const sel of await p.$$('[data-why]')) { if (!(await sel.inputValue())) await sel.selectOption({ index: 1 }); } };
const approveNote = async p => { await p.click('#btn-save'); const ok = await p.waitForSelector('#fast-ok', { timeout: 800 }).catch(() => null); if (ok) await ok.click(); };

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-new');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#btn-network');

  // 1. Home screen has a Matched services card and a top-bar tab.
  check('1. Home screen shows a Matched services card and a Matched services tab in the top bar',
    (await p.textContent('#btn-network')).includes('Matched services') && (await p.textContent('#nav-network')) === 'Matched services');
  await p.click('#btn-network'); await p.waitForSelector('#net-map');
  check('1. The tab opens on Neighborhoods with a map of all 77 community areas', (await p.$$('#net-map path')).length === 77 && (await p.getAttribute('#nav-network', 'aria-current')) === 'page');

  // 2. Neighborhood profile
  await p.selectOption('#net-area', '25');
  const prof = await p.textContent('#net-profile');
  check('2. Picking Austin shows its indicators, likely needs and the clients who live there (Marcus Reed)',
    (await p.textContent('#net-area-name')) === 'Austin' && /Hardship index/.test(prof) && /Arrests per 1,000/.test(prof) && /Marcus Reed/.test(prof) && /Likely needs here/.test(prof));
  const covRows = await p.$$('#net-cov tbody tr');
  check('2. The coverage table lists 9 needs with counts in the area, within 1.5 miles and the nearest distance', covRows.length === 9);
  await p.click('#net-map path[data-area="68"]');
  check('2. Clicking Englewood on the map switches the profile', (await p.textContent('#net-area-name')) === 'Englewood');
  check('2. "What worked" lists providers with acceptance and show-up rates for people from the area', (await p.$$('#net-worked li')).length >= 1 && /showed up/.test(await p.textContent('#net-worked')));
  await p.selectOption('#net-metric', 'arrests');
  check('2. The map can be shaded by another indicator, with a legend', /arrests/i.test(await p.textContent('#net-hover')) && (await p.$$('.net-legend span')).length === 6);
  await shot(p, 'network-1-neighborhoods');

  // 3. Directory
  await p.click('#net-cov tbody tr:nth-child(2) [data-net-browse]');   // Housing near Englewood
  await p.waitForSelector('#net-list');
  const near = await p.inputValue('#net-near'), cat = await p.inputValue('#net-cat');
  const dists = await p.$$eval('.net-card', cs => cs.map(c => { const m = c.textContent.match(/([\d.]+) mi/); return m ? Number(m[1]) : 0; }));
  check('3. "See list" opens the Directory filtered to Housing near Englewood, nearest first', near === '68' && cat === 'Housing' && dists.length > 3 && dists.every((d, i) => i === 0 || d >= dists[i - 1]));
  const cardTxt = await p.textContent('#net-list');
  check('3. Cards show partner or new-to-you, the real-data source with its update date', /Your partner|New to you/.test(cardTxt) && /Real listing/.test(cardTxt) && /updated \d{4}-\d\d-\d\d/.test(cardTxt));
  await p.selectOption('#net-near', ''); await p.selectOption('#net-cat', 'Employment');
  check('3. Old public data is flagged on the card (workforce centers, 2011)', /over 3 years old/.test(await p.textContent('#net-list')));
  await p.fill('#net-q', 'Teamwork'); await p.selectOption('#net-cat', '');
  const tw = '.net-card[data-net-card="crsc-teamwork"]';
  check('3. Search finds the Teamwork Englewood re-entry center, with its referral history', /Accepted \d+ of \d+/.test(await p.textContent(tw)));

  // 4. Refer from the directory
  await p.click(`${tw} [data-net-refer]`);
  await p.selectOption('#net-rclient', 'c3'); // Luis Herrera
  check('4. Send stays disabled until the client\'s consent is ticked', await p.isDisabled('#net-rsend'));
  await p.selectOption('#net-rcat', 'Housing'); await p.fill('#net-rnote', 'Needs housing help before shelter stay ends');
  await p.check('#net-rconsent');
  check('4. Ticking consent enables Send', !(await p.isDisabled('#net-rsend')));
  await p.click('#net-rsend'); await p.waitForSelector('#net-sentnote');
  await shot(p, 'network-2-directory');

  // 5. Pipeline
  await p.click('#net-sentnote [data-net-tab="pipeline"]'); await p.waitForSelector('#net-pipe');
  const row = 'tr:has(td b:text-is("Luis Herrera")):has(button:text-is("Teamwork Englewood Community Re-Entry Support Center"))';
  check('5. The referral is in the pipeline under "Waiting for an answer"', /Sent/.test(await p.textContent(row)));
  const before = await p.textContent('#net-funnel');
  await p.click(`${row} [data-net-edit]`); await p.selectOption('#net-eto', 'Accepted'); await p.fill('#net-edate', '2026-11-16'); await p.click('#net-esave');
  check('5. Recording Accepted with a date shows the appointment', /Appt Nov 16/.test(await p.textContent(row)));
  await p.click(`${row} [data-net-edit]`); await p.selectOption('#net-eto', 'Attended'); await p.click('#net-esave');
  await p.click(`${row} [data-net-edit]`); await p.selectOption('#net-eto', 'Closed with an outcome'); await p.selectOption('#net-eout', 'Goal met'); await p.fill('#net-enote', 'Placed in an SRO unit'); await p.click('#net-esave');
  check('5. Attended and then Goal met move it to "Closed with an outcome"', /Goal met/.test(await p.textContent(row)) && /Closed with an outcome/.test(await p.textContent('#net-pipe')));
  check('5. The outcome counts change once the referral is closed', before !== (await p.textContent('#net-funnel')));
  await p.selectOption('#net-scope', 'mine');
  check('5. "Yours only" shows your own funnel', /Sent/.test(await p.textContent('#net-funnel')));
  await shot(p, 'network-3-pipeline');

  // 6. Case file and activity log
  await p.click('#nav-clients'); await p.click('tr[data-id="c3"]');
  const tl = await p.textContent('#timeline');
  check('6. Luis\'s case file has the referral and each status update', /Referred to Teamwork Englewood/.test(tl) && /Placed in an SRO unit/.test(tl));
  await p.click('#nav-activity');
  const log = await p.textContent('#activity');
  check('6. The activity log records the area opened, consent, the referral and status changes', /Area opened/.test(log) && /Consent ticked/.test(log) && /Referral sent/.test(log) && /Referral status/.test(log));

  // 7. Add a service and a partner
  await p.click('#nav-network'); await p.click('#net-tab-directory');
  await p.click('#net-addbtn'); await p.fill('#net-aname', 'St. Sabina Legal Clinic'); await p.selectOption('#net-acat', 'Legal'); await p.selectOption('#net-aarea', '71');
  await p.click('#net-asave');
  check('7. A service added by hand shows as Added by you and Your partner', /Added by you/.test(await p.textContent('#net-list')) && /Your partner/.test(await p.textContent('#net-list')));
  await p.fill('#net-q', 'Englewood MHC');
  await p.click('.net-card [data-net-partner]');
  check('7. "Add to my partners" marks a public listing as your partner', /Your partner/.test(await p.textContent('.net-card')));

  // 8. From a client's Step 2 board to the directory
  await p.click('#nav-home'); await p.click('#btn-new'); await p.click('#sample');
  await p.waitForSelector('#mgo:not([disabled])', { timeout: 5000 }); await p.click('#mgo');
  await p.waitForSelector('#seenote:not([hidden])', { timeout: 10000 }); await p.click('#seenote');
  await p.selectOption('#fx-f1', 'Male'); await p.selectOption('#fxs-f1', 'Asked client'); await p.click('[data-fix="f1"]');
  await p.fill('#fx-f2', '773-555-0186'); await p.click('[data-fix="f2"]'); await pickWhy(p);
  await p.check('#rv1'); await approveNote(p); await p.waitForSelector('#ms-board');
  await p.click('.ms-bucket:has(.ms-bopen b:text-is("Housing")) .ms-bopen');
  await p.click('#ms-netlink'); await p.waitForSelector('#net-list');
  check('8. From Andre\'s Housing matches, the link opens Housing near Englewood', (await p.inputValue('#net-near')) === '68' && (await p.inputValue('#net-cat')) === 'Housing');

  // 9. Phone width, dark mode, errors
  await p.setViewportSize({ width: 390, height: 844 });
  for (const t of ['areas', 'directory', 'pipeline']) {
    await p.click(`#net-tab-${t}`);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`9. No sideways scrolling at phone width (${t})`, over <= 1);
  }
  await p.click('#net-tab-areas'); await shot(p, 'network-4-phone');
  await p.emulateMedia({ colorScheme: 'dark' }); await p.setViewportSize({ width: 1280, height: 900 }); await shot(p, 'network-5-dark');
  check('9. No script errors', errors.length === 0);

  await browser.close();
  console.log(results.join('\n'));
  if (errors.length) console.log('Errors:', errors);
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed} of ${results.length} checks pass`);
  process.exit(failed ? 1 : 0);
})();
