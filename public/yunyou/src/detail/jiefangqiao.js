// 解放桥精模：284×45 m 五跨空腹连拱桥。桥面 + 拱肋 + 小拱 + 墩台 + 白色栏板 + 路灯；夜景拱下暖光。
import * as THREE from 'three';
import { kitMats, applyNight } from './kit.js';
import { ringAngle, extrudeRing } from '../lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let K;

function deckRing(halfL, halfW) {
  return [[-halfL, -halfW], [halfL, -halfW], [halfL, halfW], [-halfL, halfW]];
}

function archRib(L, deckY, rise, depth, mat, cxSpan, nOpen) {
  const base = 1.0;
  const yArch = (x) => base + rise * (1 - (2 * x / L) ** 2); // 拱腹抛物线
  const s = new THREE.Shape();
  s.moveTo(-L / 2, deckY); s.lineTo(L / 2, deckY);
  s.lineTo(L / 2, base); s.quadraticCurveTo(0, base + rise * 2, -L / 2, base); s.closePath();
  // 空腹小拱：真孔洞（拱背与桥面之间）
  const sw = L * 0.09;
  for (let i = 0; i < nOpen; i++) {
    const ax = -L / 2 + L * (i + 1) / (nOpen + 1);
    if (Math.abs(ax) < sw) continue;
    const bottom = yArch(Math.abs(ax) - sw / 2) + 0.5, top = deckY - 0.7;
    if (top - bottom < sw / 2 + 0.4) continue;
    const h = new THREE.Path();
    h.moveTo(ax - sw / 2, bottom); h.lineTo(ax + sw / 2, bottom); h.lineTo(ax + sw / 2, top - sw / 2);
    h.absarc(ax, top - sw / 2, sw / 2, 0, Math.PI, false); h.lineTo(ax - sw / 2, bottom);
    s.holes.push(h);
  }
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat);
  m.position.set(cxSpan, 0, -depth / 2);
  return m;
}

function edgeRails(x0, x1, z, yAt, mats) {
  const grp = new THREE.Group();
  const postH = 1.15, pitch = 2.0;
  const len = Math.abs(x1 - x0);
  const n = Math.floor(len / pitch) + 1;
  const postG = mergeGeometries([
    new THREE.BoxGeometry(0.18, postH, 0.18).translate(0, postH / 2, 0),
    new THREE.SphereGeometry(0.12, 8, 6).translate(0, postH + 0.08, 0),
  ]);
  const posts = [], m = new THREE.Matrix4();
  const lo = Math.min(x0, x1);
  for (let i = 0; i < n; i++) {
    const x = lo + i * pitch;
    if (x > Math.max(x0, x1) + 0.01) break;
    m.makeTranslation(x, yAt(x) + 1.6, z); posts.push(m.clone());
  }
  const im = new THREE.InstancedMesh(postG, mats.marble, posts.length);
  posts.forEach((mm, i) => im.setMatrixAt(i, mm));
  grp.add(im);
  const yA = yAt(x0) + 1.6, yB = yAt(x1) + 1.6;
  const railLen = Math.hypot(x1 - x0, yB - yA);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.12, 0.22), mats.marble);
  rail.position.set((x0 + x1) / 2, (yA + yB) / 2 + postH - 0.05, z);
  rail.rotation.z = Math.atan2(yB - yA, x1 - x0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.32), mats.marble);
  cap.position.set((x0 + x1) / 2, (yAt(x0) + yAt(x1)) / 2 + 1.66, z);
  cap.rotation.z = Math.atan2(yB - yA, x1 - x0);
  grp.add(rail, cap);
  return grp;
}

