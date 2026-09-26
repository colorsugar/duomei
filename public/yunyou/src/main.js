import { installPlaceList } from './place-list.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ORIGIN, BOUNDS, WATER, ROADS, BUILDINGS, GREEN, ISLETS, BRIDGES, FOOT } from '../data/geo.js';
import { LANDMARKS } from '../data/landmarks.js';
import { makeTextures, extrudeRing, flatRing, pointInRing, ringBBox, hash, HILL_MATS, loadBakedHill } from './lib.js';
import * as LM from './landmarks.js';
import { DETAIL } from './detail/index.js';
import { mergeStatic } from './mesh-utils.js';
import { createWaterfront, createCruises } from './waterfront.js';
import { createHeritageStreets, ALLEYS, HERITAGE_ROWS } from './heritage-streets.js';
import { createAtmosphere, HORIZON_DAY, HORIZON_NIGHT } from './atmosphere.js';
import { createPost } from './post.js';
import { createKarstHorizon, tintGroundFar } from './karst-horizon.js';
import { createCityFill } from './city-fill.js';
import { createRiverReflection } from './river-renderer.js';
import {createParkFallbacks} from './park-fallbacks.js';
import {createLandmarkLighting} from './landmark-lighting.js';
import {parkBuildingOwner} from './building-ownership.js';
import { createCityMaterial, cityUV } from './city-material.js';
import { createUrbanTrees, setTreeDetail, setTreeLodDistances } from './urban-trees.js';
import { createStreetDistrict } from './street-district.js';
import { createStreetWalk } from './street-walk.js';
import { installMapGestures } from './map-gestures.js';
import { DetailStream } from './detail-stream.js';
import { createExpandedModels } from './expanded-landmarks.js';
import { createSectorStream } from './sector-stream.js';
import { installBlenderModels } from './blender-models.js';
import { kitMats } from './detail/kit.js';
import { heritageMaterials } from './surface-materials.js';

// ---- 投影：WGS84 -> 局部米制（X 东，Z 南），与 data/geo.js 生成脚本一致 ----
const toXZ = (lat, lon) => [(lon - ORIGIN.lon) * ORIGIN.mPerLon, -(lat - ORIGIN.lat) * ORIGIN.mPerLat];
const toLatLon = (x, z) => [ORIGIN.lat - z / ORIGIN.mPerLat, ORIGIN.lon + x / ORIGIN.mPerLon];
const mobileQuery = matchMedia('(max-width: 720px), (pointer: coarse)');
let isMobile = mobileQuery.matches;
let quality = isMobile ? 'balanced' : 'high', walk = null; // 手机从均衡档起步
const effects={reflection:false,shadows:!isMobile,ripples:!isMobile,lights:true};
const qualityDpr = () => quality === 'high' ? Math.min(devicePixelRatio, isMobile ? 1.5 : 2) : quality === 'balanced' ? Math.min(devicePixelRatio, isMobile ? 1.15 : 1.5) : Math.min(devicePixelRatio, 1);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const usePost = () => !isMobile && quality !== 'flow'; // 手机跳过泛光/MSAA，直接 renderer.render
if (isMobile) setTreeLodDistances(55, 160);

// ---- 渲染器 / 场景 / 相机 ----
const app = document.getElementById('app');
// Pixel density is independent of optional reflection and shadow passes.
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(qualityDpr());
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = effects.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // 场景静态、太阳固定：阴影图只在内容变化时重算
let spatialDirty = true;
let dirty = true; // 画面是否需要重绘（相机不动、无动画时跳过渲染）
const invalidate = (shadows = false) => { dirty = true; spatialDirty = true; if (shadows && renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true; };
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.setAttribute('role', 'application');
renderer.domElement.setAttribute('aria-label', '桂林两江四湖 3D 地图，可拖动旋转、双指缩放并点击景点');
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = HORIZON_DAY.clone();
scene.fog = new THREE.FogExp2(HORIZON_DAY.clone(), 0.00021); // 指数雾与天空地平线同色，远山自然隐进空气里
scene.environmentIntensity = 0.6;

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 1, 30000);
camera.position.set(-145, 42, 1180); // 入场更近、更低，从漓江一侧看见象鼻山和水月洞

const controls = new OrbitControls(camera, renderer.domElement);
const gestures = installMapGestures(controls, renderer.domElement);
controls.maxPolarAngle = Math.PI * .475;
controls.minDistance = 25;
controls.maxDistance = 12000;
controls.autoRotateSpeed = 0.35; // Google Earth 式慢转
controls.target.set(-180, 20, 1420); // 对准象山临江侧
// 自动转圈：由开关开启；拖动时停，松手 6 s 后续转；飞行动画期间不转。每帧回写，避免夜景切换/其它逻辑把 autoRotate 掐死后不转。
let spin = false, spinTimer = 0, spinningDrag = false, spinAfter = 0;
controls.autoRotate = spin;
function spinResume() {
  clearTimeout(spinTimer);
  spinAfter = performance.now() + 6000;
  if (reduceMotion) return;
  spinTimer = setTimeout(() => { if (spin && !fly) { controls.autoRotate = true; invalidate(); } }, 6000);
}
controls.addEventListener('start', () => { fly = null; spinningDrag = true; controls.autoRotate = false; clearTimeout(spinTimer); });
controls.addEventListener('end', () => { spinningDrag = false; spinResume(); });

const hemi = new THREE.HemisphereLight(0xe8f1ff, 0x8a9278, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.55);
sun.position.set(1400, 2600, 2200);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -1600, right: 1600, top: 1700, bottom: -1700, near: 500, far: 7000 });
sun.shadow.bias = -0.00001;
sun.shadow.normalBias = 0.035; // close-view joinery needs contact shadows at centimetre scale
scene.add(sun, sun.target);
const shadowFocus = new THREE.Vector3(-150,0,1400);
function focusShadows(target,span=350) {
  const delta=target.clone().sub(shadowFocus);sun.position.add(delta);shadowFocus.copy(target);
  sun.target.position.copy(target);sun.target.updateMatrixWorld();
  const r=THREE.MathUtils.clamp(span*.9,40,1700),c=sun.shadow.camera;
  Object.assign(c,{left:-r,right:r,top:r,bottom:-r});c.updateProjectionMatrix();invalidate(true);
}
focusShadows(shadowFocus);


const TEX = makeTextures();
const M = LM.makeMaterials();
let bakedElephant;
try { bakedElephant = await loadBakedHill(new URL('../assets/models/xiangbishan.bin', import.meta.url), LM.XBS); } catch (err) { console.warn('Using compact hill fallback', err); }
const shadowed = (o, cast = true, receive = true) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } }); return o; };

