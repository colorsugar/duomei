// 精模公用件（单位米）：多边形曲檐翘角屋面、斗拱、栏板、隔扇、柱列、灯笼、匾额、夜景切换。
// 约定：材质 userData.night = { color, intensity, map } 时，applyNight 会把它切成自发光；PointLight 放进 group.userData.lights。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heritageMaterials } from '../surface-materials.js';
import { chamferBox, metricUV } from './architectural.js';

let sharedKit = null;
const std = (o) => new THREE.MeshStandardMaterial(o);
export const V2 = (x, y) => new THREE.Vector2(x, y);

// ---- 贴图 ----
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// 隔扇门窗：深色木框 + 万字纹格心 + 暖色窗纸（夜景发光）
export const latticeTex = (paper = '#e9dcc0', frame = '#3a2013', cols = 3, rows = 5) => canvas(256, 384, (g, w, h) => {
  g.fillStyle = frame; g.fillRect(0, 0, w, h);
  const bw = 10, cw = (w - bw) / cols, ch = (h - bw) / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = bw + i * cw, y = bw + j * ch;
    g.fillStyle = paper; g.fillRect(x, y, cw - bw, ch - bw);
    g.fillStyle = frame; g.globalAlpha = 0.9;
    const s = 12;
    for (let yy = y + 6; yy < y + ch - bw - 6; yy += s) for (let xx = x + 6; xx < x + cw - bw - 6; xx += s) { g.fillRect(xx, yy, s - 3, 2); g.fillRect(xx, yy, 2, s - 3); g.fillRect(xx + s - 5, yy + 4, 2, s - 5); }
    g.globalAlpha = 1;
  }
  // 裙板
  g.fillStyle = frame; g.fillRect(0, h * 0.78, w, h * 0.22);
  g.fillStyle = '#4e2c1c'; g.fillRect(bw, h * 0.8, w - 2 * bw, h * 0.17);
});
// 白墙抹灰
export const plasterTex = () => canvas(256, 256, (g, w, h) => {
  g.fillStyle = '#efe8da'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 6000; k++) { const v = 200 + Math.random() * 55; g.fillStyle = `rgba(${v},${v - 6},${v - 18},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 30, 1); }
});
// 汉白玉栏板：浅浮雕方框
export const marbleTex = () => canvas(256, 128, (g, w, h) => {
  g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 2500; k++) { const v = 215 + Math.random() * 40; g.fillStyle = `rgba(${v},${v},${v - 8},0.4)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
  g.strokeStyle = 'rgba(120,115,105,0.55)'; g.lineWidth = 3; g.strokeRect(18, 16, w - 36, h - 32); g.strokeRect(30, 28, w - 60, h - 56);
});
// 匾额：深底金字
export const plaqueTex = (text, bg = '#1c2a4a', fg = '#e8c364') => canvas(512, 160, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = 'bold 110px "Noto Serif CJK SC", "Songti SC", "SimSun", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 6);
});
// 彩画额枋：青绿底 + 金线
export const beamTex = () => canvas(256, 64, (g, w, h) => {
  g.fillStyle = '#2e4a6b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#3f7a5a'; g.fillRect(0, h * 0.35, w, h * 0.3);
  g.strokeStyle = '#d8b25a'; g.lineWidth = 2; for (const y of [h * 0.12, h * 0.35, h * 0.65, h * 0.88]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#d8b25a'; for (let x = 16; x < w; x += 48) { g.beginPath(); g.arc(x, h / 2, 5, 0, 7); g.fill(); }
});

// ---- 材质包 ----
export function kitMats(TEX) {
  if (sharedKit?.textures === TEX) return { ...sharedKit.materials };
  const lat = latticeTex(), bm = beamTex(), P = heritageMaterials(TEX);
  const M = {
    tile: std({ map: TEX.tile, bumpMap: TEX.tile, bumpScale: 0.35, roughness: 0.85, userData: { night: { color: 0x3a3c40, intensity: 0.35, map: true } } }),
    tileGreen: std({ map: TEX.tile, color: 0x5c8f7a, roughness: 0.4, metalness: 0.15, userData: { night: { color: 0x6aa080, intensity: 0.35, map: true } } }),
    tileYellow: std({ map: TEX.tile, color: 0xd9a63a, roughness: 0.35, metalness: 0.2 }),
    ridge: std({ color: 0x2a2d31, roughness: 0.7 }),
    ridgeGreen: std({ color: 0x2f5a4a, roughness: 0.5, metalness: 0.1 }),
    eaveWood: P.wood.clone(),
    woodDark: P.wood.clone(),
    redWall: std({ color: 0x9a3b2c, roughness: 0.9, userData: { night: { color: 0xff8a4a, intensity: 0.35 } } }),
    lacquer: std({ color: 0x8e2b21, roughness: 0.45, userData: { night: { color: 0xff7a3a, intensity: 0.45 } } }),
    beam: std({ map: bm, roughness: 0.6, userData: { night: { color: 0xffb060, intensity: 0.5, map: true } } }),
    wall: P.plaster.clone(),
    lattice: std({ map: lat, roughness: 0.7, userData: { night: { color: 0xffc67a, intensity: 1.4, map: true } } }),
    stoneBase: std({ map: TEX.stone, normalMap: TEX.pbr?.plaster.normal ?? null, normalScale: new THREE.Vector2(.28,.28), roughnessMap: TEX.pbr?.plaster.roughness ?? null, roughness: .94, userData: { metres: 3 } }),
    marble: P.dressedStone.clone(),
    gold: std({ color: 0xe6b84a, metalness: 0.85, roughness: 0.3 }),
    dark: std({ color: 0x1f1c1a, roughness: 0.9 }),
    lantern: std({ color: 0xd8321c, roughness: 0.6, userData: { night: { color: 0xff5a2a, intensity: 2.2 } } }),
    // 实拍：日塔夜间是金黄而非橙红；铜板贴图偏橙，乘进自发光会变红，所以夜里不乘贴图
    copper: std({ map: TEX.copper, metalness: 0.75, roughness: 0.3, userData: { night: { color: 0xffc94a, intensity: 1.25 } } }),
    copperDark: std({ map: TEX.copper, color: 0xb98a4a, metalness: 0.8, roughness: 0.35, userData: { night: { color: 0xe0a030, intensity: 0.9 } } }),
    glaze: std({ map: TEX.glaze, roughness: 0.25, userData: { night: { color: 0xdbe9ff, intensity: 1.2, map: true } } }),
    glazeRoof: std({ color: 0x4f8294, roughness: 0.25, metalness: 0.2, userData: { night: { color: 0x9fd0ff, intensity: 0.9 } } }),
    glass: std({ color: 0xbfd8e8, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75, userData: { night: { color: 0xeaf2ff, intensity: 1.0 } } }),
    silver: std({ color: 0xd8dee6, metalness: 0.7, roughness: 0.35, userData: { night: { color: 0xdbe9ff, intensity: 0.8 } } }),
    concrete: std({ color: 0xd6d2c8, roughness: 0.9 }),
    asphalt: std({ color: 0x4a4c50, roughness: 1 }),
    brick: std({ map: TEX.brick, bumpMap: TEX.brick, bumpScale: 0.3, roughness: 0.9, userData: { night: { color: 0x9a7a55, intensity: 0.4, map: true } } }),
    karst: std({ map: TEX.karst, bumpMap: TEX.karst, bumpScale: 2.5, vertexColors: true, roughness: 0.95, userData: { night: { color: 0x8a8f78, intensity: 0.35, map: true } } }),
  };
  M.tile.side = THREE.DoubleSide;
  M.tileGreen.side = THREE.DoubleSide;
  M.tileYellow.side = THREE.DoubleSide;
  M.glazeRoof.side = THREE.DoubleSide;
  sharedKit = { textures: TEX, materials: M };
  return { ...M };
}

// ---- 夜景切换：按材质 userData.night 开自发光；group.userData.lights 里的灯开关 ----
export function applyNight(group, on) {
  const seen = new Set();
  group.traverse((o) => {
    if (o.isLight) { o.visible = on; return; }
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (seen.has(m) || !m.userData?.night) continue;
      seen.add(m);
      const n = m.userData.night;
      m.emissive.setHex(on ? n.color : 0); m.emissiveIntensity = n.intensity;
      const wantedMap = n.map ? m.map : null;
      if (m.emissiveMap !== wantedMap) { m.emissiveMap = wantedMap; m.needsUpdate = true; }
    }
  });
}

