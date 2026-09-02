# DUOMEI Project Context — Required AI Reading

Last reviewed: 2026-09-02.

This is the canonical cross-AI maintenance entry for DUOMEI. Read it before changing code, configuration, content, credentials, or deployment state. If another document conflicts with this file, stop and verify the live repository and production marker before acting.

## Start Every Task Here

1. On this Windows host, confirm the checkout is `C:\Users\刘诚颢\Documents\color-edgeone-guyu`; on another host, confirm the DUOMEI repository root. The intended production branch is `candidate/guyu-edgeone-global-20260901`.
2. Read `AGENTS.md`, this file, and `docs/release-source-of-truth.md` completely.
3. Run `git status --short`, `git diff --stat`, and `git rev-list --left-right --count HEAD...origin/candidate/guyu-edgeone-global-20260901`.
4. Preserve all existing dirty work. Never reset, discard, or partially publish another task's changes.
5. Identify whether the request targets the production root, the retained Vercel/Cloudflare fallback, or the isolated package under `deploy/guyu-edgeone/`.
6. Never read, print, commit, rotate, or replace a production password, token, hash, salt, Cookie, private page, or signing secret unless the user explicitly authorizes that exact action.

## Current Production Source of Truth

- Public domain: `https://duomei.site`.
- Hosting: EdgeOne Makers.
- Existing project name: `duomei-guyu`.
- EdgeOne project ID: `makers-brifmhu31vjf`.
- Production source: the repository root, including `edgeone.json`, `src/`, and `cloud-functions/`.
- Production branch: `candidate/guyu-edgeone-global-20260901`.
- Production workflow: `.github/workflows/deploy-edgeone.yml`.
- Live build identity: `https://duomei.site/.well-known/duomei-build.json` must report the commit that was pushed.

`main`, `.github/workflows/deploy.yml`, GitHub Pages, `vercel.json`, and root `api/` are retained compatibility or fallback paths. They are not evidence of the current EdgeOne production release. Do not deploy to them unless the user explicitly changes the target.

`deploy/guyu-edgeone/` is an isolated historical candidate package and testable reference implementation. It is not the current full-site build root. Production still reuses its server core through `cloud-functions/api/[[default]].js`, so edits to the Guyu protocol must keep the root UI, Cloud Function adapter, isolated core, mirrored gate, and tests consistent.

## Architecture