// ---- 地面 + 网格 ----
const groundW = BOUNDS.x1 - BOUNDS.x0, groundD = BOUNDS.z1 - BOUNDS.z0;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshStandardMaterial({ color: 0xcfc6b6, map: TEX.ground, roughness: 0.95 }));
tintGroundFar(ground.material); // 城外渐变成田野，地平线不再是一块米色平板
TEX.ground.repeat.set(60000 / 180, 60000 / 180); // 平面 UV 为 0..1：每 180 m 平铺一次，原先的 1/80 等于把贴图拉成纯色
ground.rotation.x = -Math.PI / 2;
ground.position.set((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
ground.receiveShadow = true;
scene.add(ground);
// 远景峰林 / 城区补建延到首帧后空闲再建，避免挡住可交互
let cityFill = null;
const idle = () => new Promise(resolve => 'requestIdleCallback' in window ? requestIdleCallback(resolve,{timeout:900}) : setTimeout(resolve,25));
const grid = new THREE.GridHelper(Math.max(groundW, groundD), Math.round(Math.max(groundW, groundD) / 500), 0xb8b2a2, 0xd8d3c6);
grid.position.set(ground.position.x, 0.26, ground.position.z);
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

// ---- 水系 / 绿地 / 岛 ----
const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f6b58, roughness: 0.07, metalness: 0 }); // 流畅档的轻量水面
// 象鼻山东北角：OSM 把象鼻脚下画成陆地，实景象鼻立在两江汇流的水里、水月洞半浸水——补一块水面
WATER.push({ o: [[-156, 1354], [-106, 1354], [-106, 1414], [-156, 1414]], h: [] });
const water = new THREE.Mesh(mergeGeometries(WATER.map((p) => flatRing(p.o, p.h, 0.3))), waterMat);
water.receiveShadow = true;
scene.add(water);
const atmosphere = createAtmosphere(waterMat); scene.add(atmosphere.sky);
atmosphere.bakeEnvironment(renderer); scene.environment = atmosphere.envs.day; // 天空烘出的环境光：金属、琉璃和水面映出真实天色
const post = createPost(renderer, scene, camera);
const riverReflection = createRiverReflection(water.geometry,{mobile:isMobile}); scene.add(riverReflection.water); riverReflection.setQuality('flow'); water.visible=true;
// 流畅档水面也跟随日夜色彩。
waterMat.userData.dayColor = waterMat.color.clone();
const waterNight = new THREE.Color(0x07130f), waterEm = new THREE.Color(0x10281f);
const greenMat = new THREE.MeshStandardMaterial({ color: 0x7fa85e, map: TEX.grass, roughness: 0.92 });
const green = new THREE.Mesh(mergeGeometries(GREEN.map((p) => flatRing(p.o, p.h, 0.22))), greenMat); // 低于水面：公园边界伸进江湖的部分让水面盖住
green.receiveShadow = true;
scene.add(green);
if (ISLETS.length) {
  const islets = new THREE.Mesh(mergeGeometries(ISLETS.map((p) => flatRing(p.o, p.h, 0.55))), new THREE.MeshStandardMaterial({ color: 0x9bb87a, map: TEX.grass, roughness: 0.92 }));
  islets.receiveShadow = true;
  scene.add(islets);
}

