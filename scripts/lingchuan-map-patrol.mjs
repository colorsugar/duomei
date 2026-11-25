// Patrol: Lingchuan full-county sculpted atlas (Chromium + WebKit, mobile + desktop)
// BASE=http://127.0.0.1:18765 PW=/private/tmp/claude-501/ui-patrol-pw node scripts/lingchuan-map-patrol.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const PW = process.env.PW || '/private/tmp/claude-501/ui-patrol-pw/';
const pw = createRequire(PW.endsWith('/') ? PW : PW + '/')('playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:18765';
const OUT = process.env.OUT || path.join(process.env.HOME || '/tmp', '.gb/lc-atlas-verify');
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const bad = (m) => {
  fails += 1;
  console.log('FAIL:', m);
};

async function runMobileSuite(engineName) {
  console.log(`\n=== [${engineName}] Mobile 390x844 ===`);
  const launchOpts = engineName === 'chromium' ? { args: ['--mute-audio'] } : {};
  const browser = await pw[engineName].launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  const bad404 = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) bad404.push(`${res.status()} ${res.url()}`);
  });

  await page.goto(`${BASE}/lingchuan-walk/index.html?t=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#map-stage .lc-atlas', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(350);

  const checks = await page.evaluate(() => {
    const mode = document.body.dataset.mode;
    const pins = document.querySelectorAll('.lc-pins-layer .lc-pin').length;
    const back = document.querySelector('.dm-home-back');
    const sw = document.querySelector('.mode-switch');
    const br = back?.getBoundingClientRect();
    const sr = sw?.getBoundingClientRect();
    const overlap = br && sr && !(br.right <= sr.left || br.left >= sr.right || br.bottom <= sr.top || br.top >= sr.bottom);
    const bodyText = document.body.innerText || '';
    const hasForbidden = /本村|老大村|老大的村|乡镇地图|盘瑶/.test(bodyText);
    return { mode, pins, hasBack: Boolean(back), backHref: back?.getAttribute('href'), headerOverlap: Boolean(overlap), hasForbidden };
  });
  console.log(`[${engineName}] checks:`, JSON.stringify(checks));
  if (checks.mode !== 'map') bad(`${engineName} expected data-mode=map got ${checks.mode}`);
  if (checks.pins !== 12) bad(`${engineName} expected 12 townships got ${checks.pins}`);
  if (!checks.hasBack || checks.backHref !== '/') bad(`${engineName} missing/wrong dm-home-back`);
  if (checks.headerOverlap) bad(`${engineName} top-bar back link overlaps mode-switch!`);
  if (checks.hasForbidden) bad(`${engineName} forbidden word found in rendered DOM!`);

  await page.screenshot({ path: path.join(OUT, `${engineName}-01-overview.png`) });

  // Open Chaotian bespoke zoomed diorama
  await page.locator('.lc-pins-layer .lc-pin[data-town="chaotian"]').click();
  await page.waitForSelector('#lc-zoom-panel.open', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${engineName}-02-chaotian-zoom.png`) });

  // Tap Dashankou pin directly on Chaotian diorama -> opens fan detail card
  await page.locator('#lc-zoom-pins [data-id="poi-dashankou"]').click();
  await page.waitForSelector('#detail-card.open', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${engineName}-03-dashankou-card.png`) });

  // Close card via mobile bottom close bar
  await page.locator('#card-close-bottom').click();
  await page.waitForFunction(() => !document.getElementById('detail-card')?.classList.contains('open'), null, { timeout: 4000 });

  // Open share studio preview from Chaotian sheet
  await page.locator('.lc-zoom-foot .lc-zoom-share').click();
  await page.waitForSelector('#lc-share-studio.open', { timeout: 5000 });
  await page.waitForTimeout(600);
  const tplCount = await page.locator('.lc-share-tpl-btn').count();
  if (tplCount < 5) bad(`${engineName} share studio templates ${tplCount} < 5`);
  await page.screenshot({ path: path.join(OUT, `${engineName}-04-share-studio.png`) });
  await page.locator('.lc-share-close').click();
  await page.waitForTimeout(300);

  // Close Chaotian zoom -> open Haiyang focused zoom
  await page.locator('.lc-zoom-close').click();
  await page.waitForFunction(() => document.getElementById('lc-zoom-panel')?.hidden === true, null, { timeout: 4000 });
  await page.locator('.lc-pins-layer .lc-pin[data-town="haiyang"]').click();
  await page.waitForSelector('#lc-zoom-panel.open', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${engineName}-05-haiyang-zoom.png`) });
  await page.locator('.lc-zoom-close').click();
  await page.waitForTimeout(250);

  // Switch to Paper Walk mode & verify header cleanly fits
  await page.locator('.mode-btn[data-mode="walk"]').click();
  await page.waitForFunction(() => document.body.dataset.mode === 'walk', null, { timeout: 5000 });
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(OUT, `${engineName}-06-walk-mode.png`) });

  if (pageErrors.length) bad(`${engineName} pageErrors: ${pageErrors.join(' | ')}`);
  if (bad404.length) bad(`${engineName} HTTP>=400: ${bad404.join(' | ')}`);

  await browser.close();
}

async function runDesktopSuite() {
  console.log('\n=== [chromium] Desktop 1440x860 ===');
  const browser = await pw.chromium.launch({ args: ['--mute-audio'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/lingchuan-walk/index.html?t=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#map-stage .lc-atlas', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'desktop-01-overview.png') });

  // Hover Daxu -> desktop folio updates
  await page.locator('.lc-pins-layer .lc-pin[data-town="daxu"]').hover();
  await page.waitForTimeout(250);
  const folioTitle = await page.locator('.lc-folio-head h2').innerText();
  if (!folioTitle.includes('大圩镇')) bad(`desktop hover folio expected 大圩镇 got ${folioTitle}`);
  await page.screenshot({ path: path.join(OUT, 'desktop-02-daxu-folio.png') });

  if (pageErrors.length) bad(`desktop pageErrors: ${pageErrors.join(' | ')}`);
  await browser.close();
}

await runMobileSuite('chromium');
await runMobileSuite('webkit');
await runDesktopSuite();

console.log(fails ? `\nPATROL FAIL (${fails})` : '\nPATROL ALL OK (Chromium + WebKit + Desktop)');
process.exit(fails ? 1 : 0);