// ---- 多边形曲檐屋面 ----
// sides: 4 为矩形（rx, rz 为半宽/半深，ridge 为正脊长），>4 为正多边形攒尖（rx 为外接半径）
// h: 檐口到脊高；over: 出檐；curl: 翘角抬升；sag: 檐口中段下垂（凹曲）；rows/segs: 细分
export function polyRoof({ sides = 4, rx, rz = rx, h, ridge = 0, over = 1.6, curl = 0.9, rows = 6, segs = 10, mats, y = 0, eaveBoard = true }) {
  const grp = new THREE.Group();
  const corners = [], tops = [];
  if (sides === 4) {
    const ex = rx + over, ez = rz + over;
    corners.push([ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez]);
    const r2 = ridge / 2;
    tops.push([[r2, 0], [-r2, 0]], [[-r2, 0], [-r2, 0]], [[-r2, 0], [r2, 0]], [[r2, 0], [r2, 0]]);
  } else {
    for (const c of polyCorners(sides, rx + over)) { corners.push(c); tops.push([[0, 0], [0, 0]]); }
  }
  const geos = [], hipPts = [];
  for (let f = 0; f < sides; f++) {
    const A = corners[f], B = corners[(f + 1) % sides], [TA, TB] = tops[f];
    const pos = [], uv = [], idx = [];
    for (let r = 0; r <= rows; r++) {
      const s = r / rows, sy = h * Math.pow(s, 1.55); // 凹曲坡面
      for (let c = 0; c <= segs; c++) {
        const t = c / segs, u = t * 2 - 1;
        const bx = A[0] + (B[0] - A[0]) * t, bz = A[1] + (B[1] - A[1]) * t;
        const tx = TA[0] + (TB[0] - TA[0]) * t, tz = TA[1] + (TB[1] - TA[1]) * t;
        const lift = curl * Math.pow(Math.abs(u), 3) * Math.pow(1 - s, 2.2);
        pos.push(bx + (tx - bx) * s, y + sy + lift, bz + (tz - bz) * s);
        uv.push(t * Math.hypot(B[0] - A[0], B[1] - A[1]) / 1.6, s * Math.hypot(h, rx + over) / 1.6);
        if (r < rows && c < segs) { const a = r * (segs + 1) + c, b = a + 1, cc = a + segs + 1, d = cc + 1; idx.push(a, b, cc, b, d, cc); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    geos.push(g);
    // 垂脊：沿角部坡线
    const hp = [];
    for (let r = 0; r <= rows; r++) { const s = r / rows; hp.push(new THREE.Vector3(A[0] + (TA[0] - A[0]) * s, y + h * Math.pow(s, 1.55) + curl * Math.pow(1 - s, 2.2) + 0.12, A[1] + (TA[1] - A[1]) * s)); }
    hipPts.push(hp);
  }
  // Physical tile ridges follow the curved pitch. One merged mesh per roof.
  const tiles=[];
  for(let f=0;f<sides;f++){
    const A=corners[f],B=corners[(f+1)%sides],[TA,TB]=tops[f];
    const count=Math.min(64,Math.max(5,Math.round(Math.hypot(B[0]-A[0],B[1]-A[1])/.55)));
    for(let c=1;c<count;c++){
      const t=c/count,u=t*2-1,points=[];
      for(let k=0;k<=5;k++){
        const s=k/5*.9;
        points.push(new THREE.Vector3(
          THREE.MathUtils.lerp(A[0]+(B[0]-A[0])*t,TA[0]+(TB[0]-TA[0])*t,s),
          y+h*Math.pow(s,1.55)+curl*Math.pow(Math.abs(u),3)*Math.pow(1-s,2.2)+.045,
          THREE.MathUtils.lerp(A[1]+(B[1]-A[1])*t,TA[1]+(TB[1]-TA[1])*t,s)));
      }
      tiles.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),5,.048,4,false));
    }
  }
  if(tiles.length){grp.add(new THREE.Mesh(mergeGeometries(tiles),mats.roof));tiles.forEach(g=>g.dispose());}
  const roof = new THREE.Mesh(mergeGeometries(geos), mats.roof);
  grp.add(roof);
  // 法线朝上：检查一处，反了就翻
  const nr = roof.geometry.attributes.normal; if (nr.getY(Math.floor(nr.count / 2)) < 0) { const ix = roof.geometry.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } roof.geometry.computeVertexNormals(); }
  const ridgeMat = mats.ridge;
  for (const hp of hipPts) grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 12, 0.22, 6, false), ridgeMat));
  // 檐口：瓦当勾头带
  for (let f = 0; f < sides; f++) {
    const A = corners[f], B = corners[(f + 1) % sides], pts = [];
    for (let c = 0; c <= segs; c++) { const t = c / segs, u = t * 2 - 1; pts.push(new THREE.Vector3(A[0] + (B[0] - A[0]) * t, y + curl * Math.pow(Math.abs(u), 3) - 0.05, A[1] + (B[1] - A[1]) * t)); }
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs * 2, 0.16, 6, false), ridgeMat));
  }
  // 正脊 + 鸱吻 / 宝顶
  if (sides === 4 && ridge > 0) {
    const rb = new THREE.Mesh(new THREE.BoxGeometry(ridge + 0.6, 0.6, 0.8), ridgeMat); rb.position.y = y + h + 0.25; grp.add(rb);
    for (const s of [-1, 1]) {
      const q = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.7, 0.9), ridgeMat); q.position.set(s * (ridge / 2 + 0.2), y + h + 0.95, 0); grp.add(q);
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), ridgeMat); hook.position.set(s * (ridge / 2 - 0.25), y + h + 1.9, 0); grp.add(hook);
    }
  } else {
    const fin = new THREE.Mesh(new THREE.LatheGeometry([V2(0.9, 0), V2(0.7, 0.5), V2(0.35, 1.0), V2(0.5, 1.4), V2(0.15, 2.1), V2(0.01, 2.3)], 12), mats.finial ?? ridgeMat);
    fin.position.y = y + h - 0.1; fin.scale.setScalar(Math.min(1, Math.max(0.4, rx / 5.5))); grp.add(fin);
  }
  // 檐底：望板（从墙到檐口的环形木板）
  if (eaveBoard) {
    const outer = new THREE.Shape(corners.map(([x, z]) => V2(x, -z)));
    const k = sides === 4 ? { x: rx / (rx + over), z: rz / (rz + over) } : { x: rx / (rx + over), z: rx / (rx + over) };
    outer.holes.push(new THREE.Path(corners.map(([x, z]) => V2(x * k.x * 0.98, -z * k.z * 0.98))));
    const b = new THREE.Mesh(new THREE.ShapeGeometry(outer), mats.eaveWood);
    b.rotation.x = -Math.PI / 2; b.position.y = y - 0.12; b.material.side = THREE.DoubleSide;
    grp.add(b);
  }
  grp.userData.top = y + h + (ridge ? 2.3 : 2.3);
  return grp;
}

