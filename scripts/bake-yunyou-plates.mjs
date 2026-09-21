// Renders the Guilin model plates with the system Chrome. Visitors only download the webp files.
// node scripts/bake-yunyou-plates.mjs
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/yunyou');
const outDir = join(root, 'assets/plates');
const puppeteer = (await import('puppeteer-core').catch(() => import('/tmp/bake-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'))).default;

const SETS = [
  { id: 'xiaoyaolou', name: '逍遥楼', frames: 12, night: true },
  { id: 'city', name: '全城', frames: 8, night: true },
  { id: 'xiangbishan', name: '象鼻山', frames: 6 },
  { id: 'shuangta', name: '日月塔', frames: 6 },
  { id: 'wangcheng', name: '王城', frames: 6 },
  { id: 'jiefangqiao', name: '解放桥', frames: 6 },
  { id: 'fuboshan', name: '伏波山', frames: 4 },
  { id: 'gunanmen', name: '古南门', frames: 4 },
  { id: 'mulongta', name: '木龙塔', frames: 4 },
  { id: 'diecaishan', name: '叠彩山', frames: 4 },
];

const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 300));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
await page.goto('http://127.0.0.1:8765/plate-stage.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__plateReady === true');

const manifest = { version: 1, sets: [] };
try {
  for (const set of SETS) {
    const entry = { id: set.id, name: set.name, day: [], night: set.night ? [] : null };
    for (const night of set.night ? [false, true] : [false]) {
      for (let frame = 0; frame < set.frames; frame++) {
        const rel = `${set.id}/${night ? 'night' : 'day'}/${String(frame).padStart(2, '0')}.b64`;
        const data = await page.evaluate(async (spec) => window.renderPlate(spec), { subject: set.id, frame, night });
        const buf = Buffer.from(String(data).split(',')[1], 'base64');
        if (buf.length < 800 || buf.subarray(0, 4).toString() !== 'RIFF') throw new Error(`${rel} is not a webp`);
        const file = join(outDir, rel);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, buf.toString('base64'));
        (night ? entry.night : entry.day).push(rel);
        console.log(rel, buf.length);
      }
    }
    manifest.sets.push(entry);
  }
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest));
  console.log('plates', manifest.sets.length);
} finally {
  await browser.close();
  server.kill();
}
