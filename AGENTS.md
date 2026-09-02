# AI Work Rules For This Project

## Mandatory Reading Order

Before editing, committing, or deploying anything, read:

- `PROJECT_CONTEXT.md`
- `docs/release-source-of-truth.md`

Then read any task-specific document referenced there, including `docs/note-card-tilt.md` before note-card interaction work.

`PROJECT_CONTEXT.md` is the cross-AI source for current production architecture, routes, platform boundaries, user preferences, verification requirements, and known audit findings. Do not follow a historical candidate document when it conflicts with that file.

## Mandatory Latest-Version Rule

The current workspace is the source of truth when it contains uncommitted work. Never assume that `HEAD`, `origin/main`, or the production website is newer than the working tree. Never replace, omit, or partially publish existing workspace work just because it is not committed yet.

The poetry portal/editor is an atomic feature bundle. Its files must be reviewed, committed, and deployed together as described in `docs/release-source-of-truth.md`. Do not publish a navigation-only or styling-only commit while related poetry-editor files remain uncommitted.

Before every production deployment, run:

- `npm.cmd run build`
- `npm.cmd run release:check`

If `release:check` fails, stop. Do not deploy around it or silently exclude files.

The current production target is the repository root on EdgeOne Makers project `duomei-guyu` (`makers-brifmhu31vjf`), deployed from `candidate/guyu-edgeone-global-20260901`. Do not substitute Vercel, GitHub Pages, `main`, or `deploy/guyu-edgeone/` without explicit user direction.

Never change or expose production access answers, hashes, salts, tokens, Cookies, or private Guyu originals unless the user explicitly authorizes that exact action. A successful build or API response is not a webpage or real-device acceptance test; inspect the actual production page and reproduce the reported interaction.

This is mandatory for every AI coding agent working in this repository.

The homepage note-card 3D tilt interaction is performance-sensitive. Do not add duplicate mouse/pointer listeners, do not add `transform` transitions while `.is-tilting`, and do not override the final note-card tilt CSS block without following the repair notes in `docs/note-card-tilt.md`.

If a future task touches unrelated files, leave this interaction alone.

The mobile header contract is frozen. Do not change `DuomeiHeader.tsx`, `header-tablet-nav.css`, their touch activation order, navigation targets, visibility/pointer-event rules, or hide-on-scroll behavior unless the user explicitly asks for header work. An open menu must remain visible and hit-testable even after sticky `:hover`/`:focus` states in iOS WebViews. Header changes must pass `npm.cmd run test:home-hold` and production checks of the toggle plus every menu destination at a phone viewport before release.
