import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Water } from "three/addons/objects/Water.js";

const MAP_W = 1280;
const MAP_H = 720;
const HEIGHT_SCALE = 118;
const SVG_W = 1100;
const HOME = { radius: 1080, polar: 0.88, azimuth: -0.42 };
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
scene.fog = new THREE.FogExp2(0x07111d, 0.00038);

const camera = new THREE.PerspectiveCamera(44, 1, 1, 16000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = coarse ? 0.1 : 0.075;
controls.screenSpacePanning = false;
controls.minDistance = 12;
controls.maxDistance = 3200;
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
  waterColor: 0x071e33,
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

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
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

function addLandmark(kind, palette, rng) {
  const wall = hexColor(palette.wall);
  const roof = hexColor(palette.roof);
  const accent = hexColor(palette.accent);
  const g = new THREE.Group();
  if (kind === "palace" || kind === "fort") {
    const keep = new THREE.Mesh(new THREE.BoxGeometry(6.5, 10, 6.5), new THREE.MeshStandardMaterial({ color: wall, roughness: 0.62, metalness: 0.08 }));
    keep.position.y = 5; g.add(keep);
    for (let i = 0; i < 4; i += 1) {
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.85, 14 + rng() * 8, 6),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.22, roughness: 0.4, metalness: 0.25 }),
      );
      const ang = (i / 4) * Math.PI * 2;
      spire.position.set(Math.cos(ang) * 3.2, 8, Math.sin(ang) * 3.2);
      g.add(spire);
    }
  } else if (kind === "towers" || kind === "gate") {
    for (let i = 0; i < 5; i += 1) {
      const h = 10 + rng() * 16;
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55 + rng() * 0.4, 0.9, h, 7),
        new THREE.MeshStandardMaterial({ color: i % 2 ? accent : wall, emissive: accent, emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.2 }),
      );
      t.position.set((rng() - 0.5) * 8, h / 2, (rng() - 0.5) * 8);
      g.add(t);
    }
  } else if (kind === "harbor" || kind === "pens" || kind === "wrecks") {
    for (let i = 0; i < 4; i += 1) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 1.4), new THREE.MeshStandardMaterial({ color: roof, roughness: 0.8 }));
      pier.position.set((rng() - 0.5) * 6, 0.8, -4 + i * 2.2); g.add(pier);
      const ship = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0xc4a46a, roughness: 0.55 }));
      ship.rotation.z = Math.PI / 2; ship.position.set((rng() - 0.5) * 4, 1.4, -4 + i * 2.2); g.add(ship);
    }
  } else if (kind === "barracks") {
    for (let i = 0; i < 6; i += 1) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 4), new THREE.MeshStandardMaterial({ color: roof, roughness: 0.7 }));
      tent.position.set((i % 3) * 3.2 - 3.2, 1.1, Math.floor(i / 3) * 3.4 - 1.7); g.add(tent);
    }
  } else if (kind === "market" || kind === "warehouse") {
    for (let i = 0; i < 8; i += 1) {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(1.6 + rng(), 1.2 + rng(), 1.4 + rng()), new THREE.MeshStandardMaterial({ color: i % 2 ? wall : roof, roughness: 0.75 }));
      stall.position.set((i % 4) * 2.4 - 3.6, 0.9, Math.floor(i / 4) * 2.8 - 1.4); g.add(stall);
    }
  } else if (kind === "factory" || kind === "rail") {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 18, 8), new THREE.MeshStandardMaterial({ color: wall, emissive: accent, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.35 }));
    stack.position.y = 9; g.add(stack);
    for (let i = 0; i < 3; i += 1) {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 4), new THREE.MeshStandardMaterial({ color: roof, metalness: 0.4, roughness: 0.45 }));
      hall.position.set((i - 1) * 5, 1.8, 4); g.add(hall);
    }
  } else if (kind === "dome" || kind === "lake" || kind === "abyss" || kind === "ring") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.4 }),
    );
    dome.position.y = 1.2; g.add(dome);
  } else if (kind === "bridge" || kind === "road") {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 3.2), new THREE.MeshStandardMaterial({ color: wall, roughness: 0.7 }));
    deck.position.y = 2; g.add(deck);
    for (const sx of [-6, 6]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 9, 2.4), new THREE.MeshStandardMaterial({ color: roof, roughness: 0.6 }));
      tower.position.set(sx, 4.5, 0); g.add(tower);
    }
  } else {
    const block = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 5), new THREE.MeshStandardMaterial({ color: wall, roughness: 0.65 }));
    block.position.y = 3.5; g.add(block);
  }
  return g;
}

