# DUOMEI Project Context — Required AI Reading

Last reviewed: 2026-09-04.

This is the canonical cross-AI maintenance entry for DUOMEI. Read it before changing code, configuration, content, credentials, or deployment state. If another document conflicts with this file, stop and verify the live repository and production marker before acting.

## Start Every Task Here

1. On this Windows host, confirm the checkout is `C:\Users\刘诚颢\Documents\color`; on another host, confirm the DUOMEI repository root. The production branch is `main`.
2. Read `AGENTS.md`, this file, and `docs/release-source-of-truth.md` completely.
3. Run `git status --short`, `git diff --stat`, and `git rev-list --left-right --count HEAD...origin/main`.
4. Preserve all existing dirty work. Never reset, discard, or partially publish another task's changes.
5. Use the production root by default. Touch the retained Vercel/Cloudflare fallback or isolated package under `deploy/guyu-edgeone/` only when the user explicitly names that target.
6. Never read, print, commit, rotate, or replace a production password, token, hash, salt, Cookie, private page, or signing secret unless the user explicitly authorizes that exact action.

## Current Production Source of Truth

- Public domain: `https://duomei.site`.
- Hosting: EdgeOne Makers.
- Existing project name: `duomei-guyu`.
- EdgeOne project ID: `makers-brifmhu31vjf`.
- Production source: the repository root, including `edgeone.json`, `src/`, and `cloud-functions/`.
- Production branch: `main`.
- Production workflow: `.github/workflows/deploy-edgeone.yml`.
- Live build identity: `https://duomei.site/.well-known/duomei-build.json` must report the commit that was pushed.

The former `candidate/guyu-edgeone-global-20260901` branch and `C:\Users\刘诚颢\Documents\color-edgeone-guyu` worktree are retained migration fallbacks, not production entry points. The pre-promotion `main` tip is preserved at `archive/main-before-edgeone-promotion-20260903`. `.github/workflows/deploy.yml`, GitHub Pages, `vercel.json`, and root `api/` are compatibility paths and are not evidence of the current EdgeOne production release.

`deploy/guyu-edgeone/` is an isolated historical candidate package and testable reference implementation. It is not the current full-site build root. Production still reuses its server core through `cloud-functions/api/[[default]].js`, so edits to the Guyu protocol must keep the root UI, Cloud Function adapter, isolated core, mirrored gate, and tests consistent.

## Architecture

```text
Browser at duomei.site
├─ React/Vite full site (`src/`)
│  ├─ public notes → Supabase Data API (`notes`, RLS)
│  ├─ admin → Supabase Auth + RLS; media upload → Cloudflare Worker/R2
│  └─ Guyu UI → public shelf/new-book assets; old class book → same-origin auth/page API
│
├─ Yunyou static 3D map (`public/yunyou/` → `/yunyou/`)
│  ├─ Guilin map, landmarks and OSM-derived geometry
│  └─ vendored Three.js 0.170.0 runtime with local MIT license
│
├─ EdgeOne Node Cloud Function (`cloud-functions/api/[[default]].js`)
│  └─ Guyu core (`deploy/guyu-edgeone/server/guyu-core.cjs`)
│     └─ private EdgeOne Pages Blob namespace `guyu-private`
│        └─ active: `private-media/guyu/meiyou-yujian/pages/001.webp` … `053.webp`
│
├─ Public static Guyu assets (`public/images/guyu/`)
│  ├─ `zhi-shang-feiyan/pages/001.webp` … `030.webp`
│  ├─ `xinshuo-01/pages/001.webp` … `030.webp`
│  ├─ `xinshuo-02/pages/001.webp` … `030.webp`
│  └─ `gui-xiang-huan-xiang/pages/001.webp` … `030.webp`
│
├─ Supabase project `bokvqndvwqgugkcrizwj`
│  ├─ Auth
│  ├─ `public.notes`
│  └─ `public.duomei_admins`
│
└─ Cloudflare Worker `duomei-media-storage`
   ├─ public/admin note media → R2 `duomei-media`
   └─ retained signed Guyu fallback → private R2 `duomei-private`
```

