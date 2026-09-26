# 登逍遥楼 climb MVP — 截图验收（REVIEW-climb-1）

日期：2026-09-26  
分支：`cursor/xiaoyao-climb`  
本地：`npm run dev -- --port 5191 --strictPort` → `node tmp-climb/capture.mjs http://127.0.0.1:5191`

## Research checkpoint

- **Current:** 原 `public/xiaoyao` 可玩但画面不合格（回廊瓦面、天空、远山、城市、水面范围等）。
- **Choice:** 复用 yunyou 的 `geo.js` 建筑/道路/水面、`waterfront.js` 滨江、`karst-horizon.js` 远峰、blender 远峰 GLB；日景 `Sky.js`，夜景独立穹顶 shader（不用 Sky 夜景）。

## 构建 / 捕获

| 检查 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| capture pageerror | 0（desktop + iPhone13） |
| climb-log `ok` | true |
| climb-log `deltaCam` | ~7.6 m |

## 截图

| 文件 | 说明 |
| --- | --- |
| `tmp-climb/shots/01-plaza-night.png` | 广场夜景 |
| `tmp-climb/shots/02-floor1.png` | 一层 |
| `tmp-climb/shots/03-stairs.png` | 楼梯 |
| `tmp-climb/shots/04-gallery-south-night.png` | 二层南望夜景 |
| `tmp-climb/shots/05-gallery-south-day.png` | 二层南望日景 |
| `tmp-climb/shots/06-gallery-east-caustics.png` | 二层东望 + 水面 |
| `tmp-climb/shots/07-iphone13.png` | 手机视口 |
| `tmp-climb/shots/08-river-tower-night.png` | **新增** 江面方向看楼夜景 |

## 审查逐条（1–9）

1. **回廊视线** — 部分：传送点内缩 + pitch≈−4°～−5°，平台 gy≈6.92；精模檐口与碰撞平台仍可能偏差，04/05 仍可能偏瓦面，需生产页再验。
2. **天空** — 日景 Sky.js + 雾色 `HORIZON_DAY`；夜景 `night-dome.js` 渐变+星，无 Sky 棕条纹。
3. **远山** — karst 顶点色峰林 + xiangbishan/fuboshan/diecaishan-far、qixing.glb 等按经纬/方位。
4. **城市** — `city.js` 1.8km 内 BUILDINGS/ROADS/GREEN + waterfront 平移 + urban-trees。
5. **解放桥** — `jiefangqiao.glb` @ FOOT + nightStrength。
6. **一层陈设** — `interior.js` 铜地图、展台、书法框、吊灯、碑亭简化。
7. **广场黑面** — 水面 polygon 过滤广场区 + 广场/城墙 mesh；前景仍偏暗。
8. **水面** — WATER 轮廓 shader 水 + 夜景拉长高光；焦散日景保留。
9. **截图与 PR** — 本 REPORT + push draft #102。

## 仍不满意（自检）

- 二层南望 04/05：瓦面/檐下构图仍敏感，需精模檐高实测微调 z/pitch。
- 08 江面夜景：逍遥楼主体偏小，机位可再南移。
- 广场前景夜间对比度偏低。
- 城市密度与 yunyou 主地图仍有差距（刻意裁剪半径内）。
