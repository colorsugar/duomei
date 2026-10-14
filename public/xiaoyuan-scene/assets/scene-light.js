// 小院 / 江南 场景的光照微调（运行时覆盖，不改预构建包和 courtyard-3d 源码）。
// - 树叶、草叶整体提亮并加一点自发光，暗部能看出叶片层次；
// - 正午时花（荷花、花瓣、花序）收一点，避免过曝；
// - 日出 / 黄昏 / 夜晚补一盏柔和的半球光，让房子不至于发黑。
// ?light=0 关闭，便于对比。
import { bm as Scene, bE as HemisphereLight } from "./three.module-9UAnMrUf.js";

const off = new URLSearchParams(location.search).get("light") === "0";
const FOLIAGE = /foliage|needle|leaf|leaves|shrub|grass|calamus|lance|pinna|mondo|fern|bamboo|reed|moss|ivy|vine|willow/i;
const FLOWER = /blossom|floret|lotus|petal|flower|lily|bloom|plum|peach|azalea|rose|violet/i;
const SKIP = /stem|bed|gravel|pebble|mist|blob|pool|drop|bark|trunk/i;

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
      state.mats.set(mat, kind && {
        kind,
        color: mat.color.clone(),
        emissive: mat.emissive ? mat.emissive.clone() : null,
        ei: mat.emissiveIntensity ?? 1,
      });
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
  state.noon = noon; state.low = low;
  for (const [mat, info] of state.mats) {
    if (!info) continue;
    if (info.kind === "leafHue") {
      // 无贴图的纯色叶子：只轻提一点，免得发灰发白。
      mat.color.copy(info.color).multiplyScalar(1.1 + 0.12 * low);
    } else if (info.kind === "leaf") {
      mat.color.copy(info.color).multiplyScalar(1.24 + 0.16 * low);
      if (info.emissive) {
        mat.emissive.setRGB(0.07, 0.1, 0.05).add(info.emissive);
        mat.emissiveIntensity = Math.max(info.ei, 0.22 + 0.3 * low);
      }
    } else if (info.kind === "flower") {
      mat.color.copy(info.color).multiplyScalar(1 - 0.24 * noon);
    }
  }
  if (state.fill) state.fill.intensity = 0.2 + 1.35 * low;
}

if (!off) {
  const prev = Scene.prototype.onBeforeRender;
  Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
    if (scene === this) {
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
