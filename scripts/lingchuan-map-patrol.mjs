// Patrol: Lingchuan 3D interactive sculpted paper atlas with pop-up standees (Chromium + WebKit)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// 全市总览只题县名：先点「灵川县」飞进县域，乡镇签才出现；签被邻签挤掉时（手机竖屏常见）再按一下「+」放大
async function clickTownPin(page, id) {
  const pin = page.locator(`.lc-proj-layer .lc-pin[data-town="${id}"]`);
  const far = await page.evaluate(() => document.querySelector('.lc-atlas-hud')?.dataset.far === '1');
  if (far) {
    await page.locator('.lc-proj-layer .lc-pin[data-town="lingchuan-zhen"]').click();
    await page.waitForTimeout(1400);
  }
  for (let k = 0; k < 3; k++) {
    const shown = await pin.evaluate((el) => el.style.opacity !== '0' && el.style.pointerEvents !== 'none');
    if (shown) break;
    await page.evaluate(([t, z]) => window.__LINGCHUAN_MAP3D?.flyToTown(t, z), [id, 1.25 + k * 0.3]);
    await page.waitForTimeout(1200);
  }
  await pin.click();
}

const PW = process.env.PW || '/private/tmp/claude-501/ui-patrol-pw/';
const pw = createRequire(PW.endsWith('/') ? PW : PW + '/')('playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:18765';
const OUT = process.env.OUT || path.join(process.env.HOME || '/tmp', '.gb/lc-3d-verify');
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const bad = (m) => {
  fails += 1;
  console.log('FAIL:', m);
};

async function runMobileSuite(engineName) {
  console.log(`\n=== [${engineName}] Mobile 390x844 ===`);
  const launchOpts = engineName === 'chromium'
    ? { args: ['--mute-audio', '--use-gl=angle', '--ignore-gpu-blocklist'] }
    : {};
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
  await page.waitForSelector('#map-stage .lc-atlas-hud', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(700);

  const checks = await page.evaluate(() => {
    const mode = document.body.dataset.mode;
    const pins = document.querySelectorAll('.lc-proj-layer .lc-pin').length;
    const back = document.querySelector('.dm-home-back');
    const sw = document.querySelector('.mode-switch');
    const br = back?.getBoundingClientRect();
    const sr = sw?.getBoundingClientRect();
    const overlap = br && sr && !(br.right <= sr.left || br.left >= sr.right || br.bottom <= sr.top || br.top >= sr.bottom);
    const hasForbidden = /本村|老大村|老大的村|乡镇地图|盘瑶/.test(document.body.innerText || '');
    const stageVis = getComputedStyle(document.getElementById('stage')).visibility;
    return { mode, pins, hasBack: Boolean(back), backHref: back?.getAttribute('href'), headerOverlap: Boolean(overlap), hasForbidden, stageVis };
  });
  console.log(`[${engineName}] checks:`, JSON.stringify(checks));
  if (checks.mode !== 'map') bad(`${engineName} expected data-mode=map got ${checks.mode}`);
  // 12 乡镇 + 6 城区 + 10 县
  if (checks.pins !== 28) bad(`${engineName} expected 28 pins got ${checks.pins}`);
  if (!checks.hasBack || checks.backHref !== '/') bad(`${engineName} missing/wrong dm-home-back`);
  if (checks.headerOverlap) bad(`${engineName} header overlap`);
  if (checks.hasForbidden) bad(`${engineName} forbidden copy`);
  if (checks.stageVis !== 'visible') bad(`${engineName} #stage not visible in map mode`);

  await page.screenshot({ path: path.join(OUT, `${engineName}-01-overview.png`) });

  // 2) Fly into Chaotian -> 3D camera swoops down, standees pop up with hinge physics!
  await clickTownPin(page, 'chaotian');
  await page.waitForTimeout(1100);
  const standeeTagCount = await page.locator('.lc-standee-tag:not([hidden])').count();
  console.log(`[${engineName}] Chaotian popped-up standee tags:`, standeeTagCount);
  if (standeeTagCount < 1) bad(`${engineName} no standee tags popped up in Chaotian`);
  await page.screenshot({ path: path.join(OUT, `${engineName}-02-chaotian-3d.png`) });

  // 3) Tap a popped-up standee floating paper tag -> opens 3-layer fan detail card!
  await page.locator('.lc-standee-tag:not([hidden])').first().click();
  await page.waitForSelector('#detail-card.open', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${engineName}-03-standee-card.png`) });
  await page.locator('#card-close-bottom').click();
  await page.waitForFunction(() => !document.getElementById('detail-card')?.classList.contains('open'), null, { timeout: 4000 });

  // 4) Open Chaotian full monograph drawer from floating focus ribbon
  await page.locator('#lc-fr-open').click();
  await page.waitForSelector('#lc-zoom-panel.open', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${engineName}-04-chaotian-monograph.png`) });
  await page.locator('.lc-zoom-close').click();
  await page.waitForFunction(() => document.getElementById('lc-zoom-panel')?.hidden === true, null, { timeout: 4000 });

  // 5) Reset overview then fly into Haiyang (golden ginkgo standees pop up + ginkgo particles!)
  await page.locator('#lc-z-reset').click();
  await page.waitForTimeout(650);
  await clickTownPin(page, 'haiyang');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, `${engineName}-05-haiyang-3d.png`) });

  // 6) Fly into Daxu then deep-zoom 4.8x into Qingshitan / Jiuwu to verify crisp high-res tiles + lazy Grok standees!
  await page.locator('#lc-z-reset').click();
  await page.waitForTimeout(650);
  await clickTownPin(page, 'daxu');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, `${engineName}-06-daxu-3d.png`) });

  await page.evaluate(() => {
    window.__LINGCHUAN_MAP3D?.setCameraView({ townId: 'jiuwu', zoom: 4.8 });
  });
  await page.waitForTimeout(1300);
  const deepStats = await page.evaluate(() => ({
    st: window.__LINGCHUAN_MAP3D?.getState(),
    scaleTier: document.getElementById('lc-scale-tier')?.textContent,
    scaleLbl: document.getElementById('lc-scale-lbl')?.textContent,
    tags: document.querySelectorAll('.lc-standee-tag:not([hidden])').length,
  }));
  console.log(`[${engineName}] 4.8x deep zoom stats:`, JSON.stringify(deepStats));
  if (!deepStats.st || deepStats.st.totalStandees < 74) bad(`${engineName} expected >=74 standees got ${deepStats.st?.totalStandees}`);
  if ((deepStats.st?.loadedTiles || 0) < 1) bad(`${engineName} high-res DEM tiles did not load at 4.8x`);
  if ((deepStats.st?.readyStandees || 0) <= 34) bad(`${engineName} lazy Grok standees did not wake at 4.8x`);
  await page.screenshot({ path: path.join(OUT, `${engineName}-07-jiuwu-4.8x-hires.png`) });

  if (pageErrors.length) bad(`${engineName} pageErrors: ${pageErrors.join(' | ')}`);
  if (bad404.length) bad(`${engineName} HTTP>=400: ${bad404.join(' | ')}`);
  await browser.close();
}

