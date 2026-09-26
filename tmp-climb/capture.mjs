/**
 * Climb MVP acceptance capture (REVIEW-climb-2).
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

await shot('09-plaza-day-up', () => {
  window.__xiaoyao.setNight(false);
  window.__xiaoyao.teleport('plazaDayUp');
});

/** 瓦面像素占比（下半屏偏暗瓦色近似）+ 解放桥包围框 */
const metrics = await page.evaluate(async () => {
  const x = window.__xiaoyao;
  x.setNight(true);
  x.teleport('gallerySouth');
  // wait one frame
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const w = canvas.width;
  const h = canvas.height;
  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  // WebGL origin bottom-left；统计下 35% 里偏瓦色（暖褐/深灰）像素，以及全屏瓦色
  let tile = 0;
  let bottomTile = 0;
  let bottomN = 0;
  const yCut = Math.floor(h * 0.35);
  for (let y = 0; y < h; y++) {
    for (let x0 = 0; x0 < w; x0++) {
      const i = (y * w + x0) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // 瓦/木檐：偏暖、偏暗、非天空非灯
      const dark = (r + g + b) / 3 < 95;
      const warm = r > g + 8 && r > b + 15;
      const greyTile = Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && (r + g + b) / 3 < 110 && (r + g + b) / 3 > 35;
      const isTile = (dark && warm) || greyTile;
      if (isTile) tile++;
      if (y < yCut) {
        bottomN++;
        if (isTile) bottomTile++;
      }
    }
  }
  const bridgeBox = x.bridgeScreenBox();
  const bridge = x.world.root.userData.bridge;
  const THREE = x.THREE;
  bridge.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(bridge);
  const c = box.getCenter(new THREE.Vector3());
  const dist = Math.hypot(c.x, c.z);
  const bearing = ((Math.atan2(c.x, -c.z) * 180) / Math.PI + 360) % 360;
  return {
    tilePct: +((tile / (w * h)) * 100).toFixed(2),
    bottom35TilePct: +((bottomTile / bottomN) * 100).toFixed(2),
    bridgeBox,
    bridgeCenter: [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)],
    bridgeDist: +dist.toFixed(1),
    bridgeBearing: +bearing.toFixed(1),
    cam: {
      x: +x.camera.position.x.toFixed(2),
      y: +x.camera.position.y.toFixed(2),
      z: +x.camera.position.z.toFixed(2),
      pitch: +x.player.pitch.toFixed(4),
      feetY: +x.player.pos.y.toFixed(2),
    },
  };
});
writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log('metrics', JSON.stringify(metrics, null, 2));

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
  x.player.yaw = 0;
  for (let i = 0; i < 10; i++) {
    x.simulateWASD({ w: 1, steps: 25 });
    push(`walk-${i}`);
  }
  x.teleport('floor1');
  push('floor1');
  x.teleport('stairs');
  push('stairs');
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
console.log('climbLog', JSON.stringify({ ok: climbLog.ok, walkedIn: climbLog.walkedIn, deltaCam: climbLog.deltaCam }, null, 2));

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

const fail =
  errs.length ||
  phoneErrs.length ||
  !metrics.bridgeBox?.inView ||
  metrics.tilePct > 20;
process.exit(fail ? 1 : 0);
