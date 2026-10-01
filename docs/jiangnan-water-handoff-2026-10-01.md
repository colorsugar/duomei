# 2026-10-01 江南荷塘 / 小院修改与 AI 交接

状态：水下朝上视角修复仍在本地验证，尚未发布。本文是交接时的快照，接手时必须重新检查 Git 状态和线上 build marker。

## 先读什么

正式网站仓库先读 AGENTS.md、PROJECT_CONTEXT.md、docs/release-source-of-truth.md，然后读本文。旧版 concept/HANDOFF-garden.md 仅作历史参考。本次不能用旧提交覆盖当前工作树。

## 两个项目的关系

- 3D 源码工作树：`/Users/chenghaoliu/Projects/courtyard-3d/.claude/worktrees/elated-wilson-a91ac4`，分支 `claude/elated-wilson-a91ac4`。其中有大量已修改及未跟踪源码、软链和素材；不要 reset/clean，不要把所有未跟踪文件直接提交。
- 正式网站仓库：`/Users/chenghaoliu/Projects/duomei-jiangnan`。`public/xiaoyuan-scene/` 是构建产物，不能把它当作 3D 源码修改。
- 正式地址：`https://duomei.site/jiangnan` 和 `/xiaoyuan`。EdgeOne Makers 项目 `duomei-guyu` / `makers-brifmhu31vjf`，不是独立 Vercel 预览站。
- 江南与小院共用同一场景运行时。通过同源 iframe + env.goto/postMessage + React 场景导航互通，保留全局音乐。

## 已经加入的功能及相关文件

| 功能 | 3D 源码入口 | 要保留的行为 |
|---|---|---|
| 第一人称 / 加速自由飞行 | src/main.js、src/walkNavigation.js、src/freeFlight.js、src/architecture.js | WASD、Shift 快跑、E/点击互动，地面高度及障碍处理，穿门往返保持行走模式 |
| 自动游玩 | src/autoTour.js、src/autoTourRoute.js、src/main.js、src/style.css | 根据场景混合沿路步行与荷塘低空游览；持续移动；暂停/继续/下一站/结束；跨场景继续；小院接近门前先开门 |
| 荷花生长和互动 | src/scenes/lotusPond.js、src/scenes/lotusMotion.js | 花苞到开花、看花开加速；不能为了修水删掉生长/互动 |
| 荷叶积水与倾泻 | src/scenes/lotusWaterPhysics.js、src/scenes/lotusPourGeometry.js、src/scenes/lotusMotion.js、src/scenes/lotusPond.js | 水珠滚动合并、积水压叶、倾倒成水流、承接与落水涟漪、叶片回弹；视觉还需对照真实参考继续验收 |
| 池水及水下 | src/scenes/pondWater.js、src/scenes/garden.js | 水上倒影/折射、波动、雨点波纹、焦散、水下视图 |
| 园林树与锦鲤 | src/tree.js、src/scenes/gardenNature.js、src/scenes/pondFishModels.js、src/scenes/pondFishAssets.js | 完整树枝替代破碎扫描树；鱼模型和现有交互保留；7PLUS CC BY 4.0 署名保留 |

此表是本轮功能定位，并非声称这些文件全部由本轮新增。以实际 diff 为准。

## 已发布的记录

- PR #114：按场景混合步行与低空运镜；合并 a7ecdae56cdc064fc88495694344270092621f76，部署 Actions 36843549787 完成。但该包曾漏掉 Vite base，出现无样式、0% 加载的问题。
- PR #115：修复场景资源路径，并在网站 root prebuild 中加入 scripts/verify-scene-assets.mjs。合并 6ff2a2b800ed89f44e3a8d4f9c8c55f5a1249d1a，部署 Actions 36847037518 完成。
- 上次线上核验：build marker 等于 PR #115 合并 SHA；三种场景 HTML 查询和入口 JS/CSS/recorder 都返回正确类型，内容哈希与本地一致。证据：本任务 work/base-production-verified.json。这是上次核验，不代表未来线上始终停留在该提交。

## 正在修改：水下朝上看岸边

用户的验收目标：在水下向上能看到岸上的建筑、树和天空；不能出现池底、鱼被镜像成头顶天花板。用户明确要求保留已有所有效果，不接受靠删效果或降低画质掩盖问题。

当前只改 src/scenes/pondWater.js 的水下分支：

1. 移除 underReflector、tUnderReflect、uUnderReflProj 及水下镜像采集。
2. 移除原 hemisphereCamera/prepareHemisphere 和水下临界角回退路径。
3. upView 用当前水下相机采集水面上方场景；水下着色采样 tUp，加少量波动与水体透射。
4. 水上反射/折射着色分支保留；焦散、雨点及荷叶系统没有为这次修复删除。
5. 修改前备份：本任务 work/pondWater-before-underfix.js。该备份比 Git HEAD 更接近本次修复前状态，检查水上分支是否被误改时优先与它比较。

