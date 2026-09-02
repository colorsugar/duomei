$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$maintenanceBundle = @(
  ".cursor/rules/duomei-project.mdc",
  ".github/copilot-instructions.md",
  "AGENTS.md",
  "CLAUDE.md",
  "deploy/guyu-edgeone/README.md",
  "deploy/guyu-edgeone/docs/architecture.md",
  "deploy/guyu-edgeone/docs/duomei-site-dns-plan.md",
  "deploy/guyu-edgeone/docs/duomei-site-release-gate.md",
  "deploy/guyu-edgeone/docs/supabase-boundary.md",
  "GEMINI.md",
  "PROJECT_CONTEXT.md",
  "README.md"
)

$poetryBundle = @(
  ".github/workflows/deploy-edgeone.yml",
  "src/components/HomeIntroSection.tsx",
  "src/components/HomeIntroSection.css",
  "src/components/HomeKineticStage.tsx",
  "src/components/HomeSectionHold.tsx",
  "src/components/NotesDreamTransition.tsx",
  "src/components/SkillsDirectory.tsx",
  "src/components/StickerPackSection.tsx",
  "src/components/PoetryCanvasEditor.tsx",
  "src/components/RouteScrollManager.tsx",
  "src/lib/timePoetryContent.ts",
  "src/lib/homeSectionHold.ts",
  "src/lib/homeSectionHold.test.ts",
  "src/lib/headerNavBreakpoint.test.ts",
  "src/header-tablet-nav.css",
  "src/main.tsx",
  "deploy/guyu-edgeone/tests/auth-core.test.js",
  "src/pages/DuomeiHomePage.tsx",
  "src/App.tsx",
  "src/components/DuomeiFooter.tsx",
  "src/components/DuomeiHeader.tsx",
  "src/pages/DuomeiSkillsPage.tsx",
  "src/pages/DuomeiAdmin.tsx",
  "src/components/PaperLayer.tsx",
  "src/skills.css",
  "src/styles.css",
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
  "scripts/sync-guyu-private-books.mjs",
  "deploy/guyu-edgeone/edgeone.json",
  "deploy/guyu-edgeone/package-lock.json",
  "deploy/guyu-edgeone/package.json",
  "deploy/guyu-edgeone/server/guyu-core.cjs",
  "src/components/GuyuAccessGate.tsx",
  "deploy/guyu-edgeone/src/components/GuyuAccessGate.tsx",
  "src/components/GuyuFlipbook.tsx",
  "src/components/GuyuShelfPreview.tsx",
  "src/content/guyuBooks.ts",
  "src/pages/DuomeiGuyuPage.tsx",
  "src/pages/DuomeiGuyuReaderPage.tsx",
  "src/guyu.css",
  "src/main.tsx",
  "public/images/guyu-zhi-shang-feiyan-cover.webp",
  "tokens.css",
  "tsconfig.server.json",
  "vercel.json"
)

$bundle = @($maintenanceBundle + $poetryBundle + $guyuBundle | Sort-Object -Unique)

