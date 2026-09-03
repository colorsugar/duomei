// 靖江王城精模：料石城墙、正阳门/承运门/承运殿、东华/西华/广智门、独秀峰与独秀亭。
import * as THREE from 'three';
import {
  kitMats, applyNight, polyRoof, dougong, balustrade, colonnade, latticeWall,
  lanterns, plaque, at, polyCorners, edge,
} from './kit.js';
import { wangchengWalls, duxiufengPeak, zhengyangAnchor } from '../landmarks.js';
import { extrudeRing, ringAngle } from '../lib.js';

let K;
const rm = (K) => ({ roof: K.tile, ridge: K.ridge, eaveWood: K.eaveWood, finial: K.gold });
const rg = (K) => ({ roof: K.tileGreen, ridge: K.ridgeGreen, eaveWood: K.eaveWood, finial: K.gold }); // 承运门：绿琉璃瓦
// 承运殿现存为 1947 年民国重建（航拍实景：橙红陶瓦、米黄墙面）
const rr = (K) => ({ roof: K.tileRed ??= Object.assign(K.tile.clone(), { color: new THREE.Color(0xc4562e) }), ridge: K.ridge, eaveWood: K.eaveWood, finial: K.gold });
const tanWall = (K) => (K.tanWall ??= Object.assign(K.wall.clone(), { color: new THREE.Color(0xe6d3a8) }));
const yellowWall = (K) => (K.yellowWall ??= Object.assign(K.wall.clone(), { color: new THREE.Color(0xf2c24f), roughness: 0.92 }));
const whiteTrim = (K) => (K.whiteTrim ??= Object.assign(K.marble.clone(), { color: new THREE.Color(0xeae6de), roughness: 0.55 }));
const roofDark = (K) => (K.roofDark ??= {
  roof: Object.assign(K.tile.clone(), { color: new THREE.Color(0x50545a), roughness: 0.88, userData: K.tile.userData }),
  ridge: K.ridge, eaveWood: K.eaveWood, finial: K.marble,
});
const rd = (K) => roofDark(K);
const arch = (w, h) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return s;
};

function wallBox(w, d, h, y, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y + h / 2; return m;
}

function crenellatedParapet(ring, y, mat, pitch = 2.4) {
  const g = new THREE.Group();
  const merG = new THREE.BoxGeometry(1.3, 0.85, 0.75);
  const ms = [], m4 = new THREE.Matrix4();
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 1) continue;
    for (let s = pitch * 0.5; s < L; s += pitch) {
      m4.makeRotationY(Math.atan2(-dz, dx));
      m4.setPosition(ax + (dx / L) * s, y + 0.42, az + (dz / L) * s);
      ms.push(m4.clone());
    }
  }
  if (ms.length) {
    const im = new THREE.InstancedMesh(merG, mat, ms.length);
    ms.forEach((mm, i) => im.setMatrixAt(i, mm));
    g.add(im);
  }
  return g;
}

function gateArches(parent, platH, archH, archW, count, rz, mats) {
  const g = new THREE.Group();
  const gap = archW * 1.15;
  const span = (count - 1) * gap;
  for (const zSign of [-1, 1]) {
    const z = zSign * (rz + 0.08);
    for (let i = 0; i < count; i++) {
      const x = -span / 2 + i * gap;
      const outer = arch(archW * 1.12, archH * 1.04); outer.holes.push(arch(archW, archH));
      const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.35, bevelEnabled: false }), mats.stoneBase);
      const dark = new THREE.Mesh(new THREE.ShapeGeometry(arch(archW, archH)), mats.dark);
      frame.position.set(x, 0.05, z); dark.position.set(x, 0.06, z + zSign * 0.02);
      frame.rotation.y = zSign > 0 ? 0 : Math.PI;
      dark.rotation.y = frame.rotation.y;
      g.add(frame, dark);
    }
  }
  g.position.y = platH * 0.08;
  parent.add(g);
}