Only the 53-page class book uses the protected EdgeOne Blob path and the original server-verified class question. The `/guyu` shelf and every `新说` book are public static content. The retained Vercel path instead signs a short-lived URL for the Cloudflare Worker. Do not combine these storage paths or assume one platform's secrets exist on another.

### Guyu book import routing

- Before changing `src/content/guyuBooks.ts` or importing a book, read `docs/guyu-book-import.md`.
- A public `新说` book stores its preview cover at `public/images/guyu-<book-id>-cover.webp` and ordered pages under `public/images/guyu/<book-id>/pages/`; `main` and the existing EdgeOne workflow publish them. No Cloudflare, Tencent, R2, EdgeOne, or other secret is required, and no AI may ask the user for one.
- `meiyou-yujian` remains the only private/class-gated book and uses EdgeOne Pages Blob. Adding another private book expands the security boundary and requires explicit user authorization.
- Cloudflare R2 is for note media and the retained fallback only. Never route a public Guyu import through it.

## Current Data Ownership — 2026-09-03

| Data | Current system | Verified state |
|---|---|---|
| Site bundle and public assets | EdgeOne static deployment | `duomei.site`; root build output |
| Note text, metadata and status | Supabase `public.notes` | 41 rows: 8 published, 15 draft, 18 hidden/deleted |
| Admin identity and sessions | Supabase Auth + `public.duomei_admins` | Supabase remains required |
| Note cover/body media | Cloudflare Worker + R2 `duomei-media` | 28 objects, 99.3 MB; current database media URLs use the Worker host |
| Legacy Supabase `note-images` | Supabase Storage | 0 objects; retained only as a locked rollback boundary after the upload migration |
| Protected class-book pages | EdgeOne Pages Blob `guyu-private` | 53-page `meiyou-yujian`; only this book uses `/api/guyu-auth` and `/api/guyu-page` |
| Public `新说` pages | EdgeOne static deployment | 120 ordered WebP pages: `纸上飞檐`, `xinshuo-01`, `xinshuo-02`, and `gui-xiang-huan-xiang`; hashes and page sequences are release-tested |
| Yunyou 3D map | EdgeOne static deployment | same-origin `/yunyou/`; source pinned to a private-source commit and Three.js runtime vendored locally |
| Retained `纸上飞檐` Blob copy | EdgeOne Pages Blob `guyu-private` | 30 objects retained only as an unused rollback copy; not a live read path |
| Retained Guyu fallback | Cloudflare R2 `duomei-private` | 53 objects, 11.4 MB; not the current EdgeOne read path |

External runtime hosts intentionally referenced by the site are `duomei.site`, `bokvqndvwqgugkcrizwj.supabase.co`, `duomei-media-storage.colorsugar.workers.dev`, `github.com/colorsugar/agent-skills`, and WeChat short links under `w.url.cn`. No third-party analytics script was verified.

## Routes

| Route | Purpose | Global header/footer |
|---|---|---|
| `/` | Full homepage | Yes |
| `/time` | Time/poetry page | Header/footer remain, smooth-scroll exception |
| `/note/:slug` | Note detail | Yes |
| `/guyu` | Public Guyu shelf | Yes |
| `/guyu/meiyou-yujian` | Password-gated class-book reader | No |
| `/guyu/:bookId` | Public full-screen reader for allowlisted `新说` books | No |
| `/guyu/zhi-shang-feiyan` | `新说 / 纸上飞檐`, 30 complete `full` pages | No |
| `/guyu/xinshuo-01` | `新说 / 想象画本`, 30 complete `full` pages | No |
| `/guyu/xinshuo-02` | `新说 / 月亮下的童梦`, 30 complete `full` watercolor pages | No |
| `/guyu/gui-xiang-huan-xiang` | `新说 / 桂巷还香`, 30 complete `full` Guilin landmark plates | No |
| `/yunyou/` | Same-origin Guilin Liangjiang Sihu interactive 3D map | Standalone map chrome with `返回多美` |
| `/skills` | Skill directory | Yes |
| `/admin/login` | Supabase admin login | No |
| `/admin`, `/admin/notes` | Note management | No |