function buildDenseBlock(group, conf, center, radius, count, seedKey, tall = false) {
  const rng = mulberry32(hashStr(seedKey));
  const wallMat = new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.wall), roughness: 0.68, metalness: 0.06 });
  const roofMat = new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.roof), roughness: 0.55, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.accent), emissive: hexColor(conf.palette.accent), emissiveIntensity: 0.2, roughness: 0.4, metalness: 0.22 });
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, count);
  const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 0.75, 4), roofMat, count);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 6), accentMat, Math.ceil(count * 0.35));
  const dummy = new THREE.Object3D();
  let lampI = 0;
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.12 + rng() * 0.82);
    const bw = 1.1 + rng() * 2.8, bd = 1.1 + rng() * 2.6, bh = 2.2 + rng() * (tall ? 14 : 9);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    dummy.position.set(x, 1.15 + bh / 2, z); dummy.scale.set(bw, bh, bd); dummy.rotation.set(0, rng() * Math.PI, 0); dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.15 + bh + 0.28; dummy.scale.set(bw * 0.78, 1.05, bd * 0.78); dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    if (lampI < lamps.count && rng() > 0.55) {
      dummy.position.set(x + (rng() - 0.5) * 1.2, 2.2 + rng() * 3, z + (rng() - 0.5) * 1.2);
      dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      lamps.setMatrixAt(lampI, dummy.matrix); lampI += 1;
    }
  }
  buildings.instanceMatrix.needsUpdate = true; roofs.instanceMatrix.needsUpdate = true;
  lamps.count = lampI; lamps.instanceMatrix.needsUpdate = true;
  group.add(buildings, roofs, lamps);
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.7, 2.2, 5), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.green || "#5a7a48"), roughness: 0.85 }), Math.ceil(count * 0.2));
  for (let i = 0; i < trees.count; i += 1) {
    const a = rng() * Math.PI * 2, r = radius * (0.55 + rng() * 0.4);
    dummy.position.set(center.x + Math.cos(a) * r, 2.1, center.z + Math.sin(a) * r);
    dummy.scale.setScalar(0.8 + rng() * 1.1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }
  trees.instanceMatrix.needsUpdate = true; group.add(trees);
}

function buildRoads(group, scale, palette) {
  const roadMat = new THREE.MeshStandardMaterial({ color: hexColor(palette.road || "#3a3a3a"), roughness: 0.95, metalness: 0.02 });
  for (let ring = 1; ring <= 3; ring += 1) {
    const road = new THREE.Mesh(new THREE.TorusGeometry(scale * 0.12 * ring, 0.55, 5, 64), roadMat);
    road.rotation.x = Math.PI / 2; road.position.y = 1.25; group.add(road);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.42, 0.2, 1.1), roadMat);
    strip.position.set(Math.cos(a) * scale * 0.22, 1.22, Math.sin(a) * scale * 0.22);
    strip.rotation.y = -a; group.add(strip);
  }
}

function buildCityDetail(site, conf) {
  clearCity();
  const p = fromSvg(site.x, site.y);
  const baseY = heightAt(p.x, p.y, heightField);
  const origin = toWorld(p.x, p.y); origin.y = baseY;
  const group = new THREE.Group(); group.position.copy(origin);
  const scale = conf.scale || 64;
  const rng = mulberry32(hashStr(site.id));
  const count = Math.round((conf.buildingCount || 120) * (coarse ? 0.6 : 1));
  const districts = normalizeDistricts(conf);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.56, 72), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.wall), roughness: 0.92, metalness: 0.02 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 1.05; group.add(ground);
  loadTex(new URL(`../assets/cities/${site.id}.webp`, import.meta.url).href)
    .then((tex) => { ground.material.map = tex; ground.material.needsUpdate = true; }).catch(() => {});

  const shade = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.56, 64), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
  shade.rotation.x = -Math.PI / 2; shade.position.y = 1.08; group.add(shade);
  buildRoads(group, scale, conf.palette);

  const wall = new THREE.Mesh(new THREE.TorusGeometry(scale * 0.44, 0.85, 8, 64), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.wall), roughness: 0.72, metalness: 0.1 }));
  wall.rotation.x = Math.PI / 2; wall.position.y = 2.4; group.add(wall);
  const battlement = new THREE.Mesh(new THREE.TorusGeometry(scale * 0.44, 0.35, 6, 64), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.roof), roughness: 0.65, metalness: 0.12 }));
  battlement.rotation.x = Math.PI / 2; battlement.position.y = 3.3; group.add(battlement);

  buildDenseBlock(group, conf, new THREE.Vector3(0, 0, 0), scale * 0.4, count, `${site.id}-city`);

  districtLabels = [];
  for (const d of districts) {
    const local = districtLocal(conf, d);
    const landmark = addLandmark(d.kind, conf.palette, rng);
    landmark.position.copy(local); landmark.position.y = 1.2; group.add(landmark);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(3.8, 24), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.accent), emissive: hexColor(conf.palette.accent), emissiveIntensity: 0.35, transparent: true, opacity: 0.35, roughness: 0.4 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(local.x, 1.2, local.z); group.add(pad);
    const el = document.createElement("button");
    el.type = "button"; el.className = "cj3d-district"; el.textContent = d.name;
    el.addEventListener("click", (e) => { e.stopPropagation(); enterDistrict(d); });
    const lab = new CSS2DObject(el); lab.position.set(local.x, 10, local.z); group.add(lab);
    districtLabels.push({ el, id: d.id, lab });
  }

  for (const kind of conf.creatures || ["birds"]) {
    const n = ["ships", "carts", "patrols", "rails", "banners"].includes(kind) ? 12 : ["snow", "mist", "smoke"].includes(kind) ? 40 : 26;
    addCreatureFlock(group, kind, coarse ? Math.ceil(n * 0.65) : n, scale * 0.45);
  }

  cityLight.position.copy(origin); cityLight.position.y += 30; cityLight.intensity = 1.85;
  cityLight.color.set(conf.mood?.light || conf.palette.accent);
  scene.add(group); cityRoot = group; activeCity = site.id;
  lastCityView = { target: origin.clone().add(new THREE.Vector3(0, 5, 0)), radius: Math.max(48, scale * 1.05), polar: 0.92 };
  return lastCityView;
}