### 当前证据与限制

- node --check src/scenes/pondWater.js 通过。
- 本任务 work/verify-underwater-air.mjs 通过：120 帧水上/水下采集、不重复采集、穿越水面相机不变、冻结时间移动仍刷新、浅角/抬头视图投影对齐、没有水下镜像 sampler。使用模拟 renderer，不能代替真实 GPU 画面。
- 带正确 base 的 source build 通过；日志 work/underwater-build.log，产物 work/underwater-build/。
- Mac Chrome 的本地真实 WebGL 抬头视图已经看到正向岸上建筑和树，诊断 GL error 为 0。还不能宣称完整回归验收通过。
- 临时诊断页 public/__underwater-check.html，预览 http://127.0.0.1:5192/__underwater-check.html。它的“水下雨景”仅设了时刻，实际 UI 雨量仍为 0！必须手动强制雨量 45 mm/h 再检查，不能把当前画面当成暴雨验收。
- 还需要：水下看岸边 / 暴雨抬头、水上暴雨波纹、荷叶积水与倾倒，保存截图，正常页面操作回归。
- 诊断录制固定时间步，FPS 标签不能用于真实性能结论。Windows 用户设备没有实测，不得声称卡顿是显卡切换解决的。
- 性能降级草稿已撤回，不在当前源码中；本任务 work/performance-main-draft.js、work/renderBudget-draft.mjs 只是草稿，不能混入本次发布。

## 接下来按这个顺序做

