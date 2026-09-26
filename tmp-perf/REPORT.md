# 桂林云游手机端性能报告

分支：`cursor/yunyou-mobile-perf`  
测量环境：Playwright `devices['iPhone 13']`，CDP `Emulation.setCPUThrottlingRate=4`，Fast 4G（latency 150ms / down 1.6Mbps / up 750kbps）；对照桌面 1440×900。  
页面：`http://127.0.0.1:5190/yunyou/index.html?standalone=1`

## 前后对比（手机）

| 指标 | 优化前 (baseline) | 优化后 (after3) | 变化 |
|---|---:|---:|---:|
| 首屏可交互（loading 消失） | **158632 ms** | **50635 ms** | **−68%**（目标 ≥40%） |
| 拖动/自转帧中位 | 216.7 ms | 16.7 ms | −92% |
| 拖动/自转帧 p95 | **300 ms** | **33.4 ms** | **−89%**（≈30fps 预算） |
| 首屏阶段下载（至采样） | 44945 KB | 22150 KB | −51% |
| 主线程长任务合计（采样窗） | 45910 ms | 9741 ms | −79% |
| 最长单次 long task | 26484 ms | 3414 ms | −87% |

桌面对照：首屏可交互 37684 ms → 1216 ms（同样不再阻塞于 `city-far.glb`）。桌面「高清」后期/倒影/DPR2 路径未改。

## 下载 Top（手机基线前 8）

1. `city-far.glb` 8706 KB  
2. blender 贴图 jpg ~6 MB  
3. blender 贴图 jpg ~3.5 MB  
4. `xiangbishan.glb` 2436 KB  
5. blender png ~1.8 MB  
6. `three.module.js` 1351 KB  
7. `xiangbishan.bin` 1335 KB  
8. foliage normal 1245 KB  

优化后首屏阶段不再等待 `city-far` 及其贴图链；该 GLB 仍在首帧后后台加载。

## 改动摘要

- **首屏**：loading 不依赖 `blenderModels.ready` / `city-far.glb`；峰林、树点、城区补建延后并分帧；二级 GLB 流延到首帧后。
- **渲染（仅手机）**：跳过 HDR/bloom/MSAA；均衡 DPR≤1.15；阴影 1024 且默认关；波纹默认关；标签距离裁剪；树 LOD 更近；补建距离隐藏。
- **保留**：桌面高清观感；逍遥楼 / 象鼻山 / 解放桥精模与照片卡。

## 截图

- `tmp-perf/baseline-mobile.png` / `after3-mobile.png`
- `tmp-perf/baseline-desktop.png` / `after-desktop.png`

## 验收命令

全部通过：

- `node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou-walk.mjs`
- `… verify-yunyou-stream.mjs`
- `… verify-yunyou-gestures.mjs`
- `node scripts/verify-xiaoyaolou.mjs`
- `npm run build`
- `mise exec node@22.17.1 -- npm run test:home-hold`
