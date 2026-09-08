// 七国战略图志 · 立体版。Relief is lifted from the flat basemap's luminance, so the same two
// exported tiles and the same entity data drive both views. Same-origin iframe of /dalu/map.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const params = new URLSearchParams(location.search);
const embedded = params.get("embed") === "duomei" && window.parent !== window;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const HEIGHT_SCALE = 72;
const HOME = { x: 768, y: 560, radius: 1480, polar: 0.98 };
const TILT = { oblique: 0.98, top: 0.12 };
// Beyond these camera distances a kind's labels fold away so the chart never turns into a wall of pills.
const KIND_ZOOM = { kingdom: Infinity, legend: Infinity, city: 1250, site: 1250, architecture: 820 };
const KIND_NAME = { kingdom: "国家与政体", city: "城池", site: "战略要地", legend: "传说栖地", architecture: "宫堡庄园" };

const $ = (id) => document.getElementById(id);
const root = $("atlas3d");
const stage = $("stage");
const loading = $("loading");
const card = $("card");
const cardBody = $("card-body");
const lightbox = $("lightbox");

function fail(message) {
  loading.classList.add("is-failed");
  loading.innerHTML = `<p>${message}<br><a href="/dalu/map?view=2d" target="_top">打开平面版地图</a></p>`;
}

function post(message) {
  if (embedded) window.parent.postMessage(message, location.origin);
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch {
  fail("这台设备暂时打不开立体地图。");
  throw new Error("webgl unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "atlas3d-labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111d);
scene.fog = new THREE.Fog(0x07111d, 2600, 5200);

const camera = new THREE.PerspectiveCamera(46, 1, 4, 14000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = 0.09;
controls.screenSpacePanning = false;
controls.minDistance = 230;
controls.maxDistance = 3400;
controls.minPolarAngle = 0.04;
controls.maxPolarAngle = 1.24;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.9;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.listenToKeyEvents(window);
controls.keyPanSpeed = 24;

scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1d2733, 1.15));
const sun = new THREE.DirectionalLight(0xffe6c4, 1.35);
sun.position.set(-900, 1300, 700);
scene.add(sun);

const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(10000, 7000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x0a1c30, roughness: 0.55, metalness: 0.05 }),
);
sea.position.y = -1.5;
scene.add(sea);

let canvasWidth = 3256;
let canvasHeight = 1024;
const toWorld = (x, y) => new THREE.Vector3(x - canvasWidth / 2, 0, y - canvasHeight / 2);

// --- Relief ---------------------------------------------------------------
const heightFields = [];

function luminanceField(image, tile) {
  const cols = 256;
  const rows = Math.round(cols * tile.height / tile.width);
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  let field = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Water on the chart is dark and blue-leaning; everything else climbs with brightness (snowfields highest).
    const water = b > r + 0.06 && lum < 0.42;
    field[i] = water ? 0 : Math.pow(Math.min(1, Math.max(0, (lum - 0.22) / 0.62)), 1.35);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    const next = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= rows) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx;
            if (xx < 0 || xx >= cols) continue;
            sum += field[yy * cols + xx];
            n += 1;
          }
        }
        next[y * cols + x] = sum / n;
      }
    }
    field = next;
  }
  return { cols, rows, field, tile };
}