// ---- 斗拱带：沿 n 边形周边每 pitch 米一攒，三跳出挑 ----
export function dougong({ sides = 4, rx, rz = rx, y, pitch = 1.6, mats, scale = 1 }) {
  const s = scale;
  const one = mergeGeometries([
    new THREE.BoxGeometry(0.5 * s, 0.3 * s, 0.5 * s).translate(0, 0.15 * s, 0),
    new THREE.BoxGeometry(1.1 * s, 0.22 * s, 0.4 * s).translate(0, 0.4 * s, 0.15 * s),
    new THREE.BoxGeometry(0.4 * s, 0.22 * s, 1.0 * s).translate(0, 0.4 * s, 0.25 * s),
    new THREE.BoxGeometry(1.7 * s, 0.22 * s, 0.4 * s).translate(0, 0.72 * s, 0.4 * s),
    new THREE.BoxGeometry(0.4 * s, 0.22 * s, 1.4 * s).translate(0, 0.72 * s, 0.55 * s),
    new THREE.BoxGeometry(2.1 * s, 0.2 * s, 0.4 * s).translate(0, 1.0 * s, 0.7 * s),
  ]);
  metricUV(one, .6, 0);
  const mats4 = [];
  const corners = polyCorners(sides, rx, rz);
  const m = new THREE.Matrix4();
  for (let f = 0; f < sides; f++) {
    const A = corners[f], B = corners[(f + 1) % sides], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(1, Math.round(L / pitch));
    const { nx, nz } = edge(A, B);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
      m.makeRotationY(Math.atan2(nx, nz)); m.setPosition(x - nx * 0.1, y, z - nz * 0.1);
      mats4.push(m.clone());
    }
  }
  const im = new THREE.InstancedMesh(one, mats.dougong ?? mats.lacquer, mats4.length);
  mats4.forEach((mm, i) => im.setMatrixAt(i, mm));
  return im;
}

