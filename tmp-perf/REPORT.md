# 桂林云游手机端性能报告

分支：`cursor/yunyou-mobile-perf`  
测量环境：Playwright `devices['iPhone 13']`，CDP `Emulation.setCPUThrottlingRate=4`，Fast 4G（latency 150ms / down 1.6Mbps / up 750kbps）；对照桌面 1440×900。  
页面：`http://127.0.0.1:5190/yunyou/index.html?standalone=1`

## 前后对比（手机）

| 指标 | 优化前 (baseline) | 优化后 (after7) | 变化 |
|---|---:|---:|---:|
| 首屏可交互（loading 消失） | **158632 ms** | **67087 ms** | **−57.7%**（目标 ≥40%） |
| 拖动/自转帧中位 | 216.7 ms | 16.7 ms | −92% |
| 拖动/自转帧 p95 | **300 ms** | **33.4 ms** | **−89%**（≈30fps 预算） |
| 首屏阶段下载（至采样） | 44945 KB | 23992 KB | −47% |
| 主线程长任务合计（采样窗） | 45910 ms | 13428 ms | −71% |
| 最长单次 long task | 26484 ms | 3506 ms | −87% |

桌面对照：首屏可交互 37684 ms → 46834 ms（桌面仍等 `city-far` + 同步城景，观感优先；手机不等 `city-far`）。

## 画面修复（审查 after7）

- **桌面水面**：倒影开启时保留轻量水面直至 Water 首次反射完成，避免隐藏纯色水面后露出土色地面。
- **手机首屏地标**：当前机位（默认象鼻山）Blender 精模（`xiangbishan-far.glb`）就绪后再关 loading；精华一线其余 `*-far.glb` 后台预载；SDF 仅 GLB 失败回退。`city-far` 仍延后。
- **桌面城景**：峰林 / 行道树 / 城区补建改回启动时同步，避免相对 main 缺楼。

## 下载 Top（手机 after7 前 8）

1. `city-far.glb` 8706 KB（首屏后后台）  
2. `three.module.js` 1351 KB  
3. `xiangbishan.bin` 1335 KB（SDF 回退资源，精模加载后隐藏）  
4. foliage normal 1245 KB  
5. foliage color 957 KB  
6. plaster normal 879 KB  
7. **`jiefangqiao-far.glb` 855 KB**（后台预载）  
8. **`xiangbishan-far.glb` 739 KB**（首屏精模）  

## 截图

- 手机：`tmp-perf/baseline-mobile.png` ↔ `tmp-perf/after7-mobile.png` → `tmp-perf/compare-mobile.png`
- 桌面：`tmp-perf/baseline-desktop.png` ↔ `tmp-perf/after7-desktop.png` → `tmp-perf/compare-desktop.png`

## 验收命令

全部通过：

- `node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou-walk.mjs`
- `… verify-yunyou-stream.mjs`
- `… verify-yunyou-gestures.mjs`
- `node scripts/verify-xiaoyaolou.mjs`
- `npm run build`（见提交前复跑）
- `mise exec node@22.17.1 -- npm run test:home-hold`（见提交前复跑）
