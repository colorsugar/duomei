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
  王都: "#e9d29a", 帝都: "#c4b0d8", 战略通道: "#ffb089", 山口要塞: "#c4c6bf",
  战略海峡: "#82b9c4", 双层王城: "#d2b09a", 禁航海沟: "#6ee0ff", 中立学术中心: "#efe2b0",
  森林关隘: "#7dba8f", 远古遗迹: "#b9d8e0", 禁忌核心: "#9ad7e8", 渡口要塞: "#e3c27a",
};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const narrow = () => matchMedia("(max-width: 900px)").matches;

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const siteList = document.getElementById("site-list");
const regionList = document.getElementById("region-list");
const backLevel = document.getElementById("back-level");
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
controls.minDistance = 28;
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

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
let flight = null;
const markers = new Map();
const sitesById = new Map();
const siteRegion = new Map();
const citiesById = new Map();
let regions = [];
let activeRegion = null;
let activeCity = null;
let heightField = null;
let continentMesh = null;
let regionOverlay = null;
let cityRoot = null;
let creatureSystems = [];

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
    o.geometry?.dispose?.();
    for (const m of [].concat(o.material || [])) m?.dispose?.();
  });
}
function clearRegionOverlay() {
  if (!regionOverlay) return;
  scene.remove(regionOverlay); disposeObj(regionOverlay); regionOverlay = null;
}
function clearCity() {
  creatureSystems = [];
  cityLight.intensity = 0;
  if (!cityRoot) return;
  scene.remove(cityRoot); disposeObj(cityRoot); cityRoot = null; activeCity = null;
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

function addCreatureFlock(group, kind, count, span) {
  const geo = kind === "ships" ? new THREE.ConeGeometry(0.45, 2.1, 4)
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
    color, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.9 : 0, roughness: 0.45, metalness: 0.12,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = span * (0.18 + 0.4 * Math.random());
    const seed = { a, r, h: 3 + Math.random() * 16, speed: 0.25 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2 };
    seeds.push(seed);
    dummy.position.set(Math.cos(a) * r, seed.h, Math.sin(a) * r);
    dummy.scale.setScalar(kind === "ships" ? 1.35 : 0.9);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  creatureSystems.push({ mesh, seeds, kind });
}

function buildCityDetail(site, conf) {
  clearCity();
  const p = fromSvg(site.x, site.y);
  const baseY = heightAt(p.x, p.y, heightField);
  const origin = toWorld(p.x, p.y); origin.y = baseY;
  const group = new THREE.Group();
  group.position.copy(origin);
  const scale = conf.scale;
  const rng = mulberry32(hashStr(site.id));
  const count = Math.round(conf.buildingCount * (coarse ? 0.55 : 1));

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(scale * 0.52, 64),
    new THREE.MeshStandardMaterial({ color: 0xb7a78a, roughness: 0.92, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 1.15;
  group.add(ground);
  loadTex(new URL(`../assets/cities/${site.id}.webp`, import.meta.url).href)
    .then((tex) => { ground.material.map = tex; ground.material.needsUpdate = true; })
    .catch(() => {});

  const wall = new THREE.Mesh(
    new THREE.TorusGeometry(scale * 0.42, 0.55, 6, 48),
    new THREE.MeshStandardMaterial({ color: conf.palette.wall, roughness: 0.75, metalness: 0.08 }),
  );
  wall.rotation.x = Math.PI / 2;
  wall.position.y = 2.1;
  group.add(wall);

  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: conf.palette.wall, roughness: 0.7, metalness: 0.05 }),
    count,
  );
  const roofs = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.75, 0.7, 4),
    new THREE.MeshStandardMaterial({ color: conf.palette.roof, roughness: 0.62, metalness: 0.08 }),
    count,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = scale * (0.08 + rng() * 0.34);
    const bw = 1.2 + rng() * 2.4, bd = 1.2 + rng() * 2.2, bh = 2 + rng() * 10;
    dummy.position.set(Math.cos(a) * r, 1.2 + bh / 2, Math.sin(a) * r);
    dummy.scale.set(bw, bh, bd);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.2 + bh + 0.25;
    dummy.scale.set(bw * 0.75, 1, bd * 0.75);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
  }
  buildings.instanceMatrix.needsUpdate = true;
  roofs.instanceMatrix.needsUpdate = true;
  group.add(buildings, roofs);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 22, 8),
    new THREE.MeshStandardMaterial({
      color: conf.palette.accent, emissive: conf.palette.accent, emissiveIntensity: 0.28, roughness: 0.45, metalness: 0.22,
    }),
  );
  tower.position.y = 12;
  group.add(tower);

  conf.districts.forEach((name, i) => {
    const a = (i / conf.districts.length) * Math.PI * 2 + 0.35;
    const r = scale * 0.28;
    const el = document.createElement("div");
    el.className = "cj3d-district";
    el.textContent = name;
    const lab = new CSS2DObject(el);
    lab.position.set(Math.cos(a) * r, 8 + (i % 2) * 3, Math.sin(a) * r);
    group.add(lab);
  });

  for (const kind of conf.creatures) {
    const n = ["ships", "carts", "patrols", "rails", "banners"].includes(kind) ? 10
      : ["snow", "mist", "smoke"].includes(kind) ? 36 : 22;
    addCreatureFlock(group, kind, coarse ? Math.ceil(n * 0.6) : n, scale * 0.45);
  }

  cityLight.position.copy(origin);
  cityLight.position.y += 28;
  cityLight.intensity = 1.7;
  cityLight.color.set(conf.palette.accent);

  scene.add(group);
  cityRoot = group;
  activeCity = site.id;
  return { target: origin.clone().add(new THREE.Vector3(0, 6, 0)), radius: Math.max(42, scale * 0.95), polar: 0.95 };
}

