import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ORIGIN, BOUNDS, WATER, ROADS, BUILDINGS, GREEN, ISLETS, BRIDGES, FOOT } from '../data/geo.js';
import { LANDMARKS } from '../data/landmarks.js';
import { makeTextures, extrudeRing, flatRing, pointInRing, ringBBox, hash, HILL_MATS } from './lib.js';
import * as LM from './landmarks.js';
import { DETAIL } from './detail/index.js';

// ---- 投影：WGS84 -> 局部米制（X 东，Z 南），与 data/geo.js 生成脚本一致 ----
const toXZ = (lat, lon) => [(lon - ORIGIN.lon) * ORIGIN.mPerLon, -(lat - ORIGIN.lat) * ORIGIN.mPerLat];
const toLatLon = (x, z) => [ORIGIN.lat - z / ORIGIN.mPerLat, ORIGIN.lon + x / ORIGIN.mPerLon];
const isMobile = matchMedia('(max-width: 720px)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- 渲染器 / 场景 / 相机 ----
const app = document.getElementById('app');
// 观感优先、贵特效（Water/Bloom）继续关。白天要有阴影与清晰度，别成白板沙盘
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // 场景静态、太阳固定：阴影图只在内容变化时重算
let dirty = true; // 画面是否需要重绘（相机不动、无动画时跳过渲染）
const invalidate = (shadows = false) => { dirty = true; if (shadows && renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true; };
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.setAttribute('role', 'application');
renderer.domElement.setAttribute('aria-label', '桂林两江四湖 3D 地图，可拖动旋转、双指缩放并点击景点');
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc5dceb);
scene.fog = new THREE.Fog(0xc5dceb, 2800, 8200);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // 金属/琉璃反射用
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 1, 30000);
camera.position.set(420, 420, 1480); // 入场更近、更低，先看见日月双塔与象鼻山，不是鸟瞰白板

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.18; // 更大阻尼：缩放/拖动松手后更快停下，少跑几帧重渲染
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 25;
controls.maxDistance = 9000;
controls.enableZoom = false; // 自管缩放：朝光标下的地面/地标推进（见后文 zoomToward）
controls.zoomSpeed = 1.6;
controls.autoRotateSpeed = 0.35; // Google Earth 式慢转
controls.target.set(-80, 8, 1100); // 对准杉湖双塔方向
// 自动转圈：默认开；拖动时停，松手 6 s 后续转；飞行动画期间不转。每帧回写，避免夜景切换/其它逻辑把 autoRotate 掐死后不转。
let spin = !reduceMotion, spinTimer = 0, spinningDrag = false;
controls.autoRotate = spin;
function spinResume() {
  clearTimeout(spinTimer);
  if (reduceMotion) return;
  spinTimer = setTimeout(() => { if (spin && !fly) { controls.autoRotate = true; invalidate(); } }, 6000);
}
controls.addEventListener('start', () => { spinningDrag = true; controls.autoRotate = false; clearTimeout(spinTimer); });
controls.addEventListener('end', () => { spinningDrag = false; spinResume(); });

const hemi = new THREE.HemisphereLight(0xe8f1ff, 0x8a9278, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.55);
sun.position.set(1400, 2600, 2200);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 1536, isMobile ? 1024 : 1536);
Object.assign(sun.shadow.camera, { left: -1600, right: 1600, top: 1700, bottom: -1700, near: 500, far: 7000 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);

const TEX = makeTextures();
const M = LM.makeMaterials();
const shadowed = (o, cast = true, receive = true) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } }); return o; };

