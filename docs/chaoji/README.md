# 超级大陆

与奇幻大陆（V6）不是同一套世界。禁止覆盖 `public/atlas/v6/`，禁止改 `/dalu/map` 交互。

## 口令

- 用户说「超级大陆」：只动本体系
- 用户说「奇幻大陆」：只动 `/dalu` 与 `public/atlas/v6/`

## 路由与目录

- `/chaoji` → `/chaoji/map`
- `/chaoji/map`：React 壳 + iframe
- 静态包：`public/atlas/chaoji/`
  - `3d.html` + `3d/main.js` + `3d/style.css`：Three.js 立体卫星图（大陆→八区→城邦三级 LOD）
  - `assets/basemap.webp`：卫星底图（亮度抬升地形）
  - `assets/regions/` + `regions.json`：八区底图
  - `assets/cities/` + `cities.json`：十二城邦细层
  - `world.json`：十二战略点
  - `index.html`：重定向到 `3d.html`
- 总提示词：`src/content/daluMasterPrompt.md`（暂与超级大陆共用）

## 政体

艾维诺尔、因维德帝国、机械之心公国、海兽之国、北方荒原之国、瀚海古城与水下公国（主权，城主即国王）、半兽人与精灵王国。

另含极北冰封超级帝国、永恒寒冰核心、马里亚纳级海沟、赤脊入侵走廊（只留通道）、神山学院。

## 立体卫星图

三级 LOD：总览大陆 → 八区 → 十二城邦细层。点标记/名单飞入进入城邦最大细节；「返回上一级」按 城邦→地区→总览 回退。

已落地：

- 高清卫星底图 + 亮度场抬升地形 + bump 光影；水面动画
- 八区：`regions.json` + `assets/regions/*.webp` 分区底图叠加
- 十二城邦：`cities.json` + `assets/cities/*.webp`；墙体/实例建筑/街区 CSS2D/生物群
- OrbitControls：单指/左键平移、双指/滚轮缩放、双指/右键旋转俯仰
- 十二战略点 CSS2D 标记可点，侧栏地区/城邦名单跳转并 fly-in
- 手机默认收起侧栏；「目录」打开，× / 遮罩 / Esc / 点地图空白关闭
- 清屏模式隐藏 UI

嵌入边界：`/chaoji/map` 同源 iframe 加载 `/atlas/chaoji/3d.html`。`edgeone.json` 必须给 `/atlas/chaoji/*` 配 `X-Frame-Options: SAMEORIGIN` 与 `Content-Security-Policy: frame-ancestors 'self'`。

未做：完整气候模拟层、独立高模资产管线。

不继承奇幻大陆的点位与图册。