function sampleField(hf, u, v) {
  const fx = Math.min(hf.cols - 1, Math.max(0, u * (hf.cols - 1)));
  const fy = Math.min(hf.rows - 1, Math.max(0, v * (hf.rows - 1)));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(hf.cols - 1, x0 + 1);
  const y1 = Math.min(hf.rows - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = hf.field[y0 * hf.cols + x0] * (1 - tx) + hf.field[y0 * hf.cols + x1] * tx;
  const b = hf.field[y1 * hf.cols + x0] * (1 - tx) + hf.field[y1 * hf.cols + x1] * tx;
  return (a * (1 - ty) + b * ty) * HEIGHT_SCALE;
}

function heightAt(x, y) {
  for (const hf of heightFields) {
    const { tile } = hf;
    if (x >= tile.x && x <= tile.x + tile.width && y >= tile.y && y <= tile.y + tile.height) {
      return sampleField(hf, (x - tile.x) / tile.width, (y - tile.y) / tile.height);
    }
  }
  return 0;
}

async function buildTile(tile) {
  const texture = await new THREE.TextureLoader().loadAsync(tile.src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const hf = luminanceField(texture.image, tile);
  heightFields.push(hf);
  const geometry = new THREE.PlaneGeometry(tile.width, tile.height, 190, 126).rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = (pos.getX(i) + tile.width / 2) / tile.width;
    const v = (pos.getZ(i) + tile.height / 2) / tile.height;
    // Coastal vertices sink a little so the relief meets the sea plane without a visible lip.
    const edge = Math.min(u, 1 - u, v, 1 - v);
    pos.setY(i, sampleField(hf, u, v) * Math.min(1, edge * 40) - 0.6);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 }));
  const center = toWorld(tile.x + tile.width / 2, tile.y + tile.height / 2);
  mesh.position.set(center.x, 0, center.z);
  scene.add(mesh);
}

// --- Camera flights -------------------------------------------------------
const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
let flight = null;

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

function flyTo(partial, duration = 720) {
  const from = currentView();
  const to = { ...from, ...partial, target: partial.target ? partial.target.clone() : from.target };
  to.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, to.radius));
  to.polar = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, to.polar));
  if (reducedMotion || duration === 0) {
    applyView(to);
    flight = null;
    return;
  }
  flight = { from, to, start: performance.now(), duration };
}

function stepFlight(now) {
  if (!flight) return;
  const t = Math.min(1, (now - flight.start) / flight.duration);
  const e = 1 - Math.pow(1 - t, 3);
  const { from, to } = flight;
  applyView({
    target: from.target.clone().lerp(to.target, e),
    radius: from.radius + (to.radius - from.radius) * e,
    polar: from.polar + (to.polar - from.polar) * e,
    azimuth: from.azimuth + (to.azimuth - from.azimuth) * e,
  });
  if (t >= 1) flight = null;
}

function homeView() {
  const target = toWorld(HOME.x, HOME.y);
  // Portrait phones see a narrow strip of a very wide chart, so they start closer in.
  const radius = camera.aspect < 0.9 ? 1120 : HOME.radius;
  return { target, radius, polar: HOME.polar, azimuth: 0 };
}

// --- Entities & labels ----------------------------------------------------
const kindVisible = { kingdom: true, city: true, site: true, legend: true, architecture: true };
const labels = [];
let entities = [];
let active = null;

function makeLabel(entity) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `atlas3d-label kind-${entity.kind}`;
  el.style.setProperty("--dot", entity.color);
  el.innerHTML = `<i></i><span></span>`;
  el.lastChild.textContent = entity.shortName;
  el.setAttribute("aria-label", `${entity.name}，${KIND_NAME[entity.kind]}`);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    select(entity, true);
  });
  // CSS2DRenderer owns the wrapper's transform; the button keeps its own "pin above the point" offset.
  const pin = document.createElement("div");
  pin.className = "atlas3d-pin";
  pin.appendChild(el);
  const object = new CSS2DObject(pin);
  const world = toWorld(entity.x, entity.y);
  object.position.set(world.x, heightAt(entity.x, entity.y) + 3, world.z);
  scene.add(object);
  labels.push({ entity, el, object, shown: true });
}

// Capitals, gates and palaces often share a kingdom's anchor, so labels are culled greedily in screen
// space by priority; the tapped entity always survives.
const PRIORITY = { kingdom: 0, legend: 1, site: 2, city: 3, architecture: 4 };
const projected = new THREE.Vector3();
const kept = [];