// ---- 地面 + 网格 ----
const groundW = BOUNDS.x1 - BOUNDS.x0, groundD = BOUNDS.z1 - BOUNDS.z0;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundW * 3, groundD * 3), new THREE.MeshStandardMaterial({ color: 0xcfc6b6, map: TEX.ground, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.position.set((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(Math.max(groundW, groundD), Math.round(Math.max(groundW, groundD) / 500), 0xb8b2a2, 0xd8d3c6);
grid.position.set(ground.position.x, 0.26, ground.position.z);
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

// ---- 水系 / 绿地 / 岛 ----
const waterMat = new THREE.MeshStandardMaterial({ color: 0x6fb892, map: TEX.water, roughness: 0.14, metalness: 0.22 }); // 翡翠绿 + 高光，无实时倒影
// 象鼻山东北角：OSM 把象鼻脚下画成陆地，实景象鼻立在两江汇流的水里、水月洞半浸水——补一块水面
WATER.push({ o: [[-156, 1354], [-106, 1354], [-106, 1414], [-156, 1414]], h: [] });
const water = new THREE.Mesh(mergeGeometries(WATER.map((p) => flatRing(p.o, p.h, 0.3))), waterMat);
water.receiveShadow = true;
scene.add(water);
// 夜景水面：不用 Water/Reflector（整场景二次渲染）。只改材质色/粗糙度/微发光。
waterMat.userData.dayColor = waterMat.color.clone();
const waterNight = new THREE.Color(0x0a1812), waterEm = new THREE.Color(0x1a4030);
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
const roadGroup = new THREE.Group();
const roadSpec = { trunk: [16, 0xfbf9f3], primary: [12, 0xfbf9f3], secondary: [9, 0xf7f4ec], tertiary: [7, 0xf3efe6], minor: [5, 0xefebe1], pedestrian: [3.5, 0xe6dfd0] };
for (const [cls, [w, color]] of Object.entries(roadSpec)) {
  const m = new THREE.Mesh(ribbon(ROADS[cls], w, 0.7), new THREE.MeshStandardMaterial({ color, roughness: 1, userData: { day: color } }));
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
// 夜景窗灯：暖黄 / 冷白 / 暗墙 / 暗顶（顶点色伪窗，不用成千上万 PointLight）
const winWarm = new THREE.Color(0xffc978), winCool = new THREE.Color(0xc8daf8), wallDark = new THREE.Color(0x141820), roofDark = new THREE.Color(0x0c0e12);
const bGeos = [];
BUILDINGS.forEach((b, i) => {
  const bb = ringBBox(b.o), cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2;
  if (onHill(cx, cz) || modelled.some(([x, z]) => Math.hypot(x - cx, z - cz) < 28)) return;
  const g = extrudeRing(b.o, b.h);
  const inWangcheng = pointInRing(cx, cz, FOOT.wangcheng.o);
  const c = inWangcheng ? campusWall : palette[Math.floor(hash(i) * palette.length)], n = g.attributes.position.count;
  const day = new Float32Array(n * 3), night = new Float32Array(n * 3);
  const pos = g.attributes.position, roof = inWangcheng ? campusRoof : cityRoof;
  // 整楼有一定概率大部分灭灯（空楼），其余楼按层随机亮窗
  const occupied = hash(`occ${i}`) > 0.18;
  for (let k = 0; k < n; k++) {
    const y = pos.getY(k), isRoof = y >= b.h - 0.05;
    const dv = isRoof ? roof : c;
    day.set([dv.r, dv.g, dv.b], k * 3);
    let nv = isRoof ? roofDark : wallDark;
    if (!isRoof && occupied && y > 1.2) {
      const floor = Math.floor(y / 3.2);
      const lit = hash(`w${i}f${floor}x${pos.getX(k).toFixed(0)}z${pos.getZ(k).toFixed(0)}`) > 0.42;
      if (lit) nv = hash(`t${i}f${floor}`) > 0.72 ? winCool : winWarm;
    }
    night.set([nv.r, nv.g, nv.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(day, 3));
  g.setAttribute('colorDay', new THREE.BufferAttribute(day.slice(), 3));
  g.setAttribute('colorNight', new THREE.BufferAttribute(night, 3));
  bGeos.push(g);
});
const cityGroup = new THREE.Group();
const cityMat = new THREE.MeshLambertMaterial({ vertexColors: true }); // 城区楼块用 Lambert：面数多，Standard 片元太贵
let cityMesh = null;
if (bGeos.length) {
  cityMesh = shadowed(new THREE.Mesh(mergeGeometries(bGeos), cityMat));
  cityGroup.add(cityMesh);
}

// ---- 地标：逐个手工模型 ----
const models = {
  xiangbishan: LM.xiangbishan(FOOT, M),
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

// 树：绿地内按面积撒点；山体上按坡度撒（缓坡长树、陡壁露岩）
let crownMat;
{
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
    h.geometry.computeBoundingBox();
    const bb = h.geometry.boundingBox, hAt = h.userData.heightAt;
    for (let z = bb.min.z; z < bb.max.z; z += 8) for (let x = bb.min.x; x < bb.max.x; x += 8) {
      const jx = x + hash(`h${hi}${x}${z}a`) * 4.5, jz = z + hash(`h${hi}${x}${z}b`) * 4.5;
      const y = hAt(jx, jz);
      if (y < 2.5 || Math.hypot(jx - 138, jz + 343) < 8 || Math.hypot(jx + 184, jz - 1432) < 6) continue; // 独秀亭、普贤塔处不种树
      const slope = Math.hypot(hAt(jx + 2, jz) - hAt(jx - 2, jz), hAt(jx, jz + 2) - hAt(jx, jz - 2)) / 4;
      if (slope > 0.9 || hash(`h${hi}${x}${z}c`) < slope * 0.6) continue;
      pts.push([jx, jz, y - 0.8, 1.7 + hash(`h${hi}${x}${z}s`) * 1.3]); // 山顶乔木冠幅 7–10 m
    }
  });
  // 树冠：主瓣抖动二十面体；树干细圆柱（不投影）——没有树干会像漂浮绿球
  const lobe = (r, dx, dy, dz, seed, detail = 1) => {
    const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { // 按位置取随机数：二十面体顶点重复，同位同抖动才不裂
      const k = 0.82 + hash(`${seed}${p.getX(i).toFixed(3)}${p.getY(i).toFixed(3)}${p.getZ(i).toFixed(3)}`) * 0.36;
      p.setXYZ(i, p.getX(i) * k + dx, p.getY(i) * k * 0.78 + dy, p.getZ(i) * k + dz);
    }
    return g;
  };
  const crownG = lobe(1, 0, 0, 0, 'a', 0); // detail=0 → 20 面/棵
  crownG.computeVertexNormals();
  crownMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const trunkG = new THREE.CylinderGeometry(0.22, 0.3, 1, 5);
  const m4 = new THREE.Matrix4(), c = new THREE.Color(), greens = [0x3d6d33, 0x4f8240, 0x2f5a2a, 0x6a9a4a, 0x587f38, 0x7fa653];
  const q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // 按 300 m 方格分块实例化：贴近看某个地标时视锥外的块整块剔除
  const CH = 300, chunks = new Map();
  pts.forEach((p, i) => { const k = `${Math.floor(p[0] / CH)},${Math.floor(p[1] / CH)}`; (chunks.get(k) ?? chunks.set(k, []).get(k)).push(i); });
  for (const ids of chunks.values()) {
    const crowns = new THREE.InstancedMesh(crownG, crownMat, ids.length), trunks = new THREE.InstancedMesh(trunkG, M.trunk, ids.length);
    ids.forEach((i, j) => {
      const [x, z, y0, r] = pts[i];
      q.setFromAxisAngle(up, hash(`r${i}`) * Math.PI * 2);
      s3.set(r * (0.9 + hash(`sx${i}`) * 0.3), r * (0.8 + hash(`sy${i}`) * 0.3), r * (0.9 + hash(`sz${i}`) * 0.3));
      p3.set(x, y0 + r * 1.05 + 1.2, z);
      m4.compose(p3, q, s3); crowns.setMatrixAt(j, m4);
      c.setHex(greens[Math.floor(hash(`c${i}`) * greens.length)]).offsetHSL(0, 0, (hash(`l${i}`) - 0.5) * 0.08); crowns.setColorAt(j, c);
      m4.makeScale(1, r * 0.9 + 1, 1); m4.setPosition(x, y0 + (r * 0.9 + 1) / 2, z); trunks.setMatrixAt(j, m4);
    });
    crowns.castShadow = false; trunks.castShadow = false;
    crowns.computeBoundingSphere(); trunks.computeBoundingSphere();
    cityGroup.add(crowns, trunks);
  }
  window.__treeCount = pts.length;
}
scene.add(cityGroup);

const pickables = [];
const landmarkGroup = new THREE.Group();
for (const lm of LANDMARKS) {
  const [x, z] = toXZ(lm.lat, lm.lon);
  lm.x = x; lm.z = z; lm.top = lm.h || 0;
  const mdl = models[lm.id];
  if (mdl) {
    shadowed(mdl);
    mdl.traverse((o) => { if (o.isMesh) { o.userData.lm = lm; pickables.push(o); } });
    landmarkGroup.add(mdl);
    lm.top = mdl.userData.top ?? lm.top;
    if (lm.kind !== 'hill' && lm.id !== 'wangcheng') { lm.x = mdl.position.x || lm.x; lm.z = mdl.position.z || lm.z; }
  }
}
landmarkGroup.add(shadowed(LM.bridges(BRIDGES, FOOT, M)), shadowed(LM.dongzhenmen(FOOT, M)));
scene.add(landmarkGroup);

// ---- 标签 ----
const labels = { main: [], lake: [] };
function label(text, cls, x, y, z) {
  const el = document.createElement('div');
  el.className = `lbl ${cls}`;
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.position.set(x, y, z);
  labels[cls].push(obj);
  return obj;
}
for (const lm of LANDMARKS) {
  const l = label(lm.name, lm.kind === 'lake' ? 'lake' : 'main', lm.x, lm.top + 6, lm.z);
  if (lm.kind !== 'lake') { l.element.classList.add('hit'); l.element.addEventListener('click', () => select(lm)); }
  scene.add(l);
}

// ---- 侧栏列表 / 简介卡片 / 飞行 ----
const kindMark = { hill: '山', pagoda: '塔', building: '阁', bridge: '桥', lake: '湖', poi: '点' };
const list = document.getElementById('list');
const card = document.getElementById('card');
const [cx0, cz0] = toXZ(25.2836, 110.2949); // 独秀峰，用于显示到市中心距离
for (const lm of LANDMARKS) {
  const li = document.createElement('li');
  li.dataset.id = lm.id;
  const dist = Math.hypot(lm.x - cx0, lm.z - cz0);
  li.innerHTML = `<span class="k">${kindMark[lm.kind]}</span><span>${lm.name}</span><span class="m">${dist < 950 ? Math.round(dist) + ' m' : (dist / 1000).toFixed(1) + ' km'}</span>`;
  li.addEventListener('click', () => select(lm));
  list.appendChild(li);
}
document.getElementById('card-close').addEventListener('click', () => { card.hidden = true; setActive(null); });

// ---- 细节 LOD：选中地标时按需加载 src/detail/<id>.js 的精模；加载后按相机距离在简模/精模间切换（关简介不再回退，避免模型"变来变去"） ----
const detailGroup = new THREE.Group();
scene.add(detailGroup);
const detail = { cache: {}, loading: new Set() };
const LOD_DIST = isMobile ? 800 : 1100;
async function showDetail(lm) {
  const load = DETAIL[lm.id];
  if (!load || detail.cache[lm.id] || detail.loading.has(lm.id)) return;
  detail.loading.add(lm.id);
  let mod;
  try { mod = await load(); } catch (err) { console.warn('detail load failed', lm.id, err); detail.loading.delete(lm.id); return; }
  const obj = mod.build({ THREE, F: FOOT, M, TEX, lm, night: () => night });
  obj.userData.mode = mod.mode ?? 'replace';
  obj.userData.night = mod.night;
  obj.userData.lm = lm;
  obj.userData.lights = [];
  mergeStatic(obj);
  shadowed(obj, false, true); // 精模只接阴影不投影：上千个小面若投影，阴影通道会再扫一遍，桌面缩放直接掉帧
  obj.traverse((o) => { if (o.isMesh) { o.userData.lm = lm; pickables.push(o); } if (o.isLight) obj.userData.lights.push(o); });
  obj.userData.night?.(obj, detailNightOn);
  detailGroup.add(obj);
  if (obj.userData.mode === 'replace' && models[lm.id]) models[lm.id].visible = false;
  detail.cache[lm.id] = obj;
  detail.loading.delete(lm.id);
  invalidate(); // 阴影图等全部精模加载完再统一刷一次，避免每加载一个就重扫一遍
}
// 精模由上千个小 Mesh 拼成，逐个 draw call 太贵（9 处精模 ≈1800 次）：同材质、同属性布局、同阴影标志的叶子 Mesh 合并成一个
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), m4 = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || o.children.length || Array.isArray(o.material)) return;
    const g = o.geometry, key = `${o.material.uuid}|${Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize).join()}|${!!g.index}|${o.castShadow}${o.receiveShadow}${o.renderOrder}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)).push(o);
  });
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map((o) => o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld))), false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
    root.add(m);
    for (const o of list) o.removeFromParent();
  }
}
const _lmPos = new THREE.Vector3();
// 游戏式 LOD：远距离回退简模；动态灯同屏最多一处（Point/Spot 越多重算越贵，自发光材质扛夜景）
function updateLod() {
  let best = null, bestD = Infinity;
  for (const obj of Object.values(detail.cache)) {
    const lm = obj.userData.lm;
    const d = camera.position.distanceTo(_lmPos.set(lm.x, 0, lm.z));
    const show = d < Math.max(LOD_DIST * 1.8, (lm.span || 400) * 2.5);
    if (obj.visible !== show) { obj.visible = show; dirty = true; }
    if (obj.userData.mode === 'replace' && models[lm.id]) models[lm.id].visible = !show;
    for (const l of obj.userData.lights) l.visible = false;
    if (night && show && d < Math.max(LOD_DIST, (lm.span || 400) * 1.5) && d < bestD) { bestD = d; best = obj; }
  }
  if (best) for (const l of best.userData.lights) l.visible = true;
}
// 首帧后逐个后台加载全部精模（不再只在点开后显示）
async function preloadDetails() {
  await new Promise((r) => setTimeout(r, 400));
  for (const lm of LANDMARKS) if (DETAIL[lm.id]) { await showDetail(lm); await new Promise((r) => setTimeout(r, 40)); }
  invalidate(true);
}

// ---- 夜景：参考 techartist home-sweet-home —— modeCur 向 modeTarget 指数逼近，灯光/雾色/自发光按 m 插值，不是硬切 ----
let night = false; // LOD 用：m>0.5 视为夜
let modeTarget = 0, modeCur = 0, detailNightOn = false;
const C = (h) => new THREE.Color(h);
const dayFog = 0xc5dceb, nightFog = 0x0d1830;
const dayBg = C(dayFog), nightBg = C(nightFog);
const hemiSkyL = C(0xe8f1ff), hemiSkyD = C(0x223a66);
const hemiGndL = C(0x8a9278), hemiGndD = C(0x090a10);
const sunDay = C(0xfff1d0), sunNight = C(0x93a9d6);
const groundDay = C(0xcfc6b6), groundNight = C(0x1a1c22);
const greenDay = C(0x7fa85e), greenNight = C(0x18241a);
const crownDay = C(0xffffff), crownNight = C(0x2e3d30);
const cityDay = C(0xffffff), cityNight = C(0xf2ebe0); // 夜景靠顶点窗灯，材质色别压暗
const cityEm = C(0xffb060);
const sunDayPos = new THREE.Vector3(1400, 2600, 2200), sunNightPos = new THREE.Vector3(-900, 420, -1600);
// 夜景不做 Bloom / Water 倒影：两者都是整屏二次渲染，夜景卡顿主因。地标自发光本身已经够亮。
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

const roadNight = C(0x1c1e24), roadEm = C(0xffc070);
function mixCityNight(m) {
  if (!cityMesh) return;
  const g = cityMesh.geometry, day = g.attributes.colorDay, night = g.attributes.colorNight, out = g.attributes.color;
  if (!day || !night || !out) return;
  const d = day.array, n = night.array, o = out.array;
  for (let i = 0; i < o.length; i++) o[i] = d[i] + (n[i] - d[i]) * m;
  out.needsUpdate = true;
}
function applyMode(m) {
  scene.background.copy(dayBg).lerp(nightBg, m);
  scene.fog.color.copy(dayBg).lerp(nightBg, m);
  scene.environmentIntensity = THREE.MathUtils.lerp(0.7, 0.18, m);
  hemi.color.copy(hemiSkyL).lerp(hemiSkyD, m);
  hemi.groundColor.copy(hemiGndL).lerp(hemiGndD, m);
  // 夜景天光略抬：整城窗灯要靠环境光托起来，别只剩地标亮
  hemi.intensity = THREE.MathUtils.lerp(0.75, 0.42, m);
  sun.color.copy(sunDay).lerp(sunNight, m);
  sun.intensity = THREE.MathUtils.lerp(2.55, 0.22, m);
  sun.position.lerpVectors(sunDayPos, sunNightPos, m);
  // 夜景关实时阴影：自发光已经够轮廓，少一次全场景 shadow pass
  const wantShadow = m < 0.45;
  if (sun.castShadow !== wantShadow) {
    sun.castShadow = wantShadow;
    renderer.shadowMap.enabled = wantShadow;
    if (wantShadow) renderer.shadowMap.needsUpdate = true;
  }
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.12, 1.05, m);
  ground.material.color.copy(groundDay).lerp(groundNight, m);
  greenMat.color.copy(greenDay).lerp(greenNight, m);
  if (crownMat) crownMat.color.copy(crownDay).lerp(crownNight, m);
  cityMat.color.copy(cityDay).lerp(cityNight, m);
  cityMat.emissive.copy(cityEm); cityMat.emissiveIntensity = 0.28 * m; // 窗灯暖底，主亮靠顶点色
  mixCityNight(m);
  for (const mesh of roadGroup.children) {
    mesh.material.color.setHex(mesh.material.userData.day).lerp(roadNight, m);
    mesh.material.emissive.copy(roadEm); mesh.material.emissiveIntensity = 1.4 * m; // 路灯感
  }
  for (const [mat, , k] of glow) mat.emissiveIntensity = k * m;
  for (const hm of HILL_MATS) hm.emissiveIntensity = 0.35 * m;
  stars.material.opacity = Math.max(0, (m - 0.25) / 0.75);
  // 水面只改材质，不换倒影网格
  waterMat.color.copy(waterMat.userData.dayColor).lerp(waterNight, m);
  waterMat.roughness = THREE.MathUtils.lerp(0.14, 0.12, m);
  waterMat.metalness = THREE.MathUtils.lerp(0.22, 0.45, m);
  waterMat.emissive.copy(waterEm); waterMat.emissiveIntensity = 0.22 * m;
  night = m > 0.5;
  // 精模自发光/灯：越过阈值时切一次；灯光强度持续跟 m
  if (m > 0.18 && !detailNightOn) {
    detailNightOn = true;
    for (const o of Object.values(detail.cache)) o.userData.night?.(o, true);
  } else if (m < 0.12 && detailNightOn) {
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
setPanelCollapsed(isMobile);
panelToggle.addEventListener('click', () => setPanelCollapsed(!panel.classList.contains('collapsed')));

function setActive(lm) {
  for (const li of list.children) li.classList.toggle('active', !!lm && li.dataset.id === lm.id);
}
function select(lm, instant = false) {
  setActive(lm);
  if (isMobile) panel.classList.add('collapsed');
  card.querySelector('h2').textContent = lm.name;
  card.querySelector('.meta').textContent = `${lm.lat.toFixed(5)}°N, ${lm.lon.toFixed(5)}°E` + (lm.h ? ` · 高约 ${lm.h} m` : '');
  card.querySelector('p').textContent = lm.desc || '';
  card.hidden = false;
  history.replaceState(null, '', `#${lm.id}`);
  flyTo(new THREE.Vector3(lm.x, (lm.top || 0) * 0.45, lm.z), lm.span || 400, instant || reduceMotion);
  showDetail(lm);
}

let fly = null;
function flyTo(target, dist, instant = false) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.4) dir.y = 0.4;
  dir.normalize();
  fly = { t: instant ? 1 : 0, p0: camera.position.clone(), p1: target.clone().addScaledVector(dir, dist), c0: controls.target.clone(), c1: target };
  controls.autoRotate = false; spinResume();
}
{
  const lm = LANDMARKS.find((l) => l.id === location.hash.slice(1));
  if (lm) select(lm, true);
}
window.__gl = { renderer, scene, camera, controls, select, LANDMARKS, THREE, setNight: (v) => { setNight(!!v); }, detail }; // 调试/自动截图用

// ---- 鼠标拾取 / 坐标显示 ----
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const coordsEl = document.getElementById('coords');
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) return;
  const hit = pick(e);
  if (hit) return select(hit.object.userData.lm);
  // 没点中模型（远看楼阁只有几个像素）：就近吸附到屏幕上最近的地标锚点，触屏半径放大
  const rad = e.pointerType === 'touch' ? 44 : 22, v = new THREE.Vector3();
  let best = null, bd = rad;
  for (const lm of LANDMARKS) {
    if (lm.kind === 'lake') continue;
    v.set(lm.x, (lm.top || 0) * 0.5, lm.z).project(camera);
    if (v.z > 1) continue;
    const d = Math.hypot((v.x + 1) / 2 * innerWidth - e.clientX, (1 - v.y) / 2 * innerHeight - e.clientY);
    if (d < bd) { bd = d; best = lm; }
  }
  if (best) select(best);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const hit = pick(e);
  renderer.domElement.style.cursor = hit ? 'pointer' : '';
  const g = ray.intersectObject(ground)[0];
  if (g) {
    const [lat, lon] = toLatLon(g.point.x, g.point.z);
    coordsEl.textContent = `${lat.toFixed(5)}°N  ${lon.toFixed(5)}°E`;
  }
});
function pick(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  return ray.intersectObjects(pickables, false)[0];
}

