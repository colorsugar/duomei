import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const MAP_W = 1280;
const MAP_H = 720;
const HEIGHT_SCALE = 88;
const SVG_W = 1100;
const HOME = { radius: 1180, polar: 0.92, azimuth: -0.35 };
const TILT = { oblique: 0.92, top: 0.16 };
const KIND_DOT = {
  王都: "#e9d29a",
  帝都: "#c4b0d8",
  战略通道: "#ffb089",
  山口要塞: "#c4c6bf",
  战略海峡: "#82b9c4",
  双层王城: "#d2b09a",
  禁航海沟: "#6ee0ff",
  中立学术中心: "#efe2b0",
  森林关隘: "#7dba8f",
  远古遗迹: "#b9d8e0",
  禁忌核心: "#9ad7e8",
  渡口要塞: "#e3c27a",
};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const narrow = () => matchMedia("(max-width: 900px)").matches;

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const siteList = document.getElementById("site-list");
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

addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!card.hidden) {
    card.hidden = true;
    return;
  }
  if (app.classList.contains("is-immersive")) {
    setImmersive(false);
    return;
  }
  if (app.classList.contains("is-panel-open")) setPanel(false);
});

// Phone: map first. Desktop: keep the catalog open.
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
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "cj3d-labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111d);
scene.fog = new THREE.Fog(0x07111d, 2200, 4600);

const camera = new THREE.PerspectiveCamera(46, 1, 2, 12000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = 0.085;
controls.screenSpacePanning = false;
controls.minDistance = 280;
controls.maxDistance = 2800;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = 1.22;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.9;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.listenToKeyEvents(window);

scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a2733, 1.2));
const sun = new THREE.DirectionalLight(0xffe6c4, 1.4);
sun.position.set(-900, 1400, 650);
scene.add(sun);

const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 6200).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x0a1c30, roughness: 0.55, metalness: 0.04 }),
);
sea.position.y = -2;
scene.add(sea);

const toWorld = (x, y) => new THREE.Vector3(x - MAP_W / 2, 0, y - MAP_H / 2);
const fromSvg = (x, y) => ({ x: (x / SVG_W) * MAP_W, y: (y / 720) * MAP_H });

