# 家具真模型来源（第 25 轮，2026-10-11 下载）

全部来自 Poly Haven（https://polyhaven.com/license），许可 **CC0 1.0**（公有领域，可商用，不必署名；这里照实记下）。
下载走官方接口 `https://api.polyhaven.com/files/<id>` 的 1k glTF 包（.gltf + .bin + 三张 jpg）。
处理：颜色图从 1024 缩到 512，法线、ARM（AO / 粗糙度 / 金属度）图缩到 256（文件名仍带 `_1k`，gltf 不用改）；网格没动。
面数取自 `https://api.polyhaven.com/info/<id>` 的 polycount。

| 目录 | 名称 | 作者 | 面数 | 原尺寸（米，宽×深×高） | 用在 |
|---|---|---|---|---|---|
| chinese_armchair | Chinese Armchair | Kirill Sannikov | 2,675 | 0.85 × 0.79 × 1.59 | 怡红院正房 yh03 书案椅（缩到通高 1.1 m；是四出头官帽椅，不是圈椅，所以 yh08 圈椅没换） |
| chinese_console_table | Chinese Console Table | Kirill Sannikov | 13,648 | 1.72 × 0.34 × 0.66 | yh03 书案（拉成 1.8 × 0.7 × 0.84）、yh-tiaoji 条几（1.6 × 0.4 × 0.86） |
| chinese_tea_table | Chinese Tea Table | Kirill Sannikov | 2,508 | 0.84 × 0.84 × 0.50 | yh07 八仙桌（放到 0.98 见方、高 0.84） |
| chinese_cabinet | Chinese Cabinet | Kirill Sannikov | 15,668 | 1.26 × 0.55 × 2.87 | yh-x1 书架（等比缩到高 2.3） |
| chinese_screen_panels | Chinese Screen Panels | Kirill Sannikov | 784 | 1.29 × 0.38 × 1.60 | yh-x2 座屏（等比缩到高 1.86） |
| chinese_sofa | Chinese Sofa | Kirill Sannikov | 704 | 2.29 × 0.97 × 0.86 | 怡红院抱厦下两张「打就的榻」（第十七回；等比缩到宽 2.2） |

页面链接：https://polyhaven.com/a/chinese_armchair 、/chinese_console_table 、/chinese_tea_table 、/chinese_cabinet 、/chinese_screen_panels 、/chinese_sofa

没找到、照旧用程序几何的（免费清单 concept/daguanyuan/免费3D资产清单.md 里写明「没有免费的」或只在 Sketchfab 要登录下载）：
架子床 / 填漆床、圈椅、花几、鼎（明尼阿波利斯鼎在 Sketchfab，下载要登录，不代登录）、香炉、烛台、书函、卷轴、笔砚、茶具、盆景、瓶。