// ---- 开关 / 罗盘 ----
const bind = (id, fn) => { const el = document.getElementById(id); el.addEventListener('change', () => { fn(el.checked); invalidate(true); }); fn(el.checked); };
bind('t-roads', (v) => { roadGroup.visible = v; });
bind('t-labels', (v) => { for (const o of [...labels.main, ...labels.lake]) o.element.classList.toggle('hidden', !v); });
bind('t-city', (v) => { cityGroup.visible = v; });
bind('t-grid', (v) => { grid.visible = v; });
{
  const btn = document.getElementById('t-night');
  btn.addEventListener('click', () => setNight(modeTarget < 0.5));
  addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') { if (!e.metaKey && !e.ctrlKey) setNight(modeTarget < 0.5); }
  });
}
const spinInput = document.getElementById('t-spin');
if (reduceMotion) spinInput.checked = false;
bind('t-spin', (v) => { spin = v && !reduceMotion; controls.autoRotate = spin && !fly && !spinningDrag; clearTimeout(spinTimer); invalidate(); });
document.addEventListener('visibilitychange', () => {
  controls.autoRotate = !document.hidden && spin && !fly && !spinningDrag;
  if (!document.hidden) invalidate();
});
const compassSvg = document.querySelector('#compass svg');
document.getElementById('compass').addEventListener('click', () => {
  const d = camera.position.clone().sub(controls.target);
  const r = Math.hypot(d.x, d.z);
  fly = { t: 0, p0: camera.position.clone(), p1: new THREE.Vector3(controls.target.x, camera.position.y, controls.target.z + r), c0: controls.target.clone(), c1: controls.target.clone() };
});

