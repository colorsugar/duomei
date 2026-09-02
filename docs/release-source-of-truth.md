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

- `.github/workflows/deploy-edgeone.yml`
- `src/components/HomeIntroSection.tsx`
- `src/components/HomeIntroSection.css`
- `src/components/HomeKineticStage.tsx`
- `src/components/HomeSectionHold.tsx`
- `src/components/NotesDreamTransition.tsx`
- `src/components/SkillsDirectory.tsx`
- `src/components/StickerPackSection.tsx`
- `src/components/PoetryCanvasEditor.tsx`
- `src/components/RouteScrollManager.tsx`
- `src/lib/timePoetryContent.ts`
- `src/lib/homeSectionHold.ts`
- `src/lib/homeSectionHold.test.ts`
- `src/pages/DuomeiHomePage.tsx`
- `src/App.tsx`
- `src/components/DuomeiFooter.tsx`
- `src/components/DuomeiHeader.tsx`
- `src/pages/DuomeiSkillsPage.tsx`
- `src/pages/DuomeiAdmin.tsx`
- `src/components/PaperLayer.tsx`
- `src/skills.css`
- `src/styles.css`
- `public/images/stickers/` supplied preview and QR assets
- `scripts/verify-release.ps1`

Do not stage or deploy only the navigation, anchor, footer, or CSS portion while editor files remain modified or untracked.

## Atomic Guyu Bundle

The “故语” library and reader are one release unit. Review, commit, and deploy these together:

- `.hallmark/log.json`
- `.hallmark/preflight.json`
- `.env.example`, `.gitignore`, and `.vercelignore` (names only; never commit real values)
- `api/guyu-auth.ts` and `api/guyu-page.ts`
- `server/guyuSession.ts`, `server/guyuRateLimit.ts`, and their tests
- `server/guyuBooks.test.ts` for mixed single-page/two-page scan alignment
- `src/components/GuyuAccessGate.tsx`
- `deploy/guyu-edgeone/src/components/GuyuAccessGate.tsx` for the isolated EdgeOne package
- `src/components/GuyuFlipbook.tsx`
- `src/components/GuyuShelfPreview.tsx`
- `src/content/guyuBooks.ts`
- `src/pages/DuomeiGuyuPage.tsx`
- `src/pages/DuomeiGuyuReaderPage.tsx`
- `src/guyu.css`
- `src/main.tsx`
- `tokens.css`
- `vercel.json`
- `cloudflare/duomei-media/` source, configuration, lockfile, and tests
- the shared route and navigation files `src/App.tsx` and `src/components/DuomeiHeader.tsx`

The 53 WebP pages live only in the private `duomei-private` R2 bucket. They must never be committed under `public/` or shipped in the Vercel static output. The original PDF remains a local/iCloud archive and is not a web dependency. Vercel verifies the question and session cookie, then redirects each allowed page request to a short-lived signed Worker URL. Never commit the answer or signing secrets.

The reader pins `react-pageflip@2.0.3` and `page-flip@2.0.7`. Scan numbers 10, 16, 21, 23–27, 30, 34, 39–40, and 42–51 are paired visual spreads; the source file remains one R2 object while the reader crops it across two persistent logical pages. Scan 15 is a wide single page and must not be split.

All logical leaves deliberately use StPageFlip's hard-page density to match the referenced rigid-board album rather than a soft paper curl. The reader's visible back control and browser-history exit force a full document navigation so the pinned upstream render loop cannot accumulate across repeated SPA reader mounts; the component also calls `destroy()` as production cleanup.

If an unpushed local commit ever contained those pages, amend or squash that commit before pushing. A later deletion commit is not enough because the public repository would retain the original blobs in history.

Do not publish the navigation or reader until all 53 R2 objects have been verified and the Vercel and Worker tests pass. `npm.cmd run release:check` rejects public or tracked Guyu originals and verifies the complete protected delivery code bundle.

Before production, the Vercel Firewall must enforce a rate limit on `POST /api/guyu-auth`. The in-function attempt map is defense in depth only and is not shared across serverless instances.

## Features That Must Remain In The Latest Version

- Poetry canvas editor is present and opened from poetry pages while edit mode is enabled.
- Save, cancel, undo, redo, add, duplicate, delete, and page ordering remain available.
- Images support the note image crop workflow, positioning, scaling, and replacement.
- Text and images retain selectable entrance effects.
- Mobile poetry editing remains page-by-page; the public 微言 reader uses the manual horizontal overlapping deck instead of the former vertical sticky stack.
- “微言” points to `/#weiyan` and opens the homepage's manual, non-looping overlapping poetry deck.
- The homepage order remains 主视觉 / 小记 / 快活 / 故语 / 颜色 / 微言 / 技能 / 版权脚注.
- 小记、故语、颜色、微言、技能与既有快活板块统一使用 `230svh / 100svh` sticky 停留节奏；底部进度到 100% 后才释放到下一板块，小记不平移轮播层，减少动态效果模式恢复普通文档流。
- “故语” sits between “快活” and “颜色”; its homepage preview opens `/guyu`.
- “颜色” preserves the supplied 多美 and 多美猪猪 WeChat preview/QR assets and their official short links.
- Mobile keeps the fixed safe-area shortcut order 首页 / 小记 / 故语 / 颜色 / 微言 / 技能; desktop renders the same shortcuts inside the footer.
- Mobile menu anchors complete native navigation before the route/hash change closes the menu; do not synchronously hide the nav inside an anchor click handler.
- `/guyu/meiyou-yujian` keeps all 53 scans, expands detected two-page scans into aligned logical spreads, preserves the front and back covers, uses the pinned StPageFlip engine for full-screen phone/desktop page turns, and keeps keyboard plus compact overlay controls.
- `/guyu` and every page request remain behind the server-verified access code; direct static and unsigned R2 paths remain blocked.
- The poetry portal target keeps `id="kuaihuo"`.
- The admin reflects 首页 / 微言 / 小记管理.
- The homepage paper curve reaches the full right edge.
- The full-site footer remains at the end of the site without duplicating the companion.
- `/skills` remains the standalone full Skill index, while the homepage also renders the shared Skill directory before the copyright footer.
- Both Skill surfaces link to the public `colorsugar/agent-skills` repository and preserve the site-wide header, footer, and mobile menu-close behavior.

## Required Release Procedure

1. Run the root build and Guyu session tests, then run the Worker typecheck, tests, and dry deploy.
2. Stage the complete intended feature bundle.
3. Review `git diff --cached --stat` and `git diff --cached`.
4. Commit the bundle.
5. Run `npm.cmd run release:check`. It must pass against the committed `HEAD` and clean bundle files.
6. Only then push/deploy.
7. Verify production and the editor, not only the public visual page.

If any bundle file is still modified, staged, or untracked after the commit, the release is incomplete and must not be deployed.

## EdgeOne Production Automation

- Pushes to `candidate/guyu-edgeone-global-20260901` deploy the repository root to the existing direct-upload Makers project `duomei-guyu` (`makers-brifmhu31vjf`).
- The workflow must keep `edgeone.json`, `cloud-functions/`, and the full source tree together; never replace the deploy command with a `dist`-only upload.
- `EDGEONE_API_TOKEN` exists only as a GitHub Actions Secret. Runtime `GUYU_*` values remain in the EdgeOne console and must never be copied into GitHub.
- The media Worker keeps its exact Linux x64 native companion packages as optional dependencies so `npm ci` works on GitHub's Ubuntu runner without changing Windows development.
- Production is accepted only when the generated `/.well-known/duomei-build.json` matches the pushed commit and the homepage/auth/private-page checks return `200/200/401`.
