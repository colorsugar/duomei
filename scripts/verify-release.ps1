$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$bundle = @(
  "src/components/HomeIntroSection.tsx",
  "src/components/HomeIntroSection.css",
  "src/components/PoetryCanvasEditor.tsx",
  "src/lib/timePoetryContent.ts",
  "src/pages/DuomeiHomePage.tsx",
  "src/App.tsx",
  "src/components/DuomeiFooter.tsx",
  "src/components/DuomeiHeader.tsx",
  "src/pages/DuomeiAdmin.tsx",
  "src/components/PaperLayer.tsx",
  "src/styles.css"
)

$requiredMarkers = @(
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = "PoetryCanvasEditor" },
  @{ File = "src/components/HomeIntroSection.tsx"; Marker = 'id="kuaihuo"' },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onUndo" },
  @{ File = "src/components/PoetryCanvasEditor.tsx"; Marker = "onRedo" },
  @{ File = "src/components/DuomeiHeader.tsx"; Marker = 'to="/#kuaihuo"' },
  @{ File = "src/pages/DuomeiAdmin.tsx"; Marker = 'id="note-management"' },
  @{ File = "src/components/PaperLayer.tsx"; Marker = "paper-stroke-reveal-rect" },
  @{ File = "src/styles.css"; Marker = ".paper-stroke-reveal-rect" }
)

$errors = [System.Collections.Generic.List[string]]::new()

foreach ($file in $bundle) {
  if (-not (Test-Path -LiteralPath $file)) {
    $errors.Add("Missing bundle file: $file")
    continue
  }

  git cat-file -e "HEAD:$file" 2>$null
  if ($LASTEXITCODE -ne 0) {
    $errors.Add("Bundle file is not committed in HEAD: $file")
  }
}

foreach ($requirement in $requiredMarkers) {
  if (-not (Test-Path -LiteralPath $requirement.File)) { continue }
  $workingText = Get-Content -Raw -Encoding utf8 $requirement.File
  if (-not $workingText.Contains($requirement.Marker)) {
    $errors.Add("Working tree is missing required feature marker '$($requirement.Marker)' in $($requirement.File)")
  }

  $headText = git show "HEAD:$($requirement.File)"
  if ($LASTEXITCODE -ne 0 -or -not ($headText -join "`n").Contains($requirement.Marker)) {
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

Write-Output "Release check passed: committed poetry bundle and latest-version markers are intact."
