# Release Source Of Truth

This document is mandatory for every AI agent and every new conversation working in this repository.

## What Counts As The Latest Version

1. Inspect `git status --short` and `git diff --stat` before making changes.
2. If the working tree has changes, the working tree may contain the newest user work. Treat it as authoritative until the user explicitly says otherwise.
3. `HEAD`, `origin/main`, Vercel, and the production website are not allowed to overwrite or exclude newer local work.
4. Never deploy a partial subset of a coupled feature. First identify all related modified and untracked files.
5. Preserve unrelated local changes. Do not reset, checkout, delete, or rewrite them.

## Cross-AI Maintenance Bundle

The repository-level AI entry files are one documentation unit and must stay aligned with the actual architecture and release target:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `README.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/duomei-project.mdc`
- `docs/release-source-of-truth.md`

Agent-specific files are pointers only. `PROJECT_CONTEXT.md` contains the shared facts; do not duplicate changing architecture or deployment state into every pointer.

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
- root `edgeone.json` and `cloud-functions/api/[[default]].js`
- `deploy/guyu-edgeone/server/guyu-core.cjs`, its EdgeOne config/package lock, and adapter/core tests
- `api/guyu-auth.ts` and `api/guyu-page.ts`
- `server/guyuSession.ts`, `server/guyuRateLimit.ts`, and their tests
- `server/guyuBooks.test.ts` for mixed single-page/two-page scan alignment
- `src/components/GuyuAccessGate.tsx`
- `deploy/guyu-edgeone/src/components/GuyuAccessGate.tsx` for the isolated EdgeOne package
- `src/components/GuyuFlipbook.tsx`
- `src/components/GuyuShelfPreview.tsx`
- `src/lib/guyuCarousel.ts` and `src/lib/guyuCarousel.test.ts`
- `src/lib/guyuTouchSequence.ts` and `src/lib/guyuTouchSequence.test.ts`
- `src/content/guyuBooks.ts`
- `src/pages/DuomeiGuyuPage.tsx`
- `src/pages/DuomeiGuyuReaderPage.tsx`
- `src/guyu.css`
- `src/main.tsx`
- `public/images/guyu/` public `新说` page assets and their three approved preview covers
- `tokens.css`
- `vercel.json`
- `cloudflare/duomei-media/` source, configuration, lockfile, and tests
- the shared route and navigation files `src/App.tsx` and `src/components/DuomeiHeader.tsx`

Current EdgeOne production keeps only the 53-page `meiyou-yujian` class book behind the original server-verified question and private `guyu-private` Pages Blob path. `/guyu` is a public shelf. `纸上飞檐`, `xinshuo-01`, and the watercolor `xinshuo-02` are approved public `新说` books with 30 ordered static WebP pages each. The retained Vercel fallback still contains only the 53-page old-book copy in private `duomei-private` R2. Never commit the answer or signing secrets.

`纸上飞檐` is pinned to audited source commit `249736f5dd4914f1797a6eb5b4e8d9226edb6be9`; production never fetches its source Vercel preview. `xinshuo-01` is the approved first cloud-task output and must not be regenerated during website maintenance. The abstract-geometric and adult photorealistic second outputs were both rejected on 2026-09-03 and must not enter the public bundle. The approved replacement is `xinshuo-02` / `月亮下的童梦`, imported from package SHA-256 `e5489da43ef4dc5c00d9c42290503a1041c3cedce0dc8720123ed17b8817dde7`; its 30 actual 1100×1684 WebP files, five six-page chapters, `full` placements, manifest, cover, and contact sheet were checked before integration. The root book test verifies every approved public page sequence, WebP signature, and aggregate hash.

The reader pins `react-pageflip@2.0.3` and `page-flip@2.0.7`. Scan numbers 10, 16, 21, 23–27, 30, 34, 39–40, and 42–51 are paired visual spreads; the source remains one private object while the reader crops it across two persistent logical pages. Scan 15 is a wide single page and must not be split.

All logical leaves deliberately use StPageFlip's hard-page density to match the referenced rigid-board album rather than a soft paper curl. The reader's visible back control and browser-history exit force a full document navigation so the pinned upstream render loop cannot accumulate across repeated SPA reader mounts; the component also calls `destroy()` as production cleanup.

If an unpushed local commit ever contains the protected `meiyou-yujian` pages, amend or squash that commit before pushing. A later deletion commit is not enough because the public repository would retain the original blobs in history.

Do not publish the navigation or reader until the 53 protected old-book objects and all public `新说` page contracts are verified. When changing the retained Vercel/Cloudflare path, verify its R2 objects and Worker tests too. `npm.cmd run release:check` rejects public or tracked protected originals and verifies the complete mixed-access Guyu bundle.