// ---- 道路 / 铁路：折线拉成带状面 ----
function ribbon(lines, width, y) {
  const pos = [], idx = [];
  for (const pts of lines) {
    if (pts.length < 2) continue;
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [ax, az] = pts[Math.max(i - 1, 0)], [bx, bz] = pts[Math.min(i + 1, pts.length - 1)];
      let dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const nx = -dz * width / 2, nz = dx * width / 2;
      pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const ringDist = (x, z, ring) => { let best = Infinity; for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; };
// 王城城墙：跨墙或贴着城门的 OSM 建筑不画（实景墙外是林荫与门前广场），连同它们的地基和一圈人行道
const droppedFootprints = BUILDINGS.map((b) => b.o).filter((o) => {
  const bb = ringBBox(o), cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2, inside = o.map(([x, z]) => pointInRing(x, z, FOOT.wangcheng.o));
  return (inside.some(Boolean) && !inside.every(Boolean)) || (!inside[0] && ringDist(cx, cz, FOOT.wangcheng.o) < 22) || Math.hypot(cx - FOOT.zhengyangmen.c[0], cz - FOOT.zhengyangmen.c[1]) < 60;
});
const nearDropped = (x, z) => droppedFootprints.some((o) => pointInRing(x, z, o) || ringDist(x, z, o) < 25);
// Bridge decks are modelled separately: drop road segments whose midpoint lies on water so no asphalt ribbon floats on the river.
const waterBoxes = WATER.map((p) => ringBBox(p.o));
const overWater = (x, z) => WATER.some((p, i) => { const b = waterBoxes[i]; return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && pointInRing(x, z, p.o) && !p.h.some((h) => pointInRing(x, z, h)); });
const dryRuns = (lines, cls) => lines.flatMap((pts) => { const runs = []; let run = [];
  for (let i = 0; i < pts.length; i++) { const mx = i > 0 ? (pts[i][0] + pts[i - 1][0]) / 2 : 0, mz = i > 0 ? (pts[i][1] + pts[i - 1][1]) / 2 : 0;
    const wet = i > 0 && (overWater(mx, mz) || (cls === 'pedestrian' && nearDropped(mx, mz)));
    if (wet) { if (run.length > 1) runs.push(run); run = [pts[i]]; } else run.push(pts[i]); }
  if (run.length > 1) runs.push(run); return runs; });
const roadGroup = new THREE.Group();
const roadSpec = { trunk: [16, 0x5b6265], primary: [12, 0x555c5e], secondary: [9, 0x656b6b], tertiary: [7, 0x6b706c], minor: [5, 0x777970], pedestrian: [3.5, 0xe6dfd0] };
for (const [cls, [w, color]] of Object.entries(roadSpec)) {
  const m = new THREE.Mesh(ribbon(dryRuns(ROADS[cls], cls), w, 0.7), new THREE.MeshStandardMaterial({ color, roughness: 1, userData: { day: color } }));
  m.receiveShadow = true;
  roadGroup.add(m);
}
roadGroup.add(new THREE.Mesh(ribbon(ROADS.rail, 4, 0.8), new THREE.MeshStandardMaterial({ color: 0x7a7f86, userData: { day: 0x7a7f86 } })));
scene.add(roadGroup);

// ---- 城市建筑（OSM 真实轮廓拉伸），跳过已手工建模的地标足迹 ----
const modelled = ['xiaoyaolou', 'chengyundian', 'chengyunmen', 'zhengyangmen', 'rongshulou', 'dongzhenmen', 'rita', 'yueta', 'mulongta', 'shelita'].map((k) => FOOT[k].c);
const hillRings = [FOOT.xiangbishan.o, FOOT.duxiufeng.o, FOOT.diecaishan.o];
const onHill = (x, z) => hillRings.some((r) => pointInRing(x, z, r)) || Math.hypot(x - 596, z + 392) < 70 || Math.hypot((x + 198) / 76, (z - 1438) / 96) < 1;
const palette = [0xe2d8c8, 0xd5cfc0, 0xd0d2cc, 0xddd4c4, 0xc8ccd2, 0xe0d6c6].map((c) => new THREE.Color(c));
// 实景航拍：市区楼顶多为灰色，王城内师大校舍黄墙灰瓦——屋顶压暗，地标铜/琉璃才跳出来
const cityRoof = new THREE.Color(0x7a7e7c), campusWall = new THREE.Color(0xe4c46c), campusRoof = new THREE.Color(0x4a5056);
const bGeos = [],cityCells=new Map();
BUILDINGS.forEach((b, i) => {
  const bb = ringBBox(b.o), cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2;
  if (parkBuildingOwner(b.o) || onHill(cx, cz) || modelled.some(([x, z]) => Math.hypot(x - cx, z - cz) < 28)) return;
  if (droppedFootprints.includes(b.o)) return;
  const g = extrudeRing(b.o, b.h);cityUV(g);
  const inWangcheng = pointInRing(cx, cz, FOOT.wangcheng.o);
  const c = inWangcheng ? campusWall : palette[Math.floor(hash(i) * palette.length)], n = g.attributes.position.count;
  const day = new Float32Array(n * 3),normal=g.attributes.normal;
  const roof = inWangcheng ? campusRoof : cityRoof;
  for (let k=0;k<n;k++){const dv=normal.getY(k)>.5?roof:c;day.set([dv.r,dv.g,dv.b],k*3);}
  g.setAttribute('color',new THREE.BufferAttribute(day,3));
  const cell=Math.floor(cx/250)+":"+Math.floor(cz/250);if(!cityCells.has(cell))cityCells.set(cell,[]);cityCells.get(cell).push(g);
  bGeos.push(g);
});
const cityGroup = new THREE.Group();
const parkFallbacks=createParkFallbacks();cityGroup.add(parkFallbacks.root);
const landmarkLighting=createLandmarkLighting(scene);
const cityMat = createCityMaterial(); // 立面窗格与屋顶分别着色
if (bGeos.length) {
  for(const geos of cityCells.values()){const mesh=shadowed(new THREE.Mesh(mergeGeometries(geos),cityMat));cityGroup.add(mesh);geos.forEach(g=>g.dispose());}
}

// ---- 地标：逐个手工模型 ----
const models = {
  xiangbishan: LM.xiangbishan(FOOT, M, bakedElephant),
  ...LM.twinPagodas(FOOT, M),
  xiaoyaolou: LM.xiaoyaolou(FOOT, M),
  wangcheng: LM.wangcheng(FOOT, M),
  fuboshan: LM.fuboshan(FOOT, M),
  diecaishan: LM.diecaishan(FOOT, M),
  gunanmen: LM.gunanmen(FOOT, M),
  mulongta: LM.mulongta(FOOT, M),
  jiefangqiao: LM.jiefangqiao(FOOT, M),
  shelita: LM.shelita(FOOT, M),
};

// 树：绿地内按面积撒点；山体上按坡度撒（缓坡长树、陡壁露岩）——首帧后再算，避免 20s+ 主线程长任务挡住可交互
let crownMat;
const urbanTreeGroups=[];
function buildAndLoadUrbanTrees() {
  const pts = [];
  GREEN.forEach((p, pi) => {
    const bb = ringBBox(p.o), area = (bb.x1 - bb.x0) * (bb.z1 - bb.z0);
    const want = Math.min(420, Math.round(area / 520)); // 观感：公园树要成林，但不能回到卡顿密度
    for (let k = 0, tries = 0; k < want && tries < want * 6; tries++) {
      const x = bb.x0 + hash(`${pi}x${tries}`) * (bb.x1 - bb.x0), z = bb.z0 + hash(`${pi}z${tries}`) * (bb.z1 - bb.z0);
      if (!pointInRing(x, z, p.o) || p.h.some((h) => pointInRing(x, z, h)) || onHill(x, z) || modelled.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 30)) continue;
      pts.push([x, z, 0, 2.6 + hash(`${pi}s${tries}`) * 3]);
      k++;
    }
  });
  // 湖岸林带：沿水体外轮廓向外 6~16 m 撒树（实景四湖沿岸为连续榕树/樟树带）
  // ponytail: 只用建筑包围盒排除，不查道路；岸边道路多在 20 m 外，误种概率低
  const bBoxes = BUILDINGS.map((b) => ringBBox(b.o));
  const blocked = (x, z) => bBoxes.some((bb) => x > bb.x0 && x < bb.x1 && z > bb.z0 && z < bb.z1) || onHill(x, z) || modelled.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 30);
  // 两江四湖是绕市中心的一个整环，湖的内岸是水体多边形的"洞"边，所以外环和洞边都要走
  const inWater = (x, z) => WATER.some((p) => pointInRing(x, z, p.o) && !p.h.some((h) => pointInRing(x, z, h)));
  WATER.forEach((w, wi) => [w.o, ...w.h].forEach((r, ri) => {
    for (let i = 0; i < r.length; i++) {
      const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length], L = Math.hypot(bx - ax, bz - az);
      if (L < 1) continue;
      const nx = (bz - az) / L, nz = -(bx - ax) / L;
      for (let s = hash(`w${wi}${ri}${i}`) * 5, k = 0; s < L; s += 10, k++) for (const row of [0, 1]) {
        const t = s / L, ex = ax + (bx - ax) * t, ez = az + (bz - az) * t, off = 5 + row * 10 + hash(`w${wi}${ri}${i}${k}o${row}`) * 8;
        const sgn = inWater(ex + nx * 3, ez + nz * 3) ? -1 : 1; // 朝陆地一侧
        const x = ex + nx * off * sgn, z = ez + nz * off * sgn;
        if (inWater(x, z) || blocked(x, z)) continue;
        pts.push([x, z, 0, 3.5 + hash(`w${wi}${ri}${i}${k}s${row}`) * 4]);
      }
    }
  }));
  const hills = [];
  for (const mdl of Object.values(models)) mdl.traverse((o) => { if (o.userData.heightAt) hills.push(o); });
  hills.forEach((h, hi) => {
    if (hi === 0) return; // 象鼻山的 Blender 模型自带树冠
    h.geometry.computeBoundingBox();
    const bb = h.geometry.boundingBox, hAt = h.userData.heightAt;
    for (let z = bb.min.z; z < bb.max.z; z += hi===0?5:8) for (let x = bb.min.x; x < bb.max.x; x += hi===0?5:8) {
      const jx = x + hash(`h${hi}${x}${z}a`) * 4.5, jz = z + hash(`h${hi}${x}${z}b`) * 4.5;
      const y = hAt(jx, jz);
      if (y < 2.5 || Math.hypot(jx - 138, jz + 343) < 8 || Math.hypot(jx + 184, jz - 1432) < 6) continue; // 独秀亭、普贤塔处不种树
      const slope = Math.hypot(hAt(jx + 2, jz) - hAt(jx - 2, jz), hAt(jx, jz + 2) - hAt(jx, jz - 2)) / 4;
      if (slope > 0.9 || hash(`h${hi}${x}${z}c`) < slope * 0.6) continue;
      pts.push([jx, jz, y - 0.8, (hi===0?2.5:1.7) + hash(`h${hi}${x}${z}s`) * 1.3]); // 山顶乔木冠幅 7–10 m
    }
  });
  // 王城城墙内外一圈大榕树、樟树（实景墙头墙脚皆是浓荫），正阳门前两棵特大榕树
  const wall = FOOT.wangcheng.o, [gx, gz] = FOOT.zhengyangmen.c;
  for (let i = 0; i < wall.length; i++) {
    const [ax, az] = wall[i], [bx, bz] = wall[(i + 1) % wall.length], L = Math.hypot(bx - ax, bz - az);
    if (L < 1) continue;
    let nx = (bz - az) / L, nz = -(bx - ax) / L; if (pointInRing(ax + (bx - ax) / 2 + nx * 3, az + (bz - az) / 2 + nz * 3, wall)) { nx = -nx; nz = -nz; }
    for (let s = 6 + hash(`wall${i}`) * 6; s < L; s += 12 + hash(`wall${i}${s}`) * 5) {
      const ex = ax + (bx - ax) * s / L, ez = az + (bz - az) * s / L;
      if (Math.hypot(ex - gx, ez - gz) < 16) continue; // 城门洞口留空
      for (const [off, big] of [[7, 1], [-6, .8]]) {
        const x = ex + nx * off, z = ez + nz * off; if (inWater(x, z) || onHill(x, z)) continue;
        pts.push([x, z, 0, (4.2 + hash(`wt${i}${s}${off}`) * 2.2) * big, off > 0 && hash(`ws${i}${s}`) < .55 ? 'banyan' : 'camphor']);
      }
    }
  }
  // 王城内：校园空地与中轴两侧的大树（避开楼房、中轴甬道和独秀峰）
  const wbb = ringBBox(wall);
  for (let z = wbb.z0 + 10; z < wbb.z1 - 10; z += 13) for (let x = wbb.x0 + 10; x < wbb.x1 - 10; x += 13) {
    const jx = x + (hash(`wi${x}${z}a`) - .5) * 9, jz = z + (hash(`wi${x}${z}b`) - .5) * 9;
    if (!pointInRing(jx, jz, wall) || ringDist(jx, jz, wall) < 12 || onHill(jx, jz) || blocked(jx, jz) || hash(`wi${x}${z}k`) < .3) continue;
    if (Math.abs(jx - gx - (jz - gz) * -0.147) < 12) continue; // 中轴甬道
    pts.push([jx, jz, 0, 3.6 + hash(`wi${x}${z}s`) * 2.4, hash(`wi${x}${z}t`) < .4 ? 'banyan' : 'camphor']);
  }
  // 拆掉的贴墙楼原址补成林荫地
  for (const [fi, o] of droppedFootprints.entries()) { const bb = ringBBox(o);
    for (let z = bb.z0; z < bb.z1; z += 11) for (let x = bb.x0; x < bb.x1; x += 11) {
      const jx = x + hash(`df${fi}${x}${z}a`) * 7, jz = z + hash(`df${fi}${x}${z}b`) * 7;
      if (!pointInRing(jx, jz, o) || pointInRing(jx, jz, wall) || Math.hypot(jx - gx, jz - gz) < 22) continue;
      pts.push([jx, jz, 0, 3.8 + hash(`df${fi}${x}${z}s`) * 2.4, hash(`df${fi}${x}${z}t`) < .5 ? 'banyan' : 'camphor']);
    } }
  // 正阳门两侧的古榕：冠幅约 30 m
  const out = (() => { const [ax, az] = [gx, gz]; for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!pointInRing(ax + d[0] * 20, az + d[1] * 20, wall)) return d; return [0, 1]; })();
  const side = [-out[1], out[0]];
  for (const k of [-1, 1]) pts.push([gx + out[0] * 16 + side[0] * k * 17, gz + out[1] * 16 + side[1] * k * 17, 0, 10.5, 'banyan']);
  createUrbanTrees(pts.map(([x,z,y,r,sp],i)=>[x,z,y,r*.85,sp||(i%4?'camphor':'banyan')])).then(group=>{cityGroup.add(group);urbanTreeGroups.push(group);invalidate();}).catch(e=>console.warn('Urban trees',e));
  window.__treeCount = pts.length;
}
scene.add(cityGroup);

