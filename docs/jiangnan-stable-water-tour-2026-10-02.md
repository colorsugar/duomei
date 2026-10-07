# 2026-10-02 荷叶积水与自动游玩修复交接

正式网址为 https://duomei.site/jiangnan；小院为 /xiaoyuan。遵循根目录 AGENTS.md、PROJECT_CONTEXT.md、docs/release-source-of-truth.md 的 EdgeOne 发布流程。本文件对应本次提交；实际生产版本须查询 /.well-known/duomei-build.json，不能仅凭本文判断已上线。

## 修改内容

- 荷叶积水：移除静止时仍有 65% 波动的基线，改为撞击、滚动和倾泻驱动并衰减。水体积、颜色、透射、IOR、流动与叶面受力效果保留。零时间步不再进入除以 dt 的物理过程，防止诊断冻结帧污染水珠。
- 假山：扫描石头按土坡中心高度摆放导致宽底悬空，改为落地基准，并降低土坡。仅假山主、辅石头的水平占地分别缩放 .55/.65，保留高度、模型、纹理；其他岸石不变。
- 碰撞：为扫描石头逐实例补实体范围，禁止从扫描空底进入；导航避免反复检查高密度石头三角面。其他建筑仍使用实际几何。镜头避让半径园林 .55m、小院 .28m，手动移动 .22m；补齐原有中心和边缘射线之间的薄障碍检查。
- 运镜与路线：入园步行至荷塘前，绕开濯缨水阁后在开阔水面低空看花；移除原来的东西折返，降低看景目标对前进朝向的拉扯。保留加减速、角速度和下一站沿实路前进。搜索每段限 400ms/1500 节点以防坏路线卡死；正式路线必须实际通过，不能用预算代替验收。
- 光学预捕获移到主绘制前，每帧去重，保留水上反射、水下向上折射和雨点波纹。
- 没有开启声音，没有降低手机/iPad 的纹理、模型、光学、AO、泛光或阴影质量，也没有增加墙外雨。

## 源码入口

源码工作目录：`/Users/chenghaoliu/Projects/courtyard-3d/.claude/worktrees/elated-wilson-a91ac4`，包含原有未提交工作，禁止清理或重置。

- `src/scenes/lotusWaterPhysics.js`: poolSurfaceMotion 驱动与稳定相位。
- `src/scenes/lotusPond.js`: poolShape、静止/受力波动、零时间步保护。
- `src/scenes/garden.js`: 假山放置、footprint、每块石头 solidVolumes。
- `src/walkNavigation.js`: 实体石头查询、镜头避让和薄障碍采样。
- `src/autoTourRoute.js` / `src/autoTour.js`: 道路/水面路线和朝向偏重。
- `src/tourNavigation.js`: 有限路线搜索。
- `src/main.js` / `src/scenes/pondWater.js`: prepareRender 光学预捕获及去重。

正式仓库嵌入的是 Vite 输出；构建必须带 `--base=/xiaoyuan-scene/`，只同步 HTML 和新哈希 JS/CSS/recorder，保留已有模型、纹理、压缩文件与旧哈希资源。所有本地 __*.html 诊断页已经移出 public，不能发布。

## 已验证与限制

- 实际 Chrome 4 倍速完成园林 → 小院 → 园林，12 段路径均 blockedFrames=0，回到出发处。这只证明通行。
- 正常 1 倍速园林录屏约 110 秒，经过全部 6 段，3707 个监测帧，blockedFrames=0。监测中位帧间隔 23.6ms、P95 36.4ms；录屏编码帧率不等于实时渲染帧率，更不等于手机/iPad 实测。
- 原始变帧率录屏解码逐帧检查，没有超过 25% 纯黑像素的帧；同时检查了每 10 秒画面。之前偶发黑矩形曾复现，本轮未复现，根因尚未证实，不能宣称彻底消除。
- 近景 12 秒：触碰前波动衰减到约 0.001，触碰后恢复约 .85，随后衰减到 8e-8，积水仍存在；保留透明绿色叶面透射与白色高光。
- 暴雨 45mm/h 实际拍摄水上、水下抬头、水下斜看、连续水面穿越四个视角，能看见岸上建筑/树木和雨点波纹，没有鱼或池底镜像到头顶。
- verify-pool-settling / verify-lotus-rain-start / verify-live-water-geometry / verify-tour-camera-motion / verify-tour-navigation / verify-underwater-air / verify-water-material / verify-gpu-rain / verify-game-mobile 均已通过。路线避让新增薄障碍、空底扫描石头、手动/游玩不同距离的验证。
- 本轮没有真实手机/iPad 硬件控制权，不能标为真实移动设备验收。也未对用户 Windows 机器显卡选择作修改。

本线程 outputs 包含正常速度原始录屏、分段截图、路线 JSON、近景水珠实录和水面四视角截图。正式发布回执在流程完成后生成，需同时确认 exact-head PR Validation、EdgeOne 完整成功、生产 marker、实际资产字节与正式浏览器画面。


## 上一版发布与本次资源

PR120 已正式部署，main `a8553fe618f868d945eacd2a2599f0b700a8dbf6`，完整成功的 EdgeOne run 为 36901866105；旧交接末尾的“待CI/录像被锁屏阻挡”是当时状态，不能当作当前状态。本轮已完成上述正常速度录像。

本次资源：`index-MEamXQjI.js`、`recorder-BVeXJsAj.js`，CSS 仍为 `index-Bzfu4cm3.css`。根构建、home-hold/music/guyu、Worker check/test/dry、场景资源路径与校园模型完整性检查均通过；提交后仍须 release:check 与 exact-head CI/部署成功才发布验收。