function updateLabels(distance) {
  kept.length = 0;
  const halfW = stage.clientWidth / 2;
  const halfH = stage.clientHeight / 2;
  const ordered = labels
    .map((label) => {
      projected.copy(label.object.position).project(camera);
      return { label, x: projected.x * halfW, y: -projected.y * halfH, behind: projected.z > 1 };
    })
    .sort((a, b) => (a.label.entity === active ? -1 : b.label.entity === active ? 1 : PRIORITY[a.label.entity.kind] - PRIORITY[b.label.entity.kind]));
  for (const item of ordered) {
    const { label } = item;
    const { entity } = label;
    let show = entity === active || (kindVisible[entity.kind] && distance < KIND_ZOOM[entity.kind] && !item.behind);
    if (show && entity !== active) {
      const w = entity.shortName.length * 14 + 48;
      show = !kept.some((other) => Math.abs(other.x - item.x) < (w + other.w) / 2 && Math.abs(other.y - item.y) < 34);
    }
    if (show) kept.push({ x: item.x, y: item.y, w: entity.shortName.length * 14 + 48 });
    if (show !== label.shown) {
      label.shown = show;
      label.el.classList.toggle("is-hidden", !show);
    }
  }
}

function renderCard(entity) {
  cardBody.replaceChildren();
  const add = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    cardBody.appendChild(el);
    return el;
  };
  add("p", "atlas3d-card-kicker", [entity.category, KIND_NAME[entity.kind]].filter(Boolean).join(" · "));
  add("h2", null, entity.name);
  if (entity.tag) add("p", "atlas3d-card-tag", entity.tag);
  if (entity.description) add("p", null, entity.description);
  if (entity.detail && entity.detail !== entity.description) add("p", null, entity.detail);
  if (entity.facts.length) {
    const dl = add("dl");
    for (const fact of entity.facts) {
      if (fact.text === entity.detail) continue;
      const dt = document.createElement("dt");
      dt.textContent = fact.label;
      const dd = document.createElement("dd");
      dd.textContent = fact.text;
      dl.append(dt, dd);
    }
  }
  if (entity.gallery.length) {
    const list = add("ul", "atlas3d-card-gallery");
    for (const plate of entity.gallery) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const img = document.createElement("img");
      img.src = plate.src;
      img.alt = plate.title;
      img.loading = "lazy";
      img.decoding = "async";
      const caption = document.createElement("span");
      caption.textContent = plate.title.replace(`${entity.name} · `, "").replace(`${entity.shortName} · `, "");
      button.append(img, caption);
      button.addEventListener("click", () => openLightbox(plate));
      li.appendChild(button);
      list.appendChild(li);
    }
  }
  const actions = add("div", "atlas3d-card-actions");
  const focus = document.createElement("button");
  focus.type = "button";
  focus.textContent = "飞到这里";
  focus.addEventListener("click", () => focusOn(entity));
  actions.appendChild(focus);
  if (entity.parent) {
    const parent = entities.find((item) => item.id === entity.parent);
    if (parent) {
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = `所属 · ${parent.shortName}`;
      up.addEventListener("click", () => select(parent, true));
      actions.appendChild(up);
    }
  }
  cardBody.scrollTop = 0;
}

function focusOn(entity) {
  const radius = entity.kind === "kingdom" ? 980 : entity.kind === "architecture" ? 520 : 700;
  flyTo({ target: toWorld(entity.x, entity.y), radius });
}

function select(entity, fly) {
  for (const label of labels) label.el.classList.toggle("is-active", label.entity === entity);
  active = entity;
  if (!entity) {
    card.hidden = true;
    return;
  }
  renderCard(entity);
  card.hidden = false;
  if (fly) focusOn(entity);
}

function openLightbox(plate) {
  $("lightbox-img").src = plate.src;
  $("lightbox-img").alt = plate.title;
  $("lightbox-caption").textContent = [plate.title, plate.view, plate.caption].filter(Boolean).join(" · ");
  lightbox.hidden = false;
}

