// Offline stage. Headless Chrome calls renderPlate(); visitors never load this.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadXiaoyaolou, setXiaoyaolouNight } from './xiaoyaolou-model.js';

const SIZE = 1280;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.4, 40000);
const pmrem = new THREE.PMREMGenerator(renderer);
const env = new RoomEnvironment();
scene.environment = pmrem.fromScene(env, 0.04).texture;
env.dispose();
pmrem.dispose();
scene.environmentIntensity = 0.55;

const hemi = new THREE.HemisphereLight(0xe7f0ff, 0x8d9478, 0.72);
const sun = new THREE.DirectionalLight(0xfff1d2, 2.65);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);

const fill = new THREE.DirectionalLight(0xd5e4f5, 0.55);
scene.add(fill);

function sky(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, top);
  grd.addColorStop(0.55, bottom);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
const daySky = sky('#b7cbe0', '#e4eee6');
const nightSky = sky('#10182a', '#243044');
scene.background = daySky;

const groundMat = new THREE.MeshStandardMaterial({ color: 0xc5d0c2, roughness: 0.94, metalness: 0 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 72), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.visible = false;
scene.add(ground);

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath(new URL('../vendor/three/addons/libs/draco/gltf/', import.meta.url).href);
draco.setWorkerLimit(1);
loader.setDRACOLoader(draco);

const cache = new Map();
let nightOn = false;

function shade(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    for (const mat of [].concat(o.material)) {
      mat.envMapIntensity ??= 0.6;
      if (mat.userData.dayEmissive == null) mat.userData.dayEmissive = mat.emissiveIntensity || 0;
    }
  });
}

async function glb(file) {
  if (cache.has(file)) return cache.get(file);
  const gltf = await loader.loadAsync(new URL('../assets/blender/' + file, import.meta.url).href);
  const root = gltf.scene;
  shade(root);
  root.visible = false;
  scene.add(root);
  cache.set(file, root);
  return root;
}

async function bakedTower() {
  if (cache.has('baked-xiaoyaolou')) return cache.get('baked-xiaoyaolou');
  const root = await loadXiaoyaolou();
  shade(root);
  root.visible = false;
  scene.add(root);
  cache.set('baked-xiaoyaolou', root);
  return root;
}

const NEAR = ['diecaishan.glb','fuboshan.glb','gunanmen.glb','huaqiao.glb','jiefangqiao.glb','mulongta.glb','rita.glb','shelita.glb','wangcheng.glb','xiangbishan.glb','yueta.glb'];
async function detailedCity() {
  const far = await glb('city-far.glb');
  const ground = await glb('city-ground.glb');
  const hide = /^(diecaishan|fuboshan|gunanmen|huaqiao|jiefangqiao|mulongta|rita|shelita|wangcheng|xiangbishan|xiaoyaolou|yueta|Lower eave|Middle eave|Upper eave|Entrance eave|Balcony edge|Column accent)/;
  far.traverse((o) => {
    if (hide.test(o.name || '')) o.visible = false;
  });
  const near = [];
  for (const file of NEAR) near.push(await glb(file));
  near.push(await bakedTower());
  return [far, ground, ...near];
}
const SUBJECTS = {
  xiaoyaolou: { load: bakedTower, frames: 12, y: 0.48, fill: 0.7, yaw0: Math.atan2(0.4, -0.9), plinth: true, night: true },
  city: { load: detailedCity, frames: 8, fixed: true, night: true },
  xiangbishan: { load: () => glb('xiangbishan.glb'), frames: 6, y: 0.34, fill: 0.7, yaw0: Math.atan2(-1, 0.12), plinth: false },
  shuangta: { load: () => Promise.all([glb('rita.glb'), glb('yueta.glb')]), frames: 6, y: 0.46, fill: 0.66, yaw0: 0.8 },
  wangcheng: { load: () => glb('wangcheng.glb'), frames: 6, y: 0.55, fill: 0.72, yaw0: 0.4 },
  jiefangqiao: { load: () => glb('jiefangqiao.glb'), frames: 6, y: 0.42, fill: 0.7, yaw0: 0.9, night: true },
  fuboshan: { load: () => glb('fuboshan.glb'), frames: 4, y: 0.38, fill: 0.72, yaw0: 1.2 },
  gunanmen: { load: () => glb('gunanmen.glb'), frames: 4, y: 0.42, fill: 0.68, yaw0: 0.6 },
  mulongta: { load: () => glb('mulongta.glb'), frames: 4, y: 0.48, fill: 0.64, yaw0: 0.5 },
  diecaishan: { load: () => glb('diecaishan.glb'), frames: 4, y: 0.4, fill: 0.72, yaw0: 0.2 },
};

