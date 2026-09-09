import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Water } from "three/addons/objects/Water.js";

const MAP_W = 1280;
const MAP_H = 720;
const HEIGHT_SCALE = 36;
const KM_PER_UNIT = 20.3;
const EURASIA_AREA_WAN_KM2 = 5470;
const SVG_W = 1100;
const HOME = { radius: 820, polar: 0.96, azimuth: -0.42 };
const TILT = { oblique: 0.88, top: 0.14 };
const KIND_DOT = {
  "王都": "#e9d29a", "帝都": "#c4b0d8", "战略通道": "#ffb089", "山口要塞": "#c4c6bf",
  "战略海峡": "#82b9c4", "双层王城": "#d2b09a", "禁航海沟": "#6ee0ff", "中立学术中心": "#efe2b0",
  "森林关隘": "#7dba8f", "远古遗迹": "#b9d8e0", "禁忌核心": "#9ad7e8", "渡口要塞": "#e3c27a",
};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const narrow = () => matchMedia("(max-width: 900px)").matches;

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const siteList = document.getElementById("site-list");
const regionList = document.getElementById("region-list");
const backLevel = document.getElementById("back-level");
const backMap = document.getElementById("back-map");
const lodChip = document.getElementById("lod-chip");
const siteSectionTitle = document.getElementById("site-section-title");
const card = document.getElementById("card");
const cardBody = document.getElementById("card-body");
const loading = document.getElementById("loading");
const hint = document.getElementById("hint");
const menuOpen = document.getElementById("menu-open");
const menuClose = document.getElementById("menu-close");
const panelScrim = document.getElementById("panel-scrim");
const exitImmersive = document.getElementById("exit-immersive");

function setPanel(open) {
  app.classList.toggle("is-panel-open", open);
  menuOpen.setAttribute("aria-expanded", open ? "true" : "false");
}
function setImmersive(on) {
  app.classList.toggle("is-immersive", on);
  exitImmersive.hidden = !on;
  if (on) setPanel(false);
}
menuOpen.addEventListener("click", () => setPanel(true));
menuClose.addEventListener("click", () => setPanel(false));
panelScrim.addEventListener("click", () => setPanel(false));
document.getElementById("immersive").addEventListener("click", () => setImmersive(true));
exitImmersive.addEventListener("click", () => setImmersive(false));
stage.addEventListener("pointerdown", (e) => {
  if (!narrow() || !app.classList.contains("is-panel-open")) return;
  if (e.target.closest(".cj3d-label, .cj3d-district")) return;
  setPanel(false);
});
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!card.hidden) { card.hidden = true; return; }
  if (app.classList.contains("is-immersive")) { setImmersive(false); return; }
  if (activeDistrict || activeCity || activeRegion) { stepBack(); return; }
  if (app.classList.contains("is-panel-open")) setPanel(false);
});
setPanel(!narrow() && !coarse);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
} catch {
  loading.textContent = "这台设备暂时打不开立体地图。";
  throw new Error("webgl unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "cj3d-labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050c16);
scene.fog = new THREE.FogExp2(0x07111d, 0.0003);

const camera = new THREE.PerspectiveCamera(44, 1, 1, 24000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = coarse ? 0.1 : 0.075;
controls.screenSpacePanning = false;
controls.minDistance = 12;
controls.maxDistance = 5600;
controls.minPolarAngle = 0.04;
controls.maxPolarAngle = 1.25;
controls.rotateSpeed = coarse ? 0.42 : 0.52;
controls.zoomSpeed = coarse ? 0.75 : 0.9;
controls.panSpeed = coarse ? 0.85 : 0.95;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.listenToKeyEvents(window);

(function touchGuard(el) {
  const pts = new Map();
  const down = (e) => {
    if (e.pointerType !== "touch" || !controls.enabled) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size > 1) controls.touches.ONE = null;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      controls.touches.TWO = Math.hypot(a[0] - b[0], a[1] - b[1]) < 14 ? null : THREE.TOUCH.DOLLY_ROTATE;
    }
    if (pts.size > 2) controls.touches.TWO = null;
  };
  const move = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size !== 2) return;
    const [a, b] = [...pts.values()];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 14) e.stopImmediatePropagation();
  };
  const up = (e) => {
    pts.delete(e.pointerId);
    if (pts.size) return;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  };
  for (const [n, f] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up]]) {
    el.addEventListener(n, f, true);
  }
})(renderer.domElement);