function gateTower({ w, d, h, rx, rz, ridge, y0, K, plaqueText, balcony = false, upper = null }) {
  const t = new THREE.Group();
  t.add(wallBox(w, d, h, y0, K.wall));
  t.add(colonnade({ sides: 4, rx: rx ?? w / 2, rz: rz ?? d / 2, y: y0, h, mats: K, pitch: w / 7 }));
  t.add(latticeWall({ sides: 4, rx: (rx ?? w / 2) - 0.25, rz: (rz ?? d / 2) - 0.25, y: y0 + 0.4, h: h - 0.8, mats: K, faces: [0, 2] }));
  t.add(dougong({ sides: 4, rx: (rx ?? w / 2) + 0.15, rz: (rz ?? d / 2) + 0.15, y: y0 + h - 1.05, mats: K }));
  let roofY = y0 + h - 0.15;
  if (balcony) {
    t.add(balustrade({ sides: 4, rx: w / 2 + 0.7, rz: d / 2 + 0.7, y: y0 + h + 0.15, mats: K, post: 1.0, panel: 0.65, pitch: 1.4 }));
    roofY = y0 + h + 0.55;
    const waist = polyRoof({ sides: 4, rx: w / 2 - 0.4, rz: d / 2 - 0.4, h: 1.1, ridge: w * 0.55, over: 1.3, curl: 0.55, rows: 4, segs: 8, mats: rm(K), y: y0 + h - 0.1 });
    t.add(waist);
  }
  if (upper) {
    const uy = roofY + (balcony ? 0.45 : 0);
    t.add(wallBox(upper.w, upper.d, upper.h, uy, K.wall));
    t.add(colonnade({ sides: 4, rx: upper.w / 2, rz: upper.d / 2, y: uy, h: upper.h, mats: K, pitch: upper.w / 5 }));
    t.add(latticeWall({ sides: 4, rx: upper.w / 2 - 0.2, rz: upper.d / 2 - 0.2, y: uy + 0.35, h: upper.h - 0.7, mats: K, faces: [0, 2] }));
    t.add(dougong({ sides: 4, rx: upper.w / 2 + 0.15, rz: upper.d / 2 + 0.15, y: uy + upper.h - 1.0, mats: K }));
    roofY = uy + upper.h - 0.15;
    if (plaqueText) {
      const p = plaque(plaqueText, 2.6, 0.85);
      p.position.set(0, uy + upper.h * 0.55, d / 2 + 0.35);
      t.add(p);
    }
  } else if (plaqueText) {
    const p = plaque(plaqueText, 2.4, 0.8);
    p.position.set(0, y0 + h * 0.55, d / 2 + 0.3);
    t.add(p);
  }
  const roof = polyRoof({
    sides: 4, rx: (upper?.w ?? w) / 2, rz: (upper?.d ?? d) / 2, h: balcony ? 3.4 : 3.8,
    ridge: ridge ?? w * 0.55, over: 2.0, curl: 0.82, rows: 5, segs: 9, mats: rm(K), y: roofY,
  });
  t.add(roof);
  const topY = roofY + (balcony ? 5.8 : 5.2);
  const corners = polyCorners(4, w / 2 + 0.5, d / 2 + 0.5);
  t.add(lanterns(corners.map(([x, z]) => [x, topY, z]), K));
  return t;
}

function vertPlaque(text, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.fillStyle = fg; ctx.font = 'bold 72px "Noto Serif CJK SC", "Songti SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const step = (c.height - 40) / text.length;
  for (let i = 0; i < text.length; i++) ctx.fillText(text[i], c.width / 2, 20 + step * (i + 0.5));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
}

function addBox(g, w, d, h, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); g.add(m); return m;
}