// Google Earth 式缩放：朝光标下的落点推进镜头和视点（放大 = 往那边飞近；缩小 = 后退）
{
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const focusUnder = (clientX, clientY) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([landmarkGroup, cityGroup, ground, water, green, detailGroup], true);
    if (hits.length) return hits[0].point.clone();
    if (ray.ray.intersectPlane(plane, hit)) return hit.clone();
    return null;
  };
  const zoomToward = (clientX, clientY, deltaY) => {
    const focus = focusUnder(clientX, clientY);
    if (!focus) return;
    focus.y = Math.min(Math.max(focus.y, 0), 80);
    const steps = Math.min(8, Math.max(1, Math.round(Math.abs(deltaY) / 40)));
    const k = 1 - Math.pow(0.82, steps * controls.zoomSpeed);
    const cam = camera.position, tgt = controls.target;
    if (deltaY < 0) { cam.lerp(focus, k * 0.42); tgt.lerp(focus, k * 0.55); }
    else { cam.sub(focus).multiplyScalar(1 + k * 0.55).add(focus); tgt.lerp(new THREE.Vector3().addVectors(cam, focus).multiplyScalar(0.5), k * 0.12); }
    const off = cam.clone().sub(tgt); let d = off.length();
    if (d < 1e-3) { off.set(0, 40, 80); d = off.length(); }
    cam.copy(tgt).addScaledVector(off.multiplyScalar(1 / d), THREE.MathUtils.clamp(d, controls.minDistance, controls.maxDistance));
    if (cam.y < 8) cam.y = 8;
    controls.autoRotate = false; spinResume(); controls.update(); invalidate();
  };
  renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); zoomToward(e.clientX, e.clientY, e.deltaY); }, { passive: false });
  let pinch0 = 0;
  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  }, { passive: true });
  renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !pinch0) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    if (Math.abs(d / pinch0 - 1) > 0.02) { zoomToward(cx, cy, d > pinch0 ? -80 : 80); pinch0 = d; }
  }, { passive: true });
  renderer.domElement.addEventListener('touchend', () => { pinch0 = 0; }, { passive: true });
}

// ---- 循环 ----
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  invalidate();
});
const clock = new THREE.Clock();
let firstFramePainted = false;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.1);
    const k = 1 - Math.pow(1 - fly.t, 3);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
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
  if (spin && !fly && !spinningDrag) controls.autoRotate = true;
  const moved = controls.update();
  if (!fly && !moved && !dirty) return;
  dirty = false;
  updateLod();
  compassSvg.style.transform = `rotate(${controls.getAzimuthalAngle() * 180 / Math.PI}deg)`;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (!firstFramePainted) {
    firstFramePainted = true;
    document.getElementById('loading')?.setAttribute('hidden', '');
  }
}
controls.addEventListener('change', () => invalidate());
THREE.DefaultLoadingManager.onLoad = () => invalidate(true); // 贴图异步到达后补一帧
invalidate(true);
tick();
preloadDetails();