scene.add(new THREE.AmbientLight(0x1a2838, 0.4));
scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x0c1824, 0.95));
const sun = new THREE.DirectionalLight(0xffe2b8, 1.8);
sun.position.set(-1100, 1600, 780);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x7eb0ff, 0.4);
fill.position.set(900, 600, -500);
scene.add(fill);
const cityLight = new THREE.PointLight(0xffd9a0, 0, 260, 2);
scene.add(cityLight);
const districtLight = new THREE.PointLight(0xffe8c0, 0, 90, 2);
scene.add(districtLight);

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(8200, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0b1c30) },
      midColor: { value: new THREE.Color(0x143148) },
      botColor: { value: new THREE.Color(0x07111d) },
    },
    vertexShader: "varying vec3 v; void main(){v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `varying vec3 v; uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;
      void main(){ float h=v.y*0.5+0.5; vec3 c=mix(botColor,midColor,smoothstep(0.,.55,h)); c=mix(c,topColor,smoothstep(.45,1.,h)); gl_FragColor=vec4(c,1.); }`,
  }),
));

const texLoader = new THREE.TextureLoader();
const waterNormals = texLoader.load("/yunyou/assets/tex/waternormals.jpg");
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const water = new Water(new THREE.PlaneGeometry(11000, 7800), {
  textureWidth: coarse ? 256 : 512,
  textureHeight: coarse ? 256 : 512,
  waterNormals,
  sunDirection: sun.position.clone().normalize(),
  sunColor: 0xffe2b8,
  waterColor: 0x08233d,
  distortionScale: 2.2,
  fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = -2.4;
scene.add(water);

const toWorld = (x, y) => new THREE.Vector3(x - MAP_W / 2, 0, y - MAP_H / 2);
const fromSvg = (x, y) => ({ x: (x / SVG_W) * MAP_W, y: (y / 720) * MAP_H });
const texCache = new Map();

function loadTex(url) {
  if (texCache.has(url)) return Promise.resolve(texCache.get(url));
  return texLoader.loadAsync(url).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    texCache.set(url, tex);
    return tex;
  });
}

function luminanceField(image) {
  const cols = 384;
  const rows = Math.round((cols * MAP_H) / MAP_W);
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  let field = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    field[i] = (b > r + 0.05 && lum < 0.45) ? 0 : Math.pow(Math.min(1, Math.max(0, (lum - 0.2) / 0.65)), 1.3);
  }
  for (let p = 0; p < 3; p += 1) {
    const next = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const yy = y + dy; if (yy < 0 || yy >= rows) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx; if (xx < 0 || xx >= cols) continue;
            s += field[yy * cols + xx]; n += 1;
          }
        }
        next[y * cols + x] = s / n;
      }
    }
    field = next;
  }
  return { cols, rows, field };
}
function sampleField(hf, u, v) {
  const fx = Math.min(hf.cols - 1, Math.max(0, u * (hf.cols - 1)));
  const fy = Math.min(hf.rows - 1, Math.max(0, v * (hf.rows - 1)));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(hf.cols - 1, x0 + 1), y1 = Math.min(hf.rows - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a = hf.field[y0 * hf.cols + x0] * (1 - tx) + hf.field[y0 * hf.cols + x1] * tx;
  const b = hf.field[y1 * hf.cols + x0] * (1 - tx) + hf.field[y1 * hf.cols + x1] * tx;
  return (a * (1 - ty) + b * ty) * HEIGHT_SCALE;
}
function heightAt(x, y, hf) { return sampleField(hf, x / MAP_W, y / MAP_H); }
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexColor(c) { return new THREE.Color(c); }

const styleTexCache = new Map();
const ESTATE_TEX_MAP = {
  palladio: { wall: "palladio-wall", roof: "roof-terracotta", window: "win-classical" },
  baroque: { wall: "baroque-wall", roof: "roof-copper", window: "win-classical" },
  rococo: { wall: "rococo-wall", roof: "roof-slate", window: "win-classical" },
  gothic: { wall: "gothic-wall", roof: "roof-slate", window: "win-gothic" },
};

function estateTexUrl(name) {
  return new URL(`../assets/tex/${name}.webp`, import.meta.url).href;
}

function estateMaterials(style, palette) {
  const styleKey = style || "palladio";
  const key = `${styleKey}|${palette.accent}|${palette.roof}`;
  if (styleTexCache.has(key)) return styleTexCache.get(key);

  const names = ESTATE_TEX_MAP[styleKey] || ESTATE_TEX_MAP.palladio;
  const wall = hexColor(palette.wall);
  const roof = hexColor(palette.roof);
  const accent = hexColor(palette.accent);

  const roofRough = names.roof === "roof-copper" ? 0.35 : names.roof === "roof-slate" ? 0.75 : 0.8;
  const roofMetal = names.roof === "roof-copper" ? 0.6 : names.roof === "roof-slate" ? 0.1 : 0.02;

  const wallMat = new THREE.MeshStandardMaterial({ color: wall.clone(), roughness: 0.6, metalness: 0.05 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roof.clone(), roughness: roofRough, metalness: roofMetal });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent.clone(), emissive: accent.clone(), emissiveIntensity: 0.18,
    roughness: 0.3, metalness: 0.85,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: accent.clone(), emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.05,
  });

  const mats = { wallMat, roofMat, accentMat, windowMat };
  styleTexCache.set(key, mats);

  loadTex(estateTexUrl(names.wall)).then((tex) => {
    const clone = tex.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(2, 2);
    clone.needsUpdate = true;
    wallMat.map = clone;
    wallMat.color.set(0xffffff);
    wallMat.needsUpdate = true;
  }).catch(() => {});
  loadTex(estateTexUrl(names.roof)).then((tex) => {
    const clone = tex.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(3, 3);
    clone.needsUpdate = true;
    roofMat.map = clone;
    roofMat.color.set(0xffffff);
    roofMat.needsUpdate = true;
  }).catch(() => {});
  loadTex(estateTexUrl("trim-gold")).then((tex) => {
    const clone = tex.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(4, 4);
    clone.needsUpdate = true;
    accentMat.map = clone;
    accentMat.color.set(0xffffff);
    accentMat.needsUpdate = true;
  }).catch(() => {});
  loadTex(estateTexUrl(names.window)).then((tex) => {
    const clone = tex.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(2, 3);
    clone.needsUpdate = true;
    windowMat.map = clone;
    windowMat.emissiveMap = clone;
    windowMat.color.set(0xffffff);
    windowMat.needsUpdate = true;
  }).catch(() => {});

  return mats;
}

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
const scaleTarget = new THREE.Vector3();
const scaleOffset = new THREE.Vector3();
const scaleProjectA = new THREE.Vector3();
const scaleProjectB = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
let flight = null;
let lodGuardUntil = 0;
const markers = new Map();
const sitesById = new Map();
const siteRegion = new Map();
const citiesById = new Map();
let regions = [];
let activeRegion = null;
let activeCity = null;
let activeDistrict = null;
let heightField = null;
let continentMesh = null;
let regionOverlay = null;
let cityRoot = null;
let districtRoot = null;
let creatureSystems = [];
let districtLabels = [];
let lastCityView = null;
let siteButtonsBuilt = false;
let cloudLayer = null;
let graticule = null;
let iceCap = null;
let eurasiaOverlay = null;
let eurasiaLabel = null;

function currentView() {
  offset.copy(camera.position).sub(controls.target);
  spherical.setFromVector3(offset);
  return { target: controls.target.clone(), radius: spherical.radius, polar: spherical.phi, azimuth: spherical.theta };
}
function applyView(view) {
  spherical.set(view.radius, view.polar, view.azimuth);
  offset.setFromSpherical(spherical);
  controls.target.copy(view.target);
  camera.position.copy(view.target).add(offset);
  camera.lookAt(controls.target);
}
function flyTo(partial, duration = 700) {
  const from = currentView();
  const to = {
    target: partial.target ? partial.target.clone() : from.target,
    radius: Math.min(controls.maxDistance, Math.max(controls.minDistance, partial.radius ?? from.radius)),
    polar: Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, partial.polar ?? from.polar)),
    azimuth: partial.azimuth ?? from.azimuth,
  };
  lodGuardUntil = performance.now() + (reducedMotion ? 80 : duration + 200);
  if (reducedMotion || duration === 0) { applyView(to); flight = null; return Promise.resolve(); }
  return new Promise((resolve) => { flight = { from, to, start: performance.now(), duration, resolve }; });
}
function stepFlight(now) {
  if (!flight) return;
  const t = Math.min(1, (now - flight.start) / flight.duration);
  const e = 1 - (1 - t) ** 3;
  const { from, to } = flight;
  applyView({
    target: from.target.clone().lerp(to.target, e),
    radius: from.radius + (to.radius - from.radius) * e,
    polar: from.polar + (to.polar - from.polar) * e,
    azimuth: from.azimuth + (to.azimuth - from.azimuth) * e,
  });
  if (t >= 1) { const r = flight.resolve; flight = null; r?.(); }
}

function disposeObj(root) {
  root.traverse((o) => {
    if (o.isCSS2DObject && o.element?.parentNode) o.element.remove();
    o.geometry?.dispose?.();
    for (const m of [].concat(o.material || [])) m?.dispose?.();
  });
}
function clearRegionOverlay() {
  if (!regionOverlay) return;
  scene.remove(regionOverlay); disposeObj(regionOverlay); regionOverlay = null;
}
function clearDistrict() {
  districtLight.intensity = 0;
  activeDistrict = null;
  if (!districtRoot) return;
  scene.remove(districtRoot); disposeObj(districtRoot); districtRoot = null;
}
function clearCity() {
  clearDistrict();
  creatureSystems = [];
  districtLabels = [];
  cityLight.intensity = 0;
  lastCityView = null;
  if (!cityRoot) return;
  scene.remove(cityRoot); disposeObj(cityRoot); cityRoot = null; activeCity = null;
}

function normalizeEstates(conf) {
  const raw = conf.estates || [];
  return raw.map((e, i) => ({
    id: e.id || `estate-${i}`,
    name: e.name || `宅邸${i + 1}`,
    role: e.role || "领主",
    style: e.style || conf.archStyle || "palladio",
    kind: e.kind || "palace",
    angle: e.angle ?? ((i / Math.max(1, raw.length)) * Math.PI * 2),
    r: e.r ?? 0.3,
    blurb: e.blurb || "",
  }));
}

function normalizeDistricts(conf) {
  const raw = conf.districts || [];
  return raw.map((d, i) => (typeof d === "string"
    ? { id: `d${i}`, name: d, angle: (i / Math.max(1, raw.length)) * Math.PI * 2 + 0.2, r: 0.12 + (i % 3) * 0.08, kind: "block", blurb: d }
    : {
      id: d.id || `d${i}`,
      name: d.name || d.id || `地点${i + 1}`,
      angle: d.angle ?? ((i / Math.max(1, raw.length)) * Math.PI * 2),
      r: d.r ?? 0.25,
      kind: d.kind || "block",
      blurb: d.blurb || "",
    }));
}
function districtLocal(conf, district) {
  const a = district.angle ?? 0;
  const r = (conf.scale || 64) * (district.r ?? 0.25);
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function regionFrame(region) {
  let { minX, minY, maxX, maxY } = region.bounds;
  for (const id of region.siteIds) {
    const s = sitesById.get(id); if (!s) continue;
    minX = Math.min(minX, s.x - 36); maxX = Math.max(maxX, s.x + 36);
    minY = Math.min(minY, s.y - 36); maxY = Math.max(maxY, s.y + 36);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const p = fromSvg(cx, cy);
  const target = toWorld(p.x, p.y);
  target.y = heightAt(p.x, p.y, heightField) + 8;
  const span = Math.max(maxX - minX, maxY - minY, 80);
  return {
    target,
    radius: Math.min(980, Math.max(280, (span / SVG_W) * MAP_W * 1.35)),
    polar: TILT.oblique,
    bounds: { minX, minY, maxX, maxY },
  };
}

async function showRegionOverlay(region) {
  clearRegionOverlay();
  const { bounds } = regionFrame(region);
  const p0 = fromSvg(bounds.minX, bounds.minY);
  const p1 = fromSvg(bounds.maxX, bounds.maxY);
  const w = Math.abs(p1.x - p0.x), d = Math.abs(p1.y - p0.y);
  const cx = (p0.x + p1.x) / 2, cz = (p0.y + p1.y) / 2;
  const y = heightAt(cx, cz, heightField) + 1.6;
  const url = new URL(region.basemap, new URL("../regions.json", import.meta.url)).href;
  const tex = await loadTex(url);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84, metalness: 0.04, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  mesh.position.set(cx - MAP_W / 2, y, cz - MAP_H / 2);
  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.03, d * 1.03).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  rim.position.copy(mesh.position); rim.position.y -= 0.5;
  regionOverlay = new THREE.Group();
  regionOverlay.add(rim, mesh);
  scene.add(regionOverlay);
}

function addCreatureFlock(group, kind, count, span, yBias = 0) {
  const geo = kind === "ships" ? new THREE.ConeGeometry(0.45, 2.1, 4)
    : kind === "carts" ? new THREE.BoxGeometry(0.9, 0.45, 0.55)
      : kind === "patrols" ? new THREE.CapsuleGeometry(0.18, 0.55, 3, 6)
        : kind === "banners" ? new THREE.PlaneGeometry(0.55, 1.1)
          : kind === "glowfish" ? new THREE.SphereGeometry(0.32, 8, 8)
            : new THREE.SphereGeometry(0.22, 6, 6);
  const palette = {
    birds: 0xe8f0ff, ships: 0xc4a46a, glowfish: 0x5ef0ff, carts: 0xb08950,
    patrols: 0xd0d4c8, sparks: 0xff9a4a, fireflies: 0xb8ff7a, snow: 0xe8fbff,
    mist: 0xa0c4d0, banners: 0x8b6bb0, lanterns: 0xffe2a0, rails: 0xb87333, smoke: 0x9aa3a8,
  };
  const color = palette[kind] || 0xffffff;
  const glow = ["glowfish", "sparks", "fireflies", "lanterns"].includes(kind);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.9 : 0,
    roughness: 0.45, metalness: 0.12, side: kind === "banners" ? THREE.DoubleSide : THREE.FrontSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = span * (0.12 + 0.48 * Math.random());
    const ground = ["ships", "carts", "patrols", "rails"].includes(kind);
    const seed = {
      a, r,
      h: yBias + (ground ? 1.4 + Math.random() * 1.2 : 3 + Math.random() * 16),
      speed: 0.25 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    };
    seeds.push(seed);
    dummy.position.set(Math.cos(a) * r, seed.h, Math.sin(a) * r);
    dummy.scale.setScalar(kind === "ships" ? 1.35 : kind === "patrols" ? 1.1 : 0.9);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  creatureSystems.push({ mesh, seeds, kind });
}

function makeFacadeTexture(wallHex, accentHex, seed) {
  const rng = mulberry32(seed >>> 0);
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 256, 256);
  // stone banding
  for (let y = 0; y < 256; y += 8 + Math.floor(rng() * 6)) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.04})`;
    ctx.fillRect(0, y, 256, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.12})`;
    ctx.fillRect(0, y + 1, 256, 2 + rng() * 2);
  }
  for (let i = 0; i < 420; i += 1) {
    const g = Math.floor(8 + rng() * 36);
    ctx.fillStyle = `rgba(${g},${g},${g + 8},${0.05 + rng() * 0.1})`;
    ctx.fillRect(rng() * 256, rng() * 256, 2 + rng() * 14, 1 + rng() * 4);
  }
  // arched gothic windows with emissive-looking glow
  const cols = 3 + Math.floor(rng() * 2);
  const rows = 4 + Math.floor(rng() * 3);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = rng() > 0.22;
      const wx = 28 + x * (200 / cols);
      const wy = 24 + y * (200 / rows);
      const ww = 14 + rng() * 6;
      const wh = 18 + rng() * 10;
      ctx.fillStyle = "#05060a";
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 6);
      if (lit) {
        const grd = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        grd.addColorStop(0, accentHex);
        grd.addColorStop(1, "#1a1028");
        ctx.fillStyle = grd;
        ctx.globalAlpha = 0.85 + rng() * 0.15;
      } else {
        ctx.fillStyle = "#0b0d14";
        ctx.globalAlpha = 0.9;
      }
      ctx.fillRect(wx, wy, ww, wh);
      ctx.beginPath();
      ctx.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function addColumns(g, mat, count, radius, height, y0 = 0) {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, height, 8), mat);
    col.position.set(Math.cos(a) * radius, y0 + height / 2, Math.sin(a) * radius);
    g.add(col);
  }
}

function addPediment(g, mat, width, depth, y) {
  const ped = new THREE.Mesh(new THREE.ConeGeometry(width * 0.55, 2.2, 3), mat);
  ped.rotation.y = Math.PI / 6;
  ped.position.set(0, y, depth * 0.35);
  g.add(ped);
}

function buildPalladioPalace(g, wallMat, roofMat, accentMat, rng, windowMat) {
  // Palladio Book II: temple front, piano nobile, wings, optional rotunda
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 12), wallMat);
  plinth.position.y = 0.6; g.add(plinth);
  const piano = new THREE.Mesh(new THREE.BoxGeometry(12, 6.5, 9), wallMat);
  piano.position.y = 4.5; g.add(piano);
  if (windowMat) {
    const pw = 12, ph = 6.5, pd = 9, py = 4.5, bandH = ph * 0.24, off = 0.05, wd = 0.08;
    for (const [x, y, z, rw, rh, rd] of [
      [0, py, pd / 2 + off, pw, bandH, wd], [0, py, -pd / 2 - off, pw, bandH, wd],
      [pw / 2 + off, py, 0, wd, bandH, pd], [-pw / 2 - off, py, 0, wd, bandH, pd],
    ]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), windowMat);
      win.position.set(x, y, z); g.add(win);
    }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.5, 0.28, pd + 0.5), accentMat);
    cornice.position.set(0, py + ph / 2 + 0.14, 0); g.add(cornice);
  }
  // portico columns (temple front)
  for (let i = 0; i < 6; i += 1) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 6.2, 10), wallMat);
    col.position.set(-5 + i * 2, 4.3, 5.2); g.add(col);
  }
  const entablature = new THREE.Mesh(new THREE.BoxGeometry(13, 0.7, 2.2), roofMat);
  entablature.position.set(0, 7.7, 5.0); g.add(entablature);
  addPediment(g, roofMat, 12, 8, 9.2);
  // side wings
  for (const sx of [-9.5, 9.5]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 4.2, 7), wallMat);
    wing.position.set(sx, 3.3, 0); g.add(wing);
    const wr = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.45, 7.4), roofMat);
    wr.position.set(sx, 5.6, 0); g.add(wr);
  }
  // Villa Rotonda-style central dome
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 2.2, 16), wallMat);
  drum.position.y = 8.8; g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), roofMat);
  dome.position.y = 10.6; g.add(dome);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), accentMat);
  lantern.position.y = 13.2; g.add(lantern);
  // statue / finial
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 5), accentMat);
  finial.position.y = 14.2; g.add(finial);
}

function buildBaroquePalace(g, wallMat, roofMat, accentMat, rng, windowMat) {
  // Baroque: dramatic dome, twin towers, curved volutes, deep cornice
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 11), wallMat);
  base.position.y = 1; g.add(base);
  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 8.5), wallMat);
  body.position.y = 6; g.add(body);
  if (windowMat) {
    const bw = 11, bh = 8, bd = 8.5, by = 6, bandH = bh * 0.22, off = 0.05, wd = 0.08;
    for (const [x, y, z, rw, rh, rd] of [
      [0, by, bd / 2 + off, bw, bandH, wd], [0, by, -bd / 2 - off, bw, bandH, wd],
      [bw / 2 + off, by, 0, wd, bandH, bd], [-bw / 2 - off, by, 0, wd, bandH, bd],
    ]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), windowMat);
      win.position.set(x, y, z); g.add(win);
    }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.6, 0.32, bd + 0.6), accentMat);
    cornice.position.set(0, by + bh / 2 + 0.16, 0); g.add(cornice);
  }
  // curved facade bulge (simplified as half-cylinder)
  const bulge = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 8, 16, 1, false, 0, Math.PI), wallMat);
  bulge.rotation.y = Math.PI / 2; bulge.position.set(0, 6, 4.2); g.add(bulge);
  // twin towers
  for (const sx of [-6.5, 6.5]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 14, 2.6), wallMat);
    tower.position.set(sx, 8, -2); g.add(tower);
    const cupola = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), roofMat);
    cupola.position.set(sx, 16, -2); g.add(cupola);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 6), accentMat);
    tip.position.set(sx, 17.6, -2); g.add(tip);
  }
  // central dome on drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 3, 18), wallMat);
  drum.position.y = 11.5; g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.0, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), roofMat);
  dome.position.y = 14.2; g.add(dome);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 10), accentMat);
  lantern.position.y = 17.8; g.add(lantern);
  // volute scrolls (torus quarters as ornament)
  for (const sx of [-4, 4]) {
    const volute = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.28, 8, 16, Math.PI), accentMat);
    volute.position.set(sx, 10.5, 5.2); volute.rotation.z = sx > 0 ? -0.4 : 0.4; g.add(volute);
  }
}

function buildRococoPalace(g, wallMat, roofMat, accentMat, rng, windowMat) {
  // Rococo: lighter pavilion, shell curves, soft dome, ornamental urns
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9, 0.8, 20), wallMat);
  terrace.position.y = 0.4; g.add(terrace);
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 7), wallMat);
  pavilion.position.y = 3.5; g.add(pavilion);
  if (windowMat) {
    const pw = 9, ph = 5.5, pd = 7, py = 3.5, bandH = ph * 0.26, off = 0.05, wd = 0.08;
    for (const [x, y, z, rw, rh, rd] of [
      [0, py, pd / 2 + off, pw, bandH, wd], [0, py, -pd / 2 - off, pw, bandH, wd],
      [pw / 2 + off, py, 0, wd, bandH, pd], [-pw / 2 - off, py, 0, wd, bandH, pd],
    ]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), windowMat);
      win.position.set(x, y, z); g.add(win);
    }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.5, 0.26, pd + 0.5), accentMat);
    cornice.position.set(0, py + ph / 2 + 0.13, 0); g.add(cornice);
  }
  // bay windows / bowed fronts
  for (const sx of [-3.2, 3.2]) {
    const bay = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5.2, 12, 1, false, 0, Math.PI), wallMat);
    bay.position.set(sx, 3.4, 3.4); bay.rotation.y = sx > 0 ? -0.3 : 0.3; g.add(bay);
  }
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 7.8), roofMat);
  cornice.position.y = 6.4; g.add(cornice);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: roofMat.color, roughness: 0.35, metalness: 0.25, emissive: accentMat.color, emissiveIntensity: 0.15 }),
  );
  dome.position.y = 8.2; g.add(dome);
  // shell ornaments
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), accentMat);
    shell.position.set(Math.cos(a) * 4.5, 6.8, Math.sin(a) * 3.2);
    shell.rotation.x = -Math.PI / 2; g.add(shell);
  }
  // urn finials
  for (const sx of [-4.5, 4.5]) {
    const urn = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), accentMat);
    urn.position.set(sx, 7.2, -3); g.add(urn);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8), roofMat);
    neck.position.set(sx, 7.9, -3); g.add(neck);
  }
}

function buildGothicPalace(g, wallMat, roofMat, accentMat, rng, windowMat) {
  // Gothic: nave, pointed spires, flying-buttress struts, rose window
  const nave = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 18), wallMat);
  nave.position.y = 7; g.add(nave);
  if (windowMat) {
    const nw = 8, nh = 14, nd = 18, ny = 7, bandH = nh * 0.82, bandW = nw * 0.22, off = 0.05, wd = 0.08;
    for (const [x, y, z, rw, rh, rd] of [
      [0, ny, nd / 2 + off, nw * 0.75, bandH, wd],
      [0, ny, -nd / 2 - off, nw * 0.75, bandH, wd],
      [nw / 2 + off, ny, 0, wd, bandH, nd * 0.55],
      [-nw / 2 - off, ny, 0, wd, bandH, nd * 0.55],
    ]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), windowMat);
      win.position.set(x, y, z); g.add(win);
    }
    for (const sx of [-2.8, 2.8]) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(bandW, bandH, wd), windowMat);
      slit.position.set(sx, ny, nd / 2 + off); g.add(slit);
    }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(nw + 0.6, 0.3, nd + 0.6), accentMat);
    cornice.position.set(0, ny + nh / 2 + 0.15, 0); g.add(cornice);
  }
  const clerestory = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4, 16), wallMat);
  clerestory.position.y = 15; g.add(clerestory);
  // rose window disc
  const rose = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), accentMat);
  rose.position.set(0, 11, 9.2); g.add(rose);
  const roseRim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.15, 8, 28), roofMat);
  roseRim.position.copy(rose.position); g.add(roseRim);
  // twin west towers + central spire
  for (const sx of [-5.5, 5.5]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 20, 3.2), wallMat);
    tower.position.set(sx, 10, 7); g.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.0, 10, 5), roofMat);
    spire.position.set(sx, 25, 7); g.add(spire);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), accentMat);
    tip.position.set(sx, 31, 7); g.add(tip);
  }
  const crossing = new THREE.Mesh(new THREE.ConeGeometry(3.5, 16, 6), roofMat);
  crossing.position.set(0, 24, 0); g.add(crossing);
  // flying buttress struts
  for (let i = 0; i < 6; i += 1) {
    const z = -7 + i * 2.8;
    for (const sx of [-1, 1]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8, 1.1), wallMat);
      pier.position.set(sx * 7.5, 4, z); g.add(pier);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.55, 0.55), roofMat);
      strut.position.set(sx * 5.5, 9, z);
      strut.rotation.z = sx * -0.55; g.add(strut);
    }
  }
  // pinnacles
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.2, 4), accentMat);
    pin.position.set(Math.cos(a) * 5, 17.5, Math.sin(a) * 8); g.add(pin);
  }
}

function addLandmark(kind, palette, rng, style = "palladio") {
  const wall = hexColor(palette.wall);
  const roof = hexColor(palette.roof);
  const accent = hexColor(palette.accent);
  const g = new THREE.Group();
  const arch = style || "palladio";
  let wallMat = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.55, metalness: 0.12 });
  let roofMat = new THREE.MeshStandardMaterial({ color: roof, roughness: 0.48, metalness: 0.18 });
  let accentMat = new THREE.MeshStandardMaterial({
    color: accent, emissive: accent, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.35,
  });
  let windowMat = null;

  if (kind === "palace" || kind === "fort") {
    ({ wallMat, roofMat, accentMat, windowMat } = estateMaterials(arch, palette));
    if (arch === "gothic") buildGothicPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else if (arch === "baroque") buildBaroquePalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else if (arch === "rococo") buildRococoPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else buildPalladioPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    if (kind === "fort") {
      // fortification skirt
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const bastion = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 5, 6), wallMat);
        bastion.position.set(Math.cos(a) * 10, 2.5, Math.sin(a) * 10); g.add(bastion);
      }
    }
  } else if (kind === "towers" || kind === "gate") {
    if (arch === "gothic") {
      for (let i = 0; i < 5; i += 1) {
        const h = 16 + rng() * 14;
        const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, h, 2.2), i % 2 ? accentMat : wallMat);
        t.position.set((rng() - 0.5) * 10, h / 2, (rng() - 0.5) * 10); g.add(t);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 4), roofMat);
        tip.position.copy(t.position); tip.position.y = h + 2.2; g.add(tip);
      }
    } else {
      for (let i = 0; i < 7; i += 1) {
        const h = 14 + rng() * 22;
        const r0 = 0.7 + rng() * 0.55;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.55, r0, h, 8), i % 2 ? accentMat : wallMat);
        t.position.set((rng() - 0.5) * 10, h / 2, (rng() - 0.5) * 10); g.add(t);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 * 1.15, 0.12, 6, 16), accentMat);
        ring.rotation.x = Math.PI / 2; ring.position.copy(t.position); ring.position.y = h * 0.72; g.add(ring);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(r0 * 0.9, 2.4, 6), roofMat);
        tip.position.copy(t.position); tip.position.y = h + 1.1; g.add(tip);
      }
    }
  } else if (kind === "harbor" || kind === "pens" || kind === "wrecks") {
    const quay = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 10), new THREE.MeshStandardMaterial({ color: roof, roughness: 0.82 }));
    quay.position.set(0, 0.5, 2); g.add(quay);
    for (let i = 0; i < 5; i += 1) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(11, 0.45, 1.3), wallMat);
      pier.position.set((rng() - 0.5) * 3, 0.85, -5 + i * 2.3); g.add(pier);
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.8, 4, 8), new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.55, metalness: 0.2 }));
      hull.rotation.z = Math.PI / 2; hull.position.set((rng() - 0.5) * 2.5, 1.35, -5 + i * 2.3); g.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 5), wallMat);
      mast.position.set(hull.position.x, 3.1, hull.position.z); g.add(mast);
    }
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.5, 0.35), accentMat);
    crane.position.set(5.5, 3.2, 1); g.add(crane);
  } else if (kind === "barracks") {
    for (let i = 0; i < 8; i += 1) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 4), roofMat);
      tent.position.set((i % 4) * 3.4 - 5.1, 1.2, Math.floor(i / 4) * 4.2 - 2.1); g.add(tent);
    }
    const yard = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.95 }));
    yard.position.y = 0.12; g.add(yard);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 6), wallMat);
    pole.position.set(0, 3, 0); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), accentMat);
    flag.position.set(1.2, 5.2, 0); g.add(flag);
  } else if (kind === "market" || kind === "warehouse") {
    for (let i = 0; i < 12; i += 1) {
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(1.8 + rng() * 1.2, 1.4 + rng() * 1.6, 1.6 + rng()),
        new THREE.MeshStandardMaterial({ color: i % 2 ? wall : roof, roughness: 0.7 }),
      );
      stall.position.set((i % 4) * 2.6 - 3.9, stall.geometry.parameters.height / 2, Math.floor(i / 4) * 2.8 - 2.8);
      g.add(stall);
    }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 3), accentMat);
    awning.position.set(0, 2.4, 0); g.add(awning);
  } else if (kind === "factory" || kind === "rail") {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 22, 10), new THREE.MeshStandardMaterial({ color: wall, emissive: accent, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.45 }));
    stack.position.y = 11; g.add(stack);
    for (let i = 0; i < 4; i += 1) {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 4.5), new THREE.MeshStandardMaterial({ color: roof, metalness: 0.45, roughness: 0.4 }));
      hall.position.set((i % 2) * 6 - 3, 2.2, Math.floor(i / 2) * 5.5 - 2.5); g.add(hall);
    }
  } else if (kind === "dome" || kind === "lake" || kind === "abyss" || kind === "ring") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4, transparent: true, opacity: 0.5, roughness: 0.15, metalness: 0.55 }),
    );
    dome.position.y = 1.4; g.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.25, 8, 40), wallMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.3; g.add(rim);
  } else if (kind === "bridge" || kind === "road") {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 3.6), wallMat);
    deck.position.y = 2.2; g.add(deck);
    for (const sx of [-7, 7]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.8, 11, 2.8), roofMat);
      tower.position.set(sx, 5.5, 0); g.add(tower);
    }
  } else {
    // default: small pavilion in city style
    ({ wallMat, roofMat, accentMat, windowMat } = estateMaterials(arch, palette));
    if (arch === "gothic") buildGothicPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else if (arch === "baroque") buildBaroquePalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else if (arch === "rococo") buildRococoPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    else buildPalladioPalace(g, wallMat, roofMat, accentMat, rng, windowMat);
    g.scale.setScalar(0.55);
  }
  return g;
}

function buildDenseBlock(group, conf, center, radius, count, seedKey, tall = false) {
  const rng = mulberry32(hashStr(seedKey));
  const wallHex = conf.palette.wall;
  const roofHex = conf.palette.roof;
  const accentHex = conf.palette.accent;
  // ponytail: shared canvas facades — ceiling is one look per seedKey; upgrade = per-instance atlas
  const facadeA = makeFacadeTexture(wallHex, accentHex, hashStr(seedKey));
  const facadeB = makeFacadeTexture(wallHex, accentHex, hashStr(`${seedKey}-b`));
  facadeA.repeat.set(1, 2); facadeB.repeat.set(1, 2);
  // NEVER multiply facade by dark wall hex — that turns windows into mud
  const wallMat = new THREE.MeshStandardMaterial({
    map: facadeA, color: 0xffffff, roughness: 0.52, metalness: 0.12,
    emissive: hexColor(accentHex), emissiveIntensity: 0.12, emissiveMap: facadeA,
  });
  const wallMatB = new THREE.MeshStandardMaterial({
    map: facadeB, color: 0xffffff, roughness: 0.55, metalness: 0.1,
    emissive: hexColor(accentHex), emissiveIntensity: 0.1, emissiveMap: facadeB,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: hexColor(roofHex), roughness: 0.48, metalness: 0.16 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: hexColor(accentHex), emissive: hexColor(accentHex), emissiveIntensity: 0.55, roughness: 0.32, metalness: 0.3,
  });

  // city overview keeps aerial readable; district (tall) can pack denser
  const budget = Math.max(20, Math.round(count * (tall ? 0.9 : 0.28)));
  const nBox = Math.floor(budget * 0.55);
  const nTower = Math.floor(budget * 0.28);
  const nWide = Math.max(4, budget - nBox - nTower);
  const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, nBox);
  const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.82, 1.35, 4), roofMat, nBox);
  const towers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 1, 8), wallMatB, nTower);
  const towerCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1.8, 6), accentMat, nTower);
  const wides = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMatB, nWide);
  const wideRoofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.28, 1), roofMat, nWide);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 6), accentMat, Math.ceil(budget * 0.55));
  const dummy = new THREE.Object3D();
  let lampI = 0;

  function placeLamp(x, z, y) {
    if (lampI >= lamps.count) return;
    dummy.position.set(x, y, z); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    lamps.setMatrixAt(lampI, dummy.matrix); lampI += 1;
  }

  for (let i = 0; i < nBox; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.18 + rng() * 0.72);
    // keep street corridors near radial axes a bit clearer
    const corridor = Math.abs(Math.sin(a * 4)) < 0.22 ? 0.28 : 1;
    const rr = r * (0.88 + 0.12 * corridor);
    const bw = 1.05 + rng() * 1.8, bd = 1.05 + rng() * 1.7, bh = 2.8 + rng() * (tall ? 14 : 6.5);
    const x = center.x + Math.cos(a) * rr, z = center.z + Math.sin(a) * rr;
    dummy.position.set(x, 1.2 + bh / 2, z); dummy.scale.set(bw, bh, bd); dummy.rotation.set(0, a + rng() * 0.35, 0); dummy.updateMatrix();
    boxes.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.2 + bh + 0.55; dummy.scale.set(bw * 0.72, 1.35, bd * 0.72); dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    if (rng() > 0.45) placeLamp(x + (rng() - 0.5) * bw, z + (rng() - 0.5) * bd, 2.4 + rng() * bh * 0.5);
  }
  for (let i = 0; i < nTower; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.22 + rng() * 0.65);
    const h = 9 + rng() * (tall ? 22 : 11);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    dummy.position.set(x, 1.2 + h / 2, z); dummy.scale.set(1.15 + rng() * 0.7, h, 1.15 + rng() * 0.7); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    towers.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.2 + h + 0.85; dummy.scale.setScalar(1.35); dummy.updateMatrix();
    towerCaps.setMatrixAt(i, dummy.matrix);
    placeLamp(x, z, 1.2 + h * 0.85);
  }
  for (let i = 0; i < nWide; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.28 + rng() * 0.58);
    const bw = 2.2 + rng() * 3.0, bd = 1.8 + rng() * 2.4, bh = 1.6 + rng() * 2.8;
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    dummy.position.set(x, 1.2 + bh / 2, z); dummy.scale.set(bw, bh, bd); dummy.rotation.set(0, a, 0); dummy.updateMatrix();
    wides.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.2 + bh + 0.18; dummy.scale.set(bw * 1.02, 1, bd * 1.02); dummy.updateMatrix();
    wideRoofs.setMatrixAt(i, dummy.matrix);
  }

  boxes.instanceMatrix.needsUpdate = true; roofs.instanceMatrix.needsUpdate = true;
  towers.instanceMatrix.needsUpdate = true; towerCaps.instanceMatrix.needsUpdate = true;
  wides.instanceMatrix.needsUpdate = true; wideRoofs.instanceMatrix.needsUpdate = true;
  lamps.count = lampI; lamps.instanceMatrix.needsUpdate = true;
  group.add(boxes, roofs, towers, towerCaps, wides, wideRoofs, lamps);

  const trees = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.75, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.green || "#5a7a48"), roughness: 0.85 }),
    Math.max(6, Math.ceil(budget * 0.22)),
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.9, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3422, roughness: 0.9 }),
    trees.count,
  );
  for (let i = 0; i < trees.count; i += 1) {
    const a = rng() * Math.PI * 2, r = radius * (0.58 + rng() * 0.38);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    dummy.position.set(x, 0.55, z); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 2.2, z); dummy.scale.setScalar(0.85 + rng() * 1.2); dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true; trees.instanceMatrix.needsUpdate = true;
  group.add(trunks, trees);
}

function buildRoads(group, scale, palette) {
  // thin emissive veins — don't bury the aerial under opaque asphalt
  const roadMat = new THREE.MeshBasicMaterial({
    color: hexColor(palette.accent || "#8b6bb0"), transparent: true, opacity: 0.28, depthWrite: false,
  });
  const curbMat = new THREE.MeshStandardMaterial({ color: hexColor(palette.wall), roughness: 0.8 });
  for (let ring = 1; ring <= 3; ring += 1) {
    const road = new THREE.Mesh(new THREE.TorusGeometry(scale * (0.12 * ring), 0.28, 6, 72), roadMat);
    road.rotation.x = Math.PI / 2; road.position.y = 1.18; group.add(road);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.42, 0.08, 0.55), roadMat);
    strip.position.set(Math.cos(a) * scale * 0.22, 1.16, Math.sin(a) * scale * 0.22);
    strip.rotation.y = -a; group.add(strip);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({
      color: hexColor(palette.accent), emissive: hexColor(palette.accent), emissiveIntensity: 0.85, roughness: 0.28,
    }));
    lamp.position.set(Math.cos(a) * scale * 0.36, 3.2, Math.sin(a) * scale * 0.36); group.add(lamp);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 5), curbMat);
    pole.position.set(lamp.position.x, 1.7, lamp.position.z); group.add(pole);
  }
}

function applyAerialMap(mat, tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  mat.map = tex;
  mat.color.set(0xffffff);
  mat.needsUpdate = true;
}

function cityAerialUrl(siteId) {
  return new URL(`../assets/cities/${siteId}.webp`, import.meta.url).href;
}

function districtAerialUrl(siteId, districtId) {
  return new URL(`../assets/cities/districts/${siteId}--${districtId}.webp`, import.meta.url).href;
}

function buildCityDetail(site, conf) {
  clearCity();
  const p = fromSvg(site.x, site.y);
  const baseY = heightAt(p.x, p.y, heightField);
  const origin = toWorld(p.x, p.y); origin.y = baseY;
  const group = new THREE.Group(); group.position.copy(origin);
  const scale = conf.scale || 64;
  const rng = mulberry32(hashStr(site.id));
  const districts = normalizeDistricts(conf);

  // void so continent mud never frames the plate
  const voidPad = new THREE.Mesh(
    new THREE.CircleGeometry(scale * 1.35, 72),
    new THREE.MeshBasicMaterial({ color: 0x03050a }),
  );
  voidPad.rotation.x = -Math.PI / 2; voidPad.position.y = 0.2; group.add(voidPad);

  // HERO: atlas city aerial — this IS the town, not a lego forest on top of it
  const plateR = scale * 0.72;
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(plateR, 128),
    new THREE.MeshBasicMaterial({ color: 0x0a0c14 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = 1.08; group.add(ground);
  loadTex(cityAerialUrl(site.id))
    .then((tex) => applyAerialMap(ground.material, tex))
    .catch(() => {});

  // soft pedestal shadow + rim (read as finished art plate)
  const shade = new THREE.Mesh(
    new THREE.CircleGeometry(plateR * 1.06, 72),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  shade.rotation.x = -Math.PI / 2; shade.position.y = 0.95; group.add(shade);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(plateR * 0.97, plateR * 1.08, 96),
    new THREE.MeshBasicMaterial({
      color: hexColor(conf.palette.accent), transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  rim.rotation.x = -Math.PI / 2; rim.position.y = 1.12; group.add(rim);

  // sparse accent veins only — never bury the painting
  const veinMat = new THREE.MeshBasicMaterial({
    color: hexColor(conf.palette.accent), transparent: true, opacity: 0.16, depthWrite: false,
  });
  for (let ring = 1; ring <= 2; ring += 1) {
    const vein = new THREE.Mesh(new THREE.TorusGeometry(plateR * (0.28 * ring), 0.16, 6, 72), veinMat);
    vein.rotation.x = Math.PI / 2; vein.position.y = 1.14; group.add(vein);
  }

  // district pins: tiny landmark + label (click → district art)
  districtLabels = [];
  for (const d of districts) {
    const local = districtLocal(conf, d);
    const landmark = addLandmark(d.kind, conf.palette, rng, conf.archStyle || "palladio");
    landmark.position.copy(local); landmark.position.y = 1.35; landmark.scale.setScalar(0.42); group.add(landmark);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 24),
      new THREE.MeshBasicMaterial({
        color: hexColor(conf.palette.accent), transparent: true, opacity: 0.35, depthWrite: false,
      }),
    );
    pad.rotation.x = -Math.PI / 2; pad.position.set(local.x, 1.2, local.z); group.add(pad);
    const el = document.createElement("button");
    el.type = "button"; el.className = "cj3d-district"; el.textContent = d.name;
    el.addEventListener("click", (e) => { e.stopPropagation(); enterDistrict(d); });
    const lab = new CSS2DObject(el); lab.position.set(local.x, 9, local.z); group.add(lab);
    districtLabels.push({ el, id: d.id, lab });
  }

  // royal / lord estates — named houses with period architecture
  for (const e of normalizeEstates(conf)) {
    const local = districtLocal(conf, e);
    const landmark = addLandmark(e.kind, conf.palette, rng, e.style || conf.archStyle || "palladio");
    landmark.position.copy(local); landmark.position.y = 1.4;
    landmark.scale.setScalar(e.role === "王室" ? 0.72 : 0.58); group.add(landmark);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.5, 36), plazaMat);
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(local.x, 1.24, local.z); group.add(plaza);
    loadTex(estateTexUrl("plaza")).then((tex) => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(2, 2);
      clone.needsUpdate = true;
      plazaMat.map = clone;
      plazaMat.needsUpdate = true;
    });
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.1, 28),
      new THREE.MeshBasicMaterial({
        color: hexColor(conf.palette.accent), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    pad.rotation.x = -Math.PI / 2; pad.position.set(local.x, 1.22, local.z); group.add(pad);
    const el = document.createElement("button");
    el.type = "button"; el.className = `cj3d-district cj3d-estate${e.role === "王室" ? " is-royal" : ""}`;
    el.innerHTML = `<span class="cj3d-estate-role">${e.role}</span>${e.name}`;
    el.title = e.blurb || e.name;
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      // fly closer to the estate within city view
      const world = local.clone().add(origin);
      flyTo({ target: world.clone().add(new THREE.Vector3(0, 6, 0)), radius: Math.max(22, scale * 0.38), polar: 0.72 }, 700);
      hint.textContent = `${e.role} · ${e.name} — ${e.blurb || e.style}`;
    });
    const lab = new CSS2DObject(el); lab.position.set(local.x, 11, local.z); group.add(lab);
    districtLabels.push({ el, id: e.id, lab });
  }

  for (const kind of (conf.creatures || ["birds"]).slice(0, 2)) {
    const n = ["ships", "carts", "patrols", "rails", "banners"].includes(kind) ? 10 : 18;
    addCreatureFlock(group, kind, coarse ? Math.ceil(n * 0.7) : n, scale * 0.4);
  }

  cityLight.position.copy(origin); cityLight.position.y += 40; cityLight.intensity = 1.6;
  cityLight.distance = Math.max(260, scale * 3.6);
  cityLight.color.set(conf.mood?.light || conf.palette.accent);
  scene.add(group); cityRoot = group; activeCity = site.id;
  // more top-down so the atlas painting reads as the town
  lastCityView = { target: origin.clone().add(new THREE.Vector3(0, 4, 0)), radius: Math.max(48, scale * 1.05), polar: 0.58 };
  return lastCityView;
}

function buildDistrictDetail(site, conf, district) {
  clearDistrict();
  const p = fromSvg(site.x, site.y);
  const baseY = heightAt(p.x, p.y, heightField);
  const origin = toWorld(p.x, p.y); origin.y = baseY;
  const local = districtLocal(conf, district);
  const center = origin.clone().add(local); center.y = baseY + 1.2;
  const group = new THREE.Group(); group.position.copy(center);
  const span = Math.max(26, (conf.scale || 64) * 0.34);
  const rng = mulberry32(hashStr(`${site.id}-${district.id}`));

  const voidPad = new THREE.Mesh(
    new THREE.CircleGeometry(span * 1.55, 64),
    new THREE.MeshBasicMaterial({ color: 0x03050a }),
  );
  voidPad.rotation.x = -Math.PI / 2; voidPad.position.y = -0.25; group.add(voidPad);

  // HERO: district aerial art (generated plate) or UV-crop of city atlas art
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(span * 1.05, 96),
    new THREE.MeshBasicMaterial({ color: 0x0a0c14 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.05; group.add(ground);

  const applyCrop = (base) => {
    const tex = base.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const u = 0.5 + Math.cos(district.angle || 0) * (district.r || 0.25) * 0.42;
    const v = 0.5 + Math.sin(district.angle || 0) * (district.r || 0.25) * 0.42;
    const zoom = 0.32;
    tex.offset.set(Math.min(0.68, Math.max(0, u - zoom / 2)), Math.min(0.68, Math.max(0, v - zoom / 2)));
    tex.repeat.set(zoom, zoom);
    applyAerialMap(ground.material, tex);
  };

  loadTex(districtAerialUrl(site.id, district.id))
    .then((tex) => applyAerialMap(ground.material, tex))
    .catch(() => {
      loadTex(cityAerialUrl(site.id)).then(applyCrop).catch(() => {});
    });

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(span * 0.98, span * 1.12, 72),
    new THREE.MeshBasicMaterial({
      color: hexColor(conf.palette.accent), transparent: true, opacity: 0.4,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.1; group.add(rim);

  // one landmark only — don't rebuild a purple Lego district over the painting
  const landmark = addLandmark(district.kind, conf.palette, rng, conf.archStyle || "palladio");
  landmark.position.set(0, 0.2, 0); landmark.scale.setScalar(0.9); group.add(landmark);

  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(span * 0.32, 36), plazaMat);
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.09; group.add(plaza);
  loadTex(estateTexUrl("plaza")).then((tex) => {
    const clone = tex.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(2, 2);
    clone.needsUpdate = true;
    plazaMat.map = clone;
    plazaMat.needsUpdate = true;
  }).catch(() => {});

  // a few street lamps for depth, still sparse
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshStandardMaterial({
        color: hexColor(conf.palette.accent), emissive: hexColor(conf.palette.accent),
        emissiveIntensity: 0.9, roughness: 0.25,
      }),
    );
    lamp.position.set(Math.cos(a) * span * 0.62, 2.8, Math.sin(a) * span * 0.62);
    group.add(lamp);
  }

  for (const kind of (conf.creatures || ["birds"]).slice(0, 2)) {
    addCreatureFlock(group, kind, coarse ? 12 : 20, span * 0.7, 0.5);
  }

  districtLight.position.copy(center); districtLight.position.y += 18; districtLight.intensity = 2.0;
  districtLight.distance = span * 5; districtLight.color.set(conf.palette.accent);
  scene.add(group); districtRoot = group; activeDistrict = district.id;
  for (const item of districtLabels) {
    item.el.classList.toggle("is-active", item.id === district.id);
    item.el.classList.toggle("is-dim", item.id !== district.id);
  }
  return { target: center.clone().add(new THREE.Vector3(0, 3, 0)), radius: Math.max(20, span * 1.15), polar: 0.52 };
}

function rebuildSiteButtons() {
  siteList.innerHTML = "";
  for (const site of sitesById.values()) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.dataset.id = site.id; btn.textContent = site.name;
    btn.addEventListener("click", () => enterCity(site));
    siteList.appendChild(btn);
  }
  siteButtonsBuilt = true;
}

function syncUi() {
  const inDistrict = Boolean(activeDistrict);
  const inCity = Boolean(activeCity);
  const inRegion = Boolean(activeRegion);
  app.classList.toggle("is-region", inRegion && !inCity);
  app.classList.toggle("is-city", inCity && !inDistrict);
  app.classList.toggle("is-district", inDistrict);
  const showBack = inRegion || inCity || inDistrict;
  backLevel.hidden = !showBack;
  backMap.hidden = !showBack;

  if (inDistrict) {
    const site = sitesById.get(activeCity);
    const conf = citiesById.get(activeCity);
    const d = normalizeDistricts(conf || {}).find((x) => x.id === activeDistrict);
    lodChip.textContent = `街区 · ${d?.name || activeDistrict}`;
    siteSectionTitle.textContent = `${site?.name || "城邦"} · 地点`;
    const backText = `← 返回${site?.name || "城邦"}`;
    backLevel.textContent = backText; backMap.textContent = backText;
    hint.textContent = "街区航拍特写 · 缩小或点返回回到城邦";
  } else if (inCity) {
    const site = sitesById.get(activeCity);
    lodChip.textContent = `城邦 · ${site?.name || activeCity}`;
    siteSectionTitle.textContent = `${site?.name || "城邦"} · 地点`;
    const backText = activeRegion ? `← 返回${activeRegion.name}` : "← 返回总览";
    backLevel.textContent = backText; backMap.textContent = backText;
    hint.textContent = "城邦航拍图 · 点地点进街区 · 点王室/领主宅邸近观";
  } else if (inRegion) {
    lodChip.textContent = `地区 · ${activeRegion.name}`;
    siteSectionTitle.textContent = `${activeRegion.name} · 战略点`;
    backLevel.textContent = "← 返回总览"; backMap.textContent = "← 返回总览";
    hint.textContent = "点标记飞入城邦 · 缩小可回到总览";
  } else {
    lodChip.textContent = "总览 · 大陆";
    siteSectionTitle.textContent = "战略点 / 城邦";
    hint.textContent = "点标记飞入城邦 · 缩小或点返回可回到大地图";
  }

  for (const btn of regionList.querySelectorAll("button")) {
    btn.classList.toggle("is-active", inRegion && btn.dataset.id === activeRegion?.id);
  }
  const allow = inRegion || inCity ? new Set(activeRegion?.siteIds || []) : null;
  for (const [id, node] of markers) {
    const hide = inCity || inDistrict || (Boolean(allow) && !allow.has(id));
    node.classList.toggle("is-hidden", hide);
    node.classList.toggle("is-dim", false);
    node.classList.toggle("is-active", id === activeCity);
  }

  const conf = inCity ? citiesById.get(activeCity) : null;
  if (inCity && conf) {
    siteList.innerHTML = ""; siteButtonsBuilt = false;
    for (const d of normalizeDistricts(conf)) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.dataset.districtId = d.id;
      btn.innerHTML = `${d.name}<span class="cj3d-list-meta">${d.blurb || d.kind}</span>`;
      btn.classList.toggle("is-active", d.id === activeDistrict);
      btn.addEventListener("click", () => enterDistrict(d));
      siteList.appendChild(btn);
    }
  } else {
    if (!siteButtonsBuilt) rebuildSiteButtons();
    for (const btn of siteList.querySelectorAll("button")) {
      btn.hidden = Boolean(allow) && !allow.has(btn.dataset.id);
      btn.classList.toggle("is-active", btn.dataset.id === activeCity);
    }
  }

  const overview = !inRegion && !inCity && !inDistrict;
  scene.fog.density = inDistrict ? 0.0022 : inCity ? 0.00135 : inRegion ? 0.00055 : 0.0003;
  if (cloudLayer) cloudLayer.visible = overview;
  if (graticule) graticule.visible = !inCity && !inDistrict;
  if (iceCap) iceCap.visible = graticule ? graticule.visible : false;
  if (!overview) {
    if (eurasiaOverlay) eurasiaOverlay.visible = false;
    if (eurasiaLabel) eurasiaLabel.visible = false;
    const compareBtn = document.getElementById("compare-eurasia");
    if (compareBtn) compareBtn.setAttribute("aria-pressed", "false");
  }
  if (continentMesh) {
    // city/district: hide continent completely — brown blur was the "电子垃圾" skybox
    if (inCity || inDistrict) {
      continentMesh.material.transparent = true;
      continentMesh.material.opacity = 0;
      continentMesh.visible = false;
    } else {
      continentMesh.visible = true;
      continentMesh.material.transparent = inRegion;
      continentMesh.material.opacity = inRegion ? 0.72 : 1;
    }
  }
}

function showSiteCard(site, district) {
  const region = siteRegion.get(site.id);
  const conf = citiesById.get(site.id);
  const districts = conf ? normalizeDistricts(conf) : [];
  const districtBlock = district
    ? `<p class="country">地点 · ${district.name}</p><p>${district.blurb || ""}</p>`
    : districts.length
      ? `<p class="country">可放大地点</p><p>${districts.map((d) => d.name).join(" · ")}</p>`
      : "";
  cardBody.innerHTML = `
    <p class="tag">${site.kind}${region ? ` · ${region.name}` : ""}${district ? " · 街区最大" : ""}</p>
    <h2>${district ? district.name : site.name}</h2>
    <p class="country">${site.country}</p>
    ${districtBlock}
    <p>${site.function}</p>
    <p>${site.history}</p>
    <dl>
      <div><dt>年代</dt><dd>${site.age}</dd></div>
      <div><dt>风格</dt><dd>${site.style}</dd></div>
      <div><dt>战争</dt><dd>${site.wars}</dd></div>
      <div><dt>现状</dt><dd>${site.currentState}</dd></div>
      <div><dt>人物</dt><dd>${site.characters}</dd></div>
      <div><dt>传说</dt><dd>${site.legend}</dd></div>
    </dl>`;
  card.hidden = false;
}

async function enterRegion(region, { fly = true } = {}) {
  activeRegion = region; clearCity();
  await showRegionOverlay(region); syncUi();
  if (fly) await flyTo(regionFrame(region), 900);
  if (narrow()) setPanel(false);
}
async function exitToOverview() {
  clearCity(); clearRegionOverlay(); activeRegion = null; syncUi();
  await flyTo({ target: new THREE.Vector3(0, 20, 0), ...HOME }, 850);
}
async function enterCity(site) {
  const region = siteRegion.get(site.id);
  if (region && activeRegion?.id !== region.id) { activeRegion = region; await showRegionOverlay(region); }
  const conf = citiesById.get(site.id) || {
    scale: 64, buildingCount: 100,
    palette: { wall: "#c4b08a", roof: "#8a6b3a", accent: "#e6c886", road: "#4a4030", green: "#5a7a48" },
    creatures: ["birds"],
    districts: [
      { id: "core", name: "核心区", angle: 0.2, r: 0.12, kind: "palace", blurb: "城邦核心" },
      { id: "outer", name: "外城", angle: 1.8, r: 0.3, kind: "market", blurb: "外城街区" },
      { id: "market", name: "市集", angle: 3.5, r: 0.28, kind: "market", blurb: "市集" },
      { id: "gate", name: "城门", angle: 5.0, r: 0.34, kind: "gate", blurb: "城门要塞" },
    ],
  };
  clearDistrict();
  const view = buildCityDetail(site, conf);
  syncUi(); showSiteCard(site);
  await flyTo(view, 980);
  if (narrow()) setPanel(false);
}
async function enterDistrict(district) {
  if (!activeCity) return;
  const site = sitesById.get(activeCity);
  const conf = citiesById.get(activeCity);
  if (!site || !conf) return;
  const view = buildDistrictDetail(site, conf, district);
  syncUi(); showSiteCard(site, district);
  await flyTo(view, 720);
  if (narrow()) setPanel(false);
}
async function stepBack() {
  card.hidden = true;
  if (activeDistrict) {
    clearDistrict();
    for (const item of districtLabels) item.el.classList.remove("is-active", "is-dim");
    syncUi();
    if (lastCityView) await flyTo(lastCityView, 650);
    return;
  }
  if (activeCity) {
    clearCity(); syncUi();
    if (activeRegion) await flyTo(regionFrame(activeRegion), 700);
    return;
  }
  if (activeRegion) {
    await exitToOverview();
    if (narrow()) setPanel(false);
  }
}
function maybeAutoPopLod() {
  if (flight || performance.now() < lodGuardUntil) return;
  const dist = controls.getDistance();
  if (activeDistrict && dist > 55) { stepBack(); return; }
  if (activeCity && !activeDistrict && dist > Math.max(160, (citiesById.get(activeCity)?.scale || 70) * 2.4)) { stepBack(); return; }
  if (activeRegion && !activeCity && dist > 1400) stepBack();
}

document.getElementById("card-close").addEventListener("click", () => {
  card.hidden = true;
  for (const n of markers.values()) n.classList.remove("is-active");
  for (const b of siteList.querySelectorAll("button")) b.classList.remove("is-active");
});
backLevel.addEventListener("click", () => stepBack());
backMap.addEventListener("click", () => stepBack());
document.getElementById("reset").addEventListener("click", () => { card.hidden = true; exitToOverview(); });
const tiltBtn = document.getElementById("tilt");
tiltBtn.addEventListener("click", () => {
  const pressed = tiltBtn.getAttribute("aria-pressed") === "true";
  tiltBtn.setAttribute("aria-pressed", pressed ? "false" : "true");
  tiltBtn.textContent = pressed ? "俯视" : "斜看";
  flyTo({ polar: pressed ? TILT.top : TILT.oblique }, 500);
});
document.getElementById("zoom-in").addEventListener("click", () => flyTo({ radius: controls.getDistance() * 0.78 }, 260));
document.getElementById("zoom-out").addEventListener("click", async () => {
  await flyTo({ radius: controls.getDistance() * 1.25 }, 260);
  maybeAutoPopLod();
});
controls.addEventListener("end", () => maybeAutoPopLod());

function resize() {
  const w = stage.clientWidth || innerWidth;
  const h = stage.clientHeight || innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
}

function noiseSmoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function bilinearGrid(grid, size, u, v) {
  const x = u * (size - 1);
  const y = v * (size - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const a = grid[y0 * size + x0] * (1 - tx) + grid[y0 * size + x1] * tx;
  const b = grid[y1 * size + x0] * (1 - tx) + grid[y1 * size + x1] * tx;
  return a * (1 - ty) + b * ty;
}

function fractalNoiseGrid(grid, size, u, v, octaves) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += bilinearGrid(grid, size, (u * freq) % 1, (v * freq) % 1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function buildAtmosphereLayers() {
  const noiseRng = mulberry32(0xa7c31e9);
  const gridSize = 128;
  const noiseGrid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < noiseGrid.length; i += 1) noiseGrid[i] = noiseRng();

  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = cloudCanvas.height = 512;
  const cloudCtx = cloudCanvas.getContext("2d");
  const cloudImg = cloudCtx.createImageData(512, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const n = fractalNoiseGrid(noiseGrid, gridSize, x / 512, y / 512, 4);
      const alpha = Math.round(noiseSmoothstep(0.78, 0.93, n) * 255);
      const o = (y * 512 + x) * 4;
      cloudImg.data[o] = 255; cloudImg.data[o + 1] = 255; cloudImg.data[o + 2] = 255;
      cloudImg.data[o + 3] = alpha;
    }
  }
  cloudCtx.putImageData(cloudImg, 0, 0);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
  cloudTex.repeat.set(1.4, 1.1);
  cloudLayer = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W * 1.55, MAP_H * 1.55).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  cloudLayer.position.y = 48;
  scene.add(cloudLayer);

  const gridSpacing = 98.5;
  const gridVerts = [];
  const xMin = -MAP_W * 1.5, xMax = MAP_W * 1.5;
  const zMin = -MAP_H * 1.9, zMax = MAP_H * 1.9;
  for (let x = xMin; x <= xMax; x += gridSpacing) {
    gridVerts.push(x, -0.9, zMin, x, -0.9, zMax);
  }
  for (let z = zMin; z <= zMax; z += gridSpacing) {
    gridVerts.push(xMin, -0.9, z, xMax, -0.9, z);
  }
  graticule = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(gridVerts, 3)),
    new THREE.LineBasicMaterial({ color: 0x7cc4e6, transparent: true, opacity: 0.13 }),
  );
  scene.add(graticule);

  iceCap = new THREE.Group();
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xe8f2fa, roughness: 0.42, metalness: 0.08, transparent: true, opacity: 0.88,
  });
  const floeRng = mulberry32(0x51ce);
  for (let i = 0; i < 28; i += 1) {
    const r = 18 + floeRng() * 46;
    const floe = new THREE.Mesh(new THREE.CircleGeometry(r, 11), iceMat);
    floe.rotation.x = -Math.PI / 2;
    floe.position.set((floeRng() - 0.5) * MAP_W * 1.15, -0.7, -MAP_H / 2 - 30 - floeRng() * 340);
    iceCap.add(floe);
  }
  for (let i = 0; i < 8; i += 1) {
    const r = 12 + floeRng() * 22;
    const floe = new THREE.Mesh(new THREE.CircleGeometry(r, 9), iceMat);
    floe.rotation.x = -Math.PI / 2;
    floe.position.set((floeRng() - 0.5) * MAP_W * 0.7, -0.7, MAP_H / 2 + 40 + floeRng() * 160);
    iceCap.add(floe);
  }
  scene.add(iceCap);

  const eurasiaVerts = [
    [-9, 39], [-8, 43], [-2, 47], [-4, 48], [1, 51], [8, 57], [6, 58], [5, 62], [14, 68], [26, 71],
    [40, 68], [55, 69], [70, 73], [90, 76], [105, 77], [128, 73], [150, 70], [170, 69], [190, 66],
    [180, 62], [163, 60], [160, 52], [156, 51], [142, 54], [140, 48], [132, 43], [129, 35], [126, 34],
    [121, 31], [117, 25], [114, 22], [109, 12], [105, 9], [103, 1], [100, 6], [98, 8], [94, 16],
    [90, 22], [86, 20], [80, 15], [77, 8], [73, 20], [70, 22], [67, 25], [59, 22], [57, 18], [52, 17],
    [45, 13], [43, 12], [39, 21], [35, 28], [32, 30], [36, 36], [30, 36], [26, 38], [22, 37], [18, 40],
    [16, 38], [12, 42], [10, 44], [5, 43], [0, 40], [-2, 37], [-5, 36], [-9, 37],
  ];
  const projectEurasia = (lon, lat) => {
    const xKm = (lon - 90) * 111.32 * Math.cos(lat * Math.PI / 180);
    const zKm = -(lat - 50) * 111.32;
    return { x: xKm / KM_PER_UNIT, z: zKm / KM_PER_UNIT };
  };
  const shape = new THREE.Shape();
  eurasiaVerts.forEach(([lon, lat], i) => {
    const p = projectEurasia(lon, lat);
    if (i === 0) shape.moveTo(p.x, p.z);
    else shape.lineTo(p.x, p.z);
  });
  shape.closePath();
  eurasiaOverlay = new THREE.Group();
  eurasiaOverlay.rotation.x = -Math.PI / 2;
  eurasiaOverlay.position.y = HEIGHT_SCALE + 6;
  eurasiaOverlay.renderOrder = 6;
  eurasiaOverlay.visible = false;
  const eurasiaFill = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: 0xf2d27a, transparent: true, opacity: 0.34, depthTest: false, side: THREE.DoubleSide,
    }),
  );
  eurasiaOverlay.add(eurasiaFill);
  const outlinePts = eurasiaVerts.map(([lon, lat]) => {
    const p = projectEurasia(lon, lat);
    return new THREE.Vector3(p.x, p.z, 0);
  });
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(outlinePts),
    new THREE.LineBasicMaterial({ color: 0xf2d27a, transparent: true, opacity: 0.95, depthTest: false }),
  );
  eurasiaOverlay.add(outline);
  const labelEl = document.createElement("span");
  labelEl.className = "cj3d-compare-label";
  labelEl.textContent = `亚欧大陆 · 同比例 · ${EURASIA_AREA_WAN_KM2.toLocaleString("en-US")} 万 km²`;
  eurasiaLabel = new CSS2DObject(labelEl);
  eurasiaLabel.position.set(0, 4, 0);
  eurasiaLabel.visible = false;
  eurasiaOverlay.add(eurasiaLabel);
  scene.add(eurasiaOverlay);

  const compareBtn = document.getElementById("compare-eurasia");
  if (compareBtn) {
    compareBtn.addEventListener("click", () => {
      const on = !eurasiaOverlay.visible;
      eurasiaOverlay.visible = on;
      eurasiaLabel.visible = on;
      compareBtn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
}

async function boot() {
  const [world, regionsData, citiesData] = await Promise.all([
    fetch(new URL("../world.json", import.meta.url), { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`world ${r.status}`); return r.json(); }),
    fetch(new URL("../regions.json", import.meta.url), { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`regions ${r.status}`); return r.json(); }),
    fetch(new URL("../cities.json", import.meta.url), { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`cities ${r.status}`); return r.json(); }),
  ]);
  const texture = await loadTex(new URL("../assets/basemap.webp", import.meta.url).href);
  heightField = luminanceField(texture.image);
  const hf = heightField;

  const segsX = coarse ? 260 : 420, segsY = coarse ? 146 : 236;
  const geometry = new THREE.PlaneGeometry(MAP_W, MAP_H, segsX, segsY).rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = (pos.getX(i) + MAP_W / 2) / MAP_W;
    const v = (pos.getZ(i) + MAP_H / 2) / MAP_H;
    const edge = Math.min(u, 1 - u, v, 1 - v);
    pos.setY(i, sampleField(hf, u, v) * Math.min(1, edge * 40) - 1.2);
  }
  geometry.computeVertexNormals();

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = hf.cols; bumpCanvas.height = hf.rows;
  const bumpCtx = bumpCanvas.getContext("2d");
  const bumpImg = bumpCtx.createImageData(hf.cols, hf.rows);
  for (let i = 0; i < hf.field.length; i += 1) {
    const g = Math.round(hf.field[i] * 255), o = i * 4;
    bumpImg.data[o] = g; bumpImg.data[o + 1] = g; bumpImg.data[o + 2] = g; bumpImg.data[o + 3] = 255;
  }
  bumpCtx.putImageData(bumpImg, 0, 0);
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = bump.wrapT = THREE.ClampToEdgeWrapping;
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = texture.anisotropy;

  const landMat = new THREE.MeshStandardMaterial({ map: texture, bumpMap: bump, bumpScale: 9, roughness: 0.86, metalness: 0.04 });
  landMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       float cjLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
       if (diffuseColor.b > diffuseColor.r + 0.05 && cjLum < 0.45) discard;
      `,
    );
  };
  continentMesh = new THREE.Mesh(geometry, landMat);
  scene.add(continentMesh);

  for (const site of world.sites) sitesById.set(site.id, site);
  for (const c of citiesData.cities || []) citiesById.set(c.id, c);
  regions = (regionsData.regions || []).map((r) => {
    const b = r.bounds || {};
    return {
      id: r.id, name: r.name, blurb: r.blurb || "", color: r.color,
      siteIds: r.siteIds || [], basemap: r.basemap,
      bounds: { minX: b.minX ?? 0, minY: b.minY ?? 0, maxX: b.maxX ?? SVG_W, maxY: b.maxY ?? 720 },
    };
  });
  for (const region of regions) {
    for (const id of region.siteIds) siteRegion.set(id, region);
    const btn = document.createElement("button");
    btn.type = "button"; btn.dataset.id = region.id;
    btn.innerHTML = `${region.name}<span class="cj3d-list-meta">${region.blurb}</span>`;
    btn.addEventListener("click", () => enterRegion(region, { fly: true }));
    regionList.appendChild(btn);
  }

  rebuildSiteButtons();
  for (const site of world.sites) {
    const p = fromSvg(site.x, site.y);
    const y = heightAt(p.x, p.y, hf);
    const anchor = toWorld(p.x, p.y); anchor.y = y + 6;
    const label = document.createElement("button");
    label.type = "button"; label.className = "cj3d-label";
    label.innerHTML = `<i style="--dot:${KIND_DOT[site.kind] || "#e6c886"}"></i><span>${site.name}</span>`;
    label.addEventListener("click", (e) => { e.stopPropagation(); enterCity(site); });
    markers.set(site.id, label);
    const obj = new CSS2DObject(label); obj.position.copy(anchor); scene.add(obj);
  }

  buildAtmosphereLayers();
  applyView({ target: new THREE.Vector3(0, 20, 0), ...HOME });
  syncUi(); resize();
  loading.classList.add("is-done");
  setTimeout(() => { loading.hidden = true; }, 320);
  addEventListener("resize", resize);

  const dummy = new THREE.Object3D();
  let popClock = 0;
  let scaleClock = 0;
  const scaleBarEl = document.getElementById("scale-bar");
  const KM_STEPS = [200, 500, 1000, 2000, 5000, 10000];
  function frame(now) {
    stepFlight(now);
    if (water.material?.uniforms?.time) water.material.uniforms.time.value = now * 0.001;
    if (cloudLayer?.material?.map) {
      cloudLayer.material.map.offset.x = now * 0.0000045;
      cloudLayer.material.map.offset.y = now * 0.0000018;
    }
    if (scaleBarEl && now - scaleClock > 120) {
      scaleClock = now;
      if (activeCity || activeDistrict) {
        scaleBarEl.hidden = true;
      } else {
        scaleBarEl.hidden = false;
        const sh = stage.clientHeight || innerHeight;
        const dist = camera.position.distanceTo(controls.target);
        const worldPerPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, sh);
        const pxPerUnit = 1 / Math.max(1e-6, worldPerPx);
        let chosen = KM_STEPS[0];
        for (const km of KM_STEPS) {
          if ((km / KM_PER_UNIT) * pxPerUnit <= 180) chosen = km;
          else break;
        }
        const barPx = Math.max(48, (chosen / KM_PER_UNIT) * pxPerUnit);
        const bar = scaleBarEl.querySelector("i");
        const span = scaleBarEl.querySelector("span");
        if (bar) bar.style.width = `${barPx}px`;
        if (span) span.textContent = `${chosen.toLocaleString("en-US")} km`;
      }
    }
    for (const sys of creatureSystems) {
      for (let i = 0; i < sys.seeds.length; i += 1) {
        const s = sys.seeds[i];
        const a = s.a + now * 0.0004 * s.speed + s.phase * 0.01;
        const bob = Math.sin(now * 0.002 * s.speed + s.phase) * (["ships", "carts", "patrols"].includes(sys.kind) ? 0.2 : 1.1);
        dummy.position.set(Math.cos(a) * s.r, s.h + bob, Math.sin(a) * s.r);
        dummy.rotation.set(0, -a + Math.PI / 2, sys.kind === "birds" ? Math.sin(now * 0.01 + s.phase) * 0.4 : 0);
        dummy.scale.setScalar(sys.kind === "ships" ? 1.35 : sys.kind === "patrols" ? 1.1 : 0.9);
        dummy.updateMatrix(); sys.mesh.setMatrixAt(i, dummy.matrix);
      }
      sys.mesh.instanceMatrix.needsUpdate = true;
    }
    if (now - popClock > 320) { popClock = now; maybeAutoPopLod(); }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (!reducedMotion) setTimeout(() => { hint.style.opacity = "0.55"; }, 5000);
}

boot().catch((err) => {
  console.error(err);
  loading.classList.remove("is-done");
  loading.hidden = false;
  loading.textContent = "立体地图加载失败，请刷新重试。";
});