function corbelBand(g, w, d, y, mat, steps = 4, drop = 0.14) {
  for (let i = 0; i < steps; i++) {
    const inset = i * 0.09, h = drop;
    addBox(g, w - inset * 2, d + 0.06, h, 0, y + i * h, 0, mat);
  }
}

function smallWindow(g, x, y, z, K) {
  const fr = K.woodDark ?? K.lacquer;
  addBox(g, 1.15, 0.12, 1.15, x, y, z, fr);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), K.lattice);
  pane.position.set(x, y + 0.575, z + (z > 0 ? 0.07 : -0.07));
  if (z < 0) pane.rotation.y = Math.PI;
  g.add(pane);
}

function ridgeFinials(parent, x0, x1, y, z, mat) {
  for (const x of [x0, x1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.42), mat);
    f.position.set(x, y + 0.52, z); f.rotation.z = x < 0 ? 0.22 : -0.22;
    parent.add(f);
  }
}

function zhengyangGateTower(K) {
  const g = new THREE.Group();
  const yw = yellowWall(K), wt = whiteTrim(K), rm = rd(K);
  const totalW = 30, depth = 8, mainW = 12, mainH = 16, wingW = 9, wingH = 9; // 实景：中楼两层高于两翼，拱门上方一重低檐
  const archW = 6, archH = 8, frontZ = depth / 2, backZ = -depth / 2;
  const pillarW = (mainW - archW) / 2;
  const wingX = mainW / 2 + wingW / 2;
  const baseY = 0.55;

  addBox(g, totalW, depth, 0.55, 0, 0, 0, K.stoneBase);
  addBox(g, pillarW, depth, mainH, -mainW / 2 + pillarW / 2, baseY, 0, yw);
  addBox(g, pillarW, depth, mainH, mainW / 2 - pillarW / 2, baseY, 0, yw);
  addBox(g, mainW, depth, mainH - archH, 0, baseY + archH, 0, yw);
  for (const sx of [-1, 1]) addBox(g, wingW, depth, wingH, sx * wingX, baseY, 0, yw);

  const tunnel = new THREE.Mesh(new THREE.ExtrudeGeometry(arch(archW * 0.94, archH * 0.96), { depth: depth - 0.3, bevelEnabled: false }), K.dark);
  tunnel.position.set(0, baseY, -depth / 2 + 0.15); tunnel.rotation.y = Math.PI / 2; g.add(tunnel);
  const outer = arch(archW * 1.12, archH * 1.04); outer.holes.push(arch(archW, archH));
  for (const [z, ry] of [[frontZ + 0.04, 0], [backZ - 0.04, Math.PI]]) {
    const aFrame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.38, bevelEnabled: false }), wt);
    aFrame.position.set(0, baseY, z); aFrame.rotation.y = ry; g.add(aFrame);
  }

  for (const sx of [-1, 1]) {
    addBox(g, 0.22, depth + 0.1, mainH, sx * (mainW / 2 - 0.11), baseY, 0, wt);
    addBox(g, 0.22, depth + 0.1, wingH, sx * (wingX + sx * (wingW / 2 - 0.11)), baseY, 0, wt);
  }
  addBox(g, totalW + 0.14, 0.14, 0.2, 0, baseY + mainH, frontZ + 0.08, wt);

  for (const y of [baseY + 11.8, baseY + 14.0]) for (const x of [-3.6, -1.2, 1.2, 3.6]) smallWindow(g, x, y, frontZ + 0.1, K);
  for (const sx of [-1, 1]) {
    smallWindow(g, sx * (wingX - 1.7), baseY + 5.6, frontZ + 0.1, K);
    smallWindow(g, sx * (wingX + 1.7), baseY + 5.6, frontZ + 0.1, K);
    smallWindow(g, sx * wingX, baseY + 7.2, frontZ + 0.1, K);
  }

  const mainRoofY = baseY + mainH - 0.1;
  corbelBand(g, mainW + 0.55, depth + 0.08, mainRoofY - 0.58, wt, 5, 0.11);
  g.add(polyRoof({ sides: 4, rx: mainW / 2 + 0.4, rz: depth / 2 + 0.5, h: 4.0, ridge: 7.8, over: 1.9, curl: 1.0, rows: 5, segs: 10, mats: rm, y: mainRoofY }));
  ridgeFinials(g, -4.3, 4.3, mainRoofY + 3.75, 0, wt);

  const wingRoofY = baseY + wingH - 0.1;
  for (const sx of [-1, 1]) {
    corbelBand(g, wingW + 0.4, depth + 0.06, wingRoofY - 0.44, wt, 4, 0.1);
    const wr = polyRoof({ sides: 4, rx: wingW / 2 + 0.25, rz: depth / 2 + 0.38, h: 2.7, ridge: 5.8, over: 1.5, curl: 0.82, rows: 4, segs: 9, mats: rm, y: wingRoofY });
    wr.position.x = sx * wingX; g.add(wr);
    ridgeFinials(g, sx * wingX - 2.6, sx * wingX + 2.6, wingRoofY + 2.5, 0, wt);
  }

  // 中楼拱门上方的低檐（照片：匾额与大红灯笼都挂在这重檐下）
  const capY = baseY + 10.2;
  corbelBand(g, mainW + 0.25, depth + 0.18, capY - 0.3, wt, 3, 0.09);
  g.add(polyRoof({ sides: 4, rx: mainW / 2 + 0.2, rz: depth / 2 + 0.6, h: 1.3, ridge: mainW * 0.5, over: 0.9, curl: 0.45, rows: 3, segs: 8, mats: rm, y: capY }));

  const pMain = vertPlaque('靖江王府', 0.85, 1.9, '#e8c364', '#1a1410');
  pMain.position.set(0, baseY + archH + 1.15, frontZ + 0.24); g.add(pMain);
  const pSide = vertPlaque('广西师范大学', 0.78, 3.2, '#1a1410', '#e8c364');
  pSide.position.set(archW / 2 + pillarW / 2, baseY + 2.4, frontZ + 0.24); g.add(pSide);

  const ly = baseY + 6.0;
  g.add(lanterns([[-archW / 2 - 1.05, ly, frontZ + 0.6], [-archW / 2 - 1.95, ly - 0.25, frontZ + 0.6],
    [archW / 2 + 1.05, ly, frontZ + 0.6], [archW / 2 + 1.95, ly - 0.25, frontZ + 0.6]], K, 0.48));
  const eavePts = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) eavePts.push([sx * (wingX - 2.2 + i * 0.95), wingRoofY + 1.85, frontZ + 1.1]);
  g.add(lanterns(eavePts, K, 0.24));
  return g;
}