```text
Browser at duomei.site
├─ React/Vite full site (`src/`)
│  ├─ public notes → Supabase Data API (`notes`, RLS)
│  ├─ admin → Supabase Auth + RLS; media upload → Cloudflare Worker/R2
│  └─ Guyu UI → same-origin `/api/guyu-auth` and `/api/guyu-page`
│
├─ EdgeOne Node Cloud Function (`cloud-functions/api/[[default]].js`)
│  └─ Guyu core (`deploy/guyu-edgeone/server/guyu-core.cjs`)
│     └─ private EdgeOne Pages Blob namespace `guyu-private`
│        └─ `private-media/guyu/meiyou-yujian/pages/001.webp` … `053.webp`
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

The current EdgeOne Guyu path returns protected WebP bytes from EdgeOne Blob through a same-origin Cloud Function. The retained Vercel path instead signs a short-lived URL for the Cloudflare Worker. Do not combine these two storage paths or assume one platform's secrets exist on the other.

## Routes

| Route | Purpose | Global header/footer |
|---|---|---|
| `/` | Full homepage | Yes |
| `/time` | Time/poetry page | Header/footer remain, smooth-scroll exception |
| `/note/:slug` | Note detail | Yes |
| `/guyu` | Protected Guyu shelf | Yes |
| `/guyu/:bookId` | Full-screen protected reader | No |
| `/skills` | Skill directory | Yes |
| `/admin/login` | Supabase admin login | No |
| `/admin`, `/admin/notes` | Note management | No |

## Product Behavior That Must Not Regress

- Preserve the quiet warm-paper DUOMEI design, existing content, typography, mascot, and information architecture. Do not replace it with a generic template or redesign a scoped bug fix.
- Homepage order stays: hero / 小记 / 快活 / 故语 / 颜色 / 微言 / 技能 / copyright footer.
- 小记、快活、故语、颜色、微言、技能 share the `230svh` track and `100svh` sticky-stage rhythm. A section releases only after its bottom progress reaches 100%.
- 小记 keeps its horizontal carousel but does not vertically transform the carousel content; this avoids mobile scroll jank.
- The fixed header hides while scrolling down and returns while scrolling up. Mobile navigation must work from the homepage and from secondary pages, especially `/guyu`.
- The header portal binds native short-touch listeners directly to its DOM for iOS compatibility. Preserve drag rejection, duplicate-click suppression, mouse/keyboard navigation, and the delayed close after a real route/hash navigation.
- The Guyu gate uses the original class-question wording and a numeric class-number field. Do not display a generated password length. Never place the real answer in source, tests, documentation, or public history, and never change the answer without explicit authorization.
- The Guyu reader keeps 53 physical scans, reviewed spread mapping, cover pages, touch/keyboard page turning, private same-origin delivery, and no public originals.
- WeChat sticker actions copy the official short link and explain that it must be pasted into WeChat. Do not navigate the browser directly to the WeChat short link.
- Mobile and desktop text must not clip, overlap, or create horizontal overflow. Recheck all affected supported widths after UI work.

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
- session Cookies, private originals, PDFs, or Guyu page images

Production Guyu runtime values belong only in EdgeOne project environment settings. `EDGEONE_API_TOKEN` belongs only in the GitHub Actions Secret with that name. The 53 protected pages belong in private storage, never under `public/`.

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
9. Push `candidate/guyu-edgeone-global-20260901`. This triggers the EdgeOne production workflow.
10. Wait for every workflow step to finish. Record the real Actions run and EdgeOne deployment IDs.
11. Verify the live build marker equals the pushed commit.
12. Verify production homepage `200`, anonymous auth `200` with `authorized:false`, and an unauthenticated private page `401`.
13. Open the real production webpage, verify the visible copy and layout, and repeat the user's exact interaction. Real-device behavior remains a separate claim when the device is not under agent control.

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

- **P1 — 768px coarse-pointer navigation:** at a verified `768×900` coarse/hover-none viewport, the mobile toggle is hidden while the desktop nav is also hidden and non-interactive. Tablet navigation needs a breakpoint/input-mode repair.
- **P1 — Guyu brute-force boundary:** application fallback limiting uses forwarded IP headers and process-local memory. A shared EdgeOne WAF/rate-limit rule for `POST /api/guyu-auth` was not verified in the audit and must not be assumed.
- **P2 — Legacy Supabase Storage:** the public `note-images` bucket was empty at audit time, but its write/update/delete policies allow any authenticated role rather than checking DUOMEI admin membership. Current note media uses the Cloudflare Worker/R2 path; keep the legacy bucket isolated until policies are tightened or it is retired.
- **P2 — SVG uploads:** the Cloudflare media Worker accepts `image/svg+xml` without content sanitization. Remove SVG support or sanitize/rasterize it before treating arbitrary authenticated uploaders as safe.
- **P2 — Dependency advisories:** root `npm audit --omit=dev` reported 12 high and 1 moderate advisory, mainly in the Vite/Babel/PostCSS/Browserslist build chain plus a React Router RSC advisory. The site is a SPA and many findings are build-time or non-RSC, but upgrades need a separate compatibility-tested dependency task.
- **P2 — Legacy GitHub Pages workflow:** `.github/workflows/deploy.yml` still uses floating action tags. It is not the production workflow; pin or retire it in a separate task.
- **P3 — Supabase advisors:** leaked-password protection is disabled; `public.debug_auth_claims()` has a mutable search path; five RLS policies have an init-plan performance warning. Public table RLS is enabled, and an anonymous live read returned only eight non-deleted published notes.
- **P2 — Visual contrast:** the mobile menu's translucent surface can allow busy page content to show through. Preserve the design language if increasing opacity.

## Keep This File Current

Update this file in the same commit whenever production hosting, branch, project ID, routes, data ownership, storage path, authentication behavior, release commands, required UI behavior, or known-risk status changes. Do not hardcode a “latest commit”; query the production marker and Git instead.

Historical planning documents under `deploy/guyu-edgeone/docs/` remain useful evidence, but their pre-production instructions are not current operations. Their status banners and this file take precedence.