## Product Behavior That Must Not Regress

- Preserve the quiet warm-paper DUOMEI design, existing content, typography, mascot, and information architecture. Do not replace it with a generic template or redesign a scoped bug fix.
- Homepage order stays: hero / 小记 / 快活 / 故语 / 云游 / 颜色 / 微言 / 技能 / copyright footer.
- 小记、快活、故语、颜色、微言、技能 share the `230svh` track and `100svh` sticky-stage rhythm. A section releases only after its bottom progress reaches 100%.
- 小记 keeps its horizontal carousel but does not vertically transform the carousel content; this avoids mobile scroll jank.
- The fixed header hides while scrolling down and returns while scrolling up. Mobile navigation must work from the homepage and from secondary pages, especially `/guyu`.
- The header portal binds native short-touch listeners directly to its DOM for iOS compatibility. Touch activation is synchronous: buttons dispatch their click immediately, while anchors call `window.location.assign()` during the touch event. Preserve drag rejection, duplicate-click suppression, mouse/keyboard navigation, and the delayed close after a real route/hash navigation.
- The Guyu gate uses the original class-question wording and a numeric class-number field. Do not display a generated password length. Never place the real answer in source, tests, documentation, or public history, and never change the answer without explicit authorization.
- The Guyu reader keeps the 53 physical old-book scans with their reviewed spread mapping. Only that class book is password-gated. The public shelf and all `新说` books reuse the same touch/keyboard reader with public static WebP pages.
- Guyu reader touch ownership is frozen: the capture layer owns single-finger tap/swipe while leaving native vertical scroll and pinch zoom enabled. Once any touch sequence contains two fingers, that whole sequence is latched as zoom-only until every finger is released. While `visualViewport.scale > 1.01`, the page surface enables native horizontal and vertical panning and every page-turn path remains blocked; only a fresh single-finger gesture after returning to 100% may turn pages.
- The `/guyu` shelf has a visible 44px `← 返回首页` link targeting `/#guyu`; a closed Guyu reader still shows `返回故语`, and an open reader replaces it with `合上`, which returns to the cover without leaving the route or destroying the reader. Shelf titles must wrap fully inside their card without ellipsis or clipping.
- The homepage Guyu preview displays each book for 1.6 seconds, then keeps 16 visible cover fragments through an approximately 1.1-second scatter/tint/swap/reassembly. After reassembly the incoming base cover is exposed beneath the still-visible fragments with no opacity transition; the fragments stay mounted until that base image decodes and survives two paint frames, so the prior cover cannot flash back. The whole cover, copy, and “翻开这一本” card opens the current book at `/guyu/{book.id}`; a separate 44px “查看所有” link opens `/guyu`. It supports left/right swipe, Arrow/Home/End keys, a pause control, clickable IG-style progress dots, and seamless first/last looping; reduced-motion mode disables autoplay and uses immediate state changes.
- On mobile, the Guyu shelf ending uses compact spacing and the footer keeps all seven shortcuts in one 44px-high row. The back-to-top control hides while the footer is visible so it never covers navigation or copyright text.
- The header menu item `故语` targets `/#guyu`; it must never bypass the homepage preview by navigating directly to `/guyu`.
- The header and footer item `云游` targets `/#yunyou`; the homepage card then opens the same-origin `/yunyou/` map. Production must never link this card to a Vercel Preview.
- `/yunyou/` keeps a visible `← 返回多美` target, a loading state, a WebGL/module failure fallback, mobile DPR limits, touch rotation/zoom, a user-controlled auto-rotate toggle, and reduced-motion mode with auto-rotate disabled.
- WeChat sticker actions copy the official short link and explain that it must be pasted into WeChat. Do not navigate the browser directly to the WeChat short link.
- Mobile and desktop text must not clip, overlap, or create horizontal overflow. Recheck all affected supported widths after UI work.
- Note detail keeps a visible 44px `← 返回小记` target in loading, missing, and loaded states; its normal-reading top spacing must remain below the fixed header.

