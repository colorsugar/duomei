$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$maintenanceBundle = @(
  ".cursor/rules/duomei-project.mdc",
  ".github/copilot-instructions.md",
  ".github/workflows/deploy.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "deploy/guyu-edgeone/README.md",
  "deploy/guyu-edgeone/docs/architecture.md",
  "deploy/guyu-edgeone/docs/duomei-site-dns-plan.md",
  "deploy/guyu-edgeone/docs/duomei-site-release-gate.md",
  "deploy/guyu-edgeone/docs/supabase-boundary.md",
  "GEMINI.md",
  "PROJECT_CONTEXT.md",
  "README.md",
  "docs/guyu-book-import.md"
)

$poetryBundle = @(
  ".github/workflows/deploy-edgeone.yml",
  ".github/workflows/pr-validation.yml",
  "index.html",
  "src/components/HomeIntroSection.tsx",
  "src/components/HomeIntroSection.css",
  "src/components/HomeKineticStage.tsx",
  "src/components/HomeSectionHold.tsx",
  "src/components/BackToTopButton.tsx",
  "src/components/YunyouSection.tsx",
  "src/components/YunyouSection.css",
  "src/components/NotesDreamTransition.tsx",
  "src/components/ZaobaoSection.tsx",
  "src/components/ZaobaoSection.css",
  "src/components/SkillsDirectory.tsx",
  "src/components/DuomeiMusicPlayer.tsx",
  "src/components/StickerPackSection.tsx",
  "src/components/PoetryCanvasEditor.tsx",
  "src/components/RouteScrollManager.tsx",
  "src/lib/timePoetryContent.ts",
  "src/lib/homeSectionHold.ts",
  "src/lib/homeSectionHold.test.ts",
  "src/lib/headerNavBreakpoint.test.ts",
  "src/lib/floatingWidget.ts",
  "src/lib/neteasePlaylist.ts",
  "src/lib/neteasePlaylist.test.ts",
  "src/lib/neteaseLyrics.ts",
  "src/lib/neteaseLyrics.test.ts",
  "server/neteaseMusic.mjs",
  "server/neteaseMusic.test.mjs",
  "cloud-functions/api/music-playlist.js",
  "cloud-functions/api/music-stream.js",
  "cloud-functions/api/music-lyric.js",
  "src/header-tablet-nav.css",
  "src/main.tsx",
  "deploy/guyu-edgeone/tests/auth-core.test.js",
  "src/pages/DuomeiHomePage.tsx",
  "src/pages/DuomeiZaobaoPage.tsx",
  "src/pages/DuomeiYunyouPage.tsx",
  "src/App.tsx",
  "src/components/DuomeiFooter.tsx",
  "src/components/DuomeiHeader.tsx",
  "src/pages/DuomeiSkillsPage.tsx",
  "src/pages/DuomeiAdmin.tsx",
  "src/components/PaperLayer.tsx",
  "src/skills.css",
  "src/music-player.css",
  "src/yunyou-page.css",
  "src/styles.css",
  "vite.config.ts",
  "public/yunyou",
  "public/images/stickers/duomei-preview.jpg",
  "public/images/stickers/duomei-qr.jpg",
  "public/images/stickers/duomei-zhu-zhu-preview.jpg",
  "public/images/stickers/duomei-zhu-zhu-qr.jpg",
  "scripts/verify-release.ps1"
)

