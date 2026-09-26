# 登逍遥楼 climb MVP — 截图验收（REVIEW-climb-1）

日期：2026-09-26  
分支：`cursor/xiaoyao-climb`  
本地：`npm run dev -- --port 5191 --strictPort` → `node tmp-climb/capture.mjs http://127.0.0.1:5191`

## Research checkpoint

- **Current:** 初版可玩但画面不合格；Luna 首轮后回廊钻瓦、江面机位落水。
- **Choice:** 复用 yunyou geo/city/waterfront/karst/远峰 GLB；夜景穹顶；回廊脚高固定≈6.9（瓦面下沿+0.3），站位缩进檐下 z/x≈8.9。

## 构建 / 捕获

| 检查 | 结果 |
| --- | --- |
| `npm run build` | 见本次 push 前跑 |
| capture pageerror | 0（desktop + iPhone13） |
| climb-log `ok` | true |
| gallerySouth feet/cam | ≈6.89 / 8.49 |

## 截图

| 文件 | 说明 |
| --- | --- |
| `01-plaza-night.png` | 广场夜景（铺地+城墙，非黑水） |
| `02-floor1.png` | 一层铜地图展台 |
| `03-stairs.png` | 楼梯 |
| `04-gallery-south-night.png` | 二层南望夜：星空+城市+江，檐口压下缘 |
| `05-gallery-south-day.png` | 二层南望日：Sky 蓝灰天 + 峰林/江 |
| `06-gallery-east-caustics.png` | 二层东望：江面方向 + 七星/普陀名牌 |
| `07-iphone13.png` | 手机视口 |
| `08-river-tower-night.png` | 江面方向看逍遥楼夜景 |

## 审查逐条（1–9）

1. **回廊视线** — 完成（日景檐下构图 OK；夜景近瓦仍偏抢眼但已非钻进精模）
2. **天空** — 完成（日 Sky.js；夜 night-dome；无黑顶/棕条纹）
3. **远山** — 完成（karst 顶点色 + far GLB + qixing）
4. **城市** — 完成（1.8km geo + waterfront + trees）
5. **解放桥** — 完成（FOOT 位 + nightStrength 加强；名牌可见，桥体夜景仍可再亮）
6. **一层陈设** — 完成（铜地图/展台/书法/吊灯/碑亭；截图像机对准铜地图）
7. **广场黑面** — 完成（过滤水面 + 铺地/垛口）
8. **水面** — 完成（WATER 轮廓 + 日焦散 + 夜高光）
9. **截图与 PR** — 本 REPORT + draft #102 push

## 仍可再磨

- 夜景南望近瓦反光仍偏抢；解放桥蓝紫拱灯在南望里还不够「占画面」。
- 东望前景仍有精模曲面，焦散条纹在夜景里弱。
- WASD 爬梯脚本在楼梯中段会掉回一层（示意碰撞），传送二层仍可用。