### Frozen Mobile Header Contract

- Do not change the header event chain, navigation hrefs, portal mount, `header-tablet-nav.css`, or hide/reveal behavior unless the user explicitly requests header work.
- At `<=768px`, plus coarse/hoverless tablet viewports up to `1024px`, the hamburger is always reachable. Touch-capable desktop viewports wider than `1024px` keep the desktop layout. A closed menu is hidden and non-hit-testable; `.is-menu-open` must make the nav and every item visible and hit-testable even when WebKit leaves `:hover` or `:focus` stuck, then dismiss on downward scroll, an outside pointer press, or Escape.
- Never defer the native touch activation with `requestAnimationFrame`: iOS WebViews can drop the synthetic default navigation after user activation expires. Anchors navigate synchronously; the following compatibility click is suppressed once.
- `npm.cmd run test:home-hold` is a release gate. After every authorized header change, test the toggle and every destination on `/` and `/guyu` at a phone viewport; a desktop click alone is not acceptance.
- The frozen `故语` menu destination is `/#guyu`. Do not restore `/guyu` there unless the user explicitly changes this product rule.

Before changing note-card hover or tilt behavior, also read `docs/note-card-tilt.md`.

## Secrets and Private Data

Allowed in Git: variable names, public Supabase publishable keys, public project IDs, tests with clearly fake fixtures, public previews, and public covers.

Never commit or echo values for:

- `EDGEONE_API_TOKEN`
- `GUYU_ANSWER_SALT`
- `GUYU_ANSWER_HASH`
- `GUYU_SESSION_SECRET`
- `GUYU_UPLOAD_SECRET`
- `GUYU_MEDIA_SIGNING_SECRET`
- Supabase service-role or secret keys
- session Cookies, private class-book originals, or private source PDFs

Production Guyu runtime values belong only in EdgeOne project environment settings. `EDGEONE_API_TOKEN` belongs only in the GitHub Actions Secret with that name. The 53 protected `meiyou-yujian` pages remain private and may never be copied under `public/`; the four approved `新说` books are intentionally public static assets.

`纸上飞檐` was audited from private source repository `colorsugar/-` at commit `249736f5dd4914f1797a6eb5b4e8d9226edb6be9`. Its 30 pages are now committed public derivatives and the production reader never fetches the source Vercel preview. `xinshuo-01` is the approved first cloud-task album and must not be regenerated or replaced. Both the abstract-geometric and adult photorealistic second drafts were rejected on 2026-09-03 and must never be published. The approved `xinshuo-02` is the 30-page elementary-school watercolor album `月亮下的童梦`, imported from audited package SHA-256 `e5489da43ef4dc5c00d9c42290503a1041c3cedce0dc8720123ed17b8817dde7`; all 30 files are 1100×1684, use `full` placement, and have aggregate page SHA-256 `98f439c37b83abbb52da41334d531c7df9fc30f07a9805535d3bb96be8c6fab2`. `gui-xiang-huan-xiang` / `桂巷还香` is the 30-plate Guilin landmark album imported from private source repository `colorsugar/-`, branch `cursor/guilin-gui-xiang-1c0c`, commit `575b1e2` (the 落款版); every page and the preview cover were copied byte-for-byte (Git blob SHAs match the source tree), all 31 files are VP8 1100×1684, pages use `full` placement, the aggregate page SHA-256 is `7f69bdcf24ee701365908cdc412f3cec137951639ccc1087e5339a99f74c40ad`, and the preview cover SHA-256 is `a9f5888860feabce30e20e676a01370e602b949082372bd5eec2a8c75b5719f4`. The source repository's `book.pdf`, `contact-sheet.jpg`, standalone reader, and `editorial/` were deliberately not imported. `server/guyuBooks.test.ts` fixes every approved public book's page sequence and aggregate SHA-256.

