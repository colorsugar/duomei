# 桂林全境纸艺地图 · 接手手册

页面：`https://duomei.site/lingchuan-walk/`（地图 + 长卷），`https://duomei.site/lingchuan-walk/youzong.html`（游踪：美食去处、行程生成）。
代码全在仓库 `preview-home/lingchuan-walk/`（线上 `preview-home/` 就是站点根），纯静态 ES module + three.js，没有构建步骤。合并到 `main` 后 EdgeOne 自动部署。

先读仓库根的 `AGENTS.md`、`PROJECT_CONTEXT.md`、`docs/release-source-of-truth.md`。

## 用户（老大）定下的规矩

- 不改 `~/Projects/duomei`，不碰 `edgeone.json`，不做多语言。
- 绝不编造事实。查不到的说法删掉或标「说法不一」，删改前先列清单给老大过目。已经出过错的例子：大山口「桂林傩祭」是编的（已删，#237）；潮田是乡，过年舞狮拜年，别和灵田、兰田混（#238）。
- 文案要文雅，不要 AI 腔。资料来自网友自己写的攻略、游记，不用探店广告；不写店名电话。
- 禁用词全站为零：`本村|老大村|老大的村|乡镇地图|盘瑶`。
- 老大的私人照片暂不上网。
- 立绘由 Grok 画，不自己画。Grok 的搜索只能搜到国外，国内实拍照让 WorkBuddy（hy 模型）去搜。
- 调用别的 AI 时开在前台 Terminal 窗口，让老大能看见。能自动推进就自动推进。
- 绘本（storybook）的改动要同步到 huiben。

## 文件地图

| 文件 | 作用 |
|---|---|
| `index.html` / `app.js` | 入口；长卷步行场景；`?town=<id>&z=<zoom>` 深链 |
| `map-3d.js` | 3D 地图：画框常量、相机、瓦片 LOD、立绘、标签投影 |
| `map-view.js` | 地图 UI：标签避让、乡镇卡、风物志、游踪按钮 |
| `map-townships.js` | 乡镇 / 城区 / 县数据（`TOWNSHIPS`）、专题卡 `MAP_EXTRA_POIS` |
| `map-atmo.js` | 「一境一色」氛围：`REALMS`（加权 Voronoi 上色）、光雾、飘落物、水面反光、云影 |
| `map-props.js` | 纸艺小景：按 `map-props.json` 种树、摆村屋 |
| `map-geo.json` / `map-props.json` | 画框经纬度、区县表；树林 / 平坝 / 村落网格（脚本生成） |
| `img/map/lingchuan-dem-l0.webp`、`img/map/tiles/`、`lingchuan-dem-height.png` | 底图总览、细瓦片、高度图（脚本生成） |
| `youzong*.{html,js,css}` | 游踪页；`youzong-plan.js` 是规则排程（不用大模型，免得编造） |
| `f/fonts.css` + `f/zmx-lc-*.woff2`、`f/msz-lc-*.woff2` | 行楷 / 楷体子集，按字频切块（unicode-range 按需下载），由 `scripts/subset-lingchuan-fonts.py` 生成 |

## 底图怎么生成

`python3 scripts/build-guilin-atlas.py`

- 画框：经度 109.30–111.82，1:1 墨卡托，覆盖桂林市 17 个县区。`map-3d.js` 顶部的 `LON_MIN/LON_MAX/LAT_CENTER/MAP_W/TILE_*` 必须和脚本一致。
- 世界尺度：旧画框 1.14° = 40 单位，新画框按同一比例放大（`MAP_W ≈ 88.4`）。所以缩放 1.0 仍是「灵川一县铺满屏」，全市总览约 0.36（竖屏 0.42）。别去整体改缩放阈值。
- 数据缓存在 `~/.gb/guilin-atlas-cache/`（不进仓库）：DEM（AWS Terrarium z12）、区划边界（DataV，GCJ-02 转 WGS84）、OSM 分 3×3 块（`osm-full/`）。
- 改了任何页面文字后要重跑 `python3 scripts/subset-lingchuan-fonts.py`，否则新字会缺字形（老大报过「行楷好多显示不了」）。

## 验证与发布

本地：`python3 -m http.server 18767 --bind 127.0.0.1 -d preview-home`

1. `npm run test:home-hold`、`npm run test:music`、`npm run test:guyu`、`node scripts/verify-lingchuan.mjs`、`npm run build`
2. 巡检：`BASE=http://127.0.0.1:18767 PW=<playwright 目录> OUT=$HOME/.gb/lc-verify node scripts/lingchuan-map-patrol.mjs`
3. `git diff --quiet -- edgeone.json`；禁用词 grep 为零
4. 截图看手机（390 宽，webkit）和电脑（1440），总览和近景都看。
5. 分支 `cursor/<名字>` 基于 `origin/main`，`gh pr create`，CI 过了自动合并。
6. 上线确认：`curl -s "https://duomei.site/.well-known/duomei-build.json?t=$(date +%s)"` 的 commit 等于合并 sha，再打开线上页面看。

