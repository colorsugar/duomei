import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../header-tablet-nav.css"), "utf8");
const headerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiHeader.tsx"), "utf8");
const backToTopSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/BackToTopButton.tsx"), "utf8");
const guyuPreviewSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/GuyuShelfPreview.tsx"), "utf8");
const noteDetailSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiNoteDetailPage.tsx"), "utf8");
const footerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiFooter.tsx"), "utf8");
const yunyouSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.tsx"), "utf8");
const yunyouCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.css"), "utf8");
const yunyouIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/index.html"), "utf8");
const yunyouMain = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/src/main.js"), "utf8");
const yunyouCover = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/images/yunyou-guilin-cover.webp"));
const prValidationWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/pr-validation.yml"), "utf8");
const cursorAutoMergeWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/cursor-auto-merge.yml"), "utf8");
const edgeOneDeployWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/deploy-edgeone.yml"), "utf8");
const guyuCarouselSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "./guyuCarousel.ts"), "utf8");
const guyuCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../guyu.css"), "utf8");
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
  assert.match(headerSource, /href="\/#yunyou"/);
  assert.doesNotMatch(headerSource, /href="\/guyu"/);
  assert.doesNotMatch(headerSource, /pendingTouchActivationRef/);
});

test("keeps the homepage Guyu preview deliberate, fragmented, manual, and linked to the current book", () => {
  const beginSettle = guyuPreviewSource.slice(
    guyuPreviewSource.indexOf("const beginSettle"),
    guyuPreviewSource.indexOf("const beginAssembly"),
  );
  assert.match(guyuCarouselSource, /GUYU_CAROUSEL_DWELL_MS = 1_600/);
  assert.match(guyuCarouselSource, /GUYU_FRAGMENT_SCATTER_MS = 340/);
  assert.match(guyuCarouselSource, /GUYU_FRAGMENT_ASSEMBLE_MS = 500/);
  assert.match(guyuCarouselSource, /GUYU_SETTLE_FALLBACK_MS = 1_200/);
  assert.match(guyuPreviewSource, /data-phase=\{transitionPhase\}/);
  assert.match(guyuPreviewSource, /guyu-home-fragment/);
  assert.match(guyuPreviewSource, /onPointerMove=\{handlePointerMove\}/);
  assert.match(guyuPreviewSource, /aria-current=\{indicatedIndex === index/);
  assert.match(guyuPreviewSource, /transitionPhaseRef\.current = "settle"/);
  assert.match(guyuPreviewSource, /cycleTokenRef\.current !== cycleToken/);
  assert.match(guyuPreviewSource, /performance\.now\(\) - phaseStartedAtRef\.current/);
  assert.match(guyuPreviewSource, /event\.elapsedTime \* 1_000/);
  assert.match(guyuPreviewSource, /image\.decode\(\)\.then/);
  assert.match(guyuPreviewSource, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame\(\(\) => finishSettle/);
  assert.match(beginSettle, /setBookIndex\(completedIndex\)[\s\S]*setTransitionPhase\("settle"\)/);
  assert.doesNotMatch(beginSettle, /setIncomingIndex\(null\)|setTransitionPhase\("idle"\)/);
  assert.match(guyuCss, /data-phase="settle"\]\s+\.guyu-home-book-base\s*\{\s*opacity:\s*1;\s*transition:\s*none;/);
  assert.doesNotMatch(guyuCss, /\.guyu-home-carousel\[data-phase="settle"\][^{}]*\.guyu-home-book-base\s*\{[^}]*opacity:\s*0/);
  assert.match(guyuPreviewSource, /const linkedBook = transitionPhase === "assemble" \|\| transitionPhase === "settle"/);
  assert.match(guyuPreviewSource, /to=\{\`\/guyu\/\$\{linkedBook\.id\}\`\}/);
  assert.match(guyuPreviewSource, /className="guyu-home-shelf-all"\s+to="\/guyu"/);
  assert.match(guyuPreviewSource, /翻开\$\{getBookLabels\(linkedBook\)\.section\}《\$\{linkedBook\.title\}》/);
  assert.match(guyuCss, /\.guyu-library-back,\s*\.guyu-home-shelf-all\s*\{[^}]*min-block-size:\s*var\(--size-hit\)/);
});

test("keeps the public Guyu shelf reachable with a 44px home link", () => {
  const pageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiGuyuPage.tsx"), "utf8");
  assert.match(pageSource, /className="guyu-library-back"\s+to="\/#guyu"/);
  assert.match(guyuCss, /\.guyu-library-back,\s*\.guyu-home-shelf-all\s*\{[^}]*min-block-size:\s*var\(--size-hit\)/);
});

test("keeps the note-detail back target visible outside the fixed header", () => {
  assert.equal(noteDetailSource.match(/className="detail-back"/g)?.length, 3);
  assert.match(siteCss, /\.detail-back\s*\{[^}]*min-block-size:\s*var\(--size-hit\)/);
  assert.doesNotMatch(siteCss, /\.duomei-detail:not\(\.detail-edit-page\)\s*\{[^}]*padding-top:\s*clamp\((?:32|36)px/);
});

test("keeps the mobile footer compact with all seven shortcuts on one row", () => {
  assert.match(siteCss, /\.duomei-quick-nav ul \{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(siteCss, /\.duomei-quick-nav li \{[\s\S]*flex:\s*1 1 0/);
  assert.match(footerSource, /\{ label: "云游", to: "\/#yunyou" \}/);
  assert.match(backToTopSource, /document\.querySelector\("\.duomei-footer"\)/);
  assert.match(backToTopSource, /document\.querySelector\("\.yunyou-card"\)/);
  assert.match(backToTopSource, /visible && !footerVisible && !yunyouVisible/);
});

test("ships Yunyou as a same-origin, vendored, accessible 3D map", () => {
  assert.match(yunyouSource, /const YUNYOU_HREF = "\/yunyou\/"/);
  assert.match(yunyouSource, /\/images\/yunyou-guilin-cover\.webp/);
  assert.doesNotMatch(yunyouSource, /vercel\.app/);
  assert.match(yunyouCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(yunyouIndex, /"three": "\.\/vendor\/three\/three\.module\.js"/);
  assert.doesNotMatch(yunyouIndex, /cdn\.jsdelivr\.net|unpkg\.com/);
  assert.match(yunyouIndex, /id="map-fallback"/);
  assert.match(yunyouIndex, /href="\/#yunyou"/);
  assert.match(yunyouMain, /prefers-reduced-motion: reduce/);
  assert.equal(
    existsSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/vendor/three/LICENSE.txt")),
    true,
  );
  assert.equal(
    existsSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/images/yunyou-guilin-cover.webp")),
    true,
  );
  assert.equal(
    createHash("sha256").update(yunyouCover).digest("hex"),
    "019158f0433eaa0dfc3b0b53dd566b64bb7d2cce1a6d03ee699211013330d7e0",
  );
});

test("keeps Cursor auto-publish behind same-repository validation", () => {
  assert.match(prValidationWorkflow, /permissions:\s*\n\s+contents: read/);
  assert.match(prValidationWorkflow, /npm run test:home-hold/);
  assert.match(prValidationWorkflow, /npm run test:guyu/);
  assert.match(prValidationWorkflow, /npm run build/);
  assert.match(prValidationWorkflow, /verify-release\.ps1/);
  assert.match(cursorAutoMergeWorkflow, /workflow_run:/);
  assert.match(cursorAutoMergeWorkflow, /workflow_run\.conclusion == 'success'/);
  assert.match(cursorAutoMergeWorkflow, /\.head\.repo\.full_name[\s\S]*\$GITHUB_REPOSITORY/);
  assert.match(cursorAutoMergeWorkflow, /\.head\.ref[\s\S]*cursor\/\*/);
  assert.match(cursorAutoMergeWorkflow, /\.head\.sha[\s\S]*\$VALIDATED_SHA/);
  assert.match(cursorAutoMergeWorkflow, /protected_paths=/);
  assert.match(cursorAutoMergeWorkflow, /--match-head-commit "\$VALIDATED_SHA"/);
  assert.match(cursorAutoMergeWorkflow, /gh workflow run deploy-edgeone\.yml/);
  assert.doesNotMatch(cursorAutoMergeWorkflow, /actions\/checkout/);
  assert.match(edgeOneDeployWorkflow, /if: github\.ref == 'refs\/heads\/main'/);
});

test("keeps short mobile poetry pages clear of clipping and the fixed progress rail", () => {
  assert.match(homeIntroCss, /@media \(max-width: 48rem\) and \(max-height: 720px\)/);
  assert.match(homeIntroCss, /font-size:\s*clamp\(1rem, 4\.5vw, 1\.2rem\) !important/);
  assert.match(siteCss, /inset-block-end:\s*max\([\s\S]*var\(--space-md\)/);
});