EdgeOne production has a precise client-IP rate-limit rule for `/api/guyu-auth` in addition to the process-local failure map. Reverify the project security rule after any domain or project migration. Vercel Firewall applies only if the retained fallback becomes the requested deployment target.

## Features That Must Remain In The Latest Version

- Poetry canvas editor is present and opened from poetry pages while edit mode is enabled.
- Save, cancel, undo, redo, add, duplicate, delete, and page ordering remain available.
- Images support the note image crop workflow, positioning, scaling, and replacement.
- Text and images retain selectable entrance effects.
- Mobile poetry editing remains page-by-page; the public 微言 reader uses the manual horizontal overlapping deck instead of the former vertical sticky stack.
- “微言” points to `/#weiyan` and opens the homepage's manual, non-looping overlapping poetry deck.
- The homepage order remains 主视觉 / 小记 / 快活 / 故语 / 颜色 / 微言 / 技能 / 版权脚注.
- 小记、故语、颜色、微言、技能与既有快活板块统一使用 `230svh / 100svh` sticky 停留节奏；底部进度到 100% 后才释放到下一板块，小记不平移轮播层，减少动态效果模式恢复普通文档流。
- On short mobile viewports, the static notes stage uses its natural content height inside the unchanged `230svh` track so the complete card clears before the next section; never shrink or clip the card text or alter the tilt pipeline.
- “故语” sits between “快活” and “颜色”; its preview holds each book for 1.6 seconds, then uses an event-driven 16-fragment scatter/tint/swap/reassembly transition lasting about 1.1 seconds. During settle, the incoming base cover is exposed beneath the still-visible fragments without an opacity transition; the fragments stay mounted until that base image decodes and survives two paint frames, preventing the old cover from flashing back. The whole cover, copy, and “翻开这一本” card opens the current book at `/guyu/{book.id}`; a separate 44px “查看所有” link opens `/guyu`. It supports swipe, Arrow/Home/End keys, pause, clickable progress dots, and first/last looping.
- “颜色” preserves the supplied 多美 and 多美猪猪 WeChat preview/QR assets and their official short links.
- Mobile keeps the fixed safe-area shortcut order 首页 / 小记 / 故语 / 颜色 / 微言 / 技能; desktop renders the same shortcuts inside the footer.
- The mobile footer keeps those six shortcuts on one compact 44px-high row, reduces Guyu shelf-end whitespace, and hides the back-to-top button while the footer intersects the viewport so no link or copyright copy is covered.
- The frozen mobile header uses one synchronous native short-tap path on the portal DOM: buttons activate immediately, anchors call `window.location.assign()` before iOS user activation expires, and the compatibility click is suppressed once. Sticky hover/focus must never override `.is-menu-open` visibility or pointer events.
- `/guyu/meiyou-yujian` keeps all 53 scans, expands detected two-page scans into aligned logical spreads, preserves the front and back covers, uses the pinned StPageFlip engine for full-screen phone/desktop page turns, and keeps keyboard plus compact overlay controls.
- `/guyu/zhi-shang-feiyan`, `/guyu/xinshuo-01`, and `/guyu/xinshuo-02` appear under the public `新说` shelf and reuse the same GuyuFlipbook. Each has exactly 30 complete `full` pages and never enters the old-book split/stack pipeline.
- The Guyu book surface keeps browser-native pan and pinch zoom enabled. The reader capture layer is the sole page-turn gesture owner: a sequence that ever reaches two fingers stays zoom-only until all fingers are released, and its later touchend or compatibility mouse event must never turn a page. While the visual viewport remains above 100%, the book enables native two-axis panning and blocks touch, mouse, keyboard, and programmatic page turns; returning to 100% restores turning only for the next fresh gesture.
- The `/guyu` shelf has a visible 44px `← 返回首页` link targeting `/#guyu`; on the closed cover the top control is `返回故语`, and after opening it is replaced by `合上`, which calls the existing preload-safe jump to page zero. Guyu shelf titles wrap completely inside their cards at 320px and wider.
- Only `/guyu/meiyou-yujian` and its `/api/guyu-page` requests remain behind the original server-verified class question. `/guyu` and all `新说` readers are public; no other route may display the class gate.
- The header menu item `故语` targets the homepage `/#guyu` position, not `/guyu` directly.
- At supported mobile widths and short viewports, complete poetry cards, captions, controls, and the fixed section progress rail must remain visible without clipping or overlap.
- Note detail keeps a visible 44px `← 返回小记` target in loading, missing, and loaded states, below the fixed header.
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
- Note image uploads use the authenticated media Worker at `/v1/upload`; production CORS includes only `duomei.site` plus retained reviewed origins, and SVG uploads remain rejected.
- Production is accepted only when the generated `/.well-known/duomei-build.json` matches the pushed commit and the homepage/auth/private-page checks return `200/200/401`.