The Yunyou map runtime was imported from private source repository `colorsugar/-`, branch `cursor/guilin-3d-map-d49c`, commit `934c6782222c003a3bf626b1607e2fa74033f0d7`. Only runtime HTML, JavaScript, OSM-derived data and six texture assets were copied; the build tool and source README were not published. OpenStreetMap attribution and ODbL notice remain visible in the map. Three.js 0.170.0 was vendored from npm package integrity `sha512-FQK+LEpYc0fBD+J8g6oSEyyNzjp+Q7Ks1C568WWaoMRLW+TkNNWmenWeGgJjV105Gd+p/2ql1ZcjYvNiPZBhuQ==` under its MIT license; production has no jsDelivr dependency. The homepage cover `public/images/yunyou-guilin-cover.webp` is a text-free editorial derivative of a real render from this map, not a replacement geography source; SHA-256 is `019158f0433eaa0dfc3b0b53dd566b64bb7d2cce1a6d03ee699211013330d7e0`.

## Local Verification

Windows commands:

```powershell
npm.cmd ci
npm.cmd run test:home-hold
npm.cmd run test:guyu
npm.cmd run build
npm.cmd --prefix cloudflare/duomei-media ci
npm.cmd --prefix cloudflare/duomei-media run check
npm.cmd --prefix cloudflare/duomei-media test
npm.cmd --prefix cloudflare/duomei-media run deploy:dry
```

The isolated package has its own verification command:

```powershell
npm.cmd --prefix deploy/guyu-edgeone run verify
```

Do not treat a build, unit test, source marker, API status, or desktop click as proof that a reported mobile webpage interaction works.

## Formal Production Update Flow

1. Inspect status/diff and identify the complete coupled bundle.
2. Make the smallest scoped change while preserving unrelated work.
3. Run targeted tests and the root build.
4. For media or Guyu work, run the relevant Worker and isolated-package checks.
5. Inspect the real page at representative supported widths. For menu work, test both the toggle and every destination from `/` and `/guyu`.
6. Stage the complete intended bundle and review the staged diff.
7. Commit it.
8. Run `npm.cmd run release:check` against the committed, clean bundle. Do not bypass a failure.
9. Push `main`. This triggers the EdgeOne production workflow.
10. Wait for every workflow step to finish. Record the real Actions run and EdgeOne deployment IDs.
11. Verify the live build marker equals the pushed commit.
12. Verify production homepage `200`, anonymous auth `200` with `authorized:false`, and an unauthenticated private page `401`.
13. Open the real production webpage, verify the visible copy and layout, and repeat the user's exact interaction. Real-device behavior remains a separate claim when the device is not under agent control.

Ready same-repository PRs whose branch begins `cursor/` use `.github/workflows/pr-validation.yml` as a required status gate. After a successful run, `.github/workflows/cursor-auto-merge.yml` executes only from default-branch code, never checks out PR code with write credentials, revalidates the open/non-draft PR, same repository, `cursor/*` branch, exact tested SHA, and a denylist of release/security paths. Eligible ordinary site changes are squash-merged, then the workflow explicitly dispatches `deploy-edgeone.yml` because events created by `GITHUB_TOKEN` do not create a second push workflow. Failed/draft/stale PRs or PRs touching workflows, dependencies, deployment configuration, server infrastructure, credentials, or canonical release policy remain open for manual review. This is the only authorized unattended Cursor production path.

## User Maintenance Preferences