$guyuBundle = @(
  ".env.example",
  ".gitignore",
  ".vercelignore",
  ".hallmark/log.json",
  ".hallmark/preflight.json",
  "api/guyu-auth.ts",
  "api/guyu-page.ts",
  "cloud-functions/api/[[default]].js",
  "cloudflare/duomei-media/.gitignore",
  "cloudflare/duomei-media/package-lock.json",
  "cloudflare/duomei-media/package.json",
  "cloudflare/duomei-media/src/index.ts",
  "cloudflare/duomei-media/test/storage.test.ts",
  "cloudflare/duomei-media/tsconfig.json",
  "cloudflare/duomei-media/vitest.config.ts",
  "cloudflare/duomei-media/worker-configuration.d.ts",
  "cloudflare/duomei-media/wrangler.jsonc",
  "docs/release-source-of-truth.md",
  "edgeone.json",
  "package-lock.json",
  "package.json",
  "server/guyuSession.test.ts",
  "server/guyuSession.ts",
  "server/guyuRateLimit.test.ts",
  "server/guyuRateLimit.ts",
  "server/guyuBooks.test.ts",
  "server/guyuEdgeOneAdapter.test.mjs",
  "deploy/guyu-edgeone/edgeone.json",
  "deploy/guyu-edgeone/package-lock.json",
  "deploy/guyu-edgeone/package.json",
  "deploy/guyu-edgeone/server/guyu-core.cjs",
  "src/components/GuyuAccessGate.tsx",
  "deploy/guyu-edgeone/src/components/GuyuAccessGate.tsx",
  "src/components/GuyuFlipbook.tsx",
  "src/components/GuyuShelfPreview.tsx",
  "src/lib/guyuCarousel.ts",
  "src/lib/guyuCarousel.test.ts",
  "src/lib/guyuTouchSequence.ts",
  "src/lib/guyuTouchSequence.test.ts",
  "src/content/guyuBooks.ts",
  "src/pages/DuomeiGuyuPage.tsx",
  "src/pages/DuomeiGuyuReaderPage.tsx",
  "src/guyu.css",
  "src/main.tsx",
  "public/images/guyu",
  "public/images/guyu-gui-xiang-huan-xiang-cover.webp",
  "public/images/guyu-xinshuo-01-cover.webp",
  "public/images/guyu-xinshuo-02-cover.webp",
  "public/images/guyu-zhi-shang-feiyan-cover.webp",
  "tokens.css",
  "tsconfig.server.json",
  "vercel.json"
)

$bundle = @($maintenanceBundle + $poetryBundle + $guyuBundle | Sort-Object -Unique)