function zhengyangmen(F, K) {
  // 实景：正阳门是落地的牌楼式门楼，拱门直接在地面贯通，不坐在高台上；门楼中心对齐城墙线（城墙在此断开）
  const { x, z, angle } = zhengyangAnchor(F);
  const g = new THREE.Group();
  g.add(at(zhengyangGateTower(K), x, 0, z, angle));
  return g;
}

function chengyunmen(F, K) {
  const foot = F.chengyunmen, [cx, cz] = foot.c, ry = ringAngle(foot.o), platH = 5;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(extrudeRing(foot.o, platH), K.stoneBase));
  g.add(crenellatedParapet(foot.o, platH, K.stoneBase));
  const local = new THREE.Group();
  local.position.set(cx, 0, cz); local.rotation.y = ry;
  gateArches(local, platH, 4.2, 3.4, 1, 3.8, K);
  g.add(local);
  const tower = gateTower({ w: 20, d: 8, h: 6, y0: 0, ridge: 12, K, plaqueText: '承运门' });
  at(tower, cx, platH, cz, ry);
  g.add(tower);
  return g;
}

function sideGate(x, z, ry, K, wallH = 7.9) {
  const t = new THREE.Group();
  const w = 16, d = 7, h = 5;
  t.add(wallBox(w, d, h, 0, K.wall));
  t.add(colonnade({ sides: 4, rx: w / 2, rz: d / 2, y: 0, h, mats: K, pitch: 2.8 }));
  t.add(latticeWall({ sides: 4, rx: w / 2 - 0.2, rz: d / 2 - 0.2, y: 0.35, h: h - 0.7, mats: K, faces: [0, 2] }));
  t.add(dougong({ sides: 4, rx: w / 2 + 0.12, rz: d / 2 + 0.12, y: h - 1.0, mats: K, pitch: 1.5 }));
  t.add(polyRoof({ sides: 4, rx: w / 2, rz: d / 2, h: 3.2, ridge: 9, over: 1.7, curl: 0.7, rows: 4, segs: 8, mats: rm(K), y: h - 0.12 }));
  at(t, x, wallH, z, ry);
  return t;
}