Object.assign(models,createExpandedModels(M));
const pickables = [];
const landmarkGroup = new THREE.Group();
for (const lm of LANDMARKS) {
  const [x, z] = toXZ(lm.lat, lm.lon);
  lm.x = x; lm.z = z; lm.top = lm.h || 0;
  const mdl = models[lm.id];
  if (mdl) {
    mergeStatic(mdl);
    shadowed(mdl);
    mdl.traverse((o) => { if (o.isMesh) { o.userData.lm = lm; pickables.push(o); } });
    landmarkGroup.add(mdl);
    lm.top = mdl.userData.top ?? lm.top;
    if (lm.kind !== 'hill' && lm.id !== 'wangcheng') { lm.x = mdl.position.x || lm.x; lm.z = mdl.position.z || lm.z; }
  }
}
landmarkGroup.add(shadowed(LM.bridges(BRIDGES, FOOT, M)), shadowed(LM.dongzhenmen(FOOT, M)));
scene.add(landmarkGroup);

// Riverside remains in the shared world while landmark detail changes.
const waterfront = createWaterfront(TEX), cruises = createCruises();
const heritage = createHeritageStreets(TEX), streetDistrict=createStreetDistrict();
scene.add(waterfront.group, cruises.group, shadowed(heritage.group),streetDistrict.group);
async function buildCityFill() {
  // 空地块补建：OSM 没有记录建筑的街坊按街道方向补出多层住宅，避开水、绿地、山体、地标和岸线树带
  const segDist = (x, z, paths) => { let best = Infinity; for (const p of paths) for (let i = 1; i < p.length; i++) { const [ax, az] = p[i - 1], [bx, bz] = p[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; };
  const oldTown = (x, z) => x > 30 && x < 370 && z > 95 && z < 256; // 东西巷：只补灰瓦坡顶的低层老房子
  const nearWater = (x, z) => [[24,0],[-24,0],[0,24],[0,-24]].some(([dx,dz]) => WATER.some((p) => pointInRing(x+dx, z+dz, p.o) && !p.h.some((h) => pointInRing(x+dx, z+dz, h))));
  const landmarkXZ = LANDMARKS.filter((l) => l.kind !== 'lake' && l.kind !== 'street' && l.kind !== 'river').map((l) => toXZ(l.lat, l.lon));
  const blocked = (x, z) => onHill(x, z) || pointInRing(x, z, FOOT.wangcheng.o) || ringDist(x, z, FOOT.wangcheng.o) < 18 || nearWater(x, z)
    || modelled.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 45) || landmarkXZ.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 55)
    || Math.hypot(x - 378, z - 187) < 48 || Math.hypot(x + 198, z - 1450) < 115 || (oldTown(x, z) && (segDist(x, z, ALLEYS) < 5 || segDist(x, z, HERITAGE_ROWS) < 9));
  cityFill = await createCityFill({ material: cityMat, blocked, oldTown, taken: streetDistrict.collision.map((c) => c.box), step: isMobile ? 28 : 21, yieldEvery: isMobile ? 24 : 48 });
  cityGroup.add(cityFill); window.__infill = cityFill.userData.count; invalidate(true);
}
let boatMotion = false;

// ---- 标签 ----
const labels = { main: [], lake: [] };
const CORE_ROUTE = ['xiangbishan', 'rita', 'yueta', 'binjianglu', 'jiefangqiao', 'xiaoyaolou', 'dongxixiang']; // 精华一线：象山—双塔—滨江路—解放桥—逍遥楼—东西巷
function label(text, cls, x, y, z) {
  const el = document.createElement('div');
  el.className = `lbl ${cls}`;
  if (cls === 'main') { const pill = document.createElement('span'); pill.textContent = text; el.append(pill); } else el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.position.set(x, y, z);
  labels[cls].push(obj);
  return obj;
}
for (const lm of LANDMARKS) {
  const l = label(lm.name, lm.kind === 'lake' ? 'lake' : 'main', lm.x, lm.top + 6, lm.z);
  if (CORE_ROUTE.includes(lm.id)) l.element.classList.add('core');
  if (lm.kind !== 'lake') { l.element.classList.add('hit'); l.element.addEventListener('click', () => select(lm)); }
  scene.add(l);
}

// ---- 侧栏列表 / 简介卡片 / 飞行 ----
const card = document.getElementById('card');
const cardPhoto = document.getElementById('card-photo');
const cardPhotoImage = cardPhoto.querySelector('img');
const cardPhotoCaption = cardPhoto.querySelector('figcaption');
let cardPhotoRequest = 0;
const [cx0, cz0] = toXZ(25.2836, 110.2949); // 独秀峰，用于显示到市中心距离
const list=installPlaceList({landmarks:LANDMARKS,onSelect:lm=>select(lm),distance:lm=>Math.hypot(lm.x-cx0,lm.z-cz0)});
document.getElementById('card-close').addEventListener('click', () => { card.hidden = true; peek.hidden = true; lightbox.hidden = true; document.body.classList.remove('card-open'); setActive(null); });