$requiredMarkers = @(
  @{ File = "AGENTS.md"; Marker = "PROJECT_CONTEXT.md" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "makers-brifmhu31vjf" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = 'Production branch: `main`' },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "Never read, print, commit, rotate, or replace" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "No Cloudflare, Tencent, R2, EdgeOne, or other secret is required" },
  @{ File = "README.md"; Marker = "EdgeOne Makers" },
  @{ File = "docs/guyu-book-import.md"; Marker = "Never request or use account credentials" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "      - main" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "EDGEONE_PROJECT_ID: makers-brifmhu31vjf" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = 'EDGEONE_API_TOKEN: ${{ secrets.EDGEONE_API_TOKEN }}' },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "public/.well-known/duomei-build.json" },
  @{ File = "deploy/guyu-edgeone/tests/auth-core.test.js"; Marker = "fixture314" },
  @{ File = "server/guyuSession.test.ts"; Marker = "fixture314" },
  @{ File = "cloudflare/duomei-media/vitest.config.ts"; Marker = "test-only-secret-that-is-longer-than-thirty-two-characters" },
  @{ File = "cloudflare/duomei-media/package.json"; Marker = '"@typescript/typescript-linux-x64": "7.0.2"' },
  @{ File = "cloudflare/duomei-media/package.json"; Marker = '"@cloudflare/workerd-linux-64": "1.20260811.1"' },
  @{ File = "src/components/GuyuAccessGate.tsx"; Marker = 'data-guyu-answer-format="class-number"' },
  @{ File = "deploy/guyu-edgeone/src/components/GuyuAccessGate.tsx"; Marker = 'data-guyu-answer-format="class-number"' },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = "PoetryCanvasEditor" },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = 'id="kuaihuo"' },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = "PoetryStackDeck" },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = "StickerPackSection" },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = "HomeSkillsSection" },
  @{ File = "src/App.tsx"; Marker = 'const isZaobao = location.pathname === "/zaobao"' },
  @{ File = "src/App.tsx"; Marker = "DuomeiMusicPlayer" },
  @{ File = "src/App.tsx"; Marker = "duomei-route-paper-veil" },
  @{ File = "src/components/HomeSectionHold.tsx"; Marker = "data-home-section-hold" },
  @{ File = "src/components/HomeKineticStage.tsx"; Marker = "staticContent" },
  @{ File = "src/components/RouteScrollManager.tsx"; Marker = 'behavior: "instant"' },
  @{ File = "src/lib/homeSectionHold.ts"; Marker = "HOME_SECTION_DWELL_VIEWPORTS" },
  @{ File = "package.json"; Marker = '"test:home-hold"' },
  @{ File = "package.json"; Marker = '"test:music"' },
  @{ File = "package.json"; Marker = "headerNavBreakpoint.test.ts" },
  @{ File = "src/lib/headerNavBreakpoint.test.ts"; Marker = "../header-tablet-nav.css" },
  @{ File = "src/lib/headerNavBreakpoint.test.ts"; Marker = "@media (max-width: 768px), (max-width: 1024px) and (hover: none) and (pointer: coarse)" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onUndo" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onRedo" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#color"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#weiyan"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#guyu"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "data-native-navigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "closeAfterNativeNavigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'window.location.assign((target as HTMLAnchorElement).href)' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "onClickCapture={blockDuplicateTouchClick}" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'addEventListener("touchend", finishMenuTouch' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "ref={headerRef}" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'window.addEventListener("hashchange"' },
  @{ File = "src/header-tablet-nav.css"; Marker = "@media (max-width: 768px), (max-width: 1024px) and (hover: none) and (pointer: coarse)" },
  @{ File = "src/header-tablet-nav.css"; Marker = "@media (min-width: 1025px) and (hover: none) and (pointer: coarse)" },
  @{ File = "src/header-tablet-nav.css"; Marker = ".duomei-header:not(.is-menu-open) nav" },
  @{ File = "src/header-tablet-nav.css"; Marker = ".duomei-header.is-menu-open nav" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "### Frozen Mobile Header Contract" },
  @{ File = "src/main.tsx"; Marker = 'import "./header-tablet-nav.css"' },
  @{ File = "src/components/DuomeiFooter.tsx"; Marker = 'to: "/#skills"' },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/ANJIS6e#wechat_redirect" },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/A5vPMKw#wechat_redirect" },
  @{ File = "src/components/SkillsDirectory.tsx"; Marker = "pdf-to-immersive-flipbook" },
  @{ File = "src/components/SkillsDirectory.tsx"; Marker = "duomei-skill-open" },
  @{ File = "src/skills.css"; Marker = "grid-template-columns: repeat(3, minmax(0, 1fr))" },
  @{ File = "src/components/YunyouSection.tsx"; Marker = "yunyou-card-copy" },
  @{ File = "src/components/YunyouSection.tsx"; Marker = 'YUNYOU_HREF = "/yunyou-map"' },
  @{ File = "src/pages/DuomeiYunyouPage.tsx"; Marker = 'src="/yunyou/index.html?embed=1"' },
  @{ File = "src/yunyou-page.css"; Marker = "component: immersive map shell" },
  @{ File = "public/yunyou/index.html"; Marker = 'window.location.replace("/yunyou-map")' },
  @{ File = "index.html"; Marker = "viewport-fit=cover" },
  @{ File = "src/pages/DuomeiZaobaoPage.tsx"; Marker = "parseEdition" },
  @{ File = "src/pages/DuomeiZaobaoPage.tsx"; Marker = "zaobao-story-grid" },
  @{ File = "src/components/ZaobaoSection.css"; Marker = "macrostructure: Ecosystem Index" },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = 'NETEASE_PLAYLIST_ID = "316500315"' },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = "/api/music-stream?id=" },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = '<audio' },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = "scheduleAutoMinimize" },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = 'className="duomei-music-orb"' },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = "fetchNeteaseLyrics" },
  @{ File = "src/components/DuomeiMusicPlayer.tsx"; Marker = "beginOrbLongPress" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "Test NetEase playlist and playback gateway" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = 'yunyouFrameOptions.toUpperCase() === "SAMEORIGIN"' },
  @{ File = ".github/workflows/pr-validation.yml"; Marker = "Test NetEase playlist and playback gateway" },
  @{ File = "src/lib/neteasePlaylist.ts"; Marker = 'NETEASE_PLAYLIST_URL = "/api/music-playlist"' },
  @{ File = "src/lib/neteasePlaylist.ts"; Marker = 'NETEASE_DEFAULT_TRACK_ID = "28568227"' },
  @{ File = "server/neteaseMusic.mjs"; Marker = "NETEASE_MAX_TRACKS = 3000" },
  @{ File = "server/neteaseMusic.mjs"; Marker = "Number(privilege?.pl) > 0" },
  @{ File = "cloud-functions/api/music-playlist.js"; Marker = "handleMusicPlaylistRequest" },
  @{ File = "cloud-functions/api/music-stream.js"; Marker = "handleMusicStreamRequest" },
  @{ File = "cloud-functions/api/music-lyric.js"; Marker = "handleMusicLyricRequest" },
  @{ File = "src/lib/floatingWidget.ts"; Marker = "containFloatingWidget" },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu"' },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu/:bookId"' },
  @{ File = "src/App.tsx"; Marker = 'path="/yunyou-map"' },
  @{ File = "edgeone.json"; Marker = '"source": "/yunyou/*"' },
  @{ File = "edgeone.json"; Marker = '"value": "SAMEORIGIN"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'Array.from({ length: 53 }' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'id: "zhi-shang-feiyan"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'id: "xinshuo-01"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'id: "xinshuo-02"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'id: "gui-xiang-huan-xiang"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'access: "class-gated"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'access: "public"' },
  @{ File = "src/lib/guyuCarousel.ts"; Marker = 'GUYU_CAROUSEL_DWELL_MS = 5_000' },
  @{ File = "src/lib/guyuCarousel.ts"; Marker = 'GUYU_FRAGMENT_ASSEMBLE_MS = 1_180' },
  @{ File = "src/components/GuyuShelfPreview.tsx"; Marker = 'guyu-home-fragment' },
  @{ File = "src/components/GuyuShelfPreview.tsx"; Marker = 'transitionPhaseRef.current = "settle"' },
  @{ File = "src/components/GuyuShelfPreview.tsx"; Marker = 'image.decode().then' },
  @{ File = "src/components/GuyuShelfPreview.tsx"; Marker = 'onPointerMove={handlePointerMove}' },
  @{ File = "src/components/GuyuShelfPreview.tsx"; Marker = 'aria-current={indicatedIndex === index' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'onTouchStartCapture={onBookTouchStart}' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'onClickCapture={blockCompatibilityMouse}' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'is-viewport-zoomed' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'className="guyu-reader-close"' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'const FLIP_TIME = 1_400' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'className="guyu-reader-reveal"' },
  @{ File = "src/pages/DuomeiGuyuReaderPage.tsx"; Marker = 'aria-hidden={isBookOpen}' },
  @{ File = "src/guyu.css"; Marker = "safe-area-inset-right" },
  @{ File = "src/lib/guyuTouchSequence.ts"; Marker = 'activeTouchCount >= 2' },
  @{ File = "src/lib/guyuTouchSequence.ts"; Marker = 'isGuyuViewportZoomed' },
  @{ File = "src/guyu.css"; Marker = '.guyu-book-meta .guyu-title-phrases > span' },
  @{ File = "src/components/BackToTopButton.tsx"; Marker = 'visible && !footerVisible' },
  @{ File = "src/styles.css"; Marker = 'flex-wrap: nowrap' },
  @{ File = "server/guyuBooks.test.ts"; Marker = 'maps zhi-shang-feiyan as a full-page new-book' },
  @{ File = "server/guyuBooks.test.ts"; Marker = 'keeps every public new-book page present, ordered, and byte-stable' },
  @{ File = "deploy/guyu-edgeone/server/guyu-core.cjs"; Marker = 'private-media/guyu/meiyou-yujian/pages' },
  @{ File = "deploy/guyu-edgeone/server/guyu-core.cjs"; Marker = 'Object.hasOwn(BOOKS, book)' },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "/images/guyu/xinshuo-01/pages/001.webp" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "/images/guyu/xinshuo-02/pages/001.webp" },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "/images/guyu/gui-xiang-huan-xiang/pages/001.webp" },
  @{ File = "src/content/guyuBooks.ts"; Marker = '/api/guyu-page?book=' },
  @{ File = "package.json"; Marker = '"react-pageflip": "2.0.3"' },
  @{ File = "package.json"; Marker = '"page-flip": "2.0.7"' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'mobileScrollSupport={true}' },
  @{ File = "src/guyu.css"; Marker = 'StPageFlip ships pan-y here; keep native pinch zoom on its actual touch surface.' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'pairedScanNumbers' },
  @{ File = "src/pages/DuomeiGuyuReaderPage.tsx"; Marker = 'book.access === "class-gated"' },
  @{ File = "api/guyu-page.ts"; Marker = 'requestHasGuyuSession' },
  @{ File = "server/guyuSession.ts"; Marker = 'createGuyuMediaSignature' },
  @{ File = "cloudflare/duomei-media/src/index.ts"; Marker = '/private-media/' },
  @{ File = "cloudflare/duomei-media/src/index.ts"; Marker = '"https://duomei.site"' },
  @{ File = "cloudflare/duomei-media/test/storage.test.ts"; Marker = "rejects SVG uploads" },
  @{ File = "src/lib/supabaseNotes.ts"; Marker = 'new URL("/v1/upload", NOTE_MEDIA_ORIGIN)' },
  @{ File = "vercel.json"; Marker = '/api/guyu-page?book=:book&page=:page' },
  @{ File = "src/pages/DuomeiAdmin.tsx"; Marker = 'id="note-management"' },
  @{ File = "src/components/PaperLayer.tsx"; Marker = "paper-stroke-reveal-rect" },
  @{ File = "src/styles.css"; Marker = ".paper-stroke-reveal-rect" }
  @{ File = "src/components/HomeIntroSection.css"; Marker = "Static notes keep the shared 230svh track" }
  @{ File = "src/components/HomeIntroSection.css"; Marker = "(max-height: 720px)" }
)

