# 大陆专题与扩充艺术图集

首页 `#dalu` 位于故语之后；专题 `/dalu` 收纳地图 `/dalu/map` 和完整 PDF。`/atlas-v6` 兼容既有外部定位链接。更新地图复用上一版完整静态包（含烬月和宫堡庄园），不重复复制地图。

完整 PDF：81 页、74 幅、11 章；第 67–80 页为新增 14 幅宫堡庄园。逐幅目录、章节书签、返回目录及地图定位链接均已核对。原 64 页故语书册继续作为地理风物原册，不冒充扩充版。

## 重建图集

元数据来自地图源 `415ae7bdc8fe18be841855660f3ac17f27e2f14b` 的 `GALLERY_IMAGES`、地点说明与建筑说明，快照为 `atlas-data.json`。所有图片读取当前仓库 `public/atlas/v6/assets/` 中的公开图版，未使用用户上传的原始截图。

运行 `scripts/build-dalu-artbook.py`，需要 Python 的 reportlab、Pillow、fonttools。字体使用 Google Fonts 的 OFL Noto Sans SC，预先下载 `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf` 到 `tmp/pdfs/NotoSansSC.ttf`。脚本生成 `output/pdf/奇幻大陆-艺术图集.pdf` 和 `tmp/pdfs/pdf-manifest.json`；视觉验收后分别复制至 `public/downloads/fantasy-continent-artbook.pdf` 和 `src/content/daluArtbook.json`。字体随 PDF 子集嵌入；图片以 JPEG 82 质量嵌入，原公开 WebP 不修改。

验证 PDF 共 81 页；纸面目录 74 行指向第 7–80 页；逐图地图 URL 的 entry 与 manifest 一致；页码、书签与标题对应。页面渲染检查涵盖封面、导读、目录、地理图版和新增建筑图版。

网站版使用 `--web` 参数：图片最长边1280、JPEG78，PDF小于25MB。网站版与完整版页码、说明、目录和链接完全一致。公开 PDF 以1.8MB分片保存于 `artifacts/dalu/`，manifest记录各片与整册SHA-256；`prebuild` 自动重组到忽略的 `public/downloads/`。这样避免单次文件传输限制，用户始终下载完整 PDF。
