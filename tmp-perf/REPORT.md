# 桂林云游手机端性能报告

分支：`cursor/yunyou-mobile-perf`  
测量环境：Playwright `devices['iPhone 13']`，CDP `Emulation.setCPUThrottlingRate=4`，Fast 4G（latency 150ms / down 1.6Mbps / up 750kbps）；对照桌面 1440×900。  
页面：`http://127.0.0.1:5190/yunyou/index.html?standalone=1`

## 前后对比（手机）

| 指标 | 优化前 (baseline) | 优化后 (after4) | 变化 |
|---|---:|---:|---:|
| 首屏可交互（loading 消失） | **158632 ms** | **50875 ms** | **−68%**（目标 ≥40%） |
| 拖动/自转帧中位 | 216.7 ms | 16.7 ms | −92% |
| 拖动/自转帧 p95 | **300 ms** | **33.4 ms** | **−89%**（≈30fps 预算，目标 ≤33ms） |
| 首屏阶段下载（至采样） | 44945 KB | 22627 KB | −50% |
| 主线程长任务合计（采样窗） | 45910 ms | 9626 ms | −79% |
| 最长单次 long task | 26484 ms | 3549 ms | −87% |

桌面对照：首屏可交互 37684 ms → 1262 ms（仍不阻塞于 `city-far.glb`）；倒影开启时水面与 main 同观感（轻量水面作反射就绪前兜底）。

## 画面修复（审查 after4）

- **桌面水面**：倒影开启时保留轻量水面直至 Water 首次反射完成，避免隐藏纯色水面后露出土色地面。
- **手机首屏地标**：精华一线 Blender 精模（手机 `*-far.glb`）首帧即加载，不再等 `city-far`；SDF 仅作 GLB 失败回退。

## 下载 Top（手机 after4 前 8）

1. `city-far.glb` 8706 KB（首帧后后台）  
2. `three.module.js` 1351 KB  
3. `xiangbishan.bin` 1335 KB（SDF 回退资源，精模加载后隐藏）  
4. foliage normal 1245 KB  
5. foliage color 957 KB  
6. **`xiangbishan-far.glb` 739 KB**（首屏精华精模）  
7. plaster normal 879 KB  
8. plaster color 671 KB  

## 截图

- 手机：`tmp-perf/baseline-mobile.png` ↔ `tmp-perf/after4-mobile.png` → `tmp-perf/compare-mobile.png`
- 桌面：`tmp-perf/baseline-desktop.png` ↔ `tmp-perf/after4-desktop.png` → `tmp-perf/compare-desktop.png`

## 验收命令

全部通过：

- `node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou-walk.mjs`
- `… verify-yunyou-stream.mjs`
- `… verify-yunyou-gestures.mjs`
- `node scripts/verify-xiaoyaolou.mjs`
- `npm run build`
- `mise exec node@22.17.1 -- npm run test:home-hold`