$errors = [System.Collections.Generic.List[string]]::new()

$legacyPagesWorkflow = Get-Content -Raw -LiteralPath ".github/workflows/deploy.yml"
if ($legacyPagesWorkflow -match '(?m)^\s*push:\s*$') {
  $errors.Add("Legacy GitHub Pages workflow must remain manual-only and may not run on pushes.")
}

$publicCoverHashes = @{
  "public/images/guyu-zhi-shang-feiyan-cover.webp" = "69644B7DFFDBF78FE5D2D624678B0005AF65FA6E9029340176615FAFCE332D6B"
  "public/images/guyu-xinshuo-01-cover.webp" = "A993DF1567F85CC70D814E27ED7C8F201CDF115495D5B38B4DED47EA5F74EF8D"
  "public/images/guyu-xinshuo-02-cover.webp" = "C779F4CD56A3162C3C16631A72F3033015A02CEBBBA39C05427F3923382A5369"
  "public/images/guyu-gui-xiang-huan-xiang-cover.webp" = "A9F5888860FEABCE30E20E676A01370E602B949082372BD5EEC2A8C75B5719F4"
}

foreach ($cover in $publicCoverHashes.GetEnumerator()) {
  if (-not (Test-Path -LiteralPath $cover.Key)) { continue }
  $coverStream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $cover.Key))
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $actualCoverHash = [System.BitConverter]::ToString($sha256.ComputeHash($coverStream)).Replace("-", "")
  } finally {
    $sha256.Dispose()
    $coverStream.Dispose()
  }
  if ($actualCoverHash -ne $cover.Value) {
    $errors.Add("The public Guyu preview cover does not match its audited source: $($cover.Key)")
  }
}