function lampRow(x0, x1, z, yAt, mats) {
  const grp = new THREE.Group();
  const pitch = 12, len = Math.abs(x1 - x0);
  const n = Math.floor(len / pitch);
  const poleG = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6).translate(0, 1.6, 0);
  const bulbG = new THREE.SphereGeometry(0.22, 8, 6).translate(0, 3.35, 0);
  const ms = [], m = new THREE.Matrix4();
  const lo = Math.min(x0, x1);
  for (let i = 0; i <= n; i++) {
    const x = lo + i * pitch;
    if (x > Math.max(x0, x1) + 0.01) break;
    m.makeTranslation(x, yAt(x) + 1.6, z); ms.push(m.clone());
  }
  const poles = new THREE.InstancedMesh(poleG, mats.dark, ms.length), bulbs = new THREE.InstancedMesh(bulbG, mats.lantern, ms.length);
  ms.forEach((mm, i) => { poles.setMatrixAt(i, mm); bulbs.setMatrixAt(i, mm); });
  grp.add(poles, bulbs);
  return grp;
}

function extrudeRampBand(x0, x1, yBot0, yBot1, yTop0, yTop1, z0, depth, mat) {
  const s = new THREE.Shape();
  s.moveTo(x0, yBot0); s.lineTo(x1, yBot1); s.lineTo(x1, yTop1); s.lineTo(x0, yTop0); s.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat);
  m.position.z = z0;
  return m;
}

function buildApproachRamp(g, sign, halfL, rampLen, halfW, deckY, groundY, K, laneW, roadHalf, plantW) {
  const x0 = sign * halfL, x1 = sign * (halfL + rampLen);
  const yTopJ = deckY + 1.72;
  const tAt = (x) => (sign > 0 ? (x - halfL) / rampLen : (-x - halfL) / rampLen);
  const yTop = (x) => yTopJ - (yTopJ - groundY) * tAt(x);
  const yDeckTop = (x) => yTop(x) - 0.12;
  const yDeckBot = (x) => yDeckTop(x) - 1.6;
  const slopeA = Math.atan2(groundY - yTopJ, sign * rampLen);

  // 实体填土 + 坡面板
  g.add(extrudeRampBand(x0, x1, 0, 0, yDeckBot(x0), yDeckBot(x1), -halfW, halfW * 2, K.concrete));
  g.add(extrudeRampBand(x0, x1, yDeckBot(x0), yDeckBot(x1), yDeckTop(x0), yDeckTop(x1), -halfW, halfW * 2, K.concrete));

  // 沥青 + 人行道 + 绿化带
  g.add(extrudeRampBand(x0, x1, yDeckTop(x0), yDeckTop(x1), yTop(x0), yTop(x1), -roadHalf, roadHalf * 2, K.asphalt));
  for (const side of [-1, 1]) {
    const swZ = side * (halfW + roadHalf + plantW) / 2 - (halfW - roadHalf - plantW) / 2;
    g.add(extrudeRampBand(x0, x1, yDeckTop(x0), yDeckTop(x1), yTop(x0), yTop(x1), swZ, halfW - roadHalf - plantW, K.concrete));
    const bedZ = side * (roadHalf + plantW / 2) - plantW / 2;
    g.add(extrudeRampBand(x0, x1, yDeckTop(x0), yDeckTop(x1), yTop(x0), yTop(x1), bedZ, plantW, K.grass));
    g.add(extrudeRampBand(x0, x1, yTop(x0) - 0.02, yTop(x1) - 0.02, yTop(x0), yTop(x1), side * 0.22 - 0.07, 0.14, K.yellowLine));
  }

  // 白虚线（随坡旋转）
  const dashG = new THREE.BoxGeometry(3, 0.02, 0.14), ms = [], m4 = new THREE.Matrix4(), rm = new THREE.Matrix4();
  rm.makeRotationZ(slopeA);
  for (const side of [-1, 1]) for (const li of [1, 2]) {
    for (let x = x0 + sign * 6; sign > 0 ? x < x1 - 6 : x > x1 + 6; x += sign * 6) {
      m4.makeTranslation(x, yTop(x), side * li * laneW);
      m4.multiply(rm);
      ms.push(m4.clone());
    }
  }
  if (ms.length) {
    const dash = new THREE.InstancedMesh(dashG, K.marble, ms.length);
    ms.forEach((mm, i) => dash.setMatrixAt(i, mm)); g.add(dash);
  }

  // 绿化带小乔木
  const trunkG = new THREE.CylinderGeometry(0.1, 0.13, 2.2, 6).translate(0, 1.1, 0);
  const crownG = new THREE.SphereGeometry(1.5, 8, 6).translate(0, 3.0, 0);
  const ts = [];
  for (const side of [-1, 1]) {
    for (let x = x0 + sign * 8; sign > 0 ? x < x1 - 6 : x > x1 + 6; x += sign * 7) {
      m4.makeTranslation(x, yDeckBot(x) + 1.8, side * (roadHalf + plantW / 2)); ts.push(m4.clone());
    }
  }
  if (ts.length) {
    const trunks = new THREE.InstancedMesh(trunkG, K.trunk, ts.length), crowns = new THREE.InstancedMesh(crownG, K.leaf, ts.length);
    ts.forEach((mm, i) => { trunks.setMatrixAt(i, mm); crowns.setMatrixAt(i, mm); });
    g.add(trunks, crowns);
  }

  g.add(edgeRails(x0, x1, -halfW + 0.35, yDeckBot, K), edgeRails(x0, x1, halfW - 0.35, yDeckBot, K));
  g.add(lampRow(x0, x1, -halfW + 1.6, yDeckBot, K), lampRow(x0, x1, halfW - 1.6, yDeckBot, K));
}

