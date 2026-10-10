# Claude Project Instructions

Before any analysis or change, read `AGENTS.md`, `PROJECT_CONTEXT.md`, and `docs/release-source-of-truth.md` completely. They are the canonical DUOMEI rules and current production context. Preserve dirty work, never expose credentials or private Guyu content, and do not claim completion without the required production webpage verification.

The notes below are a local-development memory only. Architecture, routes, release bundles and production state live in `PROJECT_CONTEXT.md`; if anything here disagrees with it, that file wins.

## Shape of the repo (short)

- Root = production site: React 19 + Vite 7 + TypeScript SPA in `src/`, deployed to EdgeOne Makers from `main` by `.github/workflows/deploy-edgeone.yml` (never a `dist`-only upload).
- `cloud-functions/api/` = EdgeOne Node functions (Guyu auth/page, NetEase music, zaobao/xunji relays). `server/*.mjs|ts` holds the shared handlers and their tests; `vite.config.ts` mounts the music, `/zaobao-src` and `/xunji-src` handlers as dev middleware.
- `public/` holds large static runtimes that are not part of the Vite graph: `yunyou/`, `atlas/v6/`, `atlas/chaoji/` (vendored Three.js via import maps), `lingchuan/`, Guyu public book pages.
- Separate npm packages with their own lockfiles: `cloudflare/duomei-media/` (media Worker, Wrangler + Vitest) and `deploy/guyu-edgeone/` (isolated historical Guyu package; touch only when the user names it).
- `api/` + `vercel.json` are the retained Vercel fallback, not production.

## Environment

- Node **22.17.1** (matches CI and `edgeone.json`; pinned in `.node-version`). On this Mac the default `node` is 26 and mise does not read `.node-version` by default, so run CI-equivalent commands as `mise exec node@22.17.1 -- <cmd>`. The root site also builds and tests on Node 26.
- No `.env` is needed for the public site locally: Supabase URL/publishable key and media origin have public defaults in `src/lib/`.
- Docs show Windows `npm.cmd`; on macOS/Linux use `npm`.

## Reliable commands (all verified 2026-09-25)

Root:

```bash
npm ci
npm test                       # home-hold + music + guyu + relay suites (145 tests)
npm run lint                   # = tsc -b (also the typecheck)
npm run build                  # prebuild restores lingchuan GLB + dalu PDF, then server typecheck, tsc -b, vite build
node scripts/verify-lingchuan.mjs
npm run dev -- --port 5188     # 5173 is often taken by another local project
```

Media Worker (`cloudflare/duomei-media`):

```bash
npm --prefix cloudflare/duomei-media ci
npm --prefix cloudflare/duomei-media run check
npm --prefix cloudflare/duomei-media test
npm --prefix cloudflare/duomei-media run deploy:dry
```

Isolated package: `npm --prefix deploy/guyu-edgeone ci && npm --prefix deploy/guyu-edgeone run verify` (see pitfalls for Node 22).

`npm run release:check` needs PowerShell (`pwsh`); CI runs it on Ubuntu. It must pass against a committed, clean HEAD before any release.

## Pitfalls

