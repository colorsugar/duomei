import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as adminSiteInventory from "./adminSiteInventory.ts";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { containFloatingWidget } from "./floatingWidget.ts";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { shouldAnimateRoute } from "../experience/routeMotion.ts";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../header-tablet-nav.css"), "utf8");
const appSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../App.tsx"), "utf8");
const headerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiHeader.tsx"), "utf8");
const backToTopSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/BackToTopButton.tsx"), "utf8");
const guyuPreviewSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/GuyuShelfPreview.tsx"), "utf8");
const noteDetailSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiNoteDetailPage.tsx"), "utf8");
const footerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiFooter.tsx"), "utf8");
const yunyouSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.tsx"), "utf8");
const yunyouCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/YunyouSection.css"), "utf8");
const yunyouPageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiYunyouPage.tsx"), "utf8");
const yunyouPageCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../yunyou-page.css"), "utf8");
const zaobaoSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/ZaobaoSection.tsx"), "utf8");
const zaobaoCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/ZaobaoSection.css"), "utf8");
const zaobaoPageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiZaobaoPage.tsx"), "utf8");
const zaobaoArchivePageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiZaobaoArchivePage.tsx"), "utf8");
const skillsSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/SkillsDirectory.tsx"), "utf8");
const skillsPageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiSkillsPage.tsx"), "utf8");
const skillsCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../skills.css"), "utf8");
const homePageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiHomePage.tsx"), "utf8");
const musicPlayerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/DuomeiMusicPlayer.tsx"), "utf8");
const musicPlayerCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../music-player.css"), "utf8");
const neteaseClientSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "./neteasePlaylist.ts"), "utf8");
const neteaseServerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../server/neteaseMusic.mjs"), "utf8");
const yunyouIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/index.html"), "utf8");
const yunyouMain = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/src/main.js"), "utf8");
const yunyouLandmarks = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/yunyou/data/landmarks.js"), "utf8");
const yunyouCover = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/images/yunyou-guilin-cover.webp"));
const prValidationWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/pr-validation.yml"), "utf8");
const cursorAutoMergeWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/cursor-auto-merge.yml"), "utf8");
const edgeOneDeployWorkflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.github/workflows/deploy-edgeone.yml"), "utf8");
const edgeOneConfig = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../edgeone.json"), "utf8");
const guyuCarouselSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "./guyuCarousel.ts"), "utf8");
const guyuCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../guyu.css"), "utf8");
const guyuReaderPageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../pages/DuomeiGuyuReaderPage.tsx"), "utf8");
const homeIntroCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/HomeIntroSection.css"), "utf8");
const siteCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles.css"), "utf8");
const rootIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../index.html"), "utf8");
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

test("joins public route journeys while leaving anchors, reduced motion and administration immediate", () => {
  for (const target of ['/zaobao', '/note/a', '/guyu', '/guyu/xinshuo-01', '/yunyou-map', '/skills']) {
    assert.equal(shouldAnimateRoute('/', target, false, false), true, target);
    assert.equal(shouldAnimateRoute(target, '/', false, false), true, `return from ${target}`);
    assert.equal(shouldAnimateRoute('/', target, true, false), false, 'reduced motion');
    assert.equal(shouldAnimateRoute('/', target, false, true), false, 'background navigation');
  }
  assert.equal(shouldAnimateRoute('/', '/', false, false), false, 'homepage chapter anchors');
  assert.equal(shouldAnimateRoute('/guyu', '/guyu', false, false), false, 'query-only changes');
  assert.equal(shouldAnimateRoute('/', '/admin/login', false, false), false);
  assert.equal(shouldAnimateRoute('/admin', '/', false, false), false);
});