// --- Chrome ---------------------------------------------------------------
$("card-close").addEventListener("click", () => select(null));
$("lightbox-close").addEventListener("click", () => { lightbox.hidden = true; });
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.hidden = true; });
$("reset").addEventListener("click", () => { select(null); flyTo(homeView(), 900); });
$("zoom-in").addEventListener("click", () => flyTo({ radius: currentView().radius * 0.68 }, 420));
$("zoom-out").addEventListener("click", () => flyTo({ radius: currentView().radius * 1.45 }, 420));
$("tilt").addEventListener("click", (event) => {
  const oblique = event.currentTarget.getAttribute("aria-pressed") !== "true";
  event.currentTarget.setAttribute("aria-pressed", String(oblique));
  event.currentTarget.textContent = oblique ? "斜看" : "俯视";
  flyTo({ polar: oblique ? TILT.oblique : TILT.top }, 600);
});
$("artbook").addEventListener("click", () => {
  if (embedded) post({ type: "atlas-open-artbook" });
  else window.top.location.href = "/guyu/hanhai-realms-artbook";
});

function setImmersive(on) {
  root.classList.toggle("is-immersive", on);
  $("exit-immersive").hidden = !on;
  post({ type: "atlas-immersive", on });
}
$("immersive").addEventListener("click", () => setImmersive(true));
$("exit-immersive").addEventListener("click", () => setImmersive(false));
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!lightbox.hidden) lightbox.hidden = true;
  else if (!card.hidden) select(null);
  else if (root.classList.contains("is-immersive")) setImmersive(false);
});

for (const chip of $("chips").querySelectorAll("button")) {
  chip.addEventListener("click", () => {
    const kind = chip.dataset.kind;
    kindVisible[kind] = !kindVisible[kind];
    chip.setAttribute("aria-pressed", String(kindVisible[kind]));
    if (active?.kind === kind && !kindVisible[kind]) select(null);
  });
}

// A clean tap on open water or land (no drag) folds the card away.
let tap = null;
renderer.domElement.addEventListener("pointerdown", (event) => { tap = { x: event.clientX, y: event.clientY, at: performance.now(), id: event.pointerId }; });
renderer.domElement.addEventListener("pointerup", (event) => {
  if (!tap || tap.id !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
  if (moved < 8 && performance.now() - tap.at < 400 && !card.hidden) select(null);
  tap = null;
});

$("hint").textContent = coarse ? "单指拖动 · 双指缩放旋转 · 点标记看介绍" : "拖动平移 · 滚轮缩放 · 右键旋转俯仰 · 点标记看介绍";
// The React shell already offers the flat chart next to its own return link.
if (embedded) $("bar").querySelector('a[href*="view=2d"]').hidden = true;

// --- Boot -----------------------------------------------------------------
function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

const bounds = new THREE.Box3();
function clampTarget() {
  bounds.min.set(-canvasWidth / 2 - 120, -50, -canvasHeight / 2 - 120);
  bounds.max.set(canvasWidth / 2 + 120, 200, canvasHeight / 2 + 120);
  if (bounds.containsPoint(controls.target)) return;
  const before = controls.target.clone();
  bounds.clampPoint(controls.target, controls.target);
  camera.position.add(controls.target.clone().sub(before));
}

renderer.setAnimationLoop((now) => {
  stepFlight(now);
  if (!flight) {
    controls.update();
    clampTarget();
  }
  updateLabels(camera.position.distanceTo(controls.target));
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

(async () => {
  try {
    const data = await (await fetch("./3d/data.json?v=20260908-3d")).json();
    canvasWidth = data.canvas.width;
    canvasHeight = data.canvas.height;
    entities = data.entities;
    await Promise.all(data.tiles.map(buildTile));
    for (const entity of entities) makeLabel(entity);
    applyView(homeView());
    const entry = params.get("entry");
    const wanted = entry && entities.find((item) => item.id === entry);
    if (wanted) {
      select(wanted, false);
      flyTo({ target: toWorld(wanted.x, wanted.y), radius: wanted.kind === "kingdom" ? 980 : 700 }, 1400);
    }
    loading.classList.add("is-done");
    document.title = `${wanted ? `${wanted.name} · ` : ""}七国战略图志 · 立体 | 多美小记`;
  } catch (error) {
    console.error(error);
    fail("大陆暂时没展开，可能是网络不太顺。");
  }
})();