function buildDistrictDetail(site, conf, district) {
  clearDistrict();
  const p = fromSvg(site.x, site.y);
  const baseY = heightAt(p.x, p.y, heightField);
  const origin = toWorld(p.x, p.y); origin.y = baseY;
  const local = districtLocal(conf, district);
  const center = origin.clone().add(local); center.y = baseY + 1.4;
  const group = new THREE.Group(); group.position.copy(center);
  const span = Math.max(18, (conf.scale || 64) * 0.22);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(span, 48), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.road || "#3a3a3a"), roughness: 0.9, metalness: 0.04 }));
  ground.rotation.x = -Math.PI / 2; group.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(span * 0.35, 32), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.accent), emissive: hexColor(conf.palette.accent), emissiveIntensity: 0.15, roughness: 0.55, metalness: 0.12 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.05; group.add(plaza);
  const landmark = addLandmark(district.kind, conf.palette, mulberry32(hashStr(district.id)));
  landmark.position.set(0, 0.1, 0); landmark.scale.setScalar(1.35); group.add(landmark);
  buildDenseBlock(group, conf, new THREE.Vector3(0, 0, 0), span * 0.85, coarse ? 70 : 120, `${site.id}-${district.id}`, true);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    const street = new THREE.Mesh(new THREE.BoxGeometry(span * 0.9, 0.12, 1.6), new THREE.MeshStandardMaterial({ color: hexColor(conf.palette.wall), roughness: 0.88 }));
    street.position.set(Math.cos(a) * span * 0.2, 0.08, Math.sin(a) * span * 0.2); street.rotation.y = -a; group.add(street);
  }
  for (const kind of (conf.creatures || ["birds"]).slice(0, 2)) addCreatureFlock(group, kind, coarse ? 10 : 18, span * 0.7, 0.5);

  districtLight.position.copy(center); districtLight.position.y += 14; districtLight.intensity = 2.2; districtLight.color.set(conf.palette.accent);
  scene.add(group); districtRoot = group; activeDistrict = district.id;
  for (const item of districtLabels) {
    item.el.classList.toggle("is-active", item.id === district.id);
    item.el.classList.toggle("is-dim", item.id !== district.id);
  }
  return { target: center.clone().add(new THREE.Vector3(0, 3, 0)), radius: Math.max(16, span * 1.15), polar: 0.78 };
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
    hint.textContent = "已放到最大细节 · 缩小或点返回回到城邦";
  } else if (inCity) {
    const site = sitesById.get(activeCity);
    lodChip.textContent = `城邦 · ${site?.name || activeCity}`;
    siteSectionTitle.textContent = `${site?.name || "城邦"} · 地点`;
    const backText = activeRegion ? `← 返回${activeRegion.name}` : "← 返回总览";
    backLevel.textContent = backText; backMap.textContent = backText;
    hint.textContent = "点地点标记放大到街区最大细节";
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

  scene.fog.density = inDistrict ? 0.0016 : inCity ? 0.00105 : inRegion ? 0.00055 : 0.00038;
  if (continentMesh) {
    continentMesh.material.transparent = inRegion || inCity;
    continentMesh.material.opacity = inDistrict ? 0.22 : inCity ? 0.38 : inRegion ? 0.72 : 1;
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

  continentMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, bumpMap: bump, bumpScale: 18, roughness: 0.86, metalness: 0.04 }));
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

  applyView({ target: new THREE.Vector3(0, 20, 0), ...HOME });
  syncUi(); resize();
  loading.classList.add("is-done");
  setTimeout(() => { loading.hidden = true; }, 320);
  addEventListener("resize", resize);

  const dummy = new THREE.Object3D();
  let popClock = 0;
  function frame(now) {
    stepFlight(now);
    if (water.material?.uniforms?.time) water.material.uniforms.time.value = now * 0.001;
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