function incenseBurner(K) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 10), K.copper));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.35, 10), K.copperDark).translateY(0.42));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 12), K.copper).translateY(0.65).rotateX(Math.PI / 2));
  return g;
}

function chengyundian(F, K) {
  const foot = F.chengyundian, [cx, cz] = foot.c, ry = ringAngle(foot.o), baseH = 2.2;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(extrudeRing(foot.o, baseH), K.marble));
  g.add(crenellatedParapet(foot.o, baseH, K.marble, 2.8));
  const hall = new THREE.Group();
  hall.rotation.y = ry;
  // 须弥座栏板
  hall.add(balustrade({ sides: 4, rx: 22, rz: 10.5, y: baseH, mats: K, post: 1.15, panel: 0.75, pitch: 1.6 }));
  // 前月台 + 三级踏跺
  const terrace = new THREE.Group();
  terrace.position.set(0, baseH, 12);
  terrace.add(new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 8), K.marble));
  terrace.add(balustrade({ sides: 4, rx: 14, rz: 4, y: 0.45, mats: K, post: 1.0, panel: 0.65, pitch: 1.5 }));
  for (const sx of [-8, 0, 8]) {
    const st = new THREE.Group(); st.position.set(sx, 0, 5.5);
    for (let i = 0; i < 5; i++) {
      st.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.55), K.stoneBase).translateY(i * 0.22).translateZ(-i * 0.32));
    }
    terrace.add(st);
  }
  for (const bx of [-6, 0, 6]) {
    const b = incenseBurner(K); b.position.set(bx, 0.5, 2); b.scale.setScalar(0.85); terrace.add(b);
  }
  hall.add(terrace);
  const y0 = baseH;
  const lw = 42, ld = 20, lh = 6;
  hall.add(wallBox(lw, ld, lh, y0, K.redWall));
  hall.add(colonnade({ sides: 4, rx: lw / 2, rz: ld / 2, y: y0, h: lh, mats: K, pitch: lw / 7 }));
  hall.add(latticeWall({ sides: 4, rx: lw / 2 - 0.3, rz: ld / 2 - 0.3, y: y0 + 0.5, h: lh - 0.9, mats: K, faces: [0, 2] }));
  hall.add(dougong({ sides: 4, rx: lw / 2 + 0.2, rz: ld / 2 + 0.2, y: y0 + lh - 1.05, mats: K, pitch: 1.7 }));
  const eave1Y = y0 + lh - 0.12;
  hall.add(polyRoof({ sides: 4, rx: lw / 2 - 0.5, rz: ld / 2 - 0.5, h: 2.0, ridge: lw * 0.62, over: 1.8, curl: 0.65, rows: 4, segs: 9, mats: rg(K), y: eave1Y }));
  const uy = eave1Y + 1.6;
  const uw = 36, ud = 16, uh = 3.8;
  hall.add(wallBox(uw, ud, uh, uy, K.redWall));
  hall.add(colonnade({ sides: 4, rx: uw / 2, rz: ud / 2, y: uy, h: uh, mats: K, pitch: uw / 7 }));
  hall.add(latticeWall({ sides: 4, rx: uw / 2 - 0.2, rz: ud / 2 - 0.2, y: uy + 0.35, h: uh - 0.7, mats: K, faces: [0, 2] }));
  hall.add(dougong({ sides: 4, rx: uw / 2 + 0.15, rz: ud / 2 + 0.15, y: uy + uh - 1.0, mats: K, pitch: 1.6 }));
  const p = plaque('承运殿', 3.4, 1.0); p.position.set(0, uy + uh * 0.55, ld / 2 + 0.45); hall.add(p);
  hall.add(polyRoof({ sides: 4, rx: uw / 2, rz: ud / 2, h: 4.8, ridge: 26, over: 2.4, curl: 0.88, rows: 5, segs: 10, mats: rg(K), y: uy + uh - 0.15 }));
  hall.position.set(cx, 0, cz);
  g.add(hall);
  return g;
}

