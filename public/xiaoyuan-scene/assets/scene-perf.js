// 江南 / 小院 帧率稳定（运行时覆盖，不改预构建包）。?perf=0 关闭。
// - 像素比上限 1.5（Retina 下 GPU 压力减半左右）
// - 水面倒影隔帧刷新（倒影本来就模糊，隔帧肉眼看不出）
// - 太阳阴影贴图上限 2048
// - 加载后预热各时段（午后/黄昏/夜晚）的着色器，切换时段不卡
import { bm as Scene } from "./three.module-9UAnMrUf.js";

const off = new URLSearchParams(location.search).get("perf") === "0";
const MAX_PR = 1.5;
const st = { renderer: null, frame: 0, reflectors: new Set(), warmed: false, lastScan: 0 };
window.__xyPerf = st;

function hookRenderer(r) {
  st.renderer = r;
  const set = r.setPixelRatio.bind(r);
  r.setPixelRatio = (v) => set(Math.min(v, MAX_PR));
  if (r.getPixelRatio() > MAX_PR) r.setPixelRatio(r.getPixelRatio());
}

function scan(scene) {
  scene.traverse((o) => {
    if (o.isDirectionalLight && o.castShadow && o.shadow.mapSize.x > 2048) {
      o.shadow.mapSize.set(2048, 2048);
      if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
    }
    if (o.isMesh && typeof o.getRenderTarget === "function" && !st.reflectors.has(o)) {
      st.reflectors.add(o);
      const orig = o.onBeforeRender;
      // 同一帧里第一次调用才决定是否刷新；跳过的帧沿用上一帧的倒影贴图。
      o.onBeforeRender = function (...a) {
        if (this.__f === st.frame) return;
        this.__f = st.frame;
        if (st.frame % 2 === 1 && this.__drawn) return;
        this.__drawn = true;
        return orig.apply(this, a);
      };
    }
  });
}

function warm(scene, camera) {
  st.warmed = true;
  const btns = [...document.querySelectorAll("[data-tod]")].filter((b) => !b.hidden);
  const cur = document.querySelector("[data-tod].is-current");
  const r = st.renderer;
  try {
    for (const b of btns) { b.click(); r.compile(scene, camera); }
  } catch (e) { console.warn("[scene-perf] warm", e); }
  if (cur) cur.click();
}

if (!off) {
  const prev = Scene.prototype.onBeforeRender;
  let lastNow = -1;
  Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
    const now = performance.now();
    if (now !== lastNow && now - lastNow > 4) { st.frame++; lastNow = now; }
    if (!st.renderer && renderer) hookRenderer(renderer);
    if (scene === this && scene.children.length > 5 && now - st.lastScan > 3000) {
      scan(scene); st.lastScan = now;
      if (!st.warmed && camera && camera.isPerspectiveCamera && st.frame > 30) setTimeout(() => warm(scene, camera), 0);
    }
    return prev && prev.call(this, renderer, scene, camera, target);
  };
}
