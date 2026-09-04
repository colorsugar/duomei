import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as adminSiteInventory from "./adminSiteInventory.ts";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../header-tablet-nav.css"), "utf8");
const headerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiHeader.tsx"), "utf8");
const backToTopSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/BackToTopButton.tsx"), "utf8");
const guyuPreviewSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/GuyuShelfPreview.tsx"), "utf8");
const noteDetailSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiNoteDetailPage.tsx"), "utf8");
const footerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiFooter.tsx"), "utf8");
const yunyouSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.tsx"), "utf8");
const yunyouCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.css"), "utf8");
const zaobaoSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/ZaobaoSection.tsx"), "utf8");
const zaobaoCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/ZaobaoSection.css"), "utf8");
const yunyouIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/index.html"), "utf8");
const yunyouMain = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/src/main.js"), "utf8");
const yunyouLandmarks = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/data/landmarks.js"), "utf8");
const yunyouCover = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/images/yunyou-guilin-cover.webp"));
const prValidationWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/pr-validation.yml"), "utf8");
const cursorAutoMergeWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/cursor-auto-merge.yml"), "utf8");
const edgeOneDeployWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/deploy-edgeone.yml"), "utf8");
const guyuCarouselSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "./guyuCarousel.ts"), "utf8");
const guyuCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../guyu.css"), "utf8");
const homeIntroCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/HomeIntroSection.css"), "utf8");
const siteCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles.css"), "utf8");
const adminSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiAdmin.tsx"), "utf8");
const {
  ADMIN_DEPLOYMENT,
  ADMIN_SITE_SECTIONS,
  channelLabel,
  computeAdminHealthScore,
  shortCommit,
  summarizeGuyuShelf,
} = adminSiteInventory;
const query = "@media (max-width: 768px), (max-width: 1024px) and (hover: none) and (pointer: coarse)";

