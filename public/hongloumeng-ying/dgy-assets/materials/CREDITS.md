# 大观园材质库 · 来源与授权

全部材质只用 **CC0（公有领域）** 素材或**程序生成**，可放心商用、无需署名；这里仍逐条如实标注。

规格：color.webp = sRGB 颜色；normal.webp = OpenGL 法线（Y+，three.js 默认，不用翻转绿通道）；rough.webp = 粗糙度灰度（取 G 通道）；
扫描类 1024×1024 可平铺，彩画带 1024×256（横向平铺）。每个目录里有 `来源.txt`，写明 URL、作者、授权、下载日期和处理方式。

| 材质 | 目录 | 来源 | 原素材 | 作者 | URL | 日期 | 处理 |
|---|---|---|---|---|---|---|---|
| 白灰墙（新） | `baihuiqiang-xin` | Poly Haven | White Stucco 02 | Dimitrios Savva | https://polyhaven.com/a/white_stucco_02 | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 白灰墙（风化） | `baihuiqiang-fenghua` | Poly Haven | Worn Mossy Plasterwall | Amal Kumar | https://polyhaven.com/a/worn_mossy_plasterwall | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 青砖（下碱） | `qingzhuan-xiajian` | Poly Haven | Brick Wall 08 | Amal Kumar | https://polyhaven.com/a/brick_wall_08 | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 虎皮石 | `hupishi` | Poly Haven | Rock Wall 14 | Dimitrios Savva | https://polyhaven.com/a/rock_wall_14 | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 栗壳漆木 | `likeqi-mu` | Poly Haven | Wood Table 001 | Dimitrios Savva、Rico Cilliers | https://polyhaven.com/a/wood_table_001 | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 朱红漆木 | `zhuhongqi-mu` | Poly Haven | Dark Wood | Dario Barresi、Dimitrios Savva、Rico Cilliers | https://polyhaven.com/a/dark_wood | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 竹绿漆木 | `zhulvqi-mu` | Poly Haven | Wood Cabinet Worn Long | Dimitrios Savva、Rico Cilliers | https://polyhaven.com/a/wood_cabinet_worn_long | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 金砖地 | `jinzhuan-di` | Poly Haven | Granite Tile | Charlotte Baglioni | https://polyhaven.com/a/granite_tile | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 方砖地 | `fangzhuan-di` | Poly Haven | Granite Tile 04 | Amal Kumar | https://polyhaven.com/a/granite_tile_04 | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 石板 | `shiban` | Poly Haven | Rock Tile Floor | Charlotte Baglioni | https://polyhaven.com/a/rock_tile_floor | 2026-10-09 | 调色/烘焙 AO/粗糙度重映射 |
| 筒瓦（灰） | `tongwa-hui` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 小青瓦 | `xiaoqingwa` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 绿琉璃瓦 | `lvliuli-wa` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 苏式包袱彩画带 | `suzhou-baofu-caihua` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 和玺彩画带 | `hexi-caihua` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 斑竹纹带 | `banzhu-wen` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |
| 宣纸窗 | `xuanzhi-chuang` | 程序生成 | — | 本项目 | — | 2026-10-09 | 线描/退晕/纤维/噪声程序绘制 |

## 来源站点

- Poly Haven（https://polyhaven.com/textures ，API https://api.polyhaven.com ）：全部素材 CC0 1.0。
- ambientCG（https://ambientcg.com ，API https://ambientcg.com/api/v2/full_json ）：全部素材 CC0 1.0。

## 重新生成

`node scripts/dgy-materials-fetch.mjs`（下载 → 转换 → 程序生成 → 本文件 → 对照页，可重跑）。

## 第 15 轮补充

| 材质 | 目录 | 来源 | 说明 |
|---|---|---|---|
| 湘妃竹纹 | `xiangfei-zhu` | 程序生成（`scripts/dgy-materials-r15.py`） | 潇湘馆斑竹木作、室内竹器；本项目自绘，无外部素材 |

## 第 15 轮 · 室内陈设（全部程序建模，没有外部模型）

所有家具、陈设、织物、画都是本项目代码生成（`dgy/furniture.js` 家具库、`dgy/interior.js` 园内五院、`dgy/mansion.js` 贾府两处），没有下载或使用任何外部 3D 模型和图片。木纹借用本库已有的 CC0 贴图（栗壳漆木 Poly Haven「Wood Table 001」、朱红漆木），墙地用本库白灰墙、方砖、金砖；湘妃竹纹见上「第 15 轮补充」。

| 物件 | 做法 | 出处 |
|---|---|---|
| 官帽椅、玫瑰椅、交椅、方凳、绣墩 | 程序建模（几何拼接，栗壳漆木木纹染紫檀 / 花梨 / 楠木 / 湘妃竹 / 白木） | 交椅：第三回「兩溜十六張楠木交椅」；其余推断 |
| 翘头案、平头案、方桌、香几、炕桌、板桌 | 程序建模 | 第三回大紫檀雕螭案；第四十回花梨大理石大案；其余推断 |
| 书格（书函平放） | 程序建模，顶点色 | 第四十回潇湘馆「書架上磊著滿滿的書」 |
| 架子床、拔步床、罗汉床 / 木榻 | 程序建模；帐子为程序画纱（葱绿双绣花卉草虫、大红销金撒花、青纱、碧纱） | 第四十回、第二十六回、第十七回 |
| 碧纱橱、落地罩、十锦格子、紫檀板壁 | 程序建模 + 程序画雕空贴图（缠枝、五彩销金开光、素冰裂） | 第十七回、第二十六回、第四十一回 |
| 穿衣镜 | three.js Reflector（只照室内层） | 第十七、二十六、四十一回 |
| 宫灯、油灯 | 程序建模 + 程序画绢面 | 推断（正定荣国府实景） |
| 鼎、瓶、花囊、盘、佛手、菊、海棠、笔海、宝砚、比目磬、自行船 | 程序建模（车削、挤出、顶点色） | 第三、十七、三十七、四十、五十七回 |
| 米襄阳《烟雨图》、颜鲁公对联、仕女画、月洞窗竹影、琴剑瓶炉板壁、地毯、碧绿凿花砖 | canvas 程序画（示意，不冒充原作）；对联字用本项目引文字体（王漢宗中行書繁，GPL v2，见 dgy-assets/fonts/CREDITS.md） | 第四十回、第四十一回、第三十五回；地毯推断 |
