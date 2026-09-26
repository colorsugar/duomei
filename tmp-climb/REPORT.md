# 登逍遥楼 climb MVP — 截图验收（REVIEW-climb-2）

日期：2026-09-27  
分支：`cursor/xiaoyao-climb`  
PR：#102（保持 draft）  
本地：`npm run dev -- --port 5191 --strictPort` → `node tmp-climb/capture.mjs http://127.0.0.1:5191`

## Research checkpoint

- **Current:** 回廊钻瓦；解放桥/远峰 GLB 是云游世界坐标却又叠了 `footLocal`，桥飞到屏外；日景江浅地白。
- **Choice:** 世界 GLB 只 bake/`−ORIGIN`；回廊挑出灰瓦 maxZ≈16 外沿，站栏杆边 pitch=−3°；江水深绿松石；铺装灰+绿地。

## 构建 / 捕获

| 检查 | 结果 |
| --- | --- |
| capture pageerror | 0（desktop + iPhone13） |
| climb-log `ok` | true |
| gallerySouth cam | z≈16.15，pitch≈−0.052（−3°），feetY≈6.89，camY≈8.49 |
| 瓦面像素占比 | **1.04%**（≤20%） |
| 解放桥 | bearing **149.7°**、dist **215.5 m**；`bridgeBox.inView=true` |

## 截图

| 文件 | 说明 |
| --- | --- |
| `01-plaza-night.png` | 广场夜景 |
| `02-floor1.png` | 一层 |
| `03-stairs.png` | 楼梯 |
| `04-gallery-south-night.png` | 二层南望夜：解放桥蓝紫拱灯在视野内 |
| `05-gallery-south-day.png` | 二层南望日：桥+峰林绿岩色+江 |
| `06-gallery-east-caustics.png` | 二层东望 |
| `07-iphone13.png` | 手机视口 |
| `08-river-tower-night.png` | 江面望楼 |
| `09-plaza-day-up.png` | **新增**广场日景仰望 |
| `metrics.json` | 瓦面占比 + 桥包围框 |

## 审查逐条（REVIEW-climb-2）

1. **回廊视角** — 完成：站外沿栏杆边（z≈16.15），俯角 −3°；瓦面占比 1.04%
2. **解放桥** — 完成：世界坐标 GLB −ORIGIN，≈150°/220m；夜景拱灯；包围框 inView
3. **远山** — 完成：karst 顶点色；象鼻山 `xiangbishan-far` 按 205°/1.4km
4. **江面日景** — 完成：深绿松石 + 岸线 + 近焦散/远天反
5. **日景地面** — 完成：铺装灰 + 绿地条，步行道不再大白
6. **截图 / REPORT / push** — 本文件；PR 保持 draft

## 仍可再磨

- 广场仰望时下檐底面仍会占画面上沿一条（实景如此）；桥 approach 很长导致 screen box 很宽。
- 东望精模曲面与焦散仍可再压。