$publicGuyuFiles = @(
  Get-ChildItem -LiteralPath "public/books/guyu" -Recurse -File -ErrorAction SilentlyContinue
)
if ($publicGuyuFiles.Count -gt 0) {
  $errors.Add("Guyu originals must not exist under public/books/guyu; keep all pages in private storage")
}

$trackedPublicGuyuFiles = @(git ls-files -- "public/books/guyu")
if ($trackedPublicGuyuFiles.Count -gt 0) {
  $errors.Add("Protected Guyu originals must not be tracked from public/books/guyu")
}

$publicClassBookFiles = @(
  Get-ChildItem -LiteralPath "public/images/guyu/meiyou-yujian" -Recurse -File -ErrorAction SilentlyContinue
)
if ($publicClassBookFiles.Count -gt 0) {
  $errors.Add("The protected meiyou-yujian pages must never exist under public/images/guyu")
}

$savedErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
git rev-parse --verify origin/main 2>$null | Out-Null
$hasOriginMain = $LASTEXITCODE -eq 0
$ErrorActionPreference = $savedErrorActionPreference
if ($hasOriginMain) {
  $unpushedPublicObjects = @(git rev-list --objects "origin/main..HEAD" -- "public/books/guyu")
  if ($unpushedPublicObjects.Count -gt 0) {
    $errors.Add("Unpushed Git history still contains public Guyu originals; amend or squash before push")
  }
}

