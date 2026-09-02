$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$poetryBundle = @(
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
  "package-lock.json",
  "package.json",
  "server/guyuSession.test.ts",
  "server/guyuSession.ts",
  "server/guyuRateLimit.test.ts",
  "server/guyuRateLimit.ts",
  "server/guyuBooks.test.ts",
  "src/components/GuyuAccessGate.tsx",
  "src/components/GuyuFlipbook.tsx",
  "src/components/GuyuShelfPreview.tsx",
  "src/content/guyuBooks.ts",
  "src/pages/DuomeiGuyuPage.tsx",
  "src/pages/DuomeiGuyuReaderPage.tsx",
  "src/guyu.css",
  "src/main.tsx",
  "tokens.css",
  "tsconfig.server.json",
  "vercel.json"
)

$bundle = @($poetryBundle + $guyuBundle | Sort-Object -Unique)

$requiredMarkers = @(
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
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onUndo" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onRedo" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#color"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/#weiyan"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'href="/guyu"' },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "data-native-navigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = "closeAfterNativeNavigation" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'window.addEventListener("hashchange"' },
  @{ File = "src/components/DuomeiFooter.tsx"; Marker = 'to: "/#skills"' },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/ANJIS6e#wechat_redirect" },
  @{ File = "src/components/StickerPackSection.tsx"; Marker = "https://w.url.cn/s/A5vPMKw#wechat_redirect" },
  @{ File = "src/components/SkillsDirectory.tsx"; Marker = "pdf-to-immersive-flipbook" },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu"' },
  @{ File = "src/App.tsx"; Marker = 'path="/guyu/:bookId"' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'Array.from({ length: 53 }' },
  @{ File = "src/content/guyuBooks.ts"; Marker = '/api/guyu-page?book=' },
  @{ File = "package.json"; Marker = '"react-pageflip": "2.0.3"' },
  @{ File = "package.json"; Marker = '"page-flip": "2.0.7"' },
  @{ File = "src/components/GuyuFlipbook.tsx"; Marker = 'HTMLFlipBook' },
  @{ File = "src/content/guyuBooks.ts"; Marker = 'pairedScanNumbers' },
  @{ File = "src/pages/DuomeiGuyuPage.tsx"; Marker = 'GuyuAccessGate' },
  @{ File = "src/pages/DuomeiGuyuReaderPage.tsx"; Marker = 'GuyuAccessGate' },
  @{ File = "api/guyu-page.ts"; Marker = 'requestHasGuyuSession' },
  @{ File = "server/guyuSession.ts"; Marker = 'createGuyuMediaSignature' },
  @{ File = "cloudflare/duomei-media/src/index.ts"; Marker = '/private-media/' },
  @{ File = "vercel.json"; Marker = '/api/guyu-page?book=:book&page=:page' },
  @{ File = "src/pages/DuomeiAdmin.tsx"; Marker = 'id="note-management"' },
  @{ File = "src/components/PaperLayer.tsx"; Marker = "paper-stroke-reveal-rect" },
  @{ File = "src/styles.css"; Marker = ".paper-stroke-reveal-rect" }
)

$errors = [System.Collections.Generic.List[string]]::new()

$publicGuyuFiles = @(
  Get-ChildItem -LiteralPath "public/books/guyu" -Recurse -File -ErrorAction SilentlyContinue
)
if ($publicGuyuFiles.Count -gt 0) {
  $errors.Add("Guyu originals must not exist under public/books/guyu; keep all pages in private R2")
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
  $errors.Add("Local private Guyu originals must remain ignored; R2 is the deployment source")
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