// ---- 栏板：望柱 + 栏板 + 扶手，沿 n 边形 ----
export function balustrade({ sides = 4, rx, rz = rx, y, mats, post = 1.2, panel = 0.8, pitch = 1.5, mat, postMat }) {
  const grp = new THREE.Group();
  const corners = polyCorners(sides, rx, rz);
  const pm = postMat ?? mat ?? mats.marble, bm = mat ?? mats.marble;
  const postG = mergeGeometries([new THREE.BoxGeometry(0.22, post, 0.22).translate(0, post / 2, 0), new THREE.SphereGeometry(0.16, 8, 6).translate(0, post + 0.1, 0)]);
  const posts = [];
  const m = new THREE.Matrix4();
  for (let f = 0; f < sides; f++) {
    const A = corners[f], B = corners[(f + 1) % sides], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / pitch));
    const ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
    for (let i = 0; i < n; i++) { const t = i / n; m.makeTranslation(A[0] + (B[0] - A[0]) * t, y, A[1] + (B[1] - A[1]) * t); posts.push(m.clone()); }
    const cx = (A[0] + B[0]) / 2, cz = (A[1] + B[1]) / 2;
    const pnl = new THREE.Mesh(new THREE.BoxGeometry(L, panel, 0.1), bm); pnl.position.set(cx, y + panel / 2 + 0.05, cz); pnl.rotation.y = ang;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 0.24), pm); rail.position.set(cx, y + post - 0.05, cz); rail.rotation.y = ang;
    grp.add(pnl, rail);
  }
  const im = new THREE.InstancedMesh(postG, pm, posts.length);
  posts.forEach((mm, i) => im.setMatrixAt(i, mm));
  grp.add(im);
  return grp;
}