// Card gallery: blurred background + uncropped photo, arrows/dots/swipe, lightbox. Photos load only when shown.
const photoBg = cardPhoto.querySelector('.ph-bg'), photoCount = cardPhoto.querySelector('.ph-count'), photoDots = cardPhoto.querySelector('.ph-dots');
const lightbox = document.getElementById('lightbox'), lightboxImg = lightbox.querySelector('img'), lightboxCaption = lightbox.querySelector('.lb-caption');
let gallery = [], galleryIndex = 0, cardName = '';
function credit(el, photo) {
  el.textContent = photo.caption || '桂林实景';
  if (photo.source) { const a = document.createElement('a'); a.href = photo.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '来源：' + (photo.credit || '原图页面'); el.append(document.createElement('br'), a); }
}
function showPhoto(i) {
  if (!gallery.length) return;
  galleryIndex = (i + gallery.length) % gallery.length;
  const photo = gallery[galleryIndex], request = ++cardPhotoRequest;
  cardPhotoImage.dataset.loading = 'true';
  cardPhotoImage.alt = photo.alt || `${cardName}实拍`;
  credit(cardPhotoCaption, photo);
  photoCount.textContent = `${galleryIndex + 1} / ${gallery.length}`;
  photoDots.replaceChildren(...gallery.map((_, k) => { const d = document.createElement('i'); if (k === galleryIndex) d.className = 'on'; return d; }));
  cardPhotoImage.onload = () => { if (request === cardPhotoRequest) { delete cardPhotoImage.dataset.loading; photoBg.style.backgroundImage = `url("${photo.src}")`; } };
  cardPhotoImage.onerror = () => {
    if (request !== cardPhotoRequest) return;
    gallery.splice(galleryIndex, 1); // drop a failed image and keep the rest of the set
    if (gallery.length) showPhoto(galleryIndex); else { cardPhoto.hidden = true; card.classList.remove('has-photo'); }
  };
  cardPhotoImage.src = photo.src;
  if (!lightbox.hidden) openLightbox();
  new Image().src = gallery[(galleryIndex + 1) % gallery.length].src; // warm the next one
}
function updateCardPhoto(lm) {
  cardName = lm.name; gallery = [...(lm.gallery || (lm.photo ? [lm.photo] : []))];
  cardPhoto.hidden = !gallery.length; card.classList.toggle('has-photo', !!gallery.length);
  cardPhoto.classList.toggle('single', gallery.length < 2);
  cardPhotoImage.removeAttribute('src'); photoBg.style.backgroundImage = '';
  if (gallery.length) showPhoto(0);
}
function openLightbox() { const photo = gallery[galleryIndex]; lightboxImg.src = photo.src; lightboxImg.alt = photo.alt || ''; credit(lightboxCaption, photo); lightbox.hidden = false; }
cardPhoto.querySelector('.ph-prev').addEventListener('click', () => showPhoto(galleryIndex - 1));
cardPhoto.querySelector('.ph-next').addEventListener('click', () => showPhoto(galleryIndex + 1));
cardPhoto.querySelector('.ph-open').addEventListener('click', () => { if (!swiped) openLightbox(); });
lightbox.querySelector('.lb-prev').addEventListener('click', () => showPhoto(galleryIndex - 1));
lightbox.querySelector('.lb-next').addEventListener('click', () => showPhoto(galleryIndex + 1));
lightbox.querySelector('.lb-close').addEventListener('click', () => { lightbox.hidden = true; });
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.hidden = true; });
addEventListener('keydown', (e) => {
  if (!lightbox.hidden) { if (e.key === 'Escape') lightbox.hidden = true; else if (e.key === 'ArrowLeft') showPhoto(galleryIndex - 1); else if (e.key === 'ArrowRight') showPhoto(galleryIndex + 1); }
});
let swipeX = null, swiped = false;
for (const el of [cardPhoto, lightbox]) {
  el.addEventListener('pointerdown', (e) => { swipeX = e.clientX; swiped = false; });
  el.addEventListener('pointerup', (e) => { if (swipeX == null) return; const dx = e.clientX - swipeX; swipeX = null; if (Math.abs(dx) > 40 && gallery.length > 1) { swiped = true; showPhoto(galleryIndex + (dx < 0 ? 1 : -1)); } });
}

// Landmark clicks show a small name bar; the full card opens on request (or automatically if the visitor opts in).
const peek = document.getElementById('peek'), peekName = peek.querySelector('.peek-name');
const autoCardInput = document.getElementById('t-autocard');
try { autoCardInput.checked = localStorage.getItem('yunyou-autocard') === '1'; } catch {}
autoCardInput.addEventListener('change', () => { try { localStorage.setItem('yunyou-autocard', autoCardInput.checked ? '1' : '0'); } catch {} });
function openCard() { card.hidden = false; peek.hidden = true; document.body.classList.add('card-open'); }
document.getElementById('peek-open').addEventListener('click', openCard);
document.getElementById('peek-close').addEventListener('click', () => { peek.hidden = true; setActive(null); });

// ---- 细节 LOD：选中地标时按需加载 src/detail/<id>.js 的精模；加载后按相机距离在简模/精模间切换（关简介不再回退，避免模型"变来变去"） ----
const detailGroup = new THREE.Group();
scene.add(detailGroup);
const detail = { cache: {} };
const LOD_DIST = isMobile ? 800 : 1100;
async function buildDetail(id, stillWanted) {
  const lm=LANDMARKS.find(l=>l.id===id), mod=await DETAIL[id]();
  await idle();
  if (!stillWanted() || gestures.active || spinningDrag || fly || document.hidden) return null;
  const obj=mod.build({THREE,F:FOOT,M,TEX,lm,night:()=>night});
  Object.assign(obj.userData,{mode:mod.mode??'replace',night:mod.night,lm,lights:[],nearMeshes:[]});
  mergeStatic(obj);shadowed(obj,true,true);
  obj.traverse(o=>{if(o.isMesh){o.userData.lm=lm;pickables.push(o);if(o.userData.nearDetail)obj.userData.nearMeshes.push(o);}if(o.isLight)obj.userData.lights.push(o);});
  obj.userData.nearDetailVisible=true;
  obj.userData.night?.(obj,detailNightOn);
  try {await renderer.compileAsync(obj,camera,scene);} catch(error){console.warn('Detail shader warmup',error);}
  obj.visible=false;detailGroup.add(obj);detail.cache[id]=obj;invalidate(true);return obj;
}
function releaseDetail(id,obj) {
  const removed=new Set();obj.traverse(o=>removed.add(o));
  obj.removeFromParent();delete detail.cache[id];
  if(models[id])models[id].visible=true;
  for(let i=pickables.length-1;i>=0;i--)if(removed.has(pickables[i]))pickables.splice(i,1);
  const retainedG=new Set(),retainedM=new Set(Object.values(M));
  // Shared material packs survive eviction; instance/geometry buffers do not.
  for(const m of Object.values(kitMats(TEX)))retainedM.add(m);
  for(const m of Object.values(heritageMaterials(TEX)))retainedM.add(m);
  scene.traverse(o=>{if(o.geometry)retainedG.add(o.geometry);if(o.material)for(const m of [].concat(o.material))retainedM.add(m);});
  const retainedT=new Set(),collect=v=>{if(v?.isTexture)retainedT.add(v);else if(v&&typeof v==='object')for(const t of Object.values(v))if(t?.isTexture)retainedT.add(t);};
  for(const v of Object.values(TEX))collect(v);
  for(const m of retainedM)if(m)for(const v of Object.values(m))if(v?.isTexture)retainedT.add(v);
  const geos=new Set(),mats=new Set(),textures=new Set();
  obj.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.isInstancedMesh)o.dispose();if(o.material)for(const m of [].concat(o.material))mats.add(m);});
  for(const g of geos)if(!retainedG.has(g))g.dispose();
  for(const m of mats)if(!retainedM.has(m)){for(const v of Object.values(m))if(v?.isTexture&&!retainedT.has(v))textures.add(v);m.dispose();}
  for(const t of textures)t.dispose();
  invalidate(true);
}
const stream=new DetailStream({load:buildDetail,dispose:releaseDetail,limit:isMobile?3:6,paused:()=>gestures.active||spinningDrag||!!fly||document.hidden});
const sectors=createSectorStream({scene,materials:{water:waterMat,green:new THREE.MeshStandardMaterial({color:0x8da773,roughness:1}),road:new THREE.MeshStandardMaterial({color:0xa8a49b,roughness:1,side:THREE.DoubleSide}),building:cityMat},invalidate,paused:()=>gestures.active||spinningDrag||!!fly||document.hidden,mobile:()=>isMobile,visibility:()=>({road:document.getElementById('t-roads').checked,building:document.getElementById('t-city').checked})});
const blenderModels=installBlenderModels({droppedFootprints,onRegions:parkFallbacks.update,scene,camera,landmarks:LANDMARKS,models,detail,pickables,invalidate,paused:()=>gestures.active||spinningDrag||!!fly||document.hidden,mobile:()=>isMobile});
document.getElementById('model-version').addEventListener('change',e=>{blenderModels.setEnabled(e.target.value==='blender');for(const o of Object.values(models))o.visible=true;nextStreamCheck=0;invalidate(true);});
let nextStreamCheck=0;
function requestNearbyDetails(now=performance.now()) {
  if(now<nextStreamCheck)return;
  nextStreamCheck=now+350;
  sectors.update(camera,activeLandmark);
  landmarkLighting.focus(activeLandmark);
  // city-far / 二级 GLB 等首帧后再拉，别和首屏可交互抢带宽
  if(firstFramePainted)blenderModels.update(activeLandmark);
  stream.limit=isMobile?3:6;
  const candidates=LANDMARKS.filter(l=>DETAIL[l.id]&&(!blenderModels.enabled||!blenderModels.supports(l.id))).map(l=>({l,d:camera.position.distanceTo(new THREE.Vector3(l.x,(l.h||0)*.3,l.z))}));
  const wanted=candidates.filter(({l,d})=>d<Math.min(isMobile?850:1250,Math.max(260,(l.span||400)*1.35)))
    .sort((a,b)=>(a.l===activeLandmark?-10000:a.d)-(b.l===activeLandmark?-10000:b.d)).slice(0,isMobile?2:3).map(x=>x.l.id);
  stream.update(wanted);
}
function showDetail(){nextStreamCheck=0;invalidate();}
const _lmPos = new THREE.Vector3();
function updateLod() {
  for(const obj of Object.values(models))obj.visible=true;
  let best=null,bestD=Infinity;
  for(const obj of Object.values(detail.cache)) {
    const lm=obj.userData.lm,d=camera.position.distanceTo(_lmPos.set(lm.x,0,lm.z));
    const enter=Math.min(isMobile?850:1250,Math.max(260,(lm.span||400)*1.35));
    const show=stream.wanted.includes(lm.id)&&d<enter*(obj.visible?1.15:1);
    if(obj.visible!==show){obj.visible=show;invalidate(true);}
    if(obj.userData.mode==='replace'&&models[lm.id])models[lm.id].visible=!show;
    const near=show&&d<(isMobile?125:180)*(obj.userData.nearDetailVisible?1.15:1);
    if(near!==obj.userData.nearDetailVisible){obj.userData.nearDetailVisible=near;for(const m of obj.userData.nearMeshes)m.visible=near;if(obj.userData.nearMeshes.length)invalidate(true);}
    for(const l of obj.userData.lights)l.visible=false;
    if(effects.lights&&night&&show&&d<LOD_DIST&&d<bestD){best=obj;bestD=d;}
  }
  if(best)for(const l of best.userData.lights)l.visible=true;
  blenderModels.applyVisibility();
}