function rootsOf(loaded) {
  return [].concat(loaded);
}

function applyNight(activeRoots, on) {
  nightOn = on;
  scene.background = on ? nightSky : daySky;
  scene.environmentIntensity = on ? 0.22 : 0.55;
  hemi.intensity = on ? 0.28 : 0.72;
  hemi.color.set(on ? 0x8ea0c4 : 0xe7f0ff);
  hemi.groundColor.set(on ? 0x1c2836 : 0x8d9478);
  sun.intensity = on ? 0.22 : 2.65;
  sun.color.set(on ? 0x9aafd4 : 0xfff1d2);
  fill.intensity = on ? 0.08 : 0.55;
  renderer.toneMappingExposure = on ? 1.02 : 1.08;
  groundMat.color.set(on ? 0x243038 : 0xc5d0c2);
  for (const root of cache.values()) {
    if (root === cache.get('baked-xiaoyaolou')) continue;
    root.traverse((o) => {
      if (o.isLight) o.visible = on;
      if (!o.isMesh) return;
      for (const mat of [].concat(o.material)) {
        const base = mat.userData.dayEmissive || 0;
        const named = /灯|light|emissive|glow|窗/i.test(mat.name || '');
        mat.emissiveIntensity = on ? Math.max(base, named ? 1.4 : base) : base;
      }
    });
  }
  const tower = cache.get('baked-xiaoyaolou');
  if (tower) setXiaoyaolouNight(tower, on);
}

function hideAll() {
  for (const root of cache.values()) root.visible = false;
  ground.visible = false;
}

function boxOf(roots) {
  const box = new THREE.Box3();
  for (const root of roots) {
    root.visible = true;
    root.updateWorldMatrix(true, true);
    box.expandByObject(root);
  }
  return box;
}

function look(center, dir, distance) {
  const d = dir.clone().normalize();
  camera.position.copy(center).addScaledVector(d, distance);
  camera.near = Math.max(0.2, distance / 400);
  camera.far = distance * 40;
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  sun.position.copy(center).add(new THREE.Vector3(distance * 0.35, distance * 0.72, distance * 0.22));
  sun.target.position.copy(center);
  sun.target.updateMatrixWorld();
  fill.position.copy(center).add(new THREE.Vector3(-distance * 0.4, distance * 0.25, -distance * 0.3));
  const span = Math.max(18, distance * 0.55);
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  sun.shadow.camera.near = distance * 0.05;
  sun.shadow.camera.far = distance * 3.2;
  sun.shadow.camera.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
}

window.renderPlate = async ({ subject, frame = 0, night = false }) => {
  const spec = SUBJECTS[subject];
  if (!spec) throw new Error('unknown subject ' + subject);
  hideAll();
  const loaded = await spec.load();
  const roots = rootsOf(loaded);
  for (const root of roots) root.visible = true;
  applyNight(roots, !!night && !!spec.night);
  const box = boxOf(roots);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  if (spec.plinth) {
    const pad = Math.max(sphere.radius * 3.2, 40);
    ground.scale.setScalar(pad);
    ground.position.set(center.x, box.min.y - 0.05, center.z);
    ground.visible = true;
  }
  let dir;
  let distance;
  if (spec.fixed) {
    // Old town, river side: 逍遥楼 sits near (370, 187), 象鼻山 near (-200, 1450).
    center.set(180, 12, 780);
    const yaw = spec.frames ? (frame / spec.frames) * Math.PI * 2 + 0.6 : 0.6;
    dir = new THREE.Vector3(Math.cos(yaw), 0.72, Math.sin(yaw));
    distance = 2100;
  } else {
    const yaw = spec.yaw0 + (frame / spec.frames) * Math.PI * 2;
    dir = new THREE.Vector3(Math.cos(yaw), spec.y, Math.sin(yaw));
    const fov = camera.fov * Math.PI / 180;
    distance = sphere.radius / Math.sin(fov / 2) / (spec.fill || 0.68);
    center.y = box.min.y + (box.max.y - box.min.y) * 0.42;
  }
  look(center, dir, distance);
  renderer.render(scene, camera);
  return canvas.toDataURL('image/webp', 0.8);
};

window.PLATE_SUBJECTS = SUBJECTS;
window.__plateReady = true;