function luminanceField(image) {
  const cols = 256;
  const rows = Math.round((cols * MAP_H) / MAP_W);
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  let field = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const water = b > r + 0.05 && lum < 0.45;
    field[i] = water ? 0 : Math.pow(Math.min(1, Math.max(0, (lum - 0.2) / 0.65)), 1.3);
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
  return { cols, rows, field };
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

function heightAt(x, y, hf) {
  return sampleField(hf, x / MAP_W, y / MAP_H);
}

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
let flight = null;
const markers = new Map();

function currentView() {
  offset.copy(camera.position).sub(controls.target);
  spherical.setFromVector3(offset);
  return {
    target: controls.target.clone(),
    radius: spherical.radius,
    polar: spherical.phi,
    azimuth: spherical.theta,
  };
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
  const e = 1 - (1 - t) ** 3;
  const { from, to } = flight;
  applyView({
    target: from.target.clone().lerp(to.target, e),
    radius: from.radius + (to.radius - from.radius) * e,
    polar: from.polar + (to.polar - from.polar) * e,
    azimuth: from.azimuth + (to.azimuth - from.azimuth) * e,
  });
  if (t >= 1) flight = null;
}

function showSite(site, hf, focus = true) {
  for (const [id, node] of markers) node.classList.toggle("is-active", id === site.id);
  for (const btn of siteList.querySelectorAll("button")) {
    btn.classList.toggle("is-active", btn.dataset.id === site.id);
  }
  cardBody.innerHTML = `
    <p class="tag">${site.kind}</p>
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
  if (narrow()) setPanel(false);
  if (!focus) return;
  const p = fromSvg(site.x, site.y);
  const y = heightAt(p.x, p.y, hf);
  const target = toWorld(p.x, p.y);
  target.y = y + 8;
  flyTo({ target, radius: Math.max(420, controls.getDistance() * 0.72), polar: TILT.oblique });
}

document.getElementById("card-close").addEventListener("click", () => {
  card.hidden = true;
  for (const node of markers.values()) node.classList.remove("is-active");
  for (const btn of siteList.querySelectorAll("button")) btn.classList.remove("is-active");
});

document.getElementById("reset").addEventListener("click", () => {
  flyTo({ target: new THREE.Vector3(0, 20, 0), ...HOME });
});

const tiltBtn = document.getElementById("tilt");
tiltBtn.addEventListener("click", () => {
  const pressed = tiltBtn.getAttribute("aria-pressed") === "true";
  tiltBtn.setAttribute("aria-pressed", pressed ? "false" : "true");
  tiltBtn.textContent = pressed ? "俯视" : "斜看";
  flyTo({ polar: pressed ? TILT.top : TILT.oblique }, 500);
});

document.getElementById("zoom-in").addEventListener("click", () => {
  flyTo({ radius: controls.getDistance() * 0.82 }, 280);
});
document.getElementById("zoom-out").addEventListener("click", () => {
  flyTo({ radius: controls.getDistance() * 1.22 }, 280);
});

function resize() {
  const w = stage.clientWidth || innerWidth;
  const h = stage.clientHeight || innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
}

async function boot() {
  // fetch()/TextureLoader resolve against the HTML document URL, not this module —
  // pin assets to import.meta.url so /atlas/chaoji/3d.html keeps working.
  const worldUrl = new URL("../world.json", import.meta.url);
  const basemapUrl = new URL("../assets/basemap.webp", import.meta.url);
  const world = await fetch(worldUrl, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`world.json ${r.status}`);
    return r.json();
  });
  const texture = await new THREE.TextureLoader().loadAsync(basemapUrl.href);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const hf = luminanceField(texture.image);
  const geometry = new THREE.PlaneGeometry(MAP_W, MAP_H, 220, 124).rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = (pos.getX(i) + MAP_W / 2) / MAP_W;
    const v = (pos.getZ(i) + MAP_H / 2) / MAP_H;
    const edge = Math.min(u, 1 - u, v, 1 - v);
    pos.setY(i, sampleField(hf, u, v) * Math.min(1, edge * 36) - 0.8);
  }
  geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.02 }),
  ));

  for (const site of world.sites) {
    const p = fromSvg(site.x, site.y);
    const y = heightAt(p.x, p.y, hf);
    const anchor = toWorld(p.x, p.y);
    anchor.y = y + 6;

    const label = document.createElement("button");
    label.type = "button";
    label.className = "cj3d-label";
    label.innerHTML = `<i style="--dot:${KIND_DOT[site.kind] || "#e6c886"}"></i><span>${site.name}</span>`;
    label.addEventListener("click", (event) => {
      event.stopPropagation();
      showSite(site, hf, true);
    });
    markers.set(site.id, label);
    const obj = new CSS2DObject(label);
    obj.position.copy(anchor);
    scene.add(obj);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = site.id;
    btn.textContent = site.name;
    btn.addEventListener("click", () => showSite(site, hf, true));
    siteList.appendChild(btn);
  }

  applyView({ target: new THREE.Vector3(0, 20, 0), ...HOME });
  resize();
  loading.classList.add("is-done");
  setTimeout(() => { loading.hidden = true; }, 320);

  addEventListener("resize", resize);
  matchMedia("(max-width: 900px)").addEventListener("change", (event) => {
    if (event.matches && app.classList.contains("is-panel-open") && !card.hidden) setPanel(false);
  });

  function frame(now) {
    stepFlight(now);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (!reducedMotion) {
    setTimeout(() => { hint.style.opacity = "0.35"; }, 5000);
  }
}

boot().catch((error) => {
  console.error(error);
  loading.classList.remove("is-done");
  loading.hidden = false;
  loading.textContent = "立体地图加载失败，请刷新重试。";
});