// ---- 夜景：参考 techartist home-sweet-home —— modeCur 向 modeTarget 指数逼近，灯光/雾色/自发光按 m 插值，不是硬切 ----
let night = false; // LOD 用：m>0.5 视为夜
let modeTarget = 0, modeCur = 0, detailNightOn = false;
const C = (h) => new THREE.Color(h);
const hemiSkyL = C(0xe8f1ff), hemiSkyD = C(0x7b98c5);
const hemiGndL = C(0x8a9278), hemiGndD = C(0x28374a);
const sunDay = C(0xfff1d0), sunNight = C(0x93a9d6);
const groundDay = C(0xb4b3ab), groundNight = C(0x76818d); // 城区地面用中性浅灰铺装色
const greenDay = C(0x658259), greenNight = C(0x547565);
const crownDay = C(0xffffff), crownNight = C(0x2e3d30);
const cityDay = C(0xffffff), cityNight = C(0xf2ebe0);
const sunDayPos = new THREE.Vector3(1400, 2600, 2200), sunNightPos = new THREE.Vector3(-900, 420, -1600);
// 地标自发光与水面倒影共同表现夜景；流畅档可关闭反射。
const stars = (() => {
  const n = isMobile ? 180 : 320, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random();
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
    const r = 6000 + Math.random() * 2500;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.55 + 800;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xe8f0ff, size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = -1; scene.add(pts); return pts;
})();

// 自发光目标（夜景端）：白天 intensity=0
const glow = [
  [M.copper, 0xffc94a, 1.25], [M.copperRoof, 0xffb043, 1.0],
  [M.glaze, 0xd9e8ff, 1.1], [M.glazeRoof, 0x9fd0ff, 0.9], [M.silver, 0xd9e8ff, 0.8],
  [M.wall, 0xffcf8a, 0.55], [M.column, 0xff7a4a, 0.35], [M.tile, 0x30343a, 0.5],
  [M.stone, 0x6a5a3e, 0.35], [M.stoneBox, 0x6a5a3e, 0.35], [M.marble, 0xbfb59e, 0.4], [M.brick, 0x7a5a3a, 0.4], [M.pale, 0xbfb59e, 0.5],
];
for (const [mat, hex] of glow) { mat.emissive.setHex(hex); mat.emissiveIntensity = 0; if (mat.map) mat.emissiveMap = mat.map; }
for (const m of HILL_MATS) { m.emissive.setHex(0x8a8f78); m.emissiveIntensity = 0; if (m.map) m.emissiveMap = m.map; }

const roadNight = C(0x596571);
let shadowMode = -1;
function applyMode(m) {
  const lighting=effects.lights?m:0;
  scene.background.copy(HORIZON_DAY).lerp(HORIZON_NIGHT, m);
  scene.fog.color.copy(scene.background);
  scene.fog.density = THREE.MathUtils.lerp(0.00021, 0.00026, m);
  scene.environment = m < 0.5 ? atmosphere.envs.day : atmosphere.envs.night;
  scene.environmentIntensity = m < 0.5 ? THREE.MathUtils.lerp(0.6, 0.35, m * 2) : THREE.MathUtils.lerp(1.2, 0.9, m * 2 - 1);
  post.setNight(m);
  hemi.color.copy(hemiSkyL).lerp(hemiSkyD, m);
  hemi.groundColor.copy(hemiGndL).lerp(hemiGndD, m);
  // 夜景天光略抬：整城窗灯要靠环境光托起来，别只剩地标亮
  hemi.intensity = THREE.MathUtils.lerp(0.95, 0.72, m);
  sun.color.copy(sunDay).lerp(sunNight, m);
  sun.intensity = THREE.MathUtils.lerp(2.25, 0.38, m);
  sun.position.lerpVectors(sunDayPos, sunNightPos, m).add(shadowFocus);
  atmosphere.setSun(sun.position.clone().sub(shadowFocus));
  // 夜景关实时阴影：自发光已经够轮廓，少一次全场景 shadow pass
  const wantShadow = effects.shadows && m < 0.45;
  if (sun.castShadow !== wantShadow) {
    sun.castShadow = wantShadow;
    renderer.shadowMap.enabled = wantShadow;
    if (wantShadow) renderer.shadowMap.needsUpdate = true;
  }
  if (wantShadow && m !== shadowMode) renderer.shadowMap.needsUpdate = true;
  shadowMode = m;
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.12, 1.05, m);
  ground.material.color.copy(groundDay).lerp(groundNight, m);
  greenMat.color.copy(greenDay).lerp(greenNight, m);
  if (crownMat) crownMat.color.copy(crownDay).lerp(crownNight, m);
  cityMat.color.copy(cityDay).lerp(cityNight, m);
  cityMat.userData.setNight(lighting);
  for (const mesh of roadGroup.children) {
    mesh.material.color.setHex(mesh.material.userData.day).lerp(roadNight, m);
    mesh.material.emissiveIntensity = 0;
  }
  for (const [mat, , k] of glow) mat.emissiveIntensity = k * lighting;
  for (const hm of HILL_MATS) hm.emissiveIntensity = 0.35 * lighting;
  stars.material.opacity = Math.max(0, (m - 0.25) / 0.75);
  // 水面只改材质，不换倒影网格
  waterMat.color.copy(waterMat.userData.dayColor).lerp(waterNight, m);
  waterMat.emissive.copy(waterEm); waterMat.emissiveIntensity = 0.22 * m;
  waterfront.setNight(lighting); cruises.setNight(lighting); heritage.setNight(lighting); streetDistrict.setNight(lighting); atmosphere.setNight(m); riverReflection.setNight(m,sun.position.clone().sub(shadowFocus));
  blenderModels.setNight(effects.lights?m:0);
  landmarkLighting.setNight(lighting);
  night = m > 0.5;
  // 精模自发光/灯：越过阈值时切一次；灯光强度持续跟 m
  if (lighting > 0.18 && !detailNightOn) {
    detailNightOn = true;
    for (const o of Object.values(detail.cache)) o.userData.night?.(o, true);
  } else if (lighting < 0.12 && detailNightOn) {
    detailNightOn = false;
    for (const o of Object.values(detail.cache)) o.userData.night?.(o, false);
  }
  for (const o of Object.values(detail.cache)) {
    for (const l of o.userData.lights || []) {
      if (l.userData.baseIntensity == null) l.userData.baseIntensity = l.intensity || 1;
      l.intensity = l.userData.baseIntensity * m;
    }
  }
}