$trackedPrivateGuyuFiles = @(git ls-files -- "private/books/guyu")
if ($trackedPrivateGuyuFiles.Count -gt 0) {
  $errors.Add("Local private Guyu originals must remain ignored; private storage is the deployment source")
}

foreach ($file in $bundle) {
  if (-not (Test-Path -LiteralPath $file)) {
    $errors.Add("Missing bundle file: $file")
    continue
  }

  $savedErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  git cat-file -e "HEAD:$file" 2>$null
  $headFileExists = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $savedErrorActionPreference
  if (-not $headFileExists) {
    $errors.Add("Bundle file is not committed in HEAD: $file")
  }
}

foreach ($requirement in $requiredMarkers) {
  if (-not (Test-Path -LiteralPath $requirement.File)) { continue }
  $workingText = Get-Content -Raw -Encoding utf8 $requirement.File
  if (-not $workingText.Contains($requirement.Marker)) {
    $errors.Add("Working tree is missing required feature marker '$($requirement.Marker)' in $($requirement.File)")
  }

  $savedErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $headText = git show "HEAD:$($requirement.File)" 2>$null
  $headTextExists = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $savedErrorActionPreference
  if (-not $headTextExists -or -not ($headText -join "`n").Contains($requirement.Marker)) {
    $errors.Add("HEAD is missing required feature marker '$($requirement.Marker)' in $($requirement.File)")
  }
}

$unstaged = @(git diff --name-only -- $bundle)
$staged = @(git diff --cached --name-only -- $bundle)
$untracked = @(git ls-files --others --exclude-standard -- $bundle)

if ($unstaged.Count -gt 0) {
  $errors.Add("Uncommitted bundle changes remain: $($unstaged -join ', ')")
}
if ($staged.Count -gt 0) {
  $errors.Add("Staged but uncommitted bundle changes remain: $($staged -join ', ')")
}
if ($untracked.Count -gt 0) {
  $errors.Add("Untracked bundle files remain: $($untracked -join ', ')")
}

if ($errors.Count -gt 0) {
  Write-Error ("Release check failed:`n- " + ($errors -join "`n- "))
  exit 1
}

Write-Output "Release check passed: committed poetry and mixed-access Guyu bundles plus latest-version markers are intact."