$requiredMarkers = @(
  @{ File = "AGENTS.md"; Marker = "PROJECT_CONTEXT.md" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "makers-brifmhu31vjf" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "candidate/guyu-edgeone-global-20260901" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "Never read, print, commit, rotate, or replace" },
  @{ File = "README.md"; Marker = "EdgeOne Makers" },
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
  @{ File = "src/components/HomeSectionHold.tsx"; Marker = "data-home-section-hold" },
  @{ File = "src/components/HomeKineticStage.tsx"; Marker = "staticContent" },
  @{ File = "src/components/RouteScrollManager.tsx"; Marker = 'behavior: "instant"' },
  @{ File = "src/lib/homeSectionHold.ts"; Marker = "HOME_SECTION_DWELL_VIEWPORTS" },
  @{ File = "package.json"; Marker = '"test:home-hold"' },
  @{ File = "package.json"; Marker = "headerNavBreakpoint.test.ts" },
  @{ File = "src/lib/headerNavBreakpoint.test.ts"; Marker = "../header-tablet-nav.css" },
  @{ File = "src/lib/headerNavBreakpoint.test.ts"; Marker = "@media (max-width: 768px), (hover: none) and (pointer: coarse)" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onUndo" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onRedo" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#color"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#weiyan"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/guyu"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "data-native-navigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "closeAfterNativeNavigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'window.location.assign((target as HTMLAnchorElement).href)' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "onClickCapture={blockDuplicateTouchClick}" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'addEventListener("touchend", finishMenuTouch' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "ref={headerRef}" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'window.addEventListener("hashchange"' },
  @{ File = "src/header-tablet-nav.css"; Marker = "@media (max-width: 768px), (hover: none) and (pointer: coarse)" },
  @{ File = "src/header-tablet-nav.css"; Marker = ".duomei-header:not(.is-menu-open) nav" },
  @{ File = "src/header-tablet-nav.css"; Marker = ".duomei-header.is-menu-open nav" },
  @{ File = "PROJECT_CONTEXT.md"; Marker = "### Frozen Mobile Header Contract" },
  @{ File = "src/main.tsx"; Marker = 'import "./header-tablet-nav.css"' },
  @{ File = "src/components/DuomeiFooter.tsx"; Marker = 'to: "/#skills"' },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/ANJIS6e#wechat_redirect" },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/A5vPMKw#wechat_redirect" },
  @{ File = "src/components/SkillsDirectory.tsx"; Marker = "pdf-to-immersive-flipbook" },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu"' },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu/:bookId"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'Array.from({ length: 53 }' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'id: "zhi-shang-feiyan"' },
  @{ File = "server/guyuBooks.test.ts"; Marker = 'maps zhi-shang-feiyan as a full-page new-book' },
  @{ File = "deploy/guyu-edgeone/server/guyu-core.cjs"; Marker = 'private-media/guyu/zhi-shang-feiyan/pages' },
  @{ File = "deploy/guyu-edgeone/server/guyu-core.cjs"; Marker = 'Object.hasOwn(BOOKS, book)' },
  @{ File = "scripts/sync-guyu-private-books.mjs"; Marker = '249736f5dd4914f1797a6eb5b4e8d9226edb6be9' },
  @{ File = "scripts/sync-guyu-private-books.mjs"; Marker = 'https://zhi-shang-feiyan-52dbdlv5c-duomei.vercel.app/pages' },
  @{ File = "scripts/sync-guyu-private-books.mjs"; Marker = 'onlyIfNew: true' },
  @{ File = ".github/workflows/deploy-edgeone.yml"; Marker = "Sync private Guyu books" },
  @{ File = "src/content/guyuBooks.ts"; Marker = '/api/guyu-page?book=' },
  @{ File = "package.json"; Marker = '"react-pageflip": "2.0.3"' },
  @{ File = "package.json"; Marker = '"page-flip": "2.0.7"' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'mobileScrollSupport={true}' },
  @{ File = "src/guyu.css"; Marker = 'StPageFlip ships pan-y here; keep native pinch zoom on its actual touch surface.' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'pairedScanNumbers' },
  @{ File = "src/pages/DuomeiGuyuPage.tsx"; Marker = 'GuyuAccessGate' },
  @{ File = "src/pages/DuomeiGuyuReaderPage.tsx"; Marker = 'GuyuAccessGate' },
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
)

$errors = [System.Collections.Generic.List[string]]::new()

$feiyanCover = "public/images/guyu-zhi-shang-feiyan-cover.webp"
$feiyanCoverHash = "69644B7DFFDBF78FE5D2D624678B0005AF65FA6E9029340176615FAFCE332D6B"
if (Test-Path -LiteralPath $feiyanCover) {
  $coverStream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $feiyanCover))
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $actualFeiyanCoverHash = [System.BitConverter]::ToString($sha256.ComputeHash($coverStream)).Replace("-", "")
  } finally {
    $sha256.Dispose()
    $coverStream.Dispose()
  }
  if ($actualFeiyanCoverHash -ne $feiyanCoverHash) {
    $errors.Add("The public 纸上飞檐 preview cover does not match the audited source")
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
  $errors.Add("Guyu originals must not be tracked from public/books/guyu")
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

Write-Output "Release check passed: committed poetry and protected Guyu bundles plus latest-version markers are intact."