function setNight(on) {
  modeTarget = on ? 1 : 0;
  document.body.classList.toggle('night', on);
  const btn = document.getElementById('t-night');
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  invalidate();
}
applyMode(0);
const panel = document.getElementById('panel');
const panelToggle = document.getElementById('panel-toggle');
const setPanelCollapsed = (collapsed) => {
  panel.classList.toggle('collapsed', collapsed);
  panelToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
};
setPanelCollapsed(true);
panelToggle.addEventListener('click', () => setPanelCollapsed(!panel.classList.contains('collapsed')));

let activeLandmark = null;
const highlightButtons = [...document.querySelectorAll('#highlights [data-id]')];
for (const b of highlightButtons) b.addEventListener('click', () => select(LANDMARKS.find((l) => l.id === b.dataset.id)));
document.getElementById('quick-night').addEventListener('click', () => setNight(modeTarget < 0.5));
function setActive(lm) {
  for (const b of highlightButtons) b.setAttribute('aria-current', String(!!lm && (b.dataset.id === lm.id || (b.dataset.id === 'rita' && lm.id === 'yueta'))));
  for (const li of list.children) li.classList.toggle('active', !!lm && li.dataset.id === lm.id);
}
let tourOn = false, tourClock = 0;
function select(lm, instant = false) {
  walk?.exit();
  activeLandmark = lm; setActive(lm);
  setPanelCollapsed(true);
  card.querySelector('h2').textContent = lm.name;
  card.querySelector('.meta').textContent = `${lm.lat.toFixed(5)}°N, ${lm.lon.toFixed(5)}°E` + (lm.h ? ` · 高约 ${lm.h} m` : '');
  updateCardPhoto(lm);
  card.querySelector('p').textContent = lm.desc || '';
  peekName.textContent = lm.name;
  if (autoCardInput.checked || tourOn) openCard(); else if (card.hidden) peek.hidden = false;
  history.replaceState(null, '', `#${lm.id}`);
  const focus = lm.id === 'xiangbishan' ? new THREE.Vector3(-177, 23, 1415) : new THREE.Vector3(lm.x, (lm.top || 0) * 0.45, lm.z);
  flyTo(focus, (lm.span || 400) * (isMobile ? 1.22 : 1), instant || reduceMotion, lm.view);
  focusShadows(focus,lm.span || 400);
  showDetail(lm);
}

let fly = null;
function flyTo(target, dist, instant = false, view) {
  const dir = view ? new THREE.Vector3(...view).normalize() : camera.position.clone().sub(controls.target).normalize();
  dir.y = Math.max(dir.y, view ? .08 : .35);
  dir.normalize();
  fly = { t: instant ? 1 : 0, p0: camera.position.clone(), p1: target.clone().addScaledVector(dir, dist), c0: controls.target.clone(), c1: target };
  controls.autoRotate = false; spinResume();
}
{
  const lm = LANDMARKS.find((l) => l.id === location.hash.slice(1));
  if (lm) select(lm, true);
}
window.__gl = { renderer, scene, camera, controls, select, LANDMARKS, THREE, setNight: (v) => { setNight(!!v); }, detail }; // 调试/自动截图用

const tourIds=LANDMARKS.map(l=>l.id);

function advanceTour(step=1){
  const i=tourIds.indexOf(activeLandmark?.id), next=(i+step+tourIds.length)%tourIds.length;
  select(LANDMARKS.find(l=>l.id===tourIds[next]));tourClock=0;
}
document.getElementById('tour-prev').addEventListener('click',()=>advanceTour(-1));
document.getElementById('tour-next').addEventListener('click',()=>advanceTour(1));
document.getElementById('tour-play').addEventListener('click',e=>{
  tourOn=!tourOn;tourClock=0;e.currentTarget.textContent=tourOn?'暂停导览':'城中导览';e.currentTarget.setAttribute('aria-pressed',String(tourOn));
  if(tourOn&&!activeLandmark)select(LANDMARKS[0]);
});

walk=createStreetWalk({camera,controls,canvas:renderer.domElement,collision:streetDistrict.collision,
 onEnter:()=>{fly=null;tourOn=false;document.getElementById('tour-play').textContent='城中导览';document.getElementById('tour-play').setAttribute('aria-pressed','false');card.hidden=true;peek.hidden=true;document.body.classList.remove('card-open');setPanelCollapsed(true);focusShadows(camera.position,120);invalidate(true);},
 onExit:()=>{focusShadows(controls.target,activeLandmark?.span||350);invalidate(true);},
 onMove:()=>{if(camera.position.distanceTo(shadowFocus)>45)focusShadows(camera.position,120);invalidate();}
});
walk.button.addEventListener('click',()=>walk.active?walk.exit():walk.enter(activeLandmark?{x:activeLandmark.x,z:activeLandmark.z}:{x:1,z:529}));

// ---- 鼠标拾取 / 坐标显示 ----
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const coordsEl = document.getElementById('coords');
let downAt = null, pointerCount = new Set(), multiGesture = false, lastHover = 0;
const visibleInTree = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
renderer.domElement.addEventListener('pointerdown', e => {
  if(walk?.active)return;
  pointerCount.add(e.pointerId); if (pointerCount.size > 1) multiGesture = true;
  if (pointerCount.size === 1) { multiGesture = false; downAt = [e.clientX, e.clientY]; }
  fly = null;
});
renderer.domElement.addEventListener('pointerup', e => {
  if(walk?.active)return;
  pointerCount.delete(e.pointerId);
  if (multiGesture || !downAt || Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>10) { if (!pointerCount.size) downAt=null; return; }
  downAt=null;
  const hit=pick(e); if(hit) return select(hit.object.userData.lm);
  const rad=e.pointerType==='touch'?36:20, v=new THREE.Vector3();let best=null,bd=rad;
  for(const lm of LANDMARKS){
    if(lm.kind==='lake')continue;v.set(lm.x,(lm.top||0)*.5,lm.z).project(camera);
    if(v.z>1||v.z< -1)continue;
    const d=Math.hypot((v.x+1)/2*innerWidth-e.clientX,(1-v.y)/2*innerHeight-e.clientY);
    if(d<bd){bd=d;best=lm;}
  }if(best)select(best);
});
renderer.domElement.addEventListener('pointercancel', e=>{pointerCount.delete(e.pointerId);downAt=null;multiGesture=true;});
renderer.domElement.addEventListener('pointermove', e=>{
  if(walk?.active||e.pointerType==='touch'||pointerCount.size||performance.now()-lastHover<85)return;
  lastHover=performance.now(); const hit=pick(e);renderer.domElement.style.cursor=hit?'pointer':'';
  const groundHit=ray.intersectObject(ground)[0];
  if(groundHit){const [lat,lon]=toLatLon(groundHit.point.x,groundHit.point.z);coordsEl.textContent=`${lat.toFixed(5)}°N  ${lon.toFixed(5)}°E`;}
});
function pick(e){
  mouse.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(mouse,camera);
  return ray.intersectObjects(pickables.filter(visibleInTree),false)[0];
}