test("keeps a reachable hamburger on phones and tablets without collapsing touch desktops", () => {
  const start = css.lastIndexOf(query);
  assert.notEqual(start, -1, "missing tablet/coarse header media query");
  const block = css.slice(start);
  assert.match(block, /\.duomei-menu-toggle[\s\S]*display:\s*inline-flex\s*!important/);
  assert.match(block, /\.duomei-menu-toggle[\s\S]*width:\s*calc\(var\(--size-hit\) \+ var\(--space-3xs\)\)\s*!important/);
  assert.match(block, /\.duomei-header:not\(\.is-menu-open\) nav[\s\S]*pointer-events:\s*none\s*!important/);
  assert.match(block, /\.duomei-header\.is-menu-open nav[\s\S]*pointer-events:\s*auto\s*!important/);
  assert.match(block, /\.duomei-header-hover-zone[\s\S]*display:\s*none\s*!important/);
  assert.match(block, /\.duomei-header nav \{[\s\S]*gap:\s*var\(--space-2xs\)\s*!important/);
  assert.match(block, /\.duomei-header nav \{[\s\S]*background:\s*var\(--color-paper\)\s*!important/);
  assert.match(block, /\.duomei-header nav a,[\s\S]*min-height:\s*calc\(var\(--size-hit\) \+ var\(--space-2xs\)\)\s*!important/);
  assert.doesNotMatch(block, /\.duomei-menu-toggle:hover\s*~\s*nav/);
  assert.doesNotMatch(css, /@media \(max-width: 768px\), \(hover: none\) and \(pointer: coarse\)/);
  assert.doesNotMatch(zaobaoCss, /@media \(max-width: 48rem\), \(hover: none\) and \(pointer: coarse\)/);
  assert.doesNotMatch(yunyouCss, /@media \(max-width: 48rem\), \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /@media \(min-width: 1025px\) and \(hover: none\) and \(pointer: coarse\)[\s\S]*\.duomei-header nav \{[\s\S]*display:\s*flex\s*!important[\s\S]*visibility:\s*visible\s*!important/);
});

test("keeps iOS header touch activation synchronous and deterministic", () => {
  assert.match(headerSource, /lastTouchActivationRef\.current = window\.performance\.now\(\)/);
  assert.match(headerSource, /lastTouchActivationRef = useRef\(Number\.NEGATIVE_INFINITY\)/);
  assert.match(headerSource, /window\.location\.assign\(\(target as HTMLAnchorElement\)\.href\)/);
  assert.match(headerSource, /href="\/#guyu"/);
  assert.match(headerSource, /href="\/#yunyou"/);
  assert.doesNotMatch(headerSource, /href="\/guyu"/);
  assert.doesNotMatch(headerSource, /pendingTouchActivationRef/);
  assert.match(headerSource, /currentScrollY - lastScrollYRef\.current > 6\)[\s\S]*setMenuOpen\(false\)/);
  assert.match(headerSource, /document\.addEventListener\("pointerdown", closeOnOutsidePointer\)/);
  assert.match(headerSource, /event\.key !== "Escape"/);
});

test("uses a real local morning illustration for the Zaobao magazine cover", () => {
  assert.match(zaobaoSource, /duomei-default-cover-02\.png/);
  assert.match(zaobaoSource, /className="zaobao-cover-image"/);
  assert.match(zaobaoCss, /\.zaobao-cover-image\s*\{/);
  assert.equal(
    existsSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/images/note-default-covers/duomei-default-cover-02.png")),
    true,
  );
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

test("shows optional local Yunyou photos without exposing camera metadata", () => {
  assert.match(yunyouIndex, /id="card-photo" hidden/);
  assert.match(yunyouIndex, /loading="lazy" decoding="async"/);
  assert.match(yunyouIndex, /#card-photo\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(yunyouIndex, /#card\s*\{[^}]*max-height:[^}]*overflow:\s*auto/);
  assert.match(yunyouIndex, /bottom:\s*max\(12px, env\(safe-area-inset-bottom\)\)/);
  assert.match(yunyouMain, /function updateCardPhoto\(lm\)/);
  assert.match(yunyouMain, /cardPhoto\.hidden = !photo/);
  assert.match(yunyouMain, /cardPhotoImage\.onerror/);
  assert.match(yunyouMain, /photo\.alt \|\| `\$\{lm\.name\}实拍`/);

  const photoPaths = [...yunyouLandmarks.matchAll(/src: '\.\/assets\/photos\/([^']+\.webp)'/g)].map((match) => match[1]);
  assert.equal(photoPaths.length, 4);
  assert.equal(new Set(photoPaths).size, photoPaths.length);
  for (const photoPath of photoPaths) {
    const file = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/assets/photos", photoPath));
    assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(file.subarray(8, 12).toString("ascii"), "WEBP");
    for (let offset = 12; offset + 8 <= file.length;) {
      const chunk = file.subarray(offset, offset + 4).toString("ascii");
      const length = file.readUInt32LE(offset + 4);
      assert.notEqual(chunk, "EXIF", `${photoPath} must not retain EXIF/GPS metadata`);
      offset += 8 + length + (length % 2);
    }
  }
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

test("admin inventory matches the live homepage section set", () => {
  assert.equal(ADMIN_SITE_SECTIONS.length, 8);
  assert.deepEqual(
    ADMIN_SITE_SECTIONS.map((section) => section.id),
    ["zaobao", "notes", "kuaihuo", "guyu", "yunyou", "color", "weiyan", "skills"],
  );
  assert.equal(ADMIN_SITE_SECTIONS.filter((section) => section.editableInAdmin).length, 1);
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "notes")?.channel, "supabase");
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "weiyan")?.href, "/#weiyan");
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "kuaihuo")?.href, "/#kuaihuo");
});

test("deployment facts point at EdgeOne production, not Vercel", () => {
  assert.equal(ADMIN_DEPLOYMENT.platformLabel, "EdgeOne Makers");
  assert.equal(ADMIN_DEPLOYMENT.productionHost, "https://duomei.site");
  assert.match(ADMIN_DEPLOYMENT.buildMarkerPath, /duomei-build\.json$/);
  assert.doesNotMatch(ADMIN_DEPLOYMENT.platformLabel, /Vercel/i);
  assert.equal(channelLabel("git-edgeone"), "Git → EdgeOne");
});

test("health score reacts to drafts and cloud readiness", () => {
  assert.equal(computeAdminHealthScore({ draftCount: 0, imageCount: 4, cloudReady: true }), 98);
  assert.ok(computeAdminHealthScore({ draftCount: 0, imageCount: 0, cloudReady: false }) < 90);
  assert.equal(shortCommit("abcdef1234567890"), "abcdef1");
  assert.equal(shortCommit(""), "");
});

test("guyu shelf summary keeps one class-gated book", () => {
  const summary = summarizeGuyuShelf([
    { access: "class-gated" },
    { access: "public" },
    { access: "public" },
    { access: "public" },
    { access: "public" },
  ]);
  assert.equal(summary.total, 5);
  assert.equal(summary.gatedCount, 1);
  assert.equal(summary.publicCount, 4);
});

test("DuomeiAdmin source no longer advertises Vercel or the old three-entry map", () => {
  assert.doesNotMatch(adminSource, /Vercel/);
  assert.doesNotMatch(adminSource, /3 个内容入口/);
  assert.match(adminSource, /EdgeOne/);
  assert.match(adminSource, /\/#weiyan/);
  assert.match(adminSource, /adminSiteInventory/);
  assert.match(adminSource, /ADMIN_DEPLOYMENT/);
  assert.match(adminSource, /buildMarkerPath/);
});
