# 超级大陆

与奇幻大陆（V6）不是同一套世界。禁止覆盖 `public/atlas/v6/`，禁止改 `/dalu/map` 交互。

## 口令

- 用户说「超级大陆」：只动本体系
- 用户说「奇幻大陆」：只动 `/dalu` 与 `public/atlas/v6/`

## 路由与目录

- `/chaoji` → `/chaoji/map`
- `/chaoji/map`：React 壳 + iframe
- 静态包：`public/atlas/chaoji/`
  - `3d.html` + `3d/main.js` + `3d/style.css`：Three.js 立体卫星图（大陆→八区→城邦→街区四级 LOD）
  - `assets/basemap.webp`：卫星底图（亮度抬升地形）
  - `assets/regions/` + `regions.json`：八区底图
  - `assets/cities/` + `cities.json`：十二城邦细层（含可点街区）
  - `world.json`：十二战略点
  - `index.html`：重定向到 `3d.html`
- 总提示词：`src/content/daluMasterPrompt.md`（暂与超级大陆共用）

## 政体

艾维诺尔、因维德帝国、机械之心公国、海兽之国、北方荒原之国、瀚海古城与水下公国（主权，城主即国王）、半兽人与精灵王国。

另含极北冰封超级帝国、永恒寒冰核心、马里亚纳级海沟、赤脊入侵走廊（只留通道）、神山学院。

## 立体卫星图

四级 LOD：总览大陆 → 八区 → 十二城邦 → 街区最大细节。点标记/名单飞入城邦；城邦内点地点标签或侧栏地点名单再放大到街区；浮层「返回上一级」与缩小手势按 街区→城邦→地区→总览 回退。

已落地：

- 高清卫星底图 + 亮度场抬升地形 + bump 光影；水面动画
- 八区：`regions.json` + `assets/regions/*.webp` 分区底图叠加
- 十二城邦：`cities.json` + `assets/cities/*.webp`；城墙/道路/密铺建筑/地标/生物群
- 街区层：地点可点；近距密铺、地标放大、局部街道与生物
- 浮层返回按钮（不依赖侧栏）；缩小超过阈值自动退 LOD
- 城邦/街区层隐藏战略点标签，避免叠字
- OrbitControls：单指/左键平移、双指/滚轮缩放、双指/右键旋转俯仰
- 手机默认收起侧栏；「目录」打开，× / 遮罩 / Esc / 点地图空白关闭
- 清屏模式隐藏 UI
- 行星尺度：1 单位 ≈ 20.3 km，陆地约 1.86 亿 km²（亚欧大陆 3.4 倍）；山高比例压平为卫星视角；云层、经纬网、南北极冰盖、动态比例尺；「对比亚欧」把同比例亚欧大陆轮廓叠在大陆上

嵌入边界：`/chaoji/map` 同源 iframe 加载 `/atlas/chaoji/3d.html`。`edgeone.json` 必须给 `/atlas/chaoji/*` 配 `X-Frame-Options: SAMEORIGIN` 与 `Content-Security-Policy: frame-ancestors 'self'`。

未做：完整气候模拟层、独立高模资产管线。

不继承奇幻大陆的点位与图册。

## 立体地图真实地形（2026-09-26）

`/chaoji/map` 立体版不再用底图亮度单独抬高度。`scripts/atlas-terrain/build_chaoji_heightmap.py`（numpy/scipy/scikit-image，复用七国管线中的侵蚀与法线导出）从 `public/atlas/chaoji/assets/basemap.webp` 生成 `public/atlas/chaoji/assets/terrain/basemap.{height.bin,normal.png,mask.png}`：海 = 与图边连通的水域；陆地基础高度随离岸距离上升；中央山系与西北岛群用 shape-from-shading + 软掩膜增益；巨型/小型火山为凹锥、熔岩坡与放射冲沟；西部三角洲单独压平；1024×576 上粒子水力侵蚀。高程为 Uint16 小端，行 0 = 图片顶部，`h = v/65535×60 − 12`（世界单位，海平面 0）。这是依据画面与设定区域推算的**示意地形**，不是设定文本中的测量数据。

`3d/main.js` 读取上述数据做 CPU 位移网格（`heightAt` 与标签/拾取一致，海面返回 0），法线贴图增强细节；片元按 mask 区分陆海（不再用底图颜色 discard）；独立水面按水深从浅滩绿松石到深海（深海不透明）、雾中淡出；陆地按坡度露岩、约 28 起积雪；天空穹顶与雾同色。`fetch` 失败时自动回退旧的亮度高度场（仍乘 `HEIGHT_SCALE`）。

**重新生成**（需 Python 3 与 venv）：

```bash
python3 -m venv tmp/atlas-terrain/.pyvenv
tmp/atlas-terrain/.pyvenv/bin/pip install numpy scipy pillow scikit-image
tmp/atlas-terrain/.pyvenv/bin/python scripts/atlas-terrain/build_chaoji_heightmap.py
```

产物写入 `public/atlas/chaoji/assets/terrain/`；预览图 `tmp/atlas-terrain/preview-chaoji.png` 仅本地验收用，不随站点部署。
