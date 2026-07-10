# AI Work Rules For This Project

## Mandatory Latest-Version Rule

Before editing, committing, or deploying anything, read:

- `docs/release-source-of-truth.md`

The current workspace is the source of truth when it contains uncommitted work. Never assume that `HEAD`, `origin/main`, or the production website is newer than the working tree. Never replace, omit, or partially publish existing workspace work just because it is not committed yet.

The poetry portal/editor is an atomic feature bundle. Its files must be reviewed, committed, and deployed together as described in `docs/release-source-of-truth.md`. Do not publish a navigation-only or styling-only commit while related poetry-editor files remain uncommitted.

Before every production deployment, run:

- `npm.cmd run build`
- `npm.cmd run release:check`

If `release:check` fails, stop. Do not deploy around it or silently exclude files.

Before changing homepage note cards, note carousel interactions, or any `.duomei-note-card` hover/transform styles, read:

- `docs/note-card-tilt.md`

This is mandatory for AI coding agents working in this repository.

The homepage note-card 3D tilt interaction is performance-sensitive. Do not add duplicate mouse/pointer listeners, do not add `transform` transitions while `.is-tilting`, and do not override the final note-card tilt CSS block without following the repair notes in `docs/note-card-tilt.md`.

If a future task touches unrelated files, leave this interaction alone.
