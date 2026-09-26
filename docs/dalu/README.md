# 大陆专题与扩充艺术图集

首页 `#dalu` 位于故语之后；专题 `/dalu` 收纳地图 `/dalu/map` 和完整 PDF。`/atlas-v6` 兼容既有外部定位链接。更新地图复用上一版完整静态包（含烬月和宫堡庄园），不重复复制地图。

这里是「奇幻大陆」（V6）。卫星地图总提示词属于另一套世界「超级大陆」，见 `/chaoji` 与 `docs/chaoji/README.md`。不要把超级大陆资产写进 `public/atlas/v6/`。

完整 PDF：81 页、74 幅、11 章；第 67–80 页为新增 14 幅宫堡庄园。逐幅目录、章节书签、返回目录及地图定位链接均已核对。原 64 页故语书册继续作为地理风物原册，不冒充扩充版。

## 重建图集

元数据来自地图源 `415ae7bdc8fe18be841855660f3ac17f27e2f14b` 的 `GALLERY_IMAGES`、地点说明与建筑说明，快照为 `atlas-data.json`。所有图片读取当前仓库 `public/atlas/v6/assets/` 中的公开图版，未使用用户上传的原始截图。

运行 `scripts/build-dalu-artbook.py`，需要 Python 的 reportlab、Pillow、fonttools。字体使用 Google Fonts 的 OFL Noto Sans SC，预先下载 `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf` 到 `tmp/pdfs/NotoSansSC.ttf`。脚本生成 `output/pdf/奇幻大陆-艺术图集.pdf` 和 `tmp/pdfs/pdf-manifest.json`；视觉验收后分别复制至 `public/downloads/fantasy-continent-artbook.pdf` 和 `src/content/daluArtbook.json`。字体随 PDF 子集嵌入；图片以 JPEG 82 质量嵌入，原公开 WebP 不修改。

验证 PDF 共 81 页；纸面目录 74 行指向第 7–80 页；逐图地图 URL 的 entry 与 manifest 一致；页码、书签与标题对应。页面渲染检查涵盖封面、导读、目录、地理图版和新增建筑图版。

网站版使用 `--web` 参数：图片最长边1280、JPEG78，PDF小于25MB。网站版与完整版页码、说明、目录和链接完全一致。公开 PDF 以1.8MB分片保存于 `artifacts/dalu/`，manifest记录各片与整册SHA-256；`prebuild` 自动重组到忽略的 `public/downloads/`。这样避免单次文件传输限制，用户始终下载完整 PDF。

## 立体地图真实地形（2026-09-26）

`/dalu/map` 立体版不再用底图亮度抬高度。`scripts/atlas-terrain/build_heightmap.py`（numpy/scipy/scikit-image）从两张底图生成 `public/atlas/v6/assets/terrain/<tile>.{height.bin,normal.png,mask.png}`：海 = 与图边连通的水与大内海；陆地基础高度随离岸距离上升；山地按底图左上光照的明暗反推坡度并 FFT 泊松积分成山脊（shape-from-shading），乘局部对比度包络；盐盆压平；两座火山为手工控制点的凹锥与火山口；768×512 上 25 万滴粒子水力侵蚀；海床离岸 60px 到 -26、120px 外 -30。高程 Uint16 小端，h = v/65535·150 − 30，世界单位 = 底图像素。高度是依据画面推算的示意地形，不是任何设定文本给出的测量数据。

`3d/main.js` 读取上述数据生成 CPU 位移地形（`heightAt` 与标签/拾取一致，海面返回 0），材质按坡度露岩、按海拔积雪，底图作大色调；独立水面着色器按水深从浅滩到深海（深海不透明）、岸线泡沫、距离衰减波纹；天空穹顶与雾同色。数据缺失时自动回退旧的亮度高度。重新生成：`python3 -m venv tmp/atlas-terrain/venv && tmp/atlas-terrain/venv/bin/pip install numpy scipy pillow scikit-image && tmp/atlas-terrain/venv/bin/python scripts/atlas-terrain/build_heightmap.py`。