// ---- 开关 / 罗盘 ----
const bind = (id, fn) => { const el = document.getElementById(id); el.addEventListener('change', () => { fn(el.checked); invalidate(true); }); fn(el.checked); };
bind('t-roads', (v) => { roadGroup.visible = v; waterfront.group.visible = v; });
document.getElementById('quality').value=quality;
document.getElementById('quality').addEventListener('change',e=>{quality=e.target.value;renderer.setPixelRatio(qualityDpr());post.resize();invalidate(true);});
if (!isMobile) document.getElementById('t-reflection').checked = true; // 桌面默认开实时倒影
else { // 手机默认关阴影/波纹，少一档持续重绘与 shadow pass
  document.getElementById('t-shadows').checked = false;
  document.getElementById('t-ripples').checked = false;
}
bind('t-reflection',v=>{effects.reflection=v;riverReflection.setQuality(v?'balanced':'flow');water.visible=!v;});
bind('t-shadows',v=>{effects.shadows=v;applyMode(modeCur);});
bind('t-ripples',v=>{effects.ripples=v&&!reduceMotion;});
bind('t-leaves',v=>setTreeDetail(v));
bind('t-lighting',v=>{effects.lights=v;applyMode(modeCur);});
bind('t-boats', v => { boatMotion = v && !reduceMotion; });
bind('t-labels', (v) => { for (const o of [...labels.main, ...labels.lake]) o.element.classList.toggle('hidden', !v); });
bind('t-city', (v) => { cityGroup.visible = v; streetDistrict.group.visible=v; });
bind('t-grid', (v) => { grid.visible = v; });
{
  const btn = document.getElementById('t-night');
  btn.addEventListener('click', () => setNight(modeTarget < 0.5));
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'l' || e.key === 'L') { if (!e.metaKey && !e.ctrlKey) setNight(modeTarget < 0.5); }
  });
}
const spinInput = document.getElementById('t-spin');
if (reduceMotion) spinInput.checked = false;
bind('t-spin', (v) => { spin = v && !reduceMotion; controls.autoRotate = spin && !fly && !spinningDrag; clearTimeout(spinTimer); invalidate(); });
document.addEventListener('visibilitychange', () => {
  controls.autoRotate = !document.hidden && spin && !fly && !spinningDrag;
  clock.getDelta();
  if (!document.hidden) invalidate();
});
const compassSvg = document.querySelector('#compass svg');
document.getElementById('compass').addEventListener('click', () => {
  walk?.exit();
  const d = camera.position.clone().sub(controls.target);
  const r = Math.hypot(d.x, d.z);
  fly = { t: 0, p0: camera.position.clone(), p1: new THREE.Vector3(controls.target.x, camera.position.y, controls.target.z + r), c0: controls.target.clone(), c1: controls.target.clone() };
});

// ---- 循环 ----
addEventListener('resize', () => {
  isMobile = mobileQuery.matches;
  renderer.setPixelRatio(qualityDpr());
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  post.resize();
  invalidate();
});
const clock = new THREE.Clock();
let firstFramePainted = false;

// 自适应画质：连续渲染时中位帧时间长期超过 30 ms 就降一档（高清→均衡→流畅），只降不升，避免来回跳。
const frameTimes = []; let lastRenderAt = 0, adaptAfter = Infinity;
function adaptQuality() {
  const now = performance.now(), gap = now - lastRenderAt; lastRenderAt = now;
  if (now < adaptAfter || quality === 'flow' || document.hidden) { frameTimes.length = 0; return; }
  if (gap > 100) { frameTimes.length = 0; return; } // 静止后第一帧不计
  frameTimes.push(gap); if (frameTimes.length < 90) return;
  const median = [...frameTimes].sort((a, b) => a - b)[45]; frameTimes.length = 0;
  if (median < 30) return;
  quality = quality === 'high' ? 'balanced' : 'flow';
  const sel = document.getElementById('quality'); sel.value = quality;
  renderer.setPixelRatio(qualityDpr()); post.resize(); invalidate(true); adaptAfter = now + 4000;
  console.info('Yunyou quality lowered to', quality, 'median frame', median.toFixed(1), 'ms');
}
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (document.hidden) return;
  requestNearbyDetails();
  if (boatMotion) { cruises.update(dt); dirty = true; }
  if (effects.ripples) { atmosphere.update(dt); riverReflection.update(dt); dirty = true; }
  if (tourOn && !fly && !spinningDrag) { tourClock += dt; if (tourClock > 9) advanceTour(); }
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.1);
    const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    camera.position.y += Math.sin(Math.PI * k) * Math.min(100, fly.p0.distanceTo(fly.p1) * .09);
    controls.target.lerpVectors(fly.c0, fly.c1, k);
    if (fly.t >= 1) fly = null;
  }
  // 日夜：指数逼近（≈1.2s 到位），过渡期间持续重绘
  const modeGap = modeTarget - modeCur;
  if (Math.abs(modeGap) > 1e-4) {
    modeCur += modeGap * Math.min(1, dt * 2.4);
    if (Math.abs(modeTarget - modeCur) < 1e-3) modeCur = modeTarget;
    applyMode(modeCur);
    dirty = true;
  }
  // 夜景/模式切换后也要能转：未拖动且开关开着就强制 autoRotate
  controls.autoRotate = !walk?.active && spin && !fly && !spinningDrag && performance.now() >= spinAfter;
  const moved = walk?.active ? walk.update(dt) : controls.update(dt);
  if (!fly && !moved && !dirty) return;
  dirty = false;
  if (spatialDirty || moved || fly) {
  spatialDirty = false;
  updateLod();
  for(const trees of urbanTreeGroups)trees.userData.update(camera);
  waterfront.group.traverse(o=>{if(o.userData.updateTrees)o.userData.updateTrees(camera);});
  if (cityFill?.userData.update) cityFill.userData.update(camera, isMobile ? 1600 : 4500);
  if (isMobile) {
    const maxD = 2000, v = new THREE.Vector3();
    for (const o of [...labels.main, ...labels.lake]) {
      const show = camera.position.distanceTo(v.copy(o.position)) < maxD;
      if (o.visible !== show) { o.visible = show; dirty = true; }
    }
  }
  compassSvg.style.transform = `rotate(${controls.getAzimuthalAngle() * 180 / Math.PI}deg)`;
  labelRenderer.render(scene, camera);
  }
  if (usePost()) post.render(); else renderer.render(scene, camera);
  adaptQuality();
  // 首帧即可交互：不再等待 city-far.glb；远景/补建/树库在首帧后空闲加载
  if (!firstFramePainted) {
    firstFramePainted = true;
    document.getElementById('loading')?.setAttribute('hidden', '');
    adaptAfter = performance.now() + 5000;
    (async () => {
      await idle();
      try { scene.add(createKarstHorizon({ count: isMobile ? 90 : 170 }).group); invalidate(true); } catch (e) { console.warn('Karst horizon', e); }
      await idle();
      while (gestures.active || spinningDrag) await idle();
      try { buildAndLoadUrbanTrees(); } catch (e) { console.warn('Urban trees schedule', e); }
      await idle();
      while (gestures.active || spinningDrag) await idle();
      try { await buildCityFill(); } catch (e) { console.warn('City fill', e); }
    })();
  }
}
controls.addEventListener('change', () => invalidate());
THREE.DefaultLoadingManager.onLoad = () => invalidate(true); // 贴图异步到达后补一帧
invalidate(true);
tick();