## 帮手 AI（都已登录）

- WorkBuddy：`codebuddy -p --model hy4-preview --permission-mode bypassPermissions "读 TASK.md 照做。"`（国内搜索、事实核查，免费模型随便用）
- Grok：`grok -p "…" --always-approve`（能出图，可多开）
- Codex：`codex --sandbox workspace-write --ask-for-approval never`（只让它改副本目录，别在仓库里跑）
- 前台开窗：`osascript -e 'tell application "Terminal" to do script "cd <目录> && <命令>"'`

各任务目录（都在 `~/grokbox/`）：

| 目录 | 内容 | 交付标志 |
|---|---|---|
| `guilin-art/` | 市区立绘：WorkBuddy 搜实拍 → `pipeline.sh` 自动开 4 个 Grok 照片重画 → 对照图 | `PIPELINE-DONE`，成品复制到桌面「桂林市区立绘-照实拍重画」 |
| `factcheck/` | 灵川 159 段说法核查 | `DONE`，结果 `result.md`（6 条有误、23 条查不到，待老大过目后再改） |
| `factcheck-counties/` | 十个县县级介绍核查 + 可补充的说法 | `DONE`，`result.md` |
| `codex-youzong/` | Codex 给游踪页补六城区资料（副本） | `REPORT.md`，审过再合进仓库 |

日报：`~/grokbox/auto-relay/daily-report.sh`，launchd `com.duomei.daily-report` 每天 09:00，输出到 `~/Projects/ai-inbox/日报/`。

## 进度（最近一次更新见文件末尾）

已上线：#232–#239（灵川十二乡十二境、纸艺底图、游踪页、删傩祭、潮田舞狮拜年、全市十七县区一张图）。

进行中：
- Codex 的六城区游踪资料（`~/grokbox/codex-youzong/`，70 条）待审后合进 `youzong-data.js`。
- 远景交互：全市总览只题县名；点「灵川县」飞到县域（手机 0.8、电脑 1.0），乡镇签相碰先换边再让位。巡检脚本 `clickTownPin` 按这个流程走。
- 十个县目前只有县级介绍，乡镇细节、立绘、游踪路线待补，素材要先由 WorkBuddy 搜、核查后再写。

待老大定：
- 灵川核查清单里的「有误 / 查不到」怎么改。
- 「潮田舞狮拜年」网上只查到灵田、大圩的记载，现按老大口述保留，出处写「潮田乡亲口述」。

## 更新记录

- 2026-11-26 Kiro：建本手册；全市画框扩到 17 县区，#239 上线（合并 3ffe98dc）。
- 2026-11-26 Kiro（cursor/guilin-polish）：
  - 主城区 23 处立绘上图：`map-city.js`（`CITY_POIS`，并入 `GROK_EXTRA_42` 导出），图 `img/gl-*.webp`、`img/m/gl-*.webp`，由 `~/grokbox/guilin-art/out/*.png` 去白底生成；坐标来自 OSM Nominatim。漓江竹筏没上图（位置不好定）。
  - 游踪并入 Codex 的六城区资料（`youzong-data.js` / `youzong-plan.js`，来源与口径见 `~/grokbox/codex-youzong/REPORT.md`）。
  - 区域分界改为相邻 4 区柔和过渡（`map-atmo.js`，缓存键 `lc-atmo-v5`）。
  - OSM 署名：开场显示，5 秒后或首次点地图时收起，右下 ⓘ 可再看，文字链到 openstreetmap.org/copyright（符合 OSMF 署名指引的可收起做法）。
  - 去掉手机底栏「飞往潮田乡」；主站导航「绘本 · 灵川」→「绘本 · 桂林」，入口按钮改「桂林全境 · 十七县区」。
  - 分享笺：预览不再裁切；正文自动缩字号放下全文，标点不起行；乡镇无专图时用该乡第一张立绘；模板文字去掉「灵川」。
  - 字体按字频切 5 块 + unicode-range（`f/fonts.css`），手机地形底图用 2048 版 `lingchuan-dem-l0-m.webp`。
  - 待办：长卷 / 2.5D 素材仍在开场全部预载（约 3 MB），要改成切换时再建场景；植被种类与摆放；Grok 工位在按实拍重画主城区（`out2/`），画好后替换 `gl-*`。