- Use concise Chinese status updates with concrete evidence. Never use the phrase “你说得对”.
- Continue safe in-scope work during status questions; stop only on an explicit request to stop, pause, or cancel.
- Reversible project changes, commits, pushes, and the established production release do not require repeated confirmation after the user has requested the change.
- Fix the live root cause with a minimal patch. Do not use a workaround that changes unrelated design or content.
- Preserve dirty work and stable subsystems. Never reset or discard another change.
- Do not claim “fixed”, “published”, “device-tested”, or “current” from partial evidence. Separate local tests, CI success, production deployment, browser verification, and real-device verification.
- After UI changes, explicitly check clipping, overlap, overflow, touch targets, common widths, and the exact page shown in the user's screenshot.
- Do not change access credentials, security questions, private content, or platform ownership unless the user explicitly asks for that exact change.

## Onboard Another AI

Open the repository root in the AI tool. The tool-specific pointer should direct it here automatically. If it does not, give it this instruction before discussing a change:

> 先只读，不要修改。完整阅读 `AGENTS.md`、`PROJECT_CONTEXT.md`、`docs/release-source-of-truth.md`，检查当前 Git 状态、正式分支和 `https://duomei.site/.well-known/duomei-build.json`，然后用中文汇报：当前架构、生产目标、未提交工作、与本任务相关的已知风险、计划运行的验证。得到这些事实后再开始最小范围修改，并遵守正式发布流程。

Do not send another AI passwords, tokens, Cookies, private page files, or platform secrets. Give it repository access and the user request; let the environment provide authorized platform connections separately.

## Known Audit Findings — 2026-09-02

These findings are not automatically authorized fixes. Reverify before acting.

- **P1 — phone/tablet coarse-pointer navigation:** repaired. The hamburger fallback now covers `<=768px` and hoverless coarse-pointer tablets through `1024px`, while wider touch-capable desktops retain the desktop layout. `.is-menu-open` remains authoritative over sticky hover state. Reverify at `768×900` and `1024×768` coarse/hover-none on `/` and `/guyu` after deploy, plus a desktop width above `1024px`.
- **Resolved — Guyu brute-force boundary:** EdgeOne precise rate-limit rule `Guyu登录限流` now matches `/api/guyu-auth`, counts by client IP, blocks after more than 6 requests in 10 seconds, and holds the block for 30 seconds. The process-local 10-minute failure map remains defense in depth.
- **Resolved — Legacy Supabase Storage migration:** note upload helpers now target the authenticated Cloudflare Worker/R2 path. Keep the empty `note-images` bucket private and admin-only as a rollback boundary; do not restore it as the primary upload path.
- **Resolved — SVG uploads:** the Cloudflare media Worker now accepts only JPG, PNG, WebP and GIF; SVG paths and MIME types are rejected.
- **P2 — Dependency advisories:** root `npm audit --omit=dev` reported 12 high and 1 moderate advisory, mainly in the Vite/Babel/PostCSS/Browserslist build chain plus a React Router RSC advisory. The site is a SPA and many findings are build-time or non-RSC, but upgrades need a separate compatibility-tested dependency task.
- **P2 — Legacy GitHub Pages workflow:** `.github/workflows/deploy.yml` still uses floating action tags. It is not the production workflow; pin or retire it in a separate task.
- **P3 — Supabase advisors:** leaked-password protection is disabled; `public.debug_auth_claims()` has a mutable search path; five RLS policies have an init-plan performance warning. Public table RLS is enabled, and an anonymous live read returned only eight non-deleted published notes.
- **P2 — Visual contrast:** the mobile menu's translucent surface can allow busy page content to show through. Preserve the design language if increasing opacity.

## Keep This File Current

Update this file in the same commit whenever production hosting, branch, project ID, routes, data ownership, storage path, authentication behavior, release commands, required UI behavior, or known-risk status changes. Do not hardcode a “latest commit”; query the production marker and Git instead.

Historical planning documents under `deploy/guyu-edgeone/docs/` remain useful evidence, but their pre-production instructions are not current operations. Their status banners and this file take precedence.
