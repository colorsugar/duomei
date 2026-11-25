// Phone touch-feel check for the static homepage. Fails if a section stops moving 1:1 with the page, script
// rewrites inline styles while scrolling, a swipe does not follow the finger or lands on an earlier section,
// or a swipe starting on the bottom progress bar seeks the page.
// BASE=http://127.0.0.1:18822 [ENGINES=chromium,webkit] [PW=<dir with playwright-core>] node scripts/home-touch-check.mjs
import { createRequire } from "node:module";

const PW = process.env.PW || "/private/tmp/claude-501/ui-patrol-pw/";
const pw = createRequire(PW.endsWith("/") ? PW : PW + "/")("playwright-core");
const BASE = process.env.BASE || "http://127.0.0.1:18822";
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const W = 390, H = 844;
const SECS = ["zaobao", "xiaoji", "kuaihuo", "guyu", "xunji", "dalu", "yunyou", "huiben", "color", "weiyan", "skill", "foot"];
// [section to start in, x share of the width]; 0.6 in 故语/大陆 starts the swipe on the embedded carousel
const SWIPES = [["hero", 0.5], ["zaobao", 0.5], ["xiaoji", 0.5], ["kuaihuo", 0.5], ["guyu", 0.6], ["xunji", 0.5], ["dalu", 0.5], ["dalu-p2", 0.6],
  ["yunyou", 0.5], ["huiben", 0.5], ["color", 0.5], ["weiyan", 0.5], ["skill", 0.5]];
let fails = 0;
const bad = (msg) => { fails++; console.log("  FAIL " + msg); };

for (const name of ENGINES) {
  const browser = await pw[name].launch(name === "chromium" ? { args: ["--mute-audio"] } : {});
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?t=${Date.now()}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById("ov").classList.contains("alive"), null, { timeout: 8000 }).catch(() => {});
  console.log(`${name} ${W}x${H}`);

  const sweep = await page.evaluate(async (ids) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let writes = 0;
    const who = {};
    const mo = new MutationObserver((ms) => ms.forEach((m) => { if (!m.target.closest("#HUD,#UI,#cur,#loader")) { writes++; const k = m.target.id || m.target.className; who[k] = (who[k] || 0) + 1; } }));
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["style"] });
    const vh = innerHeight, out = [];
    for (const id of ids) {
      const el = document.getElementById(id), y0 = Math.round(el.getBoundingClientRect().top + scrollY - vh * 0.5), step = 36;
      let max = 0, prev = null;
      for (let y = y0; y <= y0 + vh; y += step) {
        scrollTo(0, y); await frame();
        const now = { top: el.getBoundingClientRect().top, y: scrollY };
        if (prev && now.y !== prev.y) max = Math.max(max, Math.abs(Math.abs(now.top - prev.top) / Math.abs(now.y - prev.y) - 1));
        prev = now;
      }
      out.push([id, +max.toFixed(3)]);
    }
    await frame(); mo.disconnect();
    return { out, writes, who: Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 5), frames: ids.length * 24 };
  }, SECS);
  for (const [k, d] of sweep.out) if (d > 0.02) bad(`${name} section ${k} moves ${(1 + d).toFixed(2)}x the page scroll`);
  console.log(`  sections 1:1 with scroll: ${sweep.out.filter(([, d]) => d <= 0.02).length}/${sweep.out.length}; inline style writes while scrolling: ${sweep.writes} over ${sweep.frames} frames`);
  if (sweep.writes) console.log(`  style writers: ${JSON.stringify(sweep.who)}`);
  if (sweep.writes > sweep.frames * 0.2) bad(`${name} script rewrote inline styles ${sweep.writes} times while scrolling`);

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
    for (const [k, xs] of SWIPES) {
      await page.evaluate((k) => k === "dalu-p2" ? scrollTo(0, document.querySelector(".dl-p2").getBoundingClientRect().top + scrollY) : window.__scrollToSec(k, "instant"), k);
      await page.waitForTimeout(1200);
      const s0 = await page.evaluate(() => scrollY), x = W * xs, ya = H * 0.72, yb = H * 0.32;
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