export function build({ F, TEX }) {
  if (!K) {
    K = kitMats(TEX);
    const std = (o) => new THREE.MeshStandardMaterial(o);
    K.grass = std({ color: 0x5f8a45, roughness: 1 });
    K.leaf = std({ color: 0x467a3a, roughness: 0.95 });
    K.trunk = std({ color: 0x5a4636, roughness: 0.95 });
    K.yellowLine = std({ color: 0xe8b52a, roughness: 0.8 });
  }
  const g = new THREE.Group();
  const [cx, cz] = F.jiefangqiao.c;
  const ry = ringAngle(F.jiefangqiao.o);
  const deckY = 8.2, halfL = 142, halfW = 22.5;
  const ring = deckRing(halfL, halfW);

  g.add(new THREE.Mesh(extrudeRing(ring, 1.6, deckY), K.concrete));

  // 实景航拍：双向 6 车道 + 黄色双实线 + 白虚线，两侧绿化带（小乔木）+ 人行道
  const laneW = 3.5, roadHalf = laneW * 3, plantW = 1.6, yTop = deckY + 1.72;
  const asphalt = new THREE.Mesh(new THREE.BoxGeometry(halfL * 2, 0.12, roadHalf * 2), K.asphalt);
  asphalt.position.y = deckY + 1.66; g.add(asphalt);
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(halfL * 2, 0.16, halfW - roadHalf - plantW), K.concrete);
    sw.position.set(0, deckY + 1.68, side * (halfW + roadHalf + plantW) / 2); g.add(sw);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(halfL * 2, 0.22, plantW), K.grass);
    bed.position.set(0, deckY + 1.71, side * (roadHalf + plantW / 2)); g.add(bed);
    const yl = new THREE.Mesh(new THREE.BoxGeometry(halfL * 2 - 8, 0.02, 0.14), K.yellowLine);
    yl.position.set(0, yTop, side * 0.22); g.add(yl);
  }
  {
    const dashG = new THREE.BoxGeometry(3, 0.02, 0.14), ms = [], m4 = new THREE.Matrix4();
    for (const side of [-1, 1]) for (const li of [1, 2]) for (let x = -halfL + 6; x < halfL - 6; x += 6) { m4.makeTranslation(x, yTop, side * li * laneW); ms.push(m4.clone()); }
    const dash = new THREE.InstancedMesh(dashG, K.marble, ms.length); ms.forEach((mm, i) => dash.setMatrixAt(i, mm)); g.add(dash);
    const trunkG = new THREE.CylinderGeometry(0.1, 0.13, 2.2, 6).translate(0, 1.1, 0), crownG = new THREE.SphereGeometry(1.5, 8, 6).translate(0, 3.0, 0);
    const ts = [];
    for (const side of [-1, 1]) for (let x = -halfL + 8; x < halfL - 6; x += 7) { m4.makeTranslation(x, deckY + 1.8, side * (roadHalf + plantW / 2)); ts.push(m4.clone()); }
    const trunks = new THREE.InstancedMesh(trunkG, K.trunk, ts.length), crowns = new THREE.InstancedMesh(crownG, K.leaf, ts.length);
    ts.forEach((mm, i) => { trunks.setMatrixAt(i, mm); crowns.setMatrixAt(i, mm); });
    g.add(trunks, crowns);
  }

  g.add(edgeRails(-halfL, halfL, -halfW + 0.35, () => deckY, K), edgeRails(-halfL, halfL, halfW - 0.35, () => deckY, K));
  g.add(lampRow(-halfL, halfL, -halfW + 1.6, () => deckY, K), lampRow(-halfL, halfL, halfW - 1.6, () => deckY, K));

  const rampLen = 85, groundY = 0.9;
  buildApproachRamp(g, 1, halfL, rampLen, halfW, deckY, groundY, K, laneW, roadHalf, plantW);
  buildApproachRamp(g, -1, halfL, rampLen, halfW, deckY, groundY, K, laneW, roadHalf, plantW);

  const archLight = new THREE.MeshStandardMaterial({ color:0x49b9df, emissive:0x29bce8, emissiveIntensity:0, roughness:.4, userData:{night:{color:0x29bce8,intensity:2.3}} });
  const warmLight = new THREE.MeshStandardMaterial({ color:0xffd599, emissive:0xffc97d, emissiveIntensity:0, userData:{night:{color:0xffc97d,intensity:1.5}} });
  const spans = [41.5, 61, 72, 61, 41.5];
  let x = -spans.reduce((a, b) => a + b, 0) / 2;
  const pierXs = [];
  for (let si = 0; si < spans.length; si++) {
    const L = spans[si];
    const rise = L * 0.1;
    const cxSpan = x + L / 2;
    g.add(archRib(L, deckY, rise, 44, K.concrete, cxSpan, L > 50 ? 6 : 4));
    for(const side of [-1,1]){
      const pts=[];for(let i=0;i<=32;i++){const u=i/32;pts.push(new THREE.Vector3(x+u*L,1+rise*(1-(2*u-1)**2)+.24,side*22.14));}
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.16,5,false),archLight));
      const strip=new THREE.Mesh(new THREE.BoxGeometry(L,.12,.14),warmLight);strip.position.set(cxSpan,deckY+1.68,side*22.5);g.add(strip);
    }
    x += L;
    if (si < spans.length - 1) pierXs.push(x);
  }

  for (const px of pierXs) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4.5, deckY + 0.5, 42), K.concrete);
    pier.position.set(px, deckY / 2 - 0.2, 0); g.add(pier);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 42, 10), K.concrete);
    nose.rotation.x = Math.PI / 2; nose.position.set(px, deckY * 0.35, 0); g.add(nose);
  }

  for (const sx of [-halfL + 2.5, halfL - 2.5]) {
    const ab = new THREE.Mesh(new THREE.BoxGeometry(5, deckY + 2, 44), K.concrete);
    ab.position.set(sx, deckY / 2, 0); g.add(ab);
  }

  const lights = [
    [-55, 4, 0], [0, 4, 0], [55, 4, 0], [95, 4, 0],
  ];
  for (const [lx, ly, lz] of lights) {
    const pl = new THREE.PointLight(0xffa860, 18, 70, 1.8);
    pl.position.set(lx, ly, lz); g.add(pl);
  }

  g.position.set(cx, 0, cz);
  g.rotation.y = ry;
  g.userData.top = 12;
  return g;
}
export const night = applyNight;