test("keeps the Zaobao cover inside the SPA route transition", () => {
  assert.match(zaobaoSource, /import \{ Link \} from "react-router-dom"/);
  assert.match(zaobaoSource, /<Link className="zaobao-card" to=\{ZAOBAO_ROUTE\}/);
  assert.doesNotMatch(zaobaoSource, /<a className="zaobao-card"/);
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

test("keeps Zaobao immersive while safely falling back to the original edition", () => {
  assert.match(appSource, /const isZaobao = location\.pathname === "\/zaobao"/);
  assert.match(appSource, /bareChrome = isAdmin \|\| isGuyuReader \|\| isZaobao \|\| isYunyouMap/);
  assert.match(zaobaoPageSource, /function parseEdition\(html: string, base: string = ZAOBAO_URL\)/);
  assert.match(zaobaoPageSource, /\.page > section\[id\]/);
  assert.match(zaobaoPageSource, /className="zaobao-story-grid"/);
  assert.match(zaobaoPageSource, /className="zaobao-frame"/);
  assert.doesNotMatch(zaobaoPageSource, /dangerouslySetInnerHTML|srcDoc/);
  assert.match(zaobaoCss, /main\.zaobao-page \{[\s\S]*position:\s*fixed;[\s\S]*overflow-y:\s*auto/);
  assert.match(zaobaoCss, /\.zaobao-story-grid \{[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(zaobaoCss, /@media \(max-width: 64rem\)[\s\S]*\.zaobao-story-grid \{[\s\S]*minmax\(0, 1fr\)/);
});

test("keeps the Zaobao archive inside duomei.site and reuses the same reader", () => {
  assert.match(appSource, /location\.pathname\.startsWith\("\/zaobao\/"\)/);
  assert.match(appSource, /<Route path="\/zaobao\/archive" element=\{<DuomeiZaobaoArchivePage \/>\} \/>/);
  assert.match(appSource, /<Route path="\/zaobao\/:date" element=\{<DuomeiZaobaoPage \/>\} \/>/);
  assert.match(zaobaoSource, /ZAOBAO_ARCHIVE_ROUTE = "\/zaobao\/archive"/);
  assert.match(zaobaoSource, /<Link className="zaobao-heading-archive" to=\{ZAOBAO_ARCHIVE_ROUTE\}/);
  assert.match(zaobaoPageSource, /ZAOBAO_DATE_PATTERN = \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//);
  assert.match(zaobaoPageSource, /return date \? `\$\{ZAOBAO_URL\}\/\$\{date\}\/` : ZAOBAO_URL/);
  assert.match(zaobaoPageSource, /if \(invalidDate\) \{\s*return <Navigate to=\{ZAOBAO_ARCHIVE_ROUTE\} replace \/>/);
  assert.match(zaobaoPageSource, /<Link className="zaobao-page-archive" to=\{ZAOBAO_ARCHIVE_ROUTE\}>/);
  assert.match(zaobaoPageSource, /href=\{originalUrl\} target="_blank"/);
  assert.match(zaobaoPageSource, /\.page > section\[id\], \.page > \.group\[id\]/);
  assert.match(zaobaoArchivePageSource, /`\$\{ZAOBAO_URL\}\/archive\/manifest\.json`/);
  assert.match(zaobaoArchivePageSource, /<Link to=\{`\$\{ZAOBAO_ROUTE\}\/\$\{entry\.date\}`\}>/);
  assert.match(zaobaoArchivePageSource, /href=\{ZAOBAO_ARCHIVE_URL\} target="_blank"/);
  assert.doesNotMatch(zaobaoArchivePageSource, /dangerouslySetInnerHTML|srcDoc|<iframe/);
  assert.doesNotMatch(zaobaoSource, /zaobao-heading-archive"[^>]*target=/);
});

test("uses Skill naming and a three-column desktop directory", () => {
  assert.match(headerSource, /href="\/skills"[\s\S]*>\s*Skill\s*</);
  assert.match(footerSource, /\{ label: "Skill", to: "\/#skills" \}/);
  assert.match(homePageSource, /\{ id: "skills", label: "Skill" \}/);
  assert.match(skillsSource, />Skill<|>Skill 目录</);
  assert.match(skillsSource, /查看 Skill 页/);
  assert.match(skillsPageSource, /document\.title = "Skill \| 多美小记"/);
  assert.match(skillsPageSource, /<h1>Skill<\/h1>/);
  assert.match(skillsCss, /@media \(min-width: 60rem\)[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("keeps the full NetEase playlist native, movable, bounded, and autoplay-off", () => {
  assert.match(appSource, /!isAdmin \? <DuomeiMusicPlayer compactContext=\{isGuyuReader \|\| isZaobao \|\| isYunyouMap\} \/> : null/);
  assert.match(musicPlayerSource, /NETEASE_PLAYLIST_ID = "316500315"/);
  assert.match(musicPlayerSource, /<audio[\s\S]*preload="metadata"/);
  assert.doesNotMatch(musicPlayerSource, /<iframe|autoPlay/);
  assert.match(musicPlayerSource, /\/api\/music-stream\?id=/);
  assert.match(musicPlayerSource, /findPlayableIndex/);
  assert.match(musicPlayerSource, /track\.playable && !failedTrackIdsRef\.current\.has\(track\.id\)/);
  assert.match(musicPlayerSource, /搜索 \$\{playableCount\} 首可播放歌曲/);
  assert.doesNotMatch(musicPlayerSource, /2_270|PLAYABLE \/|原歌单/);
  assert.match(musicPlayerSource, /setPointerCapture\(event\.pointerId\)/);
  assert.match(musicPlayerSource, /duomei-music-player-position-v4/);
  assert.match(musicPlayerSource, /scheduleAutoMinimize/);
  assert.match(musicPlayerSource, /className="duomei-music-orb"/);
  assert.match(musicPlayerSource, /event\.pointerType !== "mouse"/);
  assert.match(musicPlayerSource, /window\.setTimeout\(revealCompactPlayer, 180\)/);
  assert.match(musicPlayerSource, /addEventListener\("wheel", containWheel, \{ passive: false \}\)/);
  assert.match(musicPlayerSource, /event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)/);
  assert.match(musicPlayerSource, /event\.ctrlKey/);
  assert.match(musicPlayerSource, /type PlaybackMode = "sequence" \| "shuffle" \| "one"/);
  assert.match(musicPlayerSource, /Math\.random\(\) \* choices\.length/);
  assert.match(musicPlayerSource, /playbackMode === "one"/);
  assert.match(musicPlayerSource, /duomei-music-playback-mode/);
  assert.match(musicPlayerSource, /return "shuffle"/);
  assert.match(musicPlayerSource, /findInitialNeteaseTrackIndex/);
  assert.match(musicPlayerSource, /useState\(compactContext\)/);
  assert.match(neteaseClientSource, /NETEASE_DEFAULT_TRACK_ID = "28568227"/);
  assert.match(musicPlayerSource, /--music-progress/);
  assert.match(musicPlayerSource, /LONG_PRESS_MS = 320/);
  assert.match(musicPlayerSource, /beginOrbLongPress/);
  assert.match(musicPlayerSource, /if \(dragRef\.current \|\| pointerFocusGuardRef\.current\) return/);
  assert.match(musicPlayerSource, /className="duomei-music-cover"[\s\S]*onPointerDown=\{beginOrbLongPress\}/);
  assert.match(musicPlayerSource, /onPointerDown=\{seekFromPointer\}/);
  assert.match(musicPlayerSource, /fetchNeteaseLyrics/);
  assert.match(musicPlayerSource, /className="duomei-music-lyrics-toggle"/);
  assert.match(neteaseClientSource, /fetch\(NETEASE_PLAYLIST_URL, \{ signal, credentials: "same-origin" \}\)/);
  assert.match(neteaseServerSource, /NETEASE_PLAYLIST_ID = 316500315/);
  assert.match(neteaseServerSource, /NETEASE_MAX_TRACKS = 3000/);
  assert.match(musicPlayerCss, /\.duomei-music-player\.is-placed/);
  assert.match(musicPlayerCss, /\.duomei-music-player\.is-minimized/);
  assert.match(musicPlayerCss, /theme: Warm Archive/);
  assert.match(musicPlayerCss, /"cover previous play next spacer mode lyrics mute queue"/);
  assert.doesNotMatch(musicPlayerCss, /is-immersive[\s\S]{0,160}duomei-music-(?:queue|lyrics-toggle)/);
  assert.match(musicPlayerCss, /\.duomei-music-orb\s*\{[\s\S]*touch-action:\s*none[\s\S]*cursor:\s*grab/);
  assert.doesNotMatch(musicPlayerCss, /\.duomei-music-drag|\.duomei-music-placement|\.is-fixed|\.is-free/);
  assert.match(musicPlayerCss, /inline-size:\s*min\(var\(--music-player-width\), calc\(100% - \(var\(--space-md\) \* 2\)\)\)/);
  assert.match(musicPlayerCss, /inline-size 620ms cubic-bezier/);
  assert.match(musicPlayerCss, /::-webkit-slider-thumb[\s\S]*inline-size:\s*0\.625rem/);
  assert.match(musicPlayerCss, /:is\(:hover, :active, :focus-visible\)::-webkit-slider-runnable-track\s*\{[\s\S]*block-size:\s*6px/);
  assert.match(musicPlayerCss, /body:has\(\.duomei-music-player:not\(\.is-minimized\)\)[\s\S]*\.back-to-top, \.home-section-progress/);
  assert.match(musicPlayerCss, /\.duomei-motion-root > \.duomei-music-player\s*\{[\s\S]*?position:\s*fixed/);
  assert.deepEqual(containFloatingWidget({ x: -20, y: 900 }, 200, 100, 800, 600), { x: 16, y: 484 });
  assert.deepEqual(containFloatingWidget({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, 200, 100, 800, 600), { x: 16, y: 16 });
});

test("keeps the homepage Guyu preview slow, misted, manual, and linked only after settling", () => {
  const beginSettle = guyuPreviewSource.slice(
    guyuPreviewSource.indexOf("const beginSettle"),
    guyuPreviewSource.indexOf("const beginAssembly"),
  );
  assert.match(guyuCarouselSource, /GUYU_CAROUSEL_DWELL_MS = 5_000/);
  assert.match(guyuCarouselSource, /GUYU_FRAGMENT_SCATTER_MS = 760/);
  assert.match(guyuCarouselSource, /GUYU_FRAGMENT_ASSEMBLE_MS = 1_180/);
  assert.match(guyuCarouselSource, /GUYU_SETTLE_MS = 1_600/);
  assert.match(guyuCarouselSource, /GUYU_SETTLE_FALLBACK_MS = 2_400/);
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
  assert.match(guyuPreviewSource, /Math\.max\(0, GUYU_SETTLE_MS - \(performance\.now\(\) - phaseStartedAt\)\)/);
  assert.match(guyuCss, /animation:\s*guyuCoverSettle var\(--guyu-settle-duration\)/);
  assert.match(guyuCss, /animation:\s*guyuCopyBreath 5s ease-in-out infinite/);
  assert.match(guyuCss, /filter:\s*blur\(2\.4px\) saturate\(0\.72\)/);
  assert.doesNotMatch(guyuCss, /\.guyu-home-carousel\[data-phase="settle"\][^{}]*\.guyu-home-book-base\s*\{[^}]*opacity:\s*0/);
  assert.match(guyuPreviewSource, /const linkedBook = transitionPhase === "settle"/);
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

test("keeps Guyu reader exits inside the SPA and moves phone actions above the safe area", () => {
  assert.doesNotMatch(guyuReaderPageSource, /reloadDocument|popstate|window\.location\.reload/);
  assert.match(guyuReaderPageSource, /className="guyu-reader-back"[\s\S]*to="\/guyu"/);
  assert.match(rootIndex, /width=device-width, initial-scale=1\.0, viewport-fit=cover/);
  assert.match(guyuCss, /@media \(max-width: 40rem\)[\s\S]*\.guyu-reader-heading\s*\{[\s\S]*inset-block-start:\s*auto[\s\S]*inset-block-end:[^;]*safe-area-inset-bottom[\s\S]*inset-inline-end:[^;]*safe-area-inset-right/);
  assert.match(guyuCss, /\.guyu-reader-close\s*\{[\s\S]*inset-block-start:\s*auto[\s\S]*inset-block-end:[^;]*safe-area-inset-bottom[\s\S]*inset-inline-end:[^;]*safe-area-inset-right/);
  assert.match(guyuCss, /\.guyu-reader-page \.guyu-book-controls\s*\{[\s\S]*inset-block-end:[^;]*var\(--size-hit\)[^;]*var\(--space-sm\)/);
  assert.match(musicPlayerCss, /body:has\(\.guyu-reader-page\) \.duomei-music-player:not\(\.is-placed\)/);
});

test("keeps the note-detail back target visible outside the fixed header", () => {
  assert.equal(noteDetailSource.match(/className="detail-back"/g)?.length, 3);
  assert.match(siteCss, /\.detail-back\s*\{[^}]*min-block-size:\s*var\(--size-hit\)/);
  assert.doesNotMatch(siteCss, /\.duomei-detail:not\(\.detail-edit-page\)\s*\{[^}]*padding-top:\s*clamp\((?:32|36)px/);
});

test("keeps the mobile footer compact with all eight shortcuts on one row", () => {
  assert.match(siteCss, /\.duomei-quick-nav ul \{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(siteCss, /\.duomei-quick-nav li \{[\s\S]*flex:\s*1 1 0/);
  assert.equal(footerSource.match(/\{ label:/g)?.length, 8);
  assert.match(footerSource, /\{ label: "云游", to: "\/#yunyou" \}/);
  assert.match(backToTopSource, /document\.querySelector\("\.duomei-footer"\)/);
  assert.match(backToTopSource, /document\.querySelector\("\.yunyou-card"\)/);
  assert.match(backToTopSource, /visible && !footerVisible && !yunyouVisible/);
});

test("ships Yunyou as a same-origin, vendored, accessible 3D map", () => {
  assert.match(yunyouSource, /const YUNYOU_HREF = "\/yunyou-map"/);
  assert.match(yunyouSource, /<Link className="yunyou-card" to=\{YUNYOU_HREF\}/);
  assert.match(yunyouSource, /\/images\/yunyou-guilin-cover\.webp/);
  assert.match(yunyouSource, /沿着水岸，慢慢看桂林/);
  assert.match(yunyouSource, /开始云游 →/);
  assert.doesNotMatch(yunyouSource, /Guilin · 1:1|点进去慢慢转/);
  assert.doesNotMatch(yunyouSource, /vercel\.app/);
  assert.match(yunyouCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(yunyouIndex, /"three": "\.\/vendor\/three\/three\.module\.js"/);
  assert.doesNotMatch(yunyouIndex, /cdn\.jsdelivr\.net|unpkg\.com/);
  assert.match(yunyouIndex, /id="map-fallback"/);
  assert.match(yunyouIndex, /href="\/#yunyou"/);
  assert.match(yunyouIndex, /window\.self !== window\.top/);
  assert.match(yunyouIndex, /window\.location\.replace\("\/yunyou-map"\)/);
  assert.match(yunyouIndex, /\.is-embedded \.back-home/);
  assert.match(yunyouPageSource, /className="yunyou-map-frame" src="\/yunyou\/index\.html\?embed=1"/);
  assert.match(yunyouPageSource, /className="yunyou-map-back" to="\/#yunyou"/);
  assert.match(appSource, /<Route path="\/yunyou-map" element=\{<DuomeiYunyouPage \/>\}/);
  assert.match(yunyouPageCss, /component: immersive map shell/);
  assert.match(yunyouPageCss, /\.duomei-motion-root > \.yunyou-map-page\s*\{[\s\S]*position:\s*fixed[\s\S]*block-size:\s*100svh/);
  assert.match(yunyouPageCss, /body:has\(\.duomei-music-player:not\(\.is-minimized\)\) \.yunyou-map-back/);
  assert.match(yunyouPageCss, /@media \(max-width: 40rem\)/);
  assert.match(edgeOneConfig, /"source": "\/\*"[\s\S]*"X-Frame-Options", "value": "DENY"/);
  assert.match(edgeOneConfig, /"source": "\/yunyou\/\*"[\s\S]*"X-Frame-Options", "value": "SAMEORIGIN"[\s\S]*"Content-Security-Policy", "value": "frame-ancestors 'self'"/);
  assert.match(edgeOneDeployWorkflow, /homeFrameOptions\.toUpperCase\(\) === "DENY"/);
  assert.match(edgeOneDeployWorkflow, /yunyouFrameOptions\.toUpperCase\(\) === "SAMEORIGIN"/);
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

test("keeps short mobile poetry pages clear of clipping and the tiny progress hint", () => {
  assert.match(homeIntroCss, /@media \(max-width: 48rem\) and \(max-height: 720px\)/);
  assert.match(homeIntroCss, /font-size:\s*clamp\(1rem, 4\.5vw, 1\.2rem\) !important/);
  assert.match(siteCss, /\.home-section-progress\s*\{[\s\S]*background:\s*transparent[\s\S]*box-shadow:\s*none/);
  assert.match(siteCss, /inset-block-end:\s*max\([\s\S]*var\(--space-sm\)/);
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
