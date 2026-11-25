// Hash lands once then clears; bare refresh returns to top.
// BASE=http://127.0.0.1:18822 node scripts/home-hash-refresh.mjs
import { createRequire } from "node:module";
const PW = process.env.PW || "/private/tmp/claude-501/ui-patrol-pw/";
const pw = createRequire(PW.endsWith("/") ? PW : PW + "/")("playwright-core");
const BASE = process.env.BASE || "http://127.0.0.1:18822";
let fails = 0;
const bad = (m) => { fails++; console.log("FAIL " + m); };

for (const name of ["webkit", "chromium"]) {
  const browser = await pw[name].launch(name === "chromium" ? { args: ["--mute-audio"] } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#xiaoji`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 45000 });
  await page.waitForTimeout(2500);
  const landed = await page.evaluate(() => ({
    y: Math.round(scrollY),
    hash: location.hash,
    hc: document.getElementById("HC")?.textContent || "",
    xiaojiTop: Math.round(document.getElementById("xiaoji").getBoundingClientRect().top),
  }));
  console.log(name, "hash-land", landed);
  if (landed.hc !== "小记" && Math.abs(landed.xiaojiTop) > 120) bad(`${name} #xiaoji did not land (hc=${landed.hc} top=${landed.xiaojiTop})`);
  if (landed.hash) bad(`${name} hash still present after land: ${landed.hash}`);
  if (landed.y < 200) bad(`${name} still near top after #xiaoji land (y=${landed.y})`);

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => window.__loaderIsDone && window.__loaderIsDone(), null, { timeout: 45000 });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({ y: Math.round(scrollY), hash: location.hash, hc: document.getElementById("HC")?.textContent || "" }));
  console.log(name, "refresh", after);
  if (after.hash) bad(`${name} hash returned after refresh: ${after.hash}`);
  if (after.y > 40) bad(`${name} refresh did not return to top (y=${after.y})`);

  const orb = await page.evaluate(() => {
    const b = document.getElementById("dm-orb");
    return { hasSvg: !!b?.querySelector("svg"), paths: b?.querySelectorAll("path,circle").length || 0 };
  });
  console.log(name, "music-orb", orb);
  if (!orb.hasSvg || orb.paths < 3) bad(`${name} music orb missing SVG mark`);
  await browser.close();
}
console.log(fails ? `FAIL ${fails}` : "PASS");
process.exit(fails ? 1 : 0);
