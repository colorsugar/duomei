// Phone touch-feel check for the static homepage. Fails if section slides outrun the finger, a swipe lands
// on an earlier section, or a swipe starting on the bottom progress bar seeks the page.
// BASE=http://127.0.0.1:18822 [ENGINES=chromium,webkit] [PW=<dir with playwright-core>] node scripts/home-touch-check.mjs
import { createRequire } from "node:module";

const PW = process.env.PW || "/private/tmp/claude-501/ui-patrol-pw/";
const pw = createRequire(PW.endsWith("/") ? PW : PW + "/")("playwright-core");
const BASE = process.env.BASE || "http://127.0.0.1:18822";
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const W = 390, H = 844, MAX_RATIO = 2;
// [element, u start, u end] of each phone section slide in main.js
const SLIDES = [["zaobao", 0.1, 0.78], ["zaobao", 4.3, 5.2], ["guyu", 12.4, 13.4], ["xunji", 17.2, 18.0], ["dalu", 20.2, 21.0],
  ["color", 34.4, 34.85], ["wbook", 38.35, 38.95], ["skill", 42.3, 42.95], ["skill", 44.35, 44.9]];
const SWIPES = ["hero", "zaobao", "xiaoji", "kuaihuo", "guyu", "xunji", "dalu", "yunyou", "color", "weiyan", "skill"];
let fails = 0;
const bad = (msg) => { fails++; console.log("  FAIL " + msg); };

for (const name of ENGINES) {
  const browser = await pw[name].launch(name === "chromium" ? { args: ["--mute-audio"] } : {});
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?t=${Date.now()}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 30000 });
  console.log(`${name} ${W}x${H}`);

  const ratios = await page.evaluate(async (slides) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const vh = window.__VH(), out = [];
    for (const [id, a, b] of slides) {
      const el = document.getElementById(id), y0 = window.__U2Y(a) * vh, y1 = window.__U2Y(b) * vh, step = (y1 - y0) / 30;
      let max = 0, prev = null;
      for (let y = y0 + step / 2; y <= y1 + step; y += step) {
        scrollTo(0, y); await frame(); await frame();
        const top = el.getBoundingClientRect().top;
        if (prev != null) max = Math.max(max, Math.abs(top - prev) / step);
        prev = top;
      }
      out.push([`${id}@${a}`, +max.toFixed(2)]);
    }
    return out;
  }, SLIDES);
  for (const [k, r] of ratios) { console.log(`  slide ${k}: ${r}x finger`); if (r > MAX_RATIO) bad(`${name} slide ${k} moves ${r}x scroll (max ${MAX_RATIO})`); }

  await page.evaluate(() => window.__scrollToSec("guyu", "instant"));
  await page.waitForTimeout(600);
  const bar = await page.evaluate(() => { const r = document.querySelector("#HUD .bar").getBoundingClientRect(); return { x: r.left + r.width * 0.15, y: r.top + r.height / 2, s: scrollY }; });
  await page.touchscreen.tap(bar.x, bar.y);
  await page.waitForTimeout(300);
  const seek = Math.round((await page.evaluate(() => scrollY)) - bar.s);
  console.log(`  touch on progress bar moved page ${seek}px`);
  if (seek !== 0) bad(`${name} touch on progress bar seeks the page by ${seek}px`);

  if (name === "chromium") {
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    for (const k of SWIPES) {
      await page.evaluate((k) => window.__scrollToSec(k, "instant"), k);
      await page.waitForTimeout(1200);
      const s0 = await page.evaluate(() => scrollY), x = W * (k === "guyu" ? 0.6 : 0.5), ya = H * 0.72, yb = H * 0.32;
      await touch("touchStart", x, ya);
      for (let i = 1; i <= 12; i++) { await touch("touchMove", x, ya + (yb - ya) * i / 12); await page.waitForTimeout(16); }
      const follow = ((await page.evaluate(() => scrollY)) - s0) / (ya - yb);
      await touch("touchEnd");
      let min = Infinity;
      for (let i = 0; i < 30; i++) { await page.waitForTimeout(50); min = Math.min(min, (await page.evaluate(() => scrollY)) - s0); }
      console.log(`  swipe ${k}: follow ${follow.toFixed(2)}, lowest after release +${Math.round(min)}px`);
      if (follow < 0.85 || follow > 1.15) bad(`${name} swipe ${k} follows finger at ${follow.toFixed(2)}`);
      if (min < 0) bad(`${name} swipe ${k} landed ${Math.round(-min)}px before where it started`);
    }
  }
  await browser.close();
}
console.log(fails ? `FAIL ${fails}` : "PASS");
process.exit(fails ? 1 : 0);
