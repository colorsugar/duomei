# AI Work Rules For This Project

## Mandatory Reading Order

Before editing, committing, or deploying anything, read:

- `PROJECT_CONTEXT.md`
- `docs/release-source-of-truth.md`

Then read any task-specific document referenced there, including `docs/note-card-tilt.md` before note-card interaction work and `docs/guyu-book-import.md` before changing `src/content/guyuBooks.ts` or importing a Guyu book.

`PROJECT_CONTEXT.md` is the cross-AI source for current production architecture, routes, platform boundaries, user preferences, verification requirements, and known audit findings. Do not follow a historical candidate document when it conflicts with that file.

## Mandatory Latest-Version Rule

The current workspace is the source of truth when it contains uncommitted work. Never assume that `HEAD`, `origin/main`, or the production website is newer than the working tree. Never replace, omit, or partially publish existing workspace work just because it is not committed yet.

The poetry portal/editor is an atomic feature bundle. Its files must be reviewed, committed, and deployed together as described in `docs/release-source-of-truth.md`. Do not publish a navigation-only or styling-only commit while related poetry-editor files remain uncommitted.

Before every production deployment, run:

- `npm.cmd run build`
- `npm.cmd run release:check`

If `release:check` fails, stop. Do not deploy around it or silently exclude files.

The current production checkout on this Windows host is `C:\Users\刘诚颢\Documents\color`, branch `main`. The repository root deploys to EdgeOne Makers project `duomei-guyu` (`makers-brifmhu31vjf`). Do not substitute the retired candidate branch, Vercel, GitHub Pages, or `deploy/guyu-edgeone/` without explicit user direction.

Ready pull requests from same-repository `cursor/*` branches use the guarded auto-publish path: `.github/workflows/pr-validation.yml` must pass, then `.github/workflows/cursor-auto-merge.yml` revalidates the exact head SHA and changed paths, squash-merges into `main`, and explicitly dispatches the existing EdgeOne production workflow. Cursor agents must work in `colorsugar/duomei`, open a ready PR, and must not ask the user to click Merge when the gate is healthy. Failed/draft PRs and PRs touching workflows, credentials, dependencies, deployment configuration, server infrastructure, or canonical release policy stay open for manual review. Never give a cloud agent EdgeOne, Cloudflare, Supabase, or GitHub account secrets to bypass this path.

Public `新说` books are Git-tracked static assets: preview covers use `public/images/guyu-<book-id>-cover.webp`, and pages use `public/images/guyu/<book-id>/pages/`. They deploy through the existing `main` GitHub Actions workflow. Importing or publishing a public book requires no Cloudflare, Tencent, R2, EdgeOne, or other account secret; never ask the user for one. `meiyou-yujian` remains the only class-gated private book and uses EdgeOne Pages Blob. Any additional private/class-gated book is a security and product change that requires explicit user authorization before implementation.

Never change or expose production access answers, hashes, salts, tokens, Cookies, or private Guyu originals unless the user explicitly authorizes that exact action. A successful build or API response is not a webpage or real-device acceptance test; inspect the actual production page and reproduce the reported interaction.

This is mandatory for every AI coding agent working in this repository.

The homepage note-card 3D tilt interaction is performance-sensitive. Do not add duplicate mouse/pointer listeners, do not add `transform` transitions while `.is-tilting`, and do not override the final note-card tilt CSS block without following the repair notes in `docs/note-card-tilt.md`.

If a future task touches unrelated files, leave this interaction alone.

The mobile header contract is frozen. Do not change `DuomeiHeader.tsx`, `header-tablet-nav.css`, their touch activation order, navigation targets, visibility/pointer-event rules, or hide-on-scroll behavior unless the user explicitly asks for header work. The hamburger fallback applies at `<=768px`, plus hoverless coarse-pointer tablets up to `1024px`; touch-capable desktops wider than that keep the desktop layout. An open menu must remain visible and hit-testable even after sticky `:hover`/`:focus` states in iOS WebViews, and must dismiss on downward scroll, outside pointer press, or Escape. Header changes must pass `npm.cmd run test:home-hold` and production checks of the toggle plus every menu destination at a phone viewport before release.
