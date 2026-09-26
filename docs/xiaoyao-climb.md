# 登逍遥楼（MVP）

独立静态体验页，第一人称走逍遥楼广场 → 一层 → 楼梯 → 二层回廊，南望解放桥、东望漓江。

## 访问

本地开发：

```bash
npm run dev -- --port 5191 --strictPort
```

浏览器打开 [http://localhost:5191/xiaoyao/](http://localhost:5191/xiaoyao/)（开发态由 `vite.config.ts` 把目录指到 `index.html`）。

生产路径：优先 `/xiaoyao/index.html`；静态托管若开目录索引则 `/xiaoyao/` 亦可用。

## 操作

- 桌面：点击画面指针锁定，`WASD` 移动，鼠标环视；右上「夜景 / 日景」；底部传送（广场 / 一层 / 二层南 / 二层东）。
- 手机：左下虚拟摇杆、右侧拖动环视；像素比 ≤ 1.5，无额外泛光。
- 二层回廊朝向外景时出现名牌，点击弹出照片卡片（数据来自 `/yunyou/data/place-photos.js`、`place-gallery.js`）。

## 场景与示意

| 内容 | 来源 | 说明 |
| --- | --- | --- |
| 逍遥楼精模 | `public/yunyou/assets/xiaoyaolou/` + `xiaoyaolou-model.js` | 昼夜 `setXiaoyaolouNight` |
| 解放桥 | `assets/blender/jiefangqiao.glb` | 真实跨径模型，桥灯材质 |
| 象鼻山 / 伏波等远景 | `*-far.glb` | 方位按 `landmarks.js` / 调研表 |
| 七星 / 普陀 | 远景占位 | 复用远峰模型，非精确山体 |
| 可走平台、楼梯、栏杆 | `public/xiaoyao/src/colliders.js` | **示意**，非测绘楼梯位置 |
| 滨江灯柱 | `waterfront.js` 坐标 | 简化几何，非完整 `createWaterfront` |
| 峰林剪影 | `karst-horizon.js` | 程序化远景 |
| 漓江水面 | `water-lijiang.js` | Clearwater 思路的折射 + 焦散（MVP 简化着色器） |
| 天空 | Three.js `Sky.js`（r170） | Preetham 模型 |

场景原点：逍遥楼 FOOT 中心（`geo.js` `FOOT.xiaoyaolou.c`）。

## 碰撞

**方案：AABB 盒子 + 踏步高度**（`STEP≈0.38`，`EYE≈1.6`，`RADIUS≈0.34`），参考 Sakura Crossing `player.js`。未集成 `three-mesh-bvh`（MVP 优先可玩）。

## 脚本调试

```js
window.__xiaoyao // { scene, camera, player, teleport, setNight, simulateWASD, getCameraHeight, THREE }
__xiaoyao.teleport('floor1')
__xiaoyao.simulateWASD({ w: 1, steps: 60 })
```

## 第三方 MIT 清单

| 组件 | 路径 / 说明 |
| --- | --- |
| three.js r170 | `/yunyou/vendor/three/` |
| Sky.js | `/yunyou/vendor/three/addons/objects/Sky.js`（自 npm `three@0.170.0` 拷贝） |
| Clearwater（焦散思路） | `tmp-xiaoyao/refs/clearwater`；许可 `public/xiaoyao/vendor/clearwater-LICENSE.txt` |
| Sakura Crossing（碰撞参考） | `tmp-xiaoyao/refs/sakura-crossing` MIT |

## 资料

- `tmp-xiaoyao/research-xiaoyaolou.md`（方位距离、夜景灯色）
- `tmp-xiaoyao/research-x-tools.md`、`tmp-xiaoyao/research-code.md`
