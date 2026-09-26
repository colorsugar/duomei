/**
 * Climb MVP acceptance capture.
 * Usage: node tmp-climb/capture.mjs http://127.0.0.1:5191
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/private/tmp/claude-501/-Users-chenghaoliu-Projects-duomei/e6ef5fa2-a381-4d31-8367-aef7914ad715/scratchpad/pw/node_modules/playwright');
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:5191';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});

const errs = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(`console: ${m.text()}`);
});

await page.goto(`${BASE}/xiaoyao/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__xiaoyao?.ready === true, null, { timeout: 180000 });
await page.waitForTimeout(2500);

async function shot(name, fn) {
  if (fn) await page.evaluate(fn);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('shot', name);
}

await shot('01-plaza-night', () => {
  const x = window.__xiaoyao;
  x.setNight(true);
  x.teleport('plaza');
});

await shot('02-floor1', () => window.__xiaoyao.teleport('floor1'));
await shot('03-stairs', () => window.__xiaoyao.teleport('stairs'));
await shot('04-gallery-south-night', () => {
  window.__xiaoyao.setNight(true);
  window.__xiaoyao.teleport('gallerySouth');
});
await shot('05-gallery-south-day', () => {
  window.__xiaoyao.setNight(false);
  window.__xiaoyao.teleport('gallerySouth');
});
await shot('06-gallery-east-caustics', () => {
  window.__xiaoyao.setNight(true);
  window.__xiaoyao.teleport('galleryEast');
});

await shot('08-river-tower-night', () => {
  window.__xiaoyao.setNight(true);
  window.__xiaoyao.teleport('riverNight');
});

const climbLog = await page.evaluate(async () => {
  const x = window.__xiaoyao;
  x.setNight(true);
  x.teleport('plaza');
  const heights = [];
  const push = (note) =>
    heights.push({
      note,
      feetY: x.player.pos.y,
      camY: x.camera.position.y,
      x: +x.player.pos.x.toFixed(2),
      z: +x.player.pos.z.toFixed(2),
    });

  push('plaza');
  // Face the tower (−z): yaw 0
  x.player.yaw = 0;
  for (let i = 0; i < 10; i++) {
    x.simulateWASD({ w: 1, steps: 25 });
    push(`walk-${i}`);
  }
  // Approach stairs from floor1
  x.teleport('floor1');
  push('floor1');
  x.teleport('stairs');
  push('stairs');
  // Climb north along stair (+z? stairs run from z=-3.2 upward in z with rising y)
  // Stair platforms: z increases with height; walk +z (yaw=π) up the flight… actually
  // platforms: z0 = -3.2 + i*0.36 rising y — so walk +z (yaw = Math.PI) to climb.
  x.player.yaw = Math.PI;
  for (let i = 0; i < 20; i++) {
    x.simulateWASD({ w: 1, steps: 12 });
    push(`climb-${i}`);
  }
  x.teleport('gallerySouth');
  push('gallerySouth');
  const climbed = heights.some((h) => h.note.startsWith('climb-') && h.feetY > 5);
  return {
    ok: heights[0].feetY < 1 && (climbed || heights.at(-1).feetY > 6.5),
    walkedIn: heights.some((h) => h.note.startsWith('walk-') && h.z < 18),
    heights,
    deltaCam: +(heights.at(-1).camY - heights[0].camY).toFixed(2),
  };
});
writeFileSync(join(OUT, 'climb-log.json'), JSON.stringify(climbLog, null, 2));
console.log('climbLog', JSON.stringify(climbLog, null, 2));

const phone = await browser.newContext({ ...devices['iPhone 13'] });
const pp = await phone.newPage();
const phoneErrs = [];
pp.on('pageerror', (e) => phoneErrs.push(String(e)));
await pp.goto(`${BASE}/xiaoyao/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await pp.waitForFunction(() => window.__xiaoyao?.ready === true, null, { timeout: 180000 }).catch(() => {});
await pp.waitForTimeout(3500);
await pp.screenshot({ path: join(OUT, '07-iphone13.png') });
console.log('phone errors', phoneErrs.length ? phoneErrs : 'none');
await phone.close();

console.log('desktop errors', errs.length ? errs : 'none');
writeFileSync(join(OUT, 'errors.json'), JSON.stringify({ desktop: errs, phone: phoneErrs }, null, 2));
await browser.close();
process.exit(errs.length || phoneErrs.length ? 1 : 0);
