# Release Source Of Truth

This document is mandatory for every AI agent and every new conversation working in this repository.

## What Counts As The Latest Version

1. Inspect `git status --short` and `git diff --stat` before making changes.
2. If the working tree has changes, the working tree may contain the newest user work. Treat it as authoritative until the user explicitly says otherwise.
3. `HEAD`, `origin/main`, Vercel, and the production website are not allowed to overwrite or exclude newer local work.
4. Never deploy a partial subset of a coupled feature. First identify all related modified and untracked files.
5. Preserve unrelated local changes. Do not reset, checkout, delete, or rewrite them.

## Atomic Poetry Portal Bundle

The following files form one release unit. If any of them changes for poetry/快活/微言 work, inspect the entire group and publish the complete intended version together:

- `src/components/HomeIntroSection.tsx`
- `src/components/HomeIntroSection.css`
- `src/components/PoetryCanvasEditor.tsx`
- `src/lib/timePoetryContent.ts`
- `src/pages/DuomeiHomePage.tsx`
- `src/App.tsx`
- `src/components/DuomeiFooter.tsx`
- `src/components/DuomeiHeader.tsx`
- `src/pages/DuomeiAdmin.tsx`
- `src/components/PaperLayer.tsx`
- `src/styles.css`

Do not stage or deploy only the navigation, anchor, footer, or CSS portion while editor files remain modified or untracked.

## Features That Must Remain In The Latest Version

- Poetry canvas editor is present and opened from poetry pages while edit mode is enabled.
- Save, cancel, undo, redo, add, duplicate, delete, and page ordering remain available.
- Images support the note image crop workflow, positioning, scaling, and replacement.
- Text and images retain selectable entrance effects.
- Mobile sticky/page-by-page poetry behavior remains intact.
- “微言” points to `/#kuaihuo` and scrolls to the homepage poetry portal like “小记”.
- The poetry portal target keeps `id="kuaihuo"`.
- The admin reflects 首页 / 微言 / 小记管理.
- The homepage paper curve reaches the full right edge.
- The full-site footer remains at the end of the site without duplicating the companion.

## Required Release Procedure

1. Run `npm.cmd run build` against the full working tree.
2. Stage the complete intended feature bundle.
3. Review `git diff --cached --stat` and `git diff --cached`.
4. Commit the bundle.
5. Run `npm.cmd run release:check`. It must pass against the committed `HEAD` and clean bundle files.
6. Only then push/deploy.
7. Verify production and the editor, not only the public visual page.

If any bundle file is still modified, staged, or untracked after the commit, the release is incomplete and must not be deployed.
