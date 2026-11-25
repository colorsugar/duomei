// Patrol: Lingchuan map mode opens, township zoom, overlay close, share UI, home link.
// BASE=http://127.0.0.1:18765 PW=<playwright-core dir> node scripts/lingchuan-map-patrol.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const PW = process.env.PW || '/private/tmp/claude-501/ui-patrol-pw/';
const pw = createRequire(PW.endsWith('/') ? PW : PW + '/')('playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:18765';
const OUT = process.env.OUT || path.resolve('preview-home/lingchuan-walk/img/map/patrol');
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const bad = (m) => {
  fails += 1;
  console.log('FAIL', m);
};

const browser = await pw.chromium.launch({ args: ['--mute-audio'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => bad(`pageerror ${e.message}`));

await page.goto(`${BASE}/lingchuan-walk/index.html?t=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('#map-stage .lc-map', { timeout: 60000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), null, { timeout: 90000 }).catch(() => {});

const mode = await page.evaluate(() => document.body.dataset.mode);
if (mode !== 'map') bad(`expected data-mode=map got ${mode}`);

await page.screenshot({ path: path.join(OUT, '01-map-overview.png'), fullPage: false });
console.log('map stage visible');

const home = await page.locator('.home-back');
if ((await home.count()) < 1) bad('missing home-back');
else console.log('home-back present', await home.getAttribute('href'));

await page.locator('.lc-map-chip[data-town="chaotian"]').click();
await page.waitForSelector('#lc-zoom-panel.open', { timeout: 5000 });
await page.screenshot({ path: path.join(OUT, '02-chaotian-zoom.png'), fullPage: false });
console.log('chaotian zoom open');

const dashan = page.locator('.lc-zoom-card[data-id="poi-dashankou"]');
await dashan.click();
await page.waitForSelector('#detail-card.open', { timeout: 5000 });
await page.screenshot({ path: path.join(OUT, '03-dashankou-card.png'), fullPage: false });
console.log('dashankou card open');

const shareBtn = page.locator('#card-share-btn');
if ((await shareBtn.count()) < 1) bad('missing share btn');
else {
  const label = await shareBtn.innerText();
  if (!/分享/.test(label)) bad(`share label unexpected: ${label}`);
  console.log('share UI', label.trim());
}

const closeBottom = page.locator('#card-close-bottom');
if ((await closeBottom.count()) < 1) bad('missing mobile close bar');
await closeBottom.click();
await page.waitForFunction(() => !document.getElementById('detail-card')?.classList.contains('open'), null, { timeout: 4000 });
console.log('card closed via bottom close');

await page.locator('.lc-zoom-close').click();
await page.waitForFunction(() => document.getElementById('lc-zoom-panel')?.hidden === true, null, { timeout: 4000 });
console.log('zoom closed');

const tplCount = await page.locator('.lc-share-tpl').count();
if (tplCount < 5) bad(`share templates ${tplCount} < 5`);
else console.log('share templates', tplCount);
await page.screenshot({ path: path.join(OUT, '04-share-templates.png'), fullPage: false });

await page.locator('.mode-btn[data-mode="walk"]').click();
await page.waitForFunction(() => document.body.dataset.mode === 'walk', null, { timeout: 4000 });
console.log('switched to walk');
await page.locator('.mode-btn[data-mode="map"]').click();
await page.waitForFunction(() => document.body.dataset.mode === 'map', null, { timeout: 4000 });
console.log('back to map');

await browser.close();
console.log(fails ? `PATROL FAIL ${fails}` : 'PATROL OK');
process.exit(fails ? 1 : 0);