function syncUi() {
  const inCity = Boolean(activeCity);
  const inRegion = Boolean(activeRegion);
  app.classList.toggle("is-region", inRegion);
  app.classList.toggle("is-city", inCity);
  backLevel.hidden = !(inRegion || inCity);
  if (inCity) {
    const site = sitesById.get(activeCity);
    lodChip.textContent = `城邦 · ${site?.name || activeCity}`;
    siteSectionTitle.textContent = `${site?.name || "城邦"} · 街区`;
    backLevel.textContent = activeRegion ? `← 返回${activeRegion.name}` : "← 返回总览";
  } else if (inRegion) {
    lodChip.textContent = `地区 · ${activeRegion.name}`;
    siteSectionTitle.textContent = `${activeRegion.name} · 战略点`;
    backLevel.textContent = "← 返回总览";
  } else {
    lodChip.textContent = "总览 · 大陆";
    siteSectionTitle.textContent = "战略点 / 城邦";
  }
  for (const btn of regionList.querySelectorAll("button")) {
    btn.classList.toggle("is-active", inRegion && btn.dataset.id === activeRegion.id);
  }
  const allow = inRegion ? new Set(activeRegion.siteIds) : null;
  for (const [id, node] of markers) {
    node.classList.toggle("is-dim", Boolean(allow) && !allow.has(id));
    node.classList.toggle("is-active", id === activeCity);
  }
  for (const btn of siteList.querySelectorAll("button")) {
    btn.hidden = Boolean(allow) && !allow.has(btn.dataset.id);
    btn.classList.toggle("is-active", btn.dataset.id === activeCity);
  }
  scene.fog.density = inCity ? 0.00105 : inRegion ? 0.00055 : 0.00038;
  if (continentMesh) {
    continentMesh.material.transparent = inRegion || inCity;
    continentMesh.material.opacity = inCity ? 0.38 : inRegion ? 0.72 : 1;
  }
}