function duxiuting(K, y) {
  const g = new THREE.Group();
  const r = 2.6, colH = 3.0;
  g.add(colonnade({ sides: 6, rx: r, y: 0, h: colH, mats: K, pitch: 1.55, r: 0.18 }));
  g.add(balustrade({ sides: 6, rx: r + 0.15, y: 0.05, mats: K, post: 0.95, panel: 0.55, pitch: 1.35 }));
  g.add(polyRoof({ sides: 6, rx: r, h: 2.4, over: 1.3, curl: 0.65, rows: 4, segs: 8, mats: rg(K), y: colH - 0.1 }));
  g.position.set(138, y, -343);
  return g;
}

function peakStairs(peak, K) {
  const g = new THREE.Group();
  const stepG = new THREE.BoxGeometry(1.1, 0.18, 0.45);
  const ms = [], m4 = new THREE.Matrix4();
  const pts = [[132, -318], [134, -325], [136, -332], [137, -338], [138, -343]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const steps = 6 + i * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const y = peak.userData.heightAt(x, z) + 0.09;
      m4.makeRotationY(Math.atan2(x1 - x0, z1 - z0));
      m4.setPosition(x, y, z);
      ms.push(m4.clone());
    }
  }
  if (ms.length) {
    const im = new THREE.InstancedMesh(stepG, K.stoneBase, ms.length);
    ms.forEach((mm, i) => im.setMatrixAt(i, mm));
    g.add(im);
  }
  return g;
}

export function build({ F, M, TEX }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  g.add(wangchengWalls(F, M));
  const peak = duxiufengPeak(F);
  g.add(peak);
  g.add(zhengyangmen(F, K));
  g.add(chengyunmen(F, K));
  g.add(chengyundian(F, K));
  g.add(sideGate(244.3, 8.0, Math.PI / 2 - 0.14, K));
  g.add(sideGate(-77.7, -32.7, Math.PI / 2 - 0.14, K));
  g.add(sideGate(147.7, -436.3, -0.14, K));
  const py = peak.userData.heightAt(138, -343) - 0.3;
  g.add(duxiuting(K, py));
  g.add(peakStairs(peak, K));
  // 夜景补光（≤4）
  const l1 = new THREE.PointLight(0xffc070, 28, 85, 1.5); l1.position.set(67, 18, 95);
  const l2 = new THREE.PointLight(0xffb860, 22, 70, 1.5); l2.position.set(105, 16, 95);
  const l3 = new THREE.PointLight(0xffc878, 24, 80, 1.5); l3.position.set(105, 14, -145);
  const l4 = new THREE.PointLight(0xffb050, 18, 60, 1.5); l4.position.set(88, 12, -38);
  g.add(l1, l2, l3, l4);
  g.userData.top = 72;
  return g;
}

export const night = applyNight;
