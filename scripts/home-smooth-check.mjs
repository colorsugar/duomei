// Objective scroll-smoothness numbers for the static homepage on a throttled phone.
// Chromium: 390x844 touch phone, CPU throttled 4x, real CDP touch swipes down the whole page.
// WebKit: same viewport, mouse-wheel scrolling (Playwright WebKit has no touch scrolling), no throttle.
// Reports rAF frame deltas (p50/p95/max, share > 20ms), long tasks (> 50ms) while scrolling, main-thread
// script+style+layout ms per scrolled second, inline style writes per scrolled frame, finger-follow ratio, and
// swipes that landed above their start. Swipes run from the top until the page bottom (capped by SWIPES).
// BASE=http://127.0.0.1:18822 [ENGINES=chromium,webkit] [SWIPES=150] [THROTTLE=4] [STRICT=1] node scripts/home-smooth-check.mjs
import { createRequire } from "node:module";

const PW = process.env.PW || "/private/tmp/claude-501/ui-patrol-pw/";
const pw = createRequire(PW.endsWith("/") ? PW : PW + "/")("playwright-core");
const BASE = process.env.BASE || "http://127.0.0.1:18822";
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const SWIPES = +(process.env.SWIPES || 150), THROTTLE = +(process.env.THROTTLE || 4);
const W = 390, H = 844;
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
let fails = 0;

for (const name of ENGINES) {
  const browser = await pw[name].launch(name === "chromium" ? { args: ["--mute-audio"] } : {});
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: name === "chromium", hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?t=${Date.now()}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const R = (window.__smooth = { on: false, d: [], lt: [], last: 0, sw: 0 });
    new MutationObserver((ms) => { if (R.on) R.sw += ms.length; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["style"] });
    const tick = (t) => { if (R.on && R.last) R.d.push(t - R.last); R.last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (R.on) R.lt.push([e.duration, scrollY]); }).observe({ type: "longtask", buffered: false }); } catch {}
  });
  const cdp = name === "chromium" ? await ctx.newCDPSession(page) : null;
  if (cdp) { await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE }); await cdp.send("Performance.enable"); }
  const metric = async () => { if (!cdp) return 0; const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value])); return (m.ScriptDuration + m.RecalcStyleDuration + m.LayoutDuration) * 1000; };
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });

  const follows = [], misfires = [];
  const busy0 = await metric(), t0 = Date.now();
  let n = 0;
  for (let s = 0; s < SWIPES; s++, n++) {
    await page.evaluate(() => { window.__smooth.on = true; window.__smooth.last = 0; });
    const y0 = await page.evaluate(() => scrollY);
    const left = (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) - y0;
    if (left < 2) break;
    if (cdp) {
      const x = W * 0.5, ya = H * 0.78, yb = H * 0.3;
      await touch("touchStart", x, ya);
      for (let i = 1; i <= 14; i++) { await touch("touchMove", x, ya + ((yb - ya) * i) / 14); await page.waitForTimeout(16); }
      if (left > (ya - yb) * 1.5) follows.push(((await page.evaluate(() => scrollY)) - y0) / (ya - yb));
      await touch("touchEnd");
    } else {
      await page.mouse.move(W / 2, H / 2);
      for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(16); }
    }
    let min = Infinity;
    for (let i = 0; i < 18; i++) { await page.waitForTimeout(50); min = Math.min(min, (await page.evaluate(() => scrollY)) - y0); }
    if (min < -2) misfires.push(`swipe ${s} landed ${Math.round(-min)}px above start`);
    await page.evaluate(() => { window.__smooth.on = false; });
  }
  const secs = (Date.now() - t0) / 1000, busy = ((await metric()) - busy0) / secs;
  const R = await page.evaluate(() => ({ d: window.__smooth.d, lt: window.__smooth.lt, sw: window.__smooth.sw, y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
  const res = {
    engine: name, throttle: cdp ? THROTTLE : 1, frames: R.d.length,
    p50: +q(R.d, 0.5).toFixed(1), p95: +q(R.d, 0.95).toFixed(1), max: +Math.max(0, ...R.d).toFixed(1),
    over20: +((R.d.filter((x) => x > 20).length / Math.max(1, R.d.length)) * 100).toFixed(1),
    swipes: n, longTasks: R.lt.length, longMax: Math.round(Math.max(0, ...R.lt.map((x) => x[0]))),
    longAt: R.lt.map(([d, y]) => `${Math.round(d)}ms@${Math.round(y)}`).slice(0, 6).join(" "),
    styleWritesPerFrame: +(R.sw / Math.max(1, R.d.length)).toFixed(2),
    busyMsPerSec: cdp ? Math.round(busy) : null,
    follow: follows.length ? +(follows.reduce((a, b) => a + b, 0) / follows.length).toFixed(2) : null,
    followMin: follows.length ? +Math.min(...follows).toFixed(2) : null,
    misfires: misfires.length, reached: `${Math.round(R.y)}/${Math.round(R.max)}`,
  };
  console.log(JSON.stringify(res));
  misfires.forEach((m) => console.log("  " + m));
  if (process.env.STRICT) {
    if (res.p95 > 20) { fails++; console.log(`  FAIL ${name} frame p95 ${res.p95}ms > 20`); }
    if (res.misfires) { fails++; console.log(`  FAIL ${name} ${res.misfires} misfires`); }
    if (res.follow != null && (res.followMin < 0.85 || res.follow > 1.15)) { fails++; console.log(`  FAIL ${name} follow ${res.follow} (min ${res.followMin})`); }
  }
  await browser.close();
}
if (process.env.STRICT) { console.log(fails ? `FAIL ${fails}` : "PASS"); process.exit(fails ? 1 : 0); }