function showSiteCard(site) {
  const region = siteRegion.get(site.id);
  cardBody.innerHTML = `
    <p class="tag">${site.kind}${region ? ` · ${region.name}` : ""}</p>
    <h2>${site.name}</h2>
    <p class="country">${site.country}</p>
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
  activeRegion = region;
  clearCity();
  await showRegionOverlay(region);
  syncUi();
  if (fly) await flyTo(regionFrame(region), 900);
  if (narrow()) setPanel(false);
}

async function exitToOverview() {
  clearCity();
  clearRegionOverlay();
  activeRegion = null;
  syncUi();
  await flyTo({ target: new THREE.Vector3(0, 20, 0), ...HOME }, 850);
}

async function enterCity(site) {
  const region = siteRegion.get(site.id);
  if (region && activeRegion?.id !== region.id) {
    activeRegion = region;
    await showRegionOverlay(region);
  }
  const conf = citiesById.get(site.id) || {
    scale: 64, buildingCount: 80,
    palette: { wall: "#c4b08a", roof: "#8a6b3a", accent: "#e6c886" },
    creatures: ["birds"], districts: ["核心区", "外城", "市集", "码头"],
  };
  const view = buildCityDetail(site, conf);
  syncUi();
  showSiteCard(site);
  await flyTo(view, 980);
  if (narrow()) setPanel(false);
}

document.getElementById("card-close").addEventListener("click", () => {
  card.hidden = true;
  for (const n of markers.values()) n.classList.remove("is-active");
  for (const b of siteList.querySelectorAll("button")) b.classList.remove("is-active");
});
backLevel.addEventListener("click", async () => {
  card.hidden = true;
  if (activeCity) {
    clearCity();
    syncUi();
    if (activeRegion) await flyTo(regionFrame(activeRegion), 700);
    return;
  }
  await exitToOverview();
  if (narrow()) setPanel(false);
});
document.getElementById("reset").addEventListener("click", () => { card.hidden = true; exitToOverview(); });
const tiltBtn = document.getElementById("tilt");
tiltBtn.addEventListener("click", () => {
  const pressed = tiltBtn.getAttribute("aria-pressed") === "true";
  tiltBtn.setAttribute("aria-pressed", pressed ? "false" : "true");
  tiltBtn.textContent = pressed ? "俯视" : "斜看";
  flyTo({ polar: pressed ? TILT.top : TILT.oblique }, 500);
});
document.getElementById("zoom-in").addEventListener("click", () => flyTo({ radius: controls.getDistance() * 0.78 }, 260));
document.getElementById("zoom-out").addEventListener("click", () => flyTo({ radius: controls.getDistance() * 1.25 }, 260));

function resize() {
  const w = stage.clientWidth || innerWidth;
  const h = stage.clientHeight || innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
}

async function boot() {
  const worldUrl = new URL("../world.json", import.meta.url);
  const regionsUrl = new URL("../regions.json", import.meta.url);
  const citiesUrl = new URL("../cities.json", import.meta.url);
  const basemapUrl = new URL("../assets/basemap.webp", import.meta.url);

  const [world, regionsData, citiesData] = await Promise.all([
    fetch(worldUrl, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`world ${r.status}`); return r.json(); }),
    fetch(regionsUrl, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`regions ${r.status}`); return r.json(); }),
    fetch(citiesUrl, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`cities ${r.status}`); return r.json(); }),
  ]);
  const texture = await loadTex(basemapUrl.href);
  heightField = luminanceField(texture.image);
  const hf = heightField;

  const segsX = coarse ? 260 : 420;
  const segsY = coarse ? 146 : 236;
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
    const g = Math.round(hf.field[i] * 255); const o = i * 4;
    bumpImg.data[o] = g; bumpImg.data[o + 1] = g; bumpImg.data[o + 2] = g; bumpImg.data[o + 3] = 255;
  }
  bumpCtx.putImageData(bumpImg, 0, 0);
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = bump.wrapT = THREE.ClampToEdgeWrapping;
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = texture.anisotropy;

  continentMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    map: texture, bumpMap: bump, bumpScale: 18, roughness: 0.86, metalness: 0.04,
  }));
  scene.add(continentMesh);

  for (const site of world.sites) sitesById.set(site.id, site);
  for (const c of citiesData.cities || []) citiesById.set(c.id, c);
  regions = regionsData.regions || [];
  for (const region of regions) {
    for (const id of region.siteIds) siteRegion.set(id, region);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = region.id;
    btn.innerHTML = `${region.name}<span class="cj3d-list-meta">${region.blurb}</span>`;
    btn.addEventListener("click", () => enterRegion(region, { fly: true }));
    regionList.appendChild(btn);
  }

  for (const site of world.sites) {
    const p = fromSvg(site.x, site.y);
    const y = heightAt(p.x, p.y, hf);
    const anchor = toWorld(p.x, p.y); anchor.y = y + 6;
    const label = document.createElement("button");
    label.type = "button";
    label.className = "cj3d-label";
    label.innerHTML = `<i style="--dot:${KIND_DOT[site.kind] || "#e6c886"}"></i><span>${site.name}</span>`;
    label.addEventListener("click", (e) => { e.stopPropagation(); enterCity(site); });
    markers.set(site.id, label);
    const obj = new CSS2DObject(label);
    obj.position.copy(anchor);
    scene.add(obj);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = site.id;
    btn.textContent = site.name;
    btn.addEventListener("click", () => enterCity(site));
    siteList.appendChild(btn);
  }

  applyView({ target: new THREE.Vector3(0, 20, 0), ...HOME });
  syncUi();
  resize();
  loading.classList.add("is-done");
  setTimeout(() => { loading.hidden = true; }, 320);
  addEventListener("resize", resize);

  const dummy = new THREE.Object3D();
  function frame(now) {
    stepFlight(now);
    if (water.material?.uniforms?.time) water.material.uniforms.time.value = now * 0.001;
    for (const sys of creatureSystems) {
      for (let i = 0; i < sys.seeds.length; i += 1) {
        const s = sys.seeds[i];
        const a = s.a + now * 0.0004 * s.speed + s.phase * 0.01;
        const bob = Math.sin(now * 0.002 * s.speed + s.phase) * (sys.kind === "ships" ? 0.25 : 1.1);
        dummy.position.set(Math.cos(a) * s.r, s.h + bob, Math.sin(a) * s.r);
        dummy.rotation.set(0, -a + Math.PI / 2, sys.kind === "birds" ? Math.sin(now * 0.01 + s.phase) * 0.4 : 0);
        dummy.scale.setScalar(sys.kind === "ships" ? 1.35 : 0.9);
        dummy.updateMatrix();
        sys.mesh.setMatrixAt(i, dummy.matrix);
      }
      sys.mesh.instanceMatrix.needsUpdate = true;
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (!reducedMotion) setTimeout(() => { hint.style.opacity = "0.35"; }, 5000);
}

boot().catch((err) => {
  console.error(err);
  loading.classList.remove("is-done");
  loading.hidden = false;
  loading.textContent = "立体地图加载失败，请刷新重试。";
});
