// 通用工具：贴图、多边形/高度场、SDF 山体（Marching Cubes）、八角楼阁塔、中式坡屋顶与殿阁。单位：米。
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- 确定性随机 ----
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const h2 = (x, y, seed = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
export function noise2(x, y, seed = 0) { // 值噪声 [-1,1]
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi, seed), b = h2(xi + 1, yi, seed), c = h2(xi, yi + 1, seed), d = h2(xi + 1, yi + 1, seed);
  return ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy) * 2 - 1;
}
export const fbm = (x, y, seed = 0, oct = 3) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f, seed + i); a *= 0.5; f *= 2.1; } return v; };
// 近似 3D 分形噪声：三个正交切片叠加
export const fbm3 = (x, y, z, seed = 0) => (fbm(x, y, seed) + fbm(y, z, seed + 11) + fbm(z, x, seed + 23)) / 3;

// ---- 贴图 ----
export function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export const TEX = {};
// 位图贴图（assets/tex/*.jpg，1024² 无缝）：喀斯特岩壁、青瓦、黄铜板、琉璃面砖、料石城墙、青砖
const loader = new THREE.TextureLoader();
function imgTex(name) {
  const t = loader.load(new URL(`../assets/tex/${name}.jpg`, import.meta.url).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function makeTextures() {
  for (const n of ['stone', 'tile', 'copper', 'glaze', 'brick', 'karst']) TEX[n] = imgTex(n);
  TEX.karst.wrapS = TEX.karst.wrapT = THREE.MirroredRepeatWrapping; // 岩壁图非无缝：镜像平铺消接缝
  // 水面：淡涟漪（偏翡翠绿，贴桂林实景）
  TEX.water = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a9a78'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(220,255,230,${Math.random() * 0.1})`; g.fillRect(Math.random() * w, Math.random() * h, 5 + Math.random() * 18, 1); }
    for (let k = 0; k < 200; k++) { g.fillStyle = `rgba(20,60,40,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 8, 2); }
  }, [1 / 40, 1 / 40]);
  // 地面：暖灰土 + 细噪点，去掉 SketchUp 白板感
  TEX.ground = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4000; k++) {
      g.fillStyle = `rgba(${160 + Math.random() * 60|0},${150 + Math.random() * 50|0},${120 + Math.random() * 40|0},${0.04 + Math.random() * 0.08})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }, [1 / 80, 1 / 80]);
  // 绿地：草斑
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6e9454'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3000; k++) {
      g.fillStyle = `rgba(${70 + Math.random() * 90|0},${110 + Math.random() * 80|0},${40 + Math.random() * 40|0},${0.15 + Math.random() * 0.25})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
  }, [1 / 35, 1 / 35]);
  return TEX;
}

// ---- 多边形工具（[x,z] 环） ----
export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function distToRing(x, z, ring) {
  let d = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[j], [bx, bz] = ring[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return d;
}
export const ringBBox = (ring) => ring.reduce((b, [x, z]) => ({ x0: Math.min(b.x0, x), x1: Math.max(b.x1, x), z0: Math.min(b.z0, z), z1: Math.max(b.z1, z) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
export const ringShape = (ring, holes = []) => {
  const s = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  return s;
};
// 把 XY 平面上的 Shape 拉伸成竖直体：底 y0，高 h（Shape 的 y = -z）
export function extrudeRing(ring, h, y0 = 0, holes = []) {
  const g = new THREE.ExtrudeGeometry(ringShape(ring, holes), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
export function flatRing(ring, holes, y) {
  const g = new THREE.ShapeGeometry(ringShape(ring, holes));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
// 最长边方向角（弧度，绕 Y 轴），用于给足迹定向
export function ringAngle(ring) {
  let best = 0, len = -1;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const l = Math.hypot(bx - ax, bz - az);
    if (l > len) { len = l; best = Math.atan2(-(bz - az), bx - ax); }
  }
  return best;
}

// ---- 山体表面：岩/植被顶点色 + 绕竖轴的柱面 UV（岩壁贴图竖向不拉伸） ----
const TILE_M = 38; // 一张岩壁贴图覆盖的米数
function hillSurface(g, cx, cz, seed) {
  const pos = g.attributes.position, nrm = g.attributes.normal, n = pos.count;
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const rock = new THREE.Color(0xf2f0ea), rockDark = new THREE.Color(0xb9b6ae), veg = new THREE.Color(0x6a9a4c), vegLight = new THREE.Color(0x98c26a), c = new THREE.Color();
  // 用「岩壁的典型半径」（y>8 的顶点平均距离）定横向重复数，避免贴图被压扁
  let R = 0, cnt = 0;
  for (let i = 0; i < n; i++) if (pos.getY(i) > 8) { R += Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz); cnt++; }
  R = cnt ? R / cnt : 30;
  const N = Math.max(1, Math.round(2 * Math.PI * R / TILE_M));
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
    const strata = 0.5 + 0.5 * Math.sin(y * 0.6 + fbm(x * 0.1, z * 0.1, seed + 3) * 2);
    const r = rock.clone().lerp(rockDark, strata * 0.6);
    const v = veg.clone().lerp(vegLight, 0.5 + 0.5 * fbm(x * 0.08, z * 0.08, seed + 5));
    const k = THREE.MathUtils.smoothstep(ny, 0.45, 0.85) * (0.75 + 0.25 * fbm(x * 0.3, z * 0.3, seed + 7));
    c.copy(r).lerp(v, k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    uv[i * 2] = (Math.atan2(z - cz, x - cx) / (2 * Math.PI) + 0.5) * N;
    uv[i * 2 + 1] = y / TILE_M;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mat = new THREE.MeshStandardMaterial({ map: TEX.karst, bumpMap: TEX.karst, bumpScale: 2.5, vertexColors: true, roughness: 0.95 });
  HILL_MATS.push(mat);
  return new THREE.Mesh(g, mat);
}
export const HILL_MATS = []; // 夜景统一加投光用

// ---- 喀斯特山体：足迹多边形 + 峰列表 -> 高度场网格 ----
// peaks: [{x, z, h, r, k}]  k 越小越尖锐(缺省 0.9)；margin: 足迹边缘到陡壁的过渡宽度
export function karstHill({ ring, peaks, margin = 18, res = 3, rough = 0.1, floor = 0.35, seed = 1, clipZ }) {
  const bb = ringBBox(ring);
  const nx = Math.ceil((bb.x1 - bb.x0) / res) + 1, nz = Math.ceil((bb.z1 - bb.z0) / res) + 1;
  const pos = new Float32Array(nx * nz * 3), inside = new Uint8Array(nx * nz);
  const maxH = Math.max(...peaks.map((p) => p.h));
  const heightAt = (x, z) => {
    if (!pointInRing(x, z, ring) || (clipZ !== undefined && z <= clipZ)) return 0;
    let d = distToRing(x, z, ring);
    if (clipZ !== undefined) d = Math.min(d, z - clipZ);
    const edge = Math.pow(Math.min(1, d / margin), 0.55);
    let ph = 0;
    for (const p of peaks) {
      const t = Math.hypot(x - p.x, z - p.z) / p.r;
      if (t < 1) ph = Math.max(ph, p.h * Math.pow(1 - t * t, p.k ?? 0.9));
    }
    return Math.max(0, edge * Math.max(ph, floor * maxH) * (1 + rough * fbm(x * 0.05, z * 0.05, seed) + 0.5 * rough * fbm(x * 0.14, z * 0.14, seed + 4)) + edge * 3 * fbm(x * 0.25, z * 0.25, seed + 9));
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = bb.x0 + i * res, z = bb.z0 + j * res, n = j * nx + i;
    const y = heightAt(x, z);
    if (y > 0) inside[n] = 1;
    pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (inside[a] || inside[b] || inside[c] || inside[d]) idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = hillSurface(g, (bb.x0 + bb.x1) / 2, (bb.z0 + bb.z1) / 2, seed);
  mesh.userData.heightAt = heightAt;
  return mesh;
}

// ---- SDF 山体：任意隐式距离函数 -> Marching Cubes 网格（用于象鼻山这类带洞、悬出的形体） ----
// sdf(x,y,z) < 0 为岩体内部（世界坐标）。box: {x0,x1,y0,y1,z0,z1}；res: 每轴体素数
export const sdRoundBox = (px, py, pz, bx, by, bz, r) => {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r, qz = Math.abs(pz) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};
export const sdEllipsoid = (px, py, pz, rx, ry, rz) => {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz), k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k0 * (k0 - 1) / k1;
};
// 圆锥胶囊：a->b，半径 ra->rb
export const sdCone = (px, py, pz, a, b, ra, rb) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], L2 = bax * bax + bay * bay + baz * baz;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * bax + (py - a[1]) * bay + (pz - a[2]) * baz) / L2));
  return Math.hypot(px - a[0] - bax * t, py - a[1] - bay * t, pz - a[2] - baz * t) - THREE.MathUtils.lerp(ra, rb, t);
};
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export function sdfHill({ sdf, box, res = 88, seed = 1, cx, cz }) {
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 400000);
  const ex = (box.x1 - box.x0) / 2, ey = (box.y1 - box.y0) / 2, ez = (box.z1 - box.z0) / 2;
  const mx = (box.x1 + box.x0) / 2, my = (box.y1 + box.y0) / 2, mz = (box.z1 + box.z0) / 2;
  const half = res / 2, f = mc.field;
  for (let k = 0; k < res; k++) for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = mx + (i - half) / half * ex, y = my + (j - half) / half * ey, z = mz + (k - half) / half * ez;
    f[(k * res + j) * res + i] = -sdf(x, y, z);
  }
  mc.isolation = 0;
  mc.update();
  const n = mc.count, src = mc.geometry.attributes.position;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = mx + src.getX(i) * ex; pos[i * 3 + 1] = my + src.getY(i) * ey; pos[i * 3 + 2] = mz + src.getZ(i) * ez; }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g = mergeVertices(g, 1e-3);
  g.computeVertexNormals();
  // 法线应背离岩体：抽样检查，反了就翻转绕序
  const nr = g.attributes.normal, ps = g.attributes.position; let dot = 0;
  for (let i = 0; i < ps.count; i += 7) dot += nr.getX(i) * (ps.getX(i) - mx) + nr.getY(i) * (ps.getY(i) - my) + nr.getZ(i) * (ps.getZ(i) - mz);
  if (dot < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  const mesh = hillSurface(g, cx ?? mx, cz ?? mz, seed);
  // 高度采样：自顶向下找第一处岩体（供撒树/放塔）
  mesh.userData.heightAt = (x, z) => { for (let y = box.y1; y > 0; y -= 0.5) if (sdf(x, y, z) < 0) return y; return 0; };
  return mesh;
}

// ---- 中式坡屋顶：底 w×d，脊长 ridge（0 为攒尖），高 h，出檐 over，翘角 lift。曲线凹面。 ----
export function roofGeom(w, d, h, { ridge = 0, over = 1.2, lift = 0.6, rows = 4 } = {}) {
  const pts = [], idx = [];
  const ring = (s) => {
    const hx = THREE.MathUtils.lerp(w / 2 + over, ridge / 2, s), hz = THREE.MathUtils.lerp(d / 2 + over, 0, s);
    const y = h * Math.pow(s, 1.7), lf = lift * Math.pow(1 - s, 2);
    // 8 点环：4 角 + 4 边中点（角抬起形成翘角）
    return [[hx, y + lf, hz], [0, y, hz], [-hx, y + lf, hz], [-hx, y, 0], [-hx, y + lf, -hz], [0, y, -hz], [hx, y + lf, -hz], [hx, y, 0]];
  };
  for (let r = 0; r <= rows; r++) for (const p of ring(r / rows)) pts.push(...p);
  for (let r = 0; r < rows; r++) for (let i = 0; i < 8; i++) {
    const a = r * 8 + i, b = r * 8 + (i + 1) % 8, c = a + 8, dd = b + 8;
    idx.push(a, c, b, b, c, dd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // UV：瓦垄沿坡向（贴图一张 ≈ 2 m）
  const uv = [];
  for (let i = 0; i < pts.length; i += 3) uv.push(pts[i] / 2, pts[i + 2] / 2);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// 檐下斗拱带 + 檐口横枋：深色矩形环
function bracketBand(w, d, y, mats) {
  const grp = new THREE.Group();
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.55, d + 1.0), mats.wood);
  band.position.y = y;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), mats.column);
  beam.position.y = y - 0.45;
  grp.add(band, beam);
  return grp;
}

// ---- 殿阁：多层楼身 + 各层腰檐/平座 + 顶屋面。floors: [{ w, d, h, roof:{h, ridge, over}, balcony }] ----
export function hall(floors, mats, { baseH = 0, baseW, baseD, colPitch = 3.2 } = {}) {
  const grp = new THREE.Group();
  let y = 0;
  if (baseH > 0) {
    const w = baseW ?? floors[0].w + 6, d = baseD ?? floors[0].d + 6;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, d), mats.stone);
    base.position.y = baseH / 2;
    grp.add(base);
    // 台基石栏
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.9, d + 0.3), mats.marble ?? mats.stone);
    rail.position.y = baseH + 0.45;
    const inner = new THREE.Mesh(new THREE.BoxGeometry(w - 1.0, 1.0, d - 1.0), mats.stone);
    inner.position.y = baseH + 0.45;
    grp.add(rail, inner);
    y = baseH;
  }
  const m = new THREE.Matrix4();
  for (const f of floors) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), mats.wall);
    body.position.y = y + f.h / 2;
    grp.add(body);
    // 檩下柱列
    const cw = f.cw ?? f.w + 1.6, cd = f.cd ?? f.d + 1.6;
    const nx = Math.max(2, Math.round(cw / colPitch)), nz = Math.max(2, Math.round(cd / colPitch));
    const colG = new THREE.CylinderGeometry(0.22, 0.24, f.h, 8);
    const cols = new THREE.InstancedMesh(colG, mats.column, (nx + 1) * 2 + (nz - 1) * 2);
    let k = 0;
    for (let i = 0; i <= nx; i++) for (const s of [-1, 1]) { m.makeTranslation(-cw / 2 + (cw / nx) * i, y + f.h / 2, s * cd / 2); cols.setMatrixAt(k++, m); }
    for (let i = 1; i < nz; i++) for (const s of [-1, 1]) { m.makeTranslation(s * cw / 2, y + f.h / 2, -cd / 2 + (cd / nz) * i); cols.setMatrixAt(k++, m); }
    cols.count = k;
    grp.add(cols);
    // 柱间隔扇门窗：深色木格栅板贴在墙面
    const winH = f.h * 0.62, win = new THREE.InstancedMesh(new THREE.BoxGeometry(1, winH, 0.12), mats.lattice ?? mats.wood, nx * 2 + nz * 2);
    k = 0;
    for (let i = 0; i < nx; i++) for (const s of [-1, 1]) { m.makeScale((cw / nx) * 0.62, 1, 1); m.setPosition(-cw / 2 + (cw / nx) * (i + 0.5), y + f.h * 0.5, s * (f.d / 2 + 0.06)); win.setMatrixAt(k++, m); }
    for (let i = 0; i < nz; i++) for (const s of [-1, 1]) { m.makeRotationY(Math.PI / 2); m.scale(new THREE.Vector3((cd / nz) * 0.62, 1, 1)); m.setPosition(s * (f.w / 2 + 0.06), y + f.h * 0.5, -cd / 2 + (cd / nz) * (i + 0.5)); win.setMatrixAt(k++, m); }
    win.count = k;
    grp.add(win);
    if (f.balcony) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(cw + 1.6, 0.35, cd + 1.6), mats.wood);
      plate.position.y = y + 0.2;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(cw + 1.6, 1.0, cd + 1.6), mats.rail);
      rail.position.y = y + 0.9;
      grp.add(plate, rail);
    }
    y += f.h;
    if (f.roof) {
      grp.add(bracketBand(cw, cd, y - 0.55, mats));
      const r = new THREE.Mesh(roofGeom(cw, cd, f.roof.h, { ridge: f.roof.ridge ?? 0, over: f.roof.over ?? 1.6, lift: f.roof.lift ?? 0.7 }), mats.roof);
      r.position.y = y - 0.3;
      grp.add(r);
      if (f.roof.ridge) {
        const rb = new THREE.Mesh(new THREE.BoxGeometry(f.roof.ridge + 1.2, 0.7, 0.9), mats.ridge);
        rb.position.y = y - 0.3 + f.roof.h + 0.2;
        grp.add(rb);
        // 鸱吻：脊两端上翘构件
        for (const s of [-1, 1]) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 1.0), mats.ridge); q.position.set(s * (f.roof.ridge / 2 + 0.3), y - 0.3 + f.roof.h + 0.9, 0); grp.add(q); }
      } else {
        const fin = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mats.ridge);
        fin.position.y = y - 0.3 + f.roof.h + 0.5;
        grp.add(fin);
      }
      y += f.roof.rise ?? 0; // 腰檐不占楼高（楼身穿过），顶檐用 rise 说明顶高
    }
  }
  grp.userData.height = y;
  return grp;
}

// ---- 八角楼阁式塔 ----
// h 总高(含塔刹)，tiers 层数，r0 底层半径，taper 顶层/底层半径比，mats: {body, roof, trim, dark}
export function pagoda({ h, tiers, r0, taper = 0.55, sides = 8, spire = 0.13, mats, balcony = true, eave = 0.34 }) {
  const grp = new THREE.Group();
  const spireH = h * spire, th = (h - spireH) / tiers;
  const m = new THREE.Matrix4();
  for (let i = 0; i < tiers; i++) {
    const t = tiers > 1 ? i / (tiers - 1) : 0, r = r0 * (1 - (1 - taper) * t), y0 = i * th;
    const bodyH = th * (1 - eave);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, sides), mats.body);
    body.position.y = y0 + bodyH / 2;
    grp.add(body);
    // 门窗：每面一块深色板 + 浅色门框
    const ra = r * Math.cos(Math.PI / sides) + 0.1;
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(r * 0.42, bodyH * 0.5, 0.25), mats.dark, sides);
    const frame = new THREE.InstancedMesh(new THREE.BoxGeometry(r * 0.5, bodyH * 0.58, 0.15), mats.trim, sides);
    for (let s = 0; s < sides; s++) {
      const a = (s + 0.5) * 2 * Math.PI / sides;
      m.makeRotationY(a);
      m.setPosition(Math.sin(a) * ra, y0 + bodyH * 0.5, Math.cos(a) * ra);
      win.setMatrixAt(s, m);
      m.setPosition(Math.sin(a) * (ra - 0.06), y0 + bodyH * 0.5, Math.cos(a) * (ra - 0.06));
      frame.setMatrixAt(s, m);
    }
    grp.add(win, frame);
    // 角柱
    const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.22, bodyH, 6), mats.trim, sides);
    for (let s = 0; s < sides; s++) { const a = s * 2 * Math.PI / sides; m.makeTranslation(Math.sin(a) * r, y0 + bodyH / 2, Math.cos(a) * r); cols.setMatrixAt(s, m); }
    grp.add(cols);
    // 平座/栏杆
    if (balcony && i > 0) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.22, 0.4, sides), mats.trim);
      plate.position.y = y0 + 0.2;
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, 0.9, sides, 1, true), mats.rail ?? mats.trim);
      rail.position.y = y0 + 0.85;
      grp.add(plate, rail);
    }
    // 檐下斗拱环
    const dg = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.02, 0.5, sides), mats.dark);
    dg.position.y = y0 + bodyH - 0.35;
    grp.add(dg);
    // 檐：凹曲面八角环
    const e = th * eave, pts = [new THREE.Vector2(r * 1.45, 0), new THREE.Vector2(r * 1.2, e * 0.22), new THREE.Vector2(r * 0.95, e * 0.55), new THREE.Vector2(r * 0.62, e)];
    const roof = new THREE.Mesh(new THREE.LatheGeometry(pts, sides), mats.roof);
    roof.position.y = y0 + bodyH - 0.2;
    grp.add(roof);
    // 檐角起翘：角部小上翘块
    const tips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.35, 1.2), mats.roof, sides);
    for (let s = 0; s < sides; s++) { const a = s * 2 * Math.PI / sides; m.makeRotationY(a); m.setPosition(Math.sin(a) * r * 1.45, y0 + bodyH + 0.15, Math.cos(a) * r * 1.45); tips.setMatrixAt(s, m); }
    grp.add(tips);
  }
  // 塔刹：须弥座 + 相轮 + 宝珠
  const yTop = tiers * th - th * eave * 0.4;
  const rt = r0 * taper;
  const cap = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(rt * 0.62, 0), new THREE.Vector2(rt * 0.45, spireH * 0.25), new THREE.Vector2(rt * 0.2, spireH * 0.5), new THREE.Vector2(0.01, spireH * 0.5)], sides), mats.roof);
  cap.position.y = yTop;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, spireH * 0.5, 8), mats.trim);
  rod.position.y = yTop + spireH * 0.7;
  grp.add(cap, rod);
  for (let k = 0; k < 3; k++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9 - k * 0.2, 12, 8), mats.trim);
    ball.position.y = yTop + spireH * (0.55 + k * 0.15);
    grp.add(ball);
  }
  grp.userData.height = h;
  return grp;
}

// ---- 宝瓶式喇嘛塔（普贤塔/舍利塔）：双层八角须弥座 + 圆瓶身 + 相轮 + 伞盖宝顶 ----
export function bottlePagoda(h, mat) {
  const grp = new THREE.Group(), s = h / 13.6;
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * s, 3.8 * s, 1.2 * s, 8), mat);
  b1.position.y = 0.6 * s;
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(2.9 * s, 3.1 * s, 1.2 * s, 8), mat);
  b2.position.y = 1.8 * s;
  const body = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(2.0, 2.4), new THREE.Vector2(2.75, 3.4), new THREE.Vector2(2.85, 4.6), new THREE.Vector2(2.3, 6.2), new THREE.Vector2(1.4, 7.2)].map((v) => v.multiplyScalar(s)), 24), mat);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * s, 1.15 * s, 4.2 * s, 16), mat);
  neck.position.y = 9.3 * s;
  grp.add(b1, b2, body, neck);
  for (let k = 0; k < 6; k++) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry((1.2 - k * 0.07) * s, (1.25 - k * 0.07) * s, 0.25 * s, 16), mat);
    ring.position.y = (7.6 + k * 0.65) * s;
    grp.add(ring);
  }
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 0.8 * s, 16), mat);
  canopy.position.y = 11.9 * s;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 12, 8), mat);
  top.position.y = 13.0 * s;
  grp.add(canopy, top);
  return grp;
}