// ---- 柱列（带柱础）+ 额枋 ----
export function colonnade({ sides = 4, rx, rz = rx, y, h, mats, pitch = 3, r = 0.24, beam = true }) {
  const grp = new THREE.Group();
  const corners = polyCorners(sides, rx, rz);
  const colG = mergeGeometries([metricUV(new THREE.CylinderGeometry(r, r * 1.08, h, 20), .6, 1).translate(0, h / 2, 0)]);
  const baseG = metricUV(new THREE.CylinderGeometry(r * 1.5, r * 1.7, 0.3, 16), .75).translate(0, 0.15, 0);
  const ms = [], m = new THREE.Matrix4();
  for (let f = 0; f < sides; f++) {
    const A = corners[f], B = corners[(f + 1) % sides], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / pitch));
    for (let i = 0; i < n; i++) { const t = i / n; m.makeTranslation(A[0] + (B[0] - A[0]) * t, y, A[1] + (B[1] - A[1]) * t); ms.push(m.clone()); }
    if (beam) {
      const ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
      const bmesh = new THREE.Mesh(chamferBox(L + r, 0.55, r * 2, .025, .6, 0), mats.beam); bmesh.position.set((A[0] + B[0]) / 2, y + h - 0.3, (A[1] + B[1]) / 2); bmesh.rotation.y = ang;
      const lower = new THREE.Mesh(chamferBox(L + r, 0.3, r * 1.6, .02, .6, 0), mats.lacquer); lower.position.set((A[0] + B[0]) / 2, y + h - 0.75, (A[1] + B[1]) / 2); lower.rotation.y = ang;
      grp.add(bmesh, lower);
    }
  }
  const cols = new THREE.InstancedMesh(colG, mats.lacquer, ms.length), bases = new THREE.InstancedMesh(baseG, mats.stoneBase, ms.length);
  ms.forEach((mm, i) => { cols.setMatrixAt(i, mm); bases.setMatrixAt(i, mm); });
  grp.add(cols, bases);
  return grp;
}