async function runDesktopSuite() {
  console.log('\n=== [chromium] Desktop 1440x860 ===');
  const browser = await pw.chromium.launch({ args: ['--mute-audio', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const pageErrors = [];
  const bad404 = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) bad404.push(`${res.status()} ${res.url()}`);
  });

  await page.goto(`${BASE}/lingchuan-walk/index.html?t=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#map-stage .lc-atlas-hud', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('done'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(850);
  await page.screenshot({ path: path.join(OUT, 'desktop-01-overview.png') });

  // Test focal-point wheel zoom over NW Qingshitan / Jiuwu region
  const zoom0 = (await page.evaluate(() => window.__LINGCHUAN_MAP3D?.getState()))?.zoom || 0.33;
  await page.mouse.move(420, 340);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(800);
  const wheelState = await page.evaluate(() => window.__LINGCHUAN_MAP3D?.getState());
  console.log('[desktop] after wheel focal zoom:', JSON.stringify({ zoom: wheelState?.zoom, tx: wheelState?.tx, tz: wheelState?.tz, tiles: wheelState?.loadedTiles }));
  // 全市总览起点约 0.33，六格滚轮应至少放大两倍
  if (!wheelState || wheelState.zoom < zoom0 * 2) bad('desktop wheel focal zoom failed');

  // Collapse desktop folio to verify fullscreen mode + deep zoom 4.6x Chaotian
  await page.locator('#lc-folio-toggle').click();
  await page.evaluate(() => window.__LINGCHUAN_MAP3D?.setCameraView({ townId: 'chaotian', zoom: 4.6 }));
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(OUT, 'desktop-02-chaotian-fullscreen-4.6x.png') });

  // Re-open folio & fly to Haiyang
  await page.locator('#lc-folio-toggle').click();
  await page.locator('#lc-z-reset').click();
  await page.waitForTimeout(700);
  await clickTownPin(page, 'haiyang');
  await page.waitForTimeout(1150);
  await page.screenshot({ path: path.join(OUT, 'desktop-03-haiyang-3d.png') });

  if (pageErrors.length) bad(`desktop pageErrors: ${pageErrors.join(' | ')}`);
  if (bad404.length) bad(`desktop HTTP>=400: ${bad404.join(' | ')}`);
  await browser.close();
}

await runMobileSuite('chromium');
await runMobileSuite('webkit');
await runDesktopSuite();

console.log(fails ? `\nPATROL FAIL (${fails})` : '\nPATROL 3D MAP ALL OK (Chromium + WebKit + Desktop)');
process.exit(fails ? 1 : 0);