1. 完成上述真实画面回归，尤其确保暴雨雨量确实非 0；对照备份检查水上分支和已有功能仍在。
2. 保存截图到本任务 outputs/；不要只编译就宣称修复。
3. 清理本次临时诊断页（只处理自己创建的文件），再构建场景：`npm run build -- --base=/xiaoyuan-scene/`。禁止默认根路径构建，这是曾导致正式网站 0% 的原因。
4. 在正式网站仓库检查当前 dirty work，基于最新主线处理完整发布单元；只替换场景 index.html 和对应 hashed JS/CSS/recorder，不覆盖现有压缩素材目录。
5. 执行 root build、home/Guyu/music 测试、灵川资源校验、Worker check/test/dry deploy；提交后 clean HEAD 执行 release:check。细节以正式发布文档为准。
6. 用户已授权发布 duomei.site。按既有 cursor/* PR 流程，精确 head CI 通过后发布；等待整个 EdgeOne Actions 完成，再核验线上 marker、JS/CSS 类型与哈希和真实页面。
7. 更新本文：发布 PR、合并 SHA、部署 run、实际截图及未通过项。不要把“本地修改”写成“已上线”。

## 交接资料位置

本轮工作目录：`/Users/chenghaoliu/Documents/Codex/2026-10-01/courtyard-water-continue`。
work/ 保存测试、修复前备份、构建日志和线上资源核验结果；outputs/ 用于交付截图/文档。不要将 work/ 的临时包、绝对路径测试脚本或本机运行环境直接打包到正式网站。

## 用户的明确约束

- 必须保留已有倒影（从水上看）、折射、雨点波纹、荷叶水珠/积水/倾泻、荷花生长、互动、第一人称、自动游玩和场景互通。
- 水珠要对照真实参考关注形状变化、颜色/亮度、滚动合并和叶片受重倾斜/回弹；不是摆几颗看不清的小球就算完成。
- 自动游玩适用于没有键盘的人，运镜按场景安排，不能无提示中途停住。
- 不再重复询问正式网址；正式站是 duomei.site。

## 后续进展：本轮准备发布的两项修复

- `pondWater.js` 水上着色分支已与修复前备份逐字比较一致。真实 Chrome 水下抬头、45 mm/h 雨景可见正向岸上建筑和树，没有镜像池底/鱼天花板，GL error 0。
- `lotusPond.js` 修复雨景只有小点、明显积水需等待很久的问题：首次雨景为叶片建立此前积雨的水团（仅一次，按曝光和承载量分配）；晴天从干叶开始。水账新增 `initial`，雨量切换不会反复补水。水团继续滚动、合并、压叶、倾倒和蒸发，未删除这些物理/互动功能。
- 水材质仍是 transmission=1 / IOR=1.333 / metalness=0。修正透射厚度，反射中加入天空亮边和暗叶影；中心保留透过真实叶片的颜色。没有给水染绿色。
- 1800 帧真实荷叶模拟测试水账守恒、叶片倾斜和水流仍发生；物理材质与第一人称/花苞开花回归通过。局部浏览器近景已见积水形状变化、明亮边缘和叶片点击响应。与用户视频完全同等的摄影真实感尚不能声称已达成。
- 截图保存于本任务 outputs/：水下看岸边-本地验证.png、荷叶积水-本地验证.png、荷叶受压水团变化-本地验证.png。诊断页已从 source public 移到本任务 work/underwater-check.html，正式包不会带诊断页。
- 正式构建：work/water-release-build/。发布分支 cursor/underwater-air-and-lotus；截至这段记录，仍待 root 检查、提交、CI、部署、生产验证。


PR116 已发布：7094084c1ca64531bef85b0c7901a3833b795183，EdgeOne run36856257927全部成功，线上场景HTML/JS/CSS哈希已核验。


## 手机、雨景与真实加载进度（本轮待发布）

用户明确要求手机和 iPad 不能直接降画质。当前源码取消自动降 DPR/AO/辉光，取消手机纹理/模型/阴影/竹林和水面降档；各设备均保留完整光学与细节。禁止后续用删水景或直接模糊画面解决性能问题。实际手机帧率仍须真机验证，桌面模拟帧率不是手机帧率。

- gardenNature.js：雨丝改 GPU 静态种子动画，两批世界雨/近景雨。世界半径70米、9000条，墙外/低空游览随相机覆盖；高空总览取消悬在相机旁的近景雨。雨量仍控制数量；水下隐藏空气雨丝。测试证明120帧位置缓冲不再修改/上传。
- pondWater.js：水下保留实时岸景透射，增加同一雨波法线的折射位移和有限曲率明暗，让雨圈从下方可见；没有恢复水下鱼/池底镜像。水上分支不改。
- main.js：取消自动画质阶梯；后台页面暂停动画及场景时间；普通浏览关闭 preserveDrawingBuffer，截图按钮仍同步重绘，debug录像继续保留缓冲。声音默认关闭，只有主动点声音才开启。
- kit.js：设备分档信息可保留，但不再自动换1K纹理/轻模型。garden.js 所有设备完整水面、竹林；锦鲤从构建开始并行下载，分段让出主线程让加载状态能绘制。
- freeFlight.js/style.css：触屏摇杆、滑动转向、快走/互动、飞行上升下降。复用原碰撞/速度/互动。触控取消、后台、失焦停止输入。手机漫游隐藏时辰/雨量卡，底部操作横向滚动；退出恢复。
- 加载：不再显示资源个数伪装成总百分比；真实显示已加载 N/M 个资源及材质准备阶段。仅资源、构建、材质准备和至少2帧完成后显示100%；删除8秒放行。失败留在加载页并显示重试。
- 回归脚本：scripts/verify-gpu-rain.mjs、verify-game-mobile.mjs，以及原水下、荷叶水账、材质脚本。已通过GPU雨静态缓冲、触控取消/碰撞/速度/开花，以及1800帧水账守恒。
- Chrome实际图：墙外雨丝和湖面雨圈、水下抬头岸景与雨圈 GL0；390×844 / 1024×768触屏模拟可显示移动控制、移动/转向并保留全水面。截图在本任务outputs。真实手机/iPad网络加载和性能未验证，不能声称真机已通过。


## 墙外降雨开销修正（2026-10-01，待发布）

用户澄清墙外降雨属于资源浪费。此前70米/9000条世界雨改为实际围墙内/1200条，世界批次不再跟随相机扩大覆盖；900条近景雨保留并按同一围墙曲线裁剪，相机离园后整批隐藏。满雨总雨丝9900→2100，下降78.8%，这是雨丝数量而非整场景性能提升百分比。园内世界雨单位面积密度基本保持，水面/荷叶/雨圈/水珠和所有设备完整画质不改变。GPU静态缓冲、真实墙曲线内种子、墙外近景批次隐藏、园内近景跟随、干晴/高空/水下可见性回归通过。


## 2026-10-02 手机和平板渲染优化（待正式发布）

源码 main.js / garden.js / staticTransforms.js / lotusPond.js：一帧统一世界矩阵更新、静态建筑不重复局部矩阵计算、空透射网格不提交、按实际数量上传水珠/水团/叶片落雨。保持全部画质与每帧水面采集，不删物理/互动。Mac Chrome相邻A/B固定帧CPU+GPU完成耗时：晴天3.2→2.6ms、3.6→3.0ms；雨景0%–7%变化，手机水上4.6→4.6ms，不能宣称全面提速或真机验证。水上矩阵1924→488，水下1293→485；雨景三角形数相同，所有GL0。暖缓存真实scene-ready为2.11秒，不是冷网络测试。Chrome390×844触屏移动、1024×768自动游玩从1/6持续到3/6、水下岸景/45mm雨圈/荷叶水团/水上雨景实图已检查。水账和几何1800帧、光学120帧、游戏/雨/材质/静态矩阵回归通过。详见本任务outputs/手机和平板优化-测量与待验收.md、最终测量JSON和20261002截图；真实手机/iPad硬件仍待测。临时诊断页已移出source public，正式包base=/xiaoyuan-scene/。
