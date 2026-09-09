# 超级大陆

与奇幻大陆（V6）不是同一套世界。禁止覆盖 `public/atlas/v6/`，禁止改 `/dalu/map` 交互。

## 口令

- 用户说「超级大陆」：只动本体系
- 用户说「奇幻大陆」：只动 `/dalu` 与 `public/atlas/v6/`

## 路由与目录

- `/chaoji` → `/chaoji/map`
- `/chaoji/map`：React 壳 + iframe
- 静态包：`public/atlas/chaoji/`
  - `3d.html` + `3d/main.js` + `3d/style.css`：Three.js 立体卫星图（交互对齐七国立体图志）
  - `assets/basemap.webp`：卫星底图（亮度抬升地形）
  - `world.json`：十二战略点
  - `index.html`：重定向到 `3d.html`
- 总提示词：`src/content/daluMasterPrompt.md`（暂与超级大陆共用）

## 政体

艾维诺尔、因维德帝国、机械之心公国、海兽之国、北方荒原之国、瀚海古城与水下公国（主权，城主即国王）、半兽人与精灵王国。

另含极北冰封超级帝国、永恒寒冰核心、马里亚纳级海沟、赤脊入侵走廊（只留通道）、神山学院。

## 立体卫星图

已落地：

- 高清卫星底图（1920×1080）+ 亮度场抬升地形 + bump 光影
- ACES 色调映射、双光源、指数雾、更密网格
- OrbitControls：单指/左键平移、双指/滚轮缩放、双指/右键旋转俯仰
- 十二战略点 CSS2D 标记可点，侧栏名单跳转
- 手机默认收起侧栏；「目录」打开，× / 遮罩 / Esc / 点地图空白关闭
- 清屏模式隐藏 UI

嵌入边界：`/chaoji/map` 同源 iframe 加载 `/atlas/chaoji/3d.html`。`edgeone.json` 必须给 `/atlas/chaoji/*` 配 `X-Frame-Options: SAMEORIGIN` 与 `Content-Security-Policy: frame-ancestors 'self'`。

未做：建筑级特写、完整气候模拟层、独立高模资产管线。

不继承奇幻大陆的点位与图册。
