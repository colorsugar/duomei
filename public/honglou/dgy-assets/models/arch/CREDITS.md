# 建筑构件库 · 来源与授权

几何全部是本项目用 Blender 脚本程序生成（`tools/blender/`），没有下载或使用外部三维模型。

贴图只有两类：

- 引用 `dgy-assets/materials/` 里已经入库的贴图。木纹和窗纸的授权以该目录的 `CREDITS.md` 为准。用到的是栗壳漆木 `likeqi-mu`、竹绿漆木 `zhulvqi-mu`、朱红漆木 `zhuhongqi-mu`（Poly Haven，CC0），以及程序绘制的宣纸 `xuanzhi-chuang`（本项目）。粗糙度取 rough.webp 的 G 通道。真实尺寸：栗壳约 1.50 m，竹绿约 1.00 m，朱红约 2.00 m。UV 按这个尺寸投，不另拉伸。
- 脚本里当场画的图，嵌进 glb，不另存贴图文件。灰瓦泥胎、青白石、正吻鳞片、额枋苏式彩画和它的粗糙度噪声都属于这一类。额枋彩画是 1024×256，没有套用现成的 `suzhou-baofu-caihua`。

每个 glb 自己带贴图，文件之间不外链。同一个 glb 里，同一张图只嵌一份 webp（不再同时嵌 png）。纯色件没有贴图。

| glb | 贴图 |
|---|---|
| `dougong-yidousansheng.glb` | `likeqi-mu` 的 color / normal / rough，斗、栱、升共用这一套 |
| `dougong-wucai-danqiao-danang.glb` | `likeqi-mu` 一套。昂嘴石青、耍头和枋心石绿是纯色，没有图 |
| `wa-tongwa-walong.glb` | 脚本灰瓦泥胎 `wa_qinghui`（256，webp） |
| `wa-banwa-dishui.glb` | 同上，各文件各自嵌一份 |
| `ji-zhengji-zhengwen.glb` | 泥胎 `wa_qinghui`，鳞片 `wen_scale`。眼、嘴、剑是纯色 |
| `ji-chuiji-zoushou.glb` | 泥胎 `wa_qinghui`。兽身、眼、嘴、仙人衣是纯色 |
| `men-geshan-bubujin.glb` | `zhulvqi-mu` 一套，`xuanzhi-chuang` 一套。纸只走透明，不透射 |
| `chuang-kanchuang-binglie.glb` | 同上 |
| `chuang-zhizhai.glb` | `zhulvqi-mu` 一套（框、上下扇、支杆共用），`xuanzhi-chuang` 一套 |
| `gualuo-wanzi.glb` | `zhulvqi-mu` |
| `meizi.glb` | `zhulvqi-mu` |
| `meirenkao.glb` | `zhulvqi-mu` 与 `zhuhongqi-mu` 各一套 |
| `lanban-xunzhang.glb` | `zhulvqi-mu` 与 `zhuhongqi-mu` 各一套 |
| `zhuchu-gujing.glb` | 脚本青白石，webp |
| `baogushi.glb` | 脚本青白石，webp。和柱础各嵌一份 |
| `mending-pushou.glb` | 无贴图。鎏金和眼是纯色 |
| `efang-sushi.glb` | 脚本彩画 `efang_sushi`，另有 64×64 粗糙度 `efang_rough` |
