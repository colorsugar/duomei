// Capture calligraphy 多美 before/during writing in WebKit + Chromium.
// Fails if any ink pixels are visible in the ovwm box before the first stroke starts.
// BASE=http://127.0.0.1:18822 OUT=/tmp/ink-frames node scripts/home-ink-frames.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PW || "/private/tmp/claude-501/ui-patrol-pw/";
const pw = createRequire(PW.endsWith("/") ? PW : PW + "/")("playwright-core");
const BASE = process.env.BASE || "http://127.0.0.1:18822";
const OUT = process.env.OUT || "/private/tmp/mv2/ink-frames";
fs.mkdirSync(OUT, { recursive: true });
const ENGINES = (process.env.ENGINES || "webkit,chromium").split(",");
let fails = 0;

for (const name of ENGINES) {
  const browser = await pw[name].launch(name === "chromium" ? { args: ["--mute-audio"] } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.clear(); } catch {}
    window.__clock = 0; // freeze intro at pre-write until we advance it
  });
  await page.goto(`${BASE}/?ink=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 45000 });
  // Give the exit curtain a beat; intro is frozen at __clock=0.
  await page.waitForTimeout(500);

  const sample = async (label, clock) => {
    await page.evaluate((c) => { window.__clock = c; if (window.__render) window.__render(); }, clock);
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => {
      const el = document.getElementById("ovwm");
      const r = el.getBoundingClientRect();
      const op = parseFloat(getComputedStyle(el).opacity);
      const live = el.classList.contains("ink-live");
      const gms = [...el.querySelectorAll(".gm")].map((g) => ({
        vis: getComputedStyle(g).visibility,
        op: parseFloat(getComputedStyle(g).opacity),
      }));
      const sk = [...el.querySelectorAll(".sk")].map((p) => parseFloat(getComputedStyle(p).strokeDashoffset || p.style.strokeDashoffset || "1"));
      const anyGm = gms.some((g) => g.vis !== "hidden" && g.op > 0.02);
      const anyStroke = sk.some((d) => d < 0.98);
      return {
        x: r.x, y: r.y, w: r.width, h: r.height,
        op, live, anyGm, anyStroke, visible: op > 0.02 && (anyGm || anyStroke),
        minDash: Math.min(...sk), gm: gms,
      };
    });
    const shot = path.join(OUT, `${name}-${label}.png`);
    await page.screenshot({
      path: shot,
      clip: {
        x: Math.max(0, state.x - 8),
        y: Math.max(0, state.y - 8),
        width: Math.min(380, Math.max(40, state.w + 16)),
        height: Math.min(420, Math.max(40, state.h + 16)),
      },
    });
    return { label, clock, state, shot };
  };

  const before = await sample("t0-before", 0);
  const mid = await sample("t1-writing", 0.55);
  const done = await sample("t2-done", 3.5);
  console.log(name, JSON.stringify({
    before: { visible: before.state.visible, op: before.state.op, anyGm: before.state.anyGm, anyStroke: before.state.anyStroke, minDash: before.state.minDash },
    mid: { visible: mid.state.visible, op: mid.state.op, anyGm: mid.state.anyGm, anyStroke: mid.state.anyStroke },
    done: { visible: done.state.visible, live: done.state.live },
    shots: [before.shot, mid.shot, done.shot],
  }));
  if (before.state.visible) { fails++; console.log(`  FAIL ${name} ink visible before writing`); }
  if (!(mid.state.anyStroke || mid.state.anyGm)) { fails++; console.log(`  FAIL ${name} no ink while writing`); }
  if (!(done.state.live && done.state.visible)) { fails++; console.log(`  FAIL ${name} calligraphy missing after writing`); }
  await browser.close();
}
console.log(fails ? `FAIL ${fails}` : "PASS");
process.exit(fails ? 1 : 0);