// ---- 隔扇墙：在 n 边形墙面上贴一圈隔扇（或指定面） ----
export function latticeWall({ sides = 4, rx, rz = rx, y, h, mats, inset = 0.05, faces }) {
  const grp = new THREE.Group();
  const corners = polyCorners(sides, rx, rz);
  for (let f = 0; f < sides; f++) {
    if (faces && !faces.includes(f)) continue;
    const A = corners[f], B = corners[(f + 1) % sides], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const { nx, nz } = edge(A, B);
    const mat = mats.lattice.clone(); mat.map = mats.lattice.map.clone(); mat.map.repeat.set(Math.max(1, Math.round(L / 1.2)), 1); mat.map.needsUpdate = true; mat.userData = mats.lattice.userData;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.94, h), mat);
    w.position.set((A[0] + B[0]) / 2 + nx * inset, y + h / 2, (A[1] + B[1]) / 2 + nz * inset);
    w.rotation.y = Math.atan2(nx, nz); // PlaneGeometry 法线 +z，转向外法线
    grp.add(w);
  }
  return grp;
}

// ---- 灯笼：挂在指定点 ----
export function lanterns(points, mats, r = 0.35) {
  const g = mergeGeometries([
    new THREE.SphereGeometry(r, 10, 8).scale(1, 1.15, 1),
    new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.12, 8).translate(0, r * 1.15, 0),
    new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.12, 8).translate(0, -r * 1.15, 0),
    new THREE.CylinderGeometry(0.03, 0.03, r * 1.2, 4).translate(0, -r * 1.8, 0),
  ]);
  const im = new THREE.InstancedMesh(g, mats.lantern, points.length);
  const m = new THREE.Matrix4();
  points.forEach((p, i) => { m.makeTranslation(p[0], p[1], p[2]); im.setMatrixAt(i, m); });
  return im;
}

// ---- 匾额 ----
export function plaque(text, w = 3.2, h = 1.0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [std({ color: 0x1c2a4a }), std({ color: 0x1c2a4a }), std({ color: 0x1c2a4a }), std({ color: 0x1c2a4a }), std({ map: plaqueTex(text), roughness: 0.6 }), std({ color: 0x1c2a4a })]);
  return m;
}

// 世界坐标摆放
export const at = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };
// n 边形拐角坐标（供模块自定义）
export function polyCorners(sides, rx, rz = rx) {
  if (sides === 4) return [[rx, rz], [-rx, rz], [-rx, -rz], [rx, -rz]];
  const R = rx / Math.cos(Math.PI / sides); return Array.from({ length: sides }, (_, i) => { const a = -(i + 0.5) * 2 * Math.PI / sides; return [Math.sin(a) * R, Math.cos(a) * R]; });
}
// 边 A->B：长度、外法线、绕 Y 的朝向角（BoxGeometry 长轴沿局部 x）
export function edge(A, B) {
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz) || 1;
  return { L, nx: dz / L, nz: -dx / L, ang: Math.atan2(-dz, dx), cx: (A[0] + B[0]) / 2, cz: (A[1] + B[1]) / 2 };
}
