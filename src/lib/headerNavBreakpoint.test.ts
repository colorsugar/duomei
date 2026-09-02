import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../header-tablet-nav.css"), "utf8");
const headerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiHeader.tsx"), "utf8");
const backToTopSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/BackToTopButton.tsx"), "utf8");
const guyuPreviewSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/GuyuShelfPreview.tsx"), "utf8");
const guyuCarouselSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "./guyuCarousel.ts"), "utf8");
const homeIntroCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/HomeIntroSection.css"), "utf8");
const siteCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles.css"), "utf8");
const query = "@media (max-width: 768px), (hover: none) and (pointer: coarse)";

test("keeps a reachable hamburger on 768px and coarse/hover-none viewports", () => {
  const start = css.lastIndexOf(query);
  assert.notEqual(start, -1, "missing tablet/coarse header media query");
  const block = css.slice(start);
  assert.match(block, /\.duomei-menu-toggle[\s\S]*display:\s*inline-flex\s*!important/);
  assert.match(block, /\.duomei-header:not\(\.is-menu-open\) nav[\s\S]*pointer-events:\s*none\s*!important/);
  assert.match(block, /\.duomei-header\.is-menu-open nav[\s\S]*pointer-events:\s*auto\s*!important/);
  assert.match(block, /\.duomei-header-hover-zone[\s\S]*display:\s*none\s*!important/);
  assert.doesNotMatch(block, /\.duomei-menu-toggle:hover\s*~\s*nav/);
});

test("keeps iOS header touch activation synchronous and deterministic", () => {
  assert.match(headerSource, /lastTouchActivationRef\.current = window\.performance\.now\(\)/);
  assert.match(headerSource, /window\.location\.assign\(\(target as HTMLAnchorElement\)\.href\)/);
  assert.match(headerSource, /href="\/#guyu"/);
  assert.doesNotMatch(headerSource, /href="\/guyu"/);
  assert.doesNotMatch(headerSource, /pendingTouchActivationRef/);
});

test("keeps the homepage Guyu preview fast, fragmented, manual, and routed through the public shelf", () => {
  assert.match(guyuCarouselSource, /GUYU_CAROUSEL_DWELL_MS = 1_600/);
  assert.match(guyuPreviewSource, /data-phase=\{transitionPhase\}/);
  assert.match(guyuPreviewSource, /guyu-home-fragment/);
  assert.match(guyuPreviewSource, /onPointerMove=\{handlePointerMove\}/);
  assert.match(guyuPreviewSource, /aria-current=\{indicatedIndex === index/);
  assert.match(guyuPreviewSource, /TRANSITION_FALLBACK_MS = 900/);
  assert.match(guyuPreviewSource, /to="\/guyu"/);
  assert.doesNotMatch(guyuPreviewSource, /to=\{`\/guyu\/\$\{book\.id\}`\}/);
});

test("keeps the mobile footer compact with all six shortcuts on one row", () => {
  assert.match(siteCss, /\.duomei-quick-nav ul \{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(siteCss, /\.duomei-quick-nav li \{[\s\S]*flex:\s*1 1 0/);
  assert.match(backToTopSource, /document\.querySelector\("\.duomei-footer"\)/);
  assert.match(backToTopSource, /visible && !footerVisible/);
});

test("keeps short mobile poetry pages clear of clipping and the fixed progress rail", () => {
  assert.match(homeIntroCss, /@media \(max-width: 48rem\) and \(max-height: 720px\)/);
  assert.match(homeIntroCss, /font-size:\s*clamp\(1rem, 4\.5vw, 1\.2rem\) !important/);
  assert.match(siteCss, /inset-block-end:\s*max\([\s\S]*var\(--space-md\)/);
});
