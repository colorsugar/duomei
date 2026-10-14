// 小院 / 江南 场景的光照微调（运行时覆盖，不改预构建包和 courtyard-3d 源码）。
// - 树叶、草叶整体提亮并加一点自发光，暗部能看出叶片层次；
// - 正午时花（荷花、花瓣、花序）收一点，避免过曝；
// - 日出 / 黄昏 / 夜晚补一盏柔和的半球光，让房子不至于发黑。
// ?light=0 关闭，便于对比。
import { bm as Scene, bE as HemisphereLight } from "./three.module-9UAnMrUf.js";

const off = new URLSearchParams(location.search).get("light") === "0";
const GARDEN = new URLSearchParams(location.search).get("scene") === "garden";
const LOW_FILL = GARDEN ? 0.3 : 0.12; // 只托一下最暗的阴影，不整体提亮
const FOLIAGE = /foliage|needle|leaf|leaves|shrub|grass|calamus|lance|pinna|mondo|fern|bamboo|reed|moss|ivy|vine|willow/i;
const FLOWER = /blossom|floret|lotus|petal|flower|lily|bloom|plum|peach|azalea|rose|violet/i;
const SKIP = /stem|bed|gravel|pebble|mist|blob|pool|drop|bark|trunk/i;

// 原始材质参数只记一次（场景切换重扫时不会把已调过的值当原值，避免叠加发白）。
const ORIG = new WeakMap();
const state = { scene: null, sun: null, fill: null, mats: new Map(), lastScan: 0 };
window.__xyLight = state;

function classify(obj, mat) {
  const name = `${obj.name} ${mat.name}`;
  if (SKIP.test(name)) return null;
  if (FOLIAGE.test(name)) return "leaf";
  if (FLOWER.test(name)) return "flower";
  // 小院里很多植物没有名字：按固有色判断，绿色当叶子、粉色当花。
  if (!obj.name && !mat.name && !mat.map && !mat.transparent) {
    const { r, g, b } = mat.color;
    if (g > r * 1.08 && g > b * 1.25 && g < 0.75) return "leafHue";
    if (r > g * 1.25 && b > g * 1.05) return "flower";
  }
  return null;
}

function scan(scene) {
  scene.traverse((obj) => {
    if (obj.isDirectionalLight && (!state.sun || obj.name === "sun")) state.sun = obj;
    for (const mat of [].concat(obj.material || [])) {
      if (!mat || !mat.color || state.mats.has(mat)) continue;
      const kind = classify(obj, mat);
      if (kind && !ORIG.has(mat)) ORIG.set(mat, {
        kind,
        color: mat.color.clone(),
        emissive: mat.emissive ? mat.emissive.clone() : null,
        ei: mat.emissiveIntensity ?? 1,
      });
      state.mats.set(mat, kind ? ORIG.get(mat) : null);
    }
  });
  if (!state.fill) {
    state.fill = new HemisphereLight(0xffe6c8, 0x6a5c4c, 0);
    state.fill.name = "xy-fill";
    scene.add(state.fill);
  }
}

const clamp = (v) => Math.min(1, Math.max(0, v));

function apply() {
  const sun = state.sun;
  let elev = 0.6;
  if (sun) {
    const dx = sun.position.x - sun.target.position.x;
    const dy = sun.position.y - sun.target.position.y;
    const dz = sun.position.z - sun.target.position.z;
    elev = dy / (Math.hypot(dx, dy, dz) || 1);
  }
  const sunI = sun ? sun.intensity : 3;
  const noon = clamp((elev - 0.55) / 0.3) * clamp((sunI - 2) / 2); // 1 = high bright sun
  const todEl = document.getElementById("tod");
  const tod = todEl ? Number(todEl.value) : 0.3;
  const night = clamp((tod - 0.62) / 0.25);
  const low = Math.max(night, 1 - clamp((elev - 0.12) / 0.4) * clamp(sunI / 3)); // 1 = dawn / dusk / night
  state.noon = noon; state.low = low; state.night = night;
  for (const [mat, info] of state.mats) {
    if (!info) continue;
    // 夜里：小院完全保持原样；江南只留很轻的一点，树不能像在发光。
    const keep = GARDEN ? 1 - 0.8 * night : 1 - night;
    const lift = (m) => 1 + (m - 1) * keep;
    if (info.kind === "leafHue") {
      mat.color.copy(info.color).multiplyScalar(lift(1.05));
    } else if (info.kind === "leaf") {
      // 带贴图的白底叶片提亮要克制，否则浅色叶会发黄发白。
      const pale = mat.map && info.color.r > 0.9 && info.color.g > 0.9;
      const dusk = Math.max(0, low - night);
      mat.color.copy(info.color).multiplyScalar(lift(pale ? 1.0 : 1.05));
      if (info.emissive) {
        const g = 1 - night; // 夜里不加绿色自发光
        mat.emissive.copy(info.emissive);
        mat.emissive.r += 0.008 * g; mat.emissive.g += 0.014 * g; mat.emissive.b += 0.006 * g;
        const ei = pale ? info.ei : Math.max(info.ei, 0.18 * (1 - 0.5 * dusk));
        mat.emissiveIntensity = info.ei + (ei - info.ei) * g;
      }
    } else if (info.kind === "flower") {
      mat.color.copy(info.color).multiplyScalar(1 - 0.15 * noon);
    }
  }
  // 补光只托最暗的阴影；小院夜里关掉，江南夜里只留一点让房子不全黑。
  if (state.fill) state.fill.intensity = GARDEN ? 0.05 + LOW_FILL * low : (0.05 + LOW_FILL * low) * (1 - night);
}

// 截图对比用：window.__xyCam = { p: [x,y,z], t: [x,y,z] } 时把镜头钉在固定位置（开/关光照都生效）。
{
  const prev = Scene.prototype.onBeforeRender;
  Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
    if (!state.camera && camera && camera.isPerspectiveCamera && !camera.userData.refractor && camera.layers.isEnabled(0)) state.camera = camera; // 只认主镜头：池面倒影/折射的虚拟镜头不算
    const pin = window.__xyCam;
    if (pin && camera === state.camera) {
      camera.position.fromArray(pin.p);
      camera.lookAt(pin.t[0], pin.t[1], pin.t[2]);
      camera.updateMatrixWorld();
    }
    if (!off && scene === this) {
      const now = performance.now();
      if (!state.scene || (scene !== state.scene && scene.children.length > state.scene.children.length)) {
        state.scene = scene; state.mats.clear(); state.fill = null; state.sun = null; state.lastScan = 0;
      }
      if (scene === state.scene) {
        if (now - state.lastScan > 2000) { scan(scene); state.lastScan = now; }
        apply();
      }
    }
    return prev && prev.call(this, renderer, scene, camera, target);
  };
}