- **Worker on macOS**: `cloudflare/duomei-media/package-lock.json` only records win32-x64 and linux-x64 native bindings (npm/cli#4828), so after `npm ci` on Apple Silicon `tsc` (TypeScript 7 native) and `vitest` (rolldown) fail with "Unable to resolve …darwin-arm64". Do not regenerate the lockfile; add the bindings locally without saving:
  `npm --prefix cloudflare/duomei-media install --no-save --no-audit --no-fund @typescript/typescript-darwin-arm64@7.0.2 @rolldown/binding-darwin-arm64@1.2.4 @cloudflare/workerd-darwin-arm64@1.20260811.1 @esbuild/darwin-arm64@0.28.1 lightningcss-darwin-arm64@1.33.0` (versions must match the lockfile's linux entries).
- **Worker `npm ci` with npm 11** (Node 26) fails with "Missing: @esbuild/…from lock file"; use Node 22 / npm 10.
- **`deploy/guyu-edgeone` tests** import `.ts` directly: on Node 22 run `node --experimental-strip-types --test tests/*.test.js`; its plain `npm test` only passes on Node ≥ 23.6.
- **Local Guyu class book** (`/guyu/meiyou-yujian`, `/api/guyu-*`) does not work under `vite dev`; it needs EdgeOne runtime secrets. Public 新说 books work locally.
- **Browser-pane checks of `/yunyou-map`**: a hidden pane pauses `requestAnimationFrame`, so the map stays on “正在展开桂林” even on production. That is not a site bug.
- Vite warns that the main chunk is > 500 kB; this is known and not a failure.

## Session log

- 2026-09-25 setup pass: fast-forwarded local `main` to `origin/main` (was 10 behind). Added `optimizeDeps.entries: ["index.html"]` to `vite.config.ts` so the dev dependency scan skips `public/**` import-map HTML (it had failed and forced a full reload on first visit; dev-only, no build impact). Added `npm test` / `npm run test:relay` so the zaobao/xunji/shareMeta/xunjiEdition tests that no script referenced now run. Added `.node-version`. `release:check` was not run locally because PowerShell's installer needs sudo.
- 2026-10-07 首页提速 + 交互（Claude，未提交未发布，本地已 build/test 通过）：
  - 图片：7 张默认封面 PNG（各 2.2–2.8 MB）转 WebP（各 70–170 KB，PNG 保留做兜底）；首屏插画 `duomei-hero.webp`（645→151 KB，`index.html` 预加载 + `fetchPriority="high"`，不要加 `decoding="async"`，隐藏页面下 Chrome 不绘制）；5 张故语封面缩到 1000 宽（2.2 MB→0.67 MB，原图在 git 历史）。旧数据里的 `.png` 封面路径由 `src/lib/coverSource.ts` 映射到 `.webp`，加载失败回退原图。
  - 网易云封面走 CDN 缩略 `?param=400y400`（`server/neteaseMusic.mjs`，原图 5 MB）；歌单 JSON（430 KB）改为页面 load 后空闲时再取。
  - 代码分包：`App.tsx` 非首页路由全部 `lazy`；`vite.config.ts` manualChunks 拆 react / motion / supabase；首页不再加载 supabase-js（公开读取走 `src/lib/publicNotes.ts` 的 REST，编辑/上传/删除在 `DuomeiEditProvider`、`DuomeiNoteDetailPage`、`HomeIntroSection` 里按需 import）。首页 JS 940 KB → 573 KB（gzip 294→189 KB）。
  - 滚动：`DuomeiHomePage` 的板块进度条不再每帧量布局（强制回流 175 ms→57 ms）。
  - 交互：卡片倾斜时封面多一层跟随指针的柔光（`--note-glare-x/y`，同一指针管线，符合 docs/note-card-tilt.md）；首屏插画鼠标视差（`HeroIllustration.tsx`，触屏/减少动态不生效）。
  - 本地 Lighthouse（移动端模拟，`vite preview`）：首页总下载 17.6 MB → 1.4 MB，LCP 10.5 s（线上）→ 4.8 s（本地）。测试断言 `headerNavBreakpoint.test.ts` 已改为 `.webp`。
- 2026-10-07 第二轮（Claude，未提交未发布）：
  - 故语板块「不驻留」根因：内容比一屏高 500 px，`HomeSectionHold` 整段驻留都在平移。改为先停住整段 dwell，再把溢出部分滚完（`homeSectionHold.ts` 新增 `holdShare`，轨道高度 = 230svh + 溢出像素，写在 section 的内联 `block-size`），测试已更新。
  - 板块标题统一为 `src/components/SectionTitle.tsx` + `SectionTitle.css`：每板块一个色相（早报橘 / 故语朱砂 / 寻迹靛蓝 / 大陆赭金 / 云游黛绿 / 颜色彩虹 / 微言紫藤 / Skill 墨绿），序号 + 英文小字 + 呼吸圆点，标题逐字浮现、彩色笔触从左扫出、副文与链接依次淡入、右上角同色光晕；链接 hover 下划线扫过。保留各板块原 header 类名以继承间距。小记「多美的小记」与快活卡片未改。`headerNavBreakpoint.test.ts` 三条源码断言改为匹配新写法。
  - 验收：`scratchpad/shots/look.mjs`（puppeteer-core，本机 Chrome 无头）给各板块截图，桌面 + 手机都看过；build/test 通过。
- 2026-10-07 第三轮「Color 彩色层」（Claude，未提交未发布）：
  - 字体：`public/fonts/duomei-wenkai-{core,ext}.woff2` 是霞鹜文楷屏幕版（OFL）按首页固定文案子集化的（core 393 字 95 KB 预加载，ext 808 字 211 KB 按需；`src/fonts.css` 的 unicode-range 由 fonttools 生成）。只用于固定文案（`--font-brand`），动态标题仍用系统字避免半套字混排。英文 display 换 Fraunces（`@fontsource-variable/fraunces`，`--font-display` / `--font-english`）。**改了首页文案要重跑子集**：原料 ttf 在 scratchpad（或重下 LxgwWenKai-Screen v1.520 release），命令见会话记录。
  - `src/colorful.css`（最后加载）：10 板块色 `--accent-<id>[-ink|-soft]`、`--rainbow`、`--current-accent`（DuomeiHomePage 的板块指示器按当前板块写到 html，页头下划线 / 指示器 / 光标跟着变）；首屏四团慢漂极光（`.duomei-hero-aurora`，手机只留两团）、DUOMEI 六字各占一段色相并 48s 慢转（`@property --duomei-hue`）、调色盘圆点导航（`HeroPalette.tsx`，Lenis 平滑滚到板块）、小记标题 kicker + 青色笔触、快活「多美」渐变呼吸、页脚彩虹细线、`CursorGlow.tsx` 光标发光（不隐藏系统光标）。
  - `BounceName.tsx`：字母弹入结束后 `is-settled`，之后字母向鼠标磁吸（CSS 用 `--mag-x/y/r`）。
  - 验收：`scripts/ui-look/`（截图 + 帧率，README）。无头 Chrome 整页滚动 60fps 零掉帧；Lighthouse 移动端 79→73（字体 + 动效，LCP 4.8→5.3 s），总下载 1.55 MB。build/test 通过。
- 2026-10-07 第四轮（Claude，未提交未发布）：
  - 播放器：默认来源「多美原创」两辑 19 首（`src/lib/originalMusic.ts`，音频 `public/audio/originals/*.mp3` 49 MB、封面 `public/images/originals/{garden,seasons}.webp`，从 courtyard-3d 复制；四季 8 首线上园子尚未部署，所以主站自托管）。面板顶部可切「网易云歌单」（原逻辑不变，`neteaseRef` 缓存）。原创曲目没有歌词，歌词按钮改显示曲目介绍。`src/music-player-colorful.css`：唱片 orb 按当前板块色呼吸、实心渐变播放键、专辑分组列表、播放中的跳动小柱、顶部彩虹线。
  - 板块内部（`colorful.css` 末段）：每个 section 暴露 `--sec/--sec-ink/--sec-soft`；卡片 kicker / 固定文案标题 / CTA 用板块色 + 文楷；动态标题（早报/寻迹抓取的 headline、小记标题）保持系统字避免混排。大图卡片指针倾斜 + 光泽（`CardTilt.tsx`，一条委托管线；小记卡片仍走 NotesCarousel 自己的）；早报/大陆/云游大图 scroll-driven 视差（`animation-timeline: view()`，用独立 `translate` 属性 + `scale` 不碰 transform；Firefox 无效果）。Skill 标签 chips、颜色编号彩虹字、页头随板块轻染、路由纸幕用当前板块色、::selection、滚动条色。
  - 故语一屏：`#guyu` 的 padding/gap 按 svh 收紧，书宽 `min(100%, 20rem, 30svh)`；手机不限制。
  - 文案润色：早报 lede/卡片、小记副标默认值、寻迹/颜色/微言/Skill lede、页脚版权行。
  - 字体子集改为 core 449 字 109 KB（首屏/页头/标题/lede/曲名，preload）+ ext 777 字 204 KB（其余固定文案，按需）。
  - 验收脚本 `scripts/ui-look/`；本轮无头 Chrome 首屏互动与整页滚动均 60fps 零掉帧；build/test 通过。
- 2026-10-07 第五轮（Claude，未提交未发布）：首屏小人插画换成「色彩星球」`src/components/HeroOrb.tsx`（Canvas 2D，无依赖）：Fibonacci 球面 680 点（手机 360）按纬度分十个板块色，自转 + 鼠标牵引转速与倾角、指针附近点亮，三圈倾斜轨道环各带一颗卫星，每 3–7 秒一道流星，页面隐藏时停；reduced-motion 画静态一帧。`HeroIllustration.tsx` 改渲染 HeroOrb（鼠标视差 hook 保留），去掉 `index.html` 的 hero 图预加载（`public/images/duomei-hero.{png,webp}` 仍在，可删）。坑：外层 `.duomei-hero-cover-motion` 原是 inline-block、`.duomei-hero-illustration-wrap` 在 grid 里按内容撑宽，换成画布后手机上塌成 2px，已在 colorful.css 末尾强制 block/100%。星球中心在画布 56% 高、半径 24.5%，避开固定页头与 DUOMEI 大字。无头 Chrome 60fps 零掉帧，test 通过。
- 2026-10-07 第六轮（Claude，未提交未发布）：首屏文案动效。`IllustrationLayer.tsx` 新增 `HeroKineticCopy`：非编辑态把「多美小记」和标语拆成 `.hero-phrase > .hero-char`，每字带 `--d` 延迟（副标 1350ms 起每字 110ms；标语 2100ms 起每字 34ms，标点后 +220ms）。CSS 在 colorful.css 末段：逐字模糊上浮进场；副标 `::after` 暖光每 7s 扫一次、hover 时字距拉开；标语按逗号分三段轮流染成 `--accent-home-ink`（9s 循环，每段错开 3s）。编辑态和 scrollHint 仍走 AnimatedParagraph。
- 2026-10-07 第七轮（Claude，未提交未发布）：
  - 点击响应：切页纸幕 `.duomei-route-paper-veil` 1300ms→520ms（小记详情 880→360，colorful.css 覆盖）；`App.tsx` 新增 `usePrefetchPages`，首页 load 后 2.5 s 空闲时预取全部 lazy 页面 chunk。模拟 4G 实测：故语/早报入口 109/104ms → 28/34ms（scratchpad click.mjs）。
  - 页头抽搐：页头 `onPointerLeave` 时若 `relatedTarget` 在 `.duomei-music-player` 内则不收起（orb 是 portal 到 body 的，鼠标移上去曾触发 leave→收起→orb 消失→hover-zone 再展开的循环）；另加 document `pointerover`：鼠标既不在页头、hover-zone、播放器上时才收起。模拟实测停在 orb 上 2.5 s 零次切换。
  - 故语：圆点导航换成 6 本封面缩略条（`guyu-home-dots` 内放 img + 书名 hover 显示，当前本上浮加框）。
  - 云游：主卡下加两张小卡（`.yunyou-more .yunyou-mini`）：大陆立体地图 `/dalu/map`、超级大陆地图 `/chaoji/map`，封面缩到 720 宽 `public/images/yunyou-{dalu,chaoji}-map.webp`；lede 改为三处地图。
- 2026-10-07 第八轮（Claude，未提交未发布）：首页所有驻留板块压进一屏。colorful.css 末段：七个板块容器 `padding-block: clamp(2rem, 5svh, 4.5rem)`、`gap: clamp(1rem, 3svh, 3rem)`；早报封面 `block-size: min(52svh, 34rem)`（不再按 4:3 撑高）；微言 `.poetry-deck-stage` 高 `clamp(24rem, 62svh, 47rem)`；云游主图 `clamp(11rem, 32svh, 20rem)`，小卡图片固定 7.5×5.6rem（HTML height 属性曾让它撑到 480px）。手机媒体查询恢复按比例。量测脚本 scratchpad/shots/heights.mjs：1366×768 / 1440×900 / 1512×982 / 1920×1080 下八个板块内容高度均 = 视口高，无超出。
- 2026-10-07 第九轮（Claude，未提交未发布）：
  - 品牌：站名统一为「DUOMEI 多美」。index.html title/og/description、site.webmanifest、`server/shareMeta.mjs` SITE_NAME、各子页 document.title「| DUOMEI」、页头小字「多美」、首屏跑马「DUOMEI · 多美」、关于页文案；首屏副标默认「多美」、标语默认「把看见的、想到的、画出来的，都收在这里。」（`heroSettings` 存储键升到 -v2 以覆盖旧缓存）。示例笔记正文/微言出处里的「多美小记」是内容，未动。
  - 小记板块：`NotesIntro` 非编辑态改用 `SectionTitle`（02 · Notes，青色笔触），标题默认「小记」，副标「记录旅途，遇见生活，也遇见自己。」（`homeSettings` 键升到 -v2）；背景大字改「小记」；colorful.css 里旧的 notes-intro 标题规则已删。
  - 播放器：只剩多美原创（网易云代码保留但 `readSource` 固定 originals，来源切换 UI 与函数已删）；`music-player-colorful.css` 末段重画：曲名行在上、控制在下、唱片居左跨两行；歌单无斑马纹、专辑横幅渐变、行高 3.1rem；歌词按钮改「这首曲子」。
  - 首屏星球：`HeroOrb` 每帧量页头底边与 DUOMEI 字顶边，球+最大环限制在两线之间（任何页头高度都不会挡）。
  - 子页固定标题加 `.duomei-page-title`（文楷）。字体子集重跑（core 459 字）。测试断言同步（Skill h1、分享站名）。build/test 通过。
  - 补：小记阅读态容器改为 `.notes-head`（`.notes-intro` 里有带 !important 的老规则：p 隐藏、span 撑 780px，会把 SectionTitle 打散）；编辑态仍用 `.notes-intro.is-editable`。
- 2026-10-07 第十轮（Claude，未提交未发布）：
  - 播放器：桌面悬停即展开并打开歌单（`onPointerEnter` 140ms），document `pointermove` 看守：指针在播放器或它原来所在的页头区域内就保持，离开 0.7 s 后收起（不再有展开/收起循环）。右侧按钮改为带字胶囊「随机/顺序/单曲」「静音」「歌单」，去掉歌词按钮。阅读页（早报/寻迹等按需加载）停靠锚点晚于播放器出现 → `dockTick` + MutationObserver 等锚点出现再停靠（之前 orb 盖在「返回首页」上）。
  - 页头：`html[data-current-section]`（首页按滚动、子页按路由 `useRouteSection`）驱动导航当前项变色、导航下方滑动圆点（`--nav-dot-x/w`，hover 跟手）、logo 悬停一道当前板块色扫过、页头底边光点随鼠标（`--hx`）。
  - 故语：过渡 3.8 s → 1.7 s（`guyuCarousel.ts` 常量 + guyu.css 变量），过渡中的请求记入 `pendingRef` 结束后立即执行，缩略图悬停即切换（`selectBook`）。
  - 微言：每 6.5 s 自动翻下一页（指针/焦点在纸页上或页面隐藏时暂停，末页停），触控板横滑翻页，点击纸页左/右半翻页（drag-surface `onTap`），控制条胶囊化。
  - 子页面：标题 `.duomei-page-title` 加笔触，kicker/返回/标签/按钮用当前板块色，卡片 hover 抬起。
  - 测试断言同步（guyuCarousel 时长、播放器 hover、dock 依赖）。
- 2026-10-07 第十一轮（Claude，未提交未发布）：快活板块重做。`PortalTitle` 去掉内联 defaultPoetryFont，加「03 ● Joy · 快活」kicker，三列各带 data-column；colorful.css：文楷、三列分别桃粉/橘/墨，前两列背后竖向笔触，标题放大并靠近卡片（right 24vw），舞台两角桃粉/橘光晕；`.dream-card` 加入 CardTilt 列表（倾斜 + 光泽），诗句上桃粉色。
- 2026-10-07 第十二轮（Claude，未提交未发布）：用户反馈 Safari 卡顿。CPU 4× 降速实测滚动 26 ms/帧；逐项关闭对比，星球画布占 ~8 ms，其余各 ≤1 ms。改动：① 首屏极光、快活光晕去掉 `filter: blur()` 与 `mix-blend-mode`，改径向渐变软边；② 光标 glow 去掉 mix-blend-mode；③ 卡片/标题光泽去掉 soft-light 混合；④ DUOMEI 色相流动默认暂停、首屏 hover 时才转；⑤ HeroOrb：光点改预渲染贴图 drawImage、30 fps 节流、环 64 段、点数 460（手机 300）、布局测量每 400 ms 一次、IntersectionObserver 滚过首屏 25% 即停。结果（4×）：首屏静止 23→18 ms，滚动 26→17 ms（p95 满帧）。验收脚本 scratchpad/shots/{fps4x,ablate,trace}.mjs（可复制到 scripts/ui-look）。
- 2026-10-07 第十三轮（Claude，未提交未发布）：
  - 页头导航悬停：链接改为 `NAV_ITEMS` 数组渲染，每个链接两层字（`.nav-face` 墨色 + `.nav-face-alt` 当前板块色渐变），hover 时墨字向上滚出、彩字从下滚入；一枚当前板块色的淡胶囊（`nav::after`，`--nav-pill-x/w/opacity`）在各项之间滑动；被悬停的项随指针轻微偏移（`--mx/--my`，磁吸）。只在桌面 hover 环境启用，窄屏下拉菜单不变。测试断言改为匹配 `href: "…", label: "…"`。
  - 首屏「多美」：每个字暖色渐变（home-ink→home→color），持续慢起伏（5.6 s，两字错相），hover 单字弹起；去掉原来的 lighten 扫光伪元素（Safari 慢，且在「多」字左边留一条橙色竖条）。标语：每字按序慢波浪（4.2 s，每字错 130 ms），三段轮流点亮保留，底色改为偏暖。
  - 首屏→早报过场：删除橙色跑马横幅、multiply 大字回声和纸折（`HomeKineticStage.tsx` 只剩进度 spring + `HeroCurtain`）。新 `src/components/HeroCurtain.tsx`：十条斜切（-8°）的板块色竖条按 0.032 错开从下方升起盖住首屏，再按序抬走露出早报；条上竖排「NN · English」，中央白色描边 DUOMEI + 「01 · 早报 · Morning Edition」随波穿过。颜色用 color-mix 向白提亮并带上下渐变、左缘 1.5 px 白线。进度 <0.4% 或 >99.6% 时整层 visibility hidden。4× 降速：首屏静止与整页滚动均 16.7 ms（满帧零掉帧）。
  - 堆叠滚动（用户参考 muuuuu.org 上常见的卡片堆叠）：`homeSectionHold.ts` 新增 `HOME_SECTION_COVER_VIEWPORTS = 1`，`HOME_SECTION_DWELL_VIEWPORTS` 1.3→0.8，轨道 = 舞台 + 驻留 + 溢出 + 覆盖段（CSS 默认 280svh）。`HomeSectionHold.tsx`：内容在覆盖段停在 -travel；另一个 `useScroll(["end end","end start"])` 得到「被下一板块盖住」的进度，驱动舞台 scale 1→0.9、上移 6svh、圆角 1.6→2.4rem、`--cover-veil` 0→0.42（`.home-section-hold-stage::after` 深色遮罩）。舞台改 `motion.div`，不透明纸色背景 + 顶部圆角 + 上沿阴影，所以后一板块从下方盖上来时像一张卡片压住前一张。reduced-motion 不缩放不遮罩。测试 `homeSectionHold.test.ts` 已按新布局（cover 字段）更新。4× 降速整页滚动仍 16.7 ms 满帧。
- 2026-10-07 第十四轮（Claude，未提交未发布）：用户要「更牛逼」的过场与堆叠、分享封面/404 全部重做、江南等页单独分享图。
  - 过场 v2（`HeroCurtain.tsx` 重写）：三道其他板块色细线先划过 → 早报橙巨幕（`.duomei-curtain-board`，斜 -7°→-1°）从底部撞入，带竖排「01 — Morning Edition」、26vw 文楷「早报」、自画的白线和 lede → 再抬走露出早报。`HeroOrb.tsx` 每帧读 `--duomei-hero-progress`：p 0.03→0.53 星球爆散（点沿径向飞出 5.5 倍、半数点带拖尾、环扩 3 倍并淡出、核心光淡出），p≥0.99 清空画布休眠，scroll 回首屏唤醒（之前 hero 是 fixed，IntersectionObserver 永远相交，画布其实一直在画）。
  - 堆叠 v2（`HomeSectionHold.tsx`）：舞台改成透明 sticky 框 + 内部 `.home-section-hold-card`（不透明纸色、上沿阴影）。进入进度 `useScroll(["start end","start start"])`：卡片从 0.93 放大到 1、圆角 2.4rem→0；覆盖进度：缩到 0.84、上移 12svh、rotateX -16°（transformPerspective 1600）、圆角 2.6rem、遮罩 0.62。`will-change` 只在进入/覆盖进行中才设 transform（九张全屏常驻层会把 4× 降速帧率拖到 p95 33ms）。驻留 0.55 视口（轨道 255svh）。测试已同步。
  - 分享封面：`public/og/*.png`（14 张，1200×630，微信可用 PNG）由 scratchpad `og/template.html + gen.mjs` 生成（完整文楷 ttf + Fraunces，无头 Chrome 截图；照片页内嵌 base64）。每板块：彩虹顶线、序号描边字、文楷大标题（首字板块色渐变）、板块色笔触、kicker、lede、右侧点阵星球；小院/江南用 `images/originals/{seasons,garden}.webp` 做底 + 深色渐变；404 用三色错位描边 404。`server/shareMeta.mjs`：默认图 `/og/duomei.png`，`SECTION_IMAGES` 按首段路径选图；新增 /guyu/:bookId、/note/:slug、/time、/dalu(/map)、/chaoji(/map)、/yunyou-map、/xiaoyuan、/jiangnan 的文案；新增 edge-functions：dalu/chaoji/note/xiaoyuan/jiangnan 目录版、time.js、yunyou-map.js，guyu.js 改成目录版覆盖阅读页。index.html / 404.html og 改 `/og/duomei.png`；旧 `og-image.png/og-zaobao.png` 保留未删。courtyard-3d worktree `index.html` 加了 og 标签（小院图）。注意：/xiaoyuan、/jiangnan 在主站 SPA 没有路由（memory 里说是子页面，实际入口未在仓库里找到），边缘函数只影响爬虫看到的 head，不改变页面。
  - 404（`DuomeiNotFoundPage.tsx` 重写 + colorful.css 末段）：三色描边 404 慢漂、「这一页走丢了」、十个板块色点直达、回首页胶囊、保留吉祥物；document.title「这一页走丢了」。
  - 内页切换：`PublicRoutePaperVeil`（App.tsx）改成目标板块色的整屏色板，中央文楷板块名 + 「NN · English」，停 36% 后向上抬走（720ms，小记详情 560ms）；`routeSectionOf(pathname)` 抽成函数供 veil 与 `useRouteSection` 共用。colorful.css 末段覆盖了 styles.css 的纸雾动画。
  - 性能（4× 降速）：首屏静止掉帧查到是标语 14 个字各自的波浪动画（16 个小合成层在 Safari/低速机上每帧都贵），改成三段短语整体轻浮 + 「多美」两字各自起伏（共 5 层，带 will-change），副标进场去掉 blur 残留 filter。现在首屏静止/整页滚动 avg 17 ms、p95 满帧，偶发 5–8 帧 >33 ms（预取 chunk 落在采样窗口）。
  - 页头链接：鼠标点「寻迹 / Skill / 首页」改走 react-router（有色板幕布、不整页刷新）；hash 链接（/#zaobao 等）和带修饰键的点击仍是原生 `<a>`；触摸路径仍由 touchend 处理器原生跳转（iOS WebView 兼容不变）。
  - 合并：本地分支 cursor/map-trackpad-gestures 落后 origin/main 44 个提交（江南场景 #125–#144）。已 `git merge origin/main`（stash 本地改动再 apply，冲突 App.tsx / YunyouSection.tsx 手工解决）：App.tsx 保留按需加载 + 加入 DuomeiXiaoyuanPage/DuomeiJiangnanPage（lazy + 预取），`routeSectionOf` 把 /xiaoyuan、/jiangnan 归到 yunyou；云游板块采用远端的三张风景 plate（桂林 / 夏日小院 / 诗语江南）+ 本地的 SectionTitle。分享：江南用远端 PR #144 的 `public/og-jiangnan.jpg`（园林实景）和 `edge-functions/jiangnan.js`，本地重复的目录版函数和 `og/jiangnan.png` 已删；小院分享图改用远端新增的 `images/xiaoyuan-cover.webp` 重新生成。远端新测试里的站名「DUOMEI 多美小记」改成「DUOMEI 多美」。
- 2026-10-07 第十五轮（Claude，未提交未发布）：用户逐屏挑的问题。
  - 快活：`legacyX` -22%→-12%，卡片不再贴左边缘。
  - 故语：过渡总时长 ~2 s→~1 s（`guyuCarousel.ts` SCATTER 300 / MAX_DELAY 96 / HOLD 70 / ASSEMBLE 440 / SETTLE 320，fallback 480/640/720；guyu.css 变量同步；两个测试文件断言同步）；缩略条悬停改为停留 160 ms 才切换（`hoverSelectTimerRef`），扫过去不再排队一串。
  - 云游：远端的三张 plate 带 `.yunyou-card` 类，被卡片倾斜/光泽/一屏规则误伤（悬浮时整张错位、文字贴边）。CardTilt 与 colorful.css 的所有 `.yunyou-card` 规则改为 `.yunyou-card:not(.yunyou-plate)`；plate 自己只做图片 1.06 放大、标题/CTA 变板块色。
  - 微言：当前页内容给右侧露出的下一页留出 `--deck-peek` 宽度（不再被盖住）；控制条中间改成页码圆点（`.poetry-deck-dots`，悬停显示标题、点击 `goToPage` 直接跳页）。
  - 回顶按钮：去掉「云游可见/页脚可见就隐藏」的逻辑，只要滚过 520 px 就显示。
  - 播放器小唱片：去掉封面照片，改成十色色环 + 纸色中心 + 当前板块色圆点（`music-player-colorful.css`），播放时旋转。
  - 首屏：星球半径上限 0.245→0.34·min(w,h)，可超过页头与字之间的空隙 1.55 倍，中心下移到空隙 56% 处，下三分之一压在 DUOMEI 后面；画布容器放大（inset -40% -10% -30%）。新 `HeroDust.tsx`：fixed 全屏 72 颗彩色微粒（手机 34）缓慢上飘、随鼠标按深度视差、随爆散一起飞散淡出，30 fps，首屏盖住后休眠。极光漂移幅度 6→14vw、scale 1.28，加第五团。4× 降速首屏/滚动 16.7 ms 零掉帧。
- 2026-10-08 第十六轮（Claude，未提交未发布）：用户 Safari 反馈。
  - 星球顶到页头：半径改为 min(0.34·min(w,h), 空隙×0.62)，中心 = 页头底 + 1.04r，球顶刚好贴页头底线，下部压在 DUOMEI 后面。
  - 页头：未滚动时透明、无毛玻璃、无阴影、无底线、padding 1.1rem；滚动后再出现底色；wordmark 1.25rem / 副字 0.72rem；背景/内边距有过渡。
  - 纸弧：`PaperLayer.tsx` 删掉两条描边 path（深绿弧线），只留弧形纸面。
  - 过场：删除 `HeroCurtain.tsx` 与其 CSS（橙色巨幕 + 彩线）；首屏自己的爆散（星球、字母、微粒）就是过场，早报卡片像其它卡片一样从下方叠上来。`HomeKineticStage.tsx` 只渲染 IllustrationLayer。
  - 交接卡顿：① `useSmoothScroll` 在 Safari（UA 判定）不启用 Lenis，用原生滚动（Lenis 每帧 scrollTo 与 sticky 在 Safari 打架）；② 卡片去掉 rotateX/perspective，`will-change: transform` 常驻（动态切换 will-change 会让 Safari 在每次交接重建图层）；进入 0.95→1，覆盖缩到 0.9、上移 8svh、遮罩 0.58。
  - 微言：`poetryDeckWidePeek` 52→-14，下一页停在舞台右侧外（页边距里）而不是盖在文字上；桌面 `.poetry-deck-stage` overflow visible；手机仍是舞台内 16px。
  - 教训：python 切片替换时 `s.index('  return (')` 会命中 `    return () =>`，切片为空后 `str.replace('', new)` 会把文件炸成几千行——切片前先断言 a < b。
  - 球「抽搐」：HeroOrb/HeroDust 的 30 fps 节流在 120 Hz（ProMotion）上落在不均匀的 3/4 帧间隔，改为 `1000/60 - 2`（60 Hz 每帧、120 Hz 隔帧）；布局重测得到的半径/中心改为每帧 lerp 0.08 逼近目标，不再每 400 ms 跳变。4× 降速仍 16.7 ms 零掉帧。
- 2026-10-08 第十七轮（Claude，未提交未发布）：
  - 故语切换「闪一下再重播」：settle 阶段 `.is-current` 文案不再从 0 重新进场（assemble 时新书文案已淡入到位），呼吸关键帧 0% 改为自然态；封面 settle 关键帧从清晰开始（原来从 0.42 透明 + 7px 模糊开始，看着像重新加载）。
  - 播放器小唱片：彩色色环太抢，改成纸色圆 + 1px 墨线 + 中心当前板块色小点 + 播放时一条细弧线转动（`music-player-colorful.css`）；`DOCK_ANCHOR_SELECTOR` 加 `.guyu-reader-back`，故语阅读页里停靠到返回按钮旁，不再盖住它。
  - 内页常驻返回：新 `BackHomeButton.tsx`（左下胶囊「← 首页」，故语阅读页为「← 故语」），App.tsx 在非首页、非 bareChrome 页面挂载。
  - 故语书架：卡片等高（`.guyu-shelf` stretch、link 100%、meta 四行 grid、描述最多 5 行、「翻阅」贴底）；之前 article 被拉伸而 link 没有，Safari 上露出一块空白。
  - 微言竖排诗句：`.poetry-free-text.is-poem.is-vertical` 改 `inline-size: max-content; overflow: visible`，列数多于保存的框宽时向右长，不再裁掉最左一列。
  - 颜色板块表情包图在 Safari 里裂：本地 4 张 jpg 都是正常 JPEG 且 200，Chrome 正常；待用户确认是否是 Safari 缓存或线上 CDN 问题。
  - 颜色板块：`.sticker-pack-preview` 原来 aspect-ratio + stretch 让它按行高算宽度，比自己那列宽 90px，盖住右边文案；改为填满本列（aspect auto、100%×100%）。
  - 微言竖排诗块：宽度按列数算（每列 7%，最少 20%），image-right 页向左扩、不压标题（`createTextBlocks`）。
- 2026-10-08 第十八轮（Claude，未提交未发布）：用户说「还是差点意思」，选了播放器圆盘 / 故语书架内页 / 首页整体。
  - 播放器圆盘：墨色黑胶（深墨径向渐变 + 细沟槽 + 纸色标签 + 当前板块色小点 + 高光弧），播放时 6 s 一圈并呼吸一圈板块色。
  - 首页每张板块卡片：`::before` 两角板块色 soft 光斑；`HomeSectionHold` 渲染 `.home-section-watermark`（板块英文名，Fraunces 描边 12vw，右下角，z-index 2 盖在内容上，进入时从右滑入、被盖时上移）。
  - 故语书架页：卡片改成「书立在架上」——封面占 60% 宽居中、书名/类别/简介居中、「翻阅」胶囊、悬停封面 rotateY(-9°) 抬起；`.guyu-shelf::after` 一条木色架板；章节标题改英文 kicker 样式带色点。全部在 colorful.css 末段覆盖 guyu.css。
