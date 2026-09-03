// 逍遥楼精模：仿唐宋二层三重檐楼阁（副阶檐 + 平座腰檐 + 歇山顶），台基以上通高约 24 m。
// 立于 ~8 m 青灰条石台基（顶缘汉白玉栏板）；木构暖金棕，深灰筒瓦；夜景整楼暖黄泛光。
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, balustrade, colonnade, latticeWall, lanterns, plaque } from './kit.js';
import { ringAngle } from '../lib.js';

let K, W, woodMats;
const box = (w, h, d, mat, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.y = y; return b; };

function initMats(TEX) {
  if (K) return;
  K = kitMats(TEX);
  const wn = (i) => ({ night: { color: 0xffa640, intensity: i } });
  K.woodGold = K.woodDark.clone(); K.woodGold.color.setHex(0xc98a3a); K.woodGold.userData = wn(0.72);
  K.woodGlow = K.woodDark.clone(); K.woodGlow.color.setHex(0xc98a3a); K.woodGlow.userData = wn(0.88);
  K.tileRoof = K.tile.clone(); K.tileRoof.color.setHex(0x4a4e55);
  K.tileRoof.userData = { night: { color: 0x222428, intensity: 0.06, map: true } };
  K.stoneGrey = K.stoneBase.clone(); K.stoneGrey.color.setHex(0xc9ccd0); // 实景：浅青灰条石
  K.wallDim = K.wall.clone(); K.wallDim.userData = { night: { color: 0x6a5030, intensity: 0.12, map: true } };
  K.latticeWood = K.lattice.clone(); K.latticeWood.userData = { night: { color: 0xffb868, intensity: 0.95, map: true } };
  K.paving = new THREE.MeshStandardMaterial({ map: TEX.stone, color: 0xcfcac0, roughness: 0.95 });
  woodMats = new Set([K.woodGold, K.woodGlow]);
  W = { lacquer: K.woodGold, dougong: K.woodGlow, beam: K.woodGold };
}

const roofMats = (K) => ({ roof: K.tileRoof, ridge: K.ridge, eaveWood: K.woodGold, finial: K.gold });

// 歇山山花（±z 山面三角板）
function gableEnds(rx, y, h, z, mat) {
  const g = new THREE.Group();
  const sh = (sign) => {
    const s = new THREE.Shape(); s.moveTo(-rx, 0); s.lineTo(rx, 0); s.lineTo(0, h); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), mat);
    m.position.set(0, y, sign * z); if (sign < 0) m.rotation.y = Math.PI;
    return m;
  };
  g.add(sh(1), sh(-1));
  return g;
}

// 檐角小灯
function eaveLamps(corners, y, mat) {
  const geo = new THREE.SphereGeometry(0.14, 8, 6);
  const im = new THREE.InstancedMesh(geo, mat, corners.length);
  const m = new THREE.Matrix4();
  corners.forEach(([x, z], i) => { m.makeTranslation(x, y, z); im.setMatrixAt(i, m); });
  return im;
}

export function build({ F, TEX }) {
  initMats(TEX);
  const g = new THREE.Group();
  const [cx, cz] = F.xiaoyaolou.c;
  const ry = ringAngle(F.xiaoyaolou.o);
  const m = new THREE.Group();

  // ---- 8 m 青灰条石台基 + 垛口 + 正面汉白玉大石阶 ----
  const TW = 24, TD = 22, TH = 8;
  m.add(box(TW * 2, TH, TD * 2, K.stoneGrey, TH / 2));
  {
    const merG = new THREE.BoxGeometry(1.4, 0.9, 0.7), ms = [], m4 = new THREE.Matrix4();
    for (let x = -TW + 1; x <= TW - 0.9; x += 2.6) for (const z of [-TD + 0.4, TD - 0.4]) { m4.makeTranslation(x, TH + 0.45, z); ms.push(m4.clone()); }
    for (let z = -TD + 3.4; z <= TD - 3.2; z += 2.6) for (const x of [-TW + 0.4, TW - 0.4]) { m4.makeRotationY(Math.PI / 2); m4.setPosition(x, TH + 0.45, z); ms.push(m4.clone()); }
    const mer = new THREE.InstancedMesh(merG, K.stoneGrey, ms.length); ms.forEach((mm, i) => mer.setMatrixAt(i, mm)); m.add(mer);
    const n = 22, run = 0.46, rise = TH / n, sw = 10;
    for (let i = 0; i < n; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(run + 0.02, rise, sw - i * 0.12), K.marble);
      st.position.set(TW + (n - i) * run - run / 2, rise * (i + 0.5), 0); m.add(st);
    }
    for (const sz of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(n * run + 0.5, 0); sh.lineTo(0, TH + 0.6); sh.closePath();
      m.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.55, bevelEnabled: false }), K.marble).translateX(TW).translateZ(sz * (sw / 2 - 0.25)));
    }
  }
  m.add(balustrade({ sides: 4, rx: TW - 0.5, rz: TD - 0.5, y: TH, mats: K, post: 1.2, panel: 0.82, pitch: 1.65 }));

  let y = TH;
  const pitch1 = 2.85, colR = 0.4;

  // ---- 一层主体 + 副阶周匝（第一重檐） ----
  const f1h = 7.0, sub = 2.9, subH = 6.0, r1 = 10, rs = r1 + sub;
  m.add(box(r1 * 2 - 0.8, f1h, r1 * 2 - 0.8, K.wallDim, y + f1h / 2));
  m.add(colonnade({ sides: 4, rx: r1, rz: r1, y, h: f1h, mats: W, pitch: pitch1, r: colR, beam: true }));
  m.add(latticeWall({ sides: 4, rx: r1 - 0.35, rz: r1 - 0.35, y: y + 0.5, h: f1h * 0.78, mats: { ...K, lattice: K.latticeWood }, inset: 0.06 }));
  m.add(colonnade({ sides: 4, rx: rs, rz: rs, y, h: subH, mats: W, pitch: pitch1 + 0.2, r: colR * 0.92 }));
  m.add(dougong({ sides: 4, rx: rs + 0.12, rz: rs + 0.12, y: y + subH - 0.45, pitch: 1.45, mats: W, scale: 0.92 }));
  const roof1Y = y + subH - 0.08;
  m.add(polyRoof({ sides: 4, rx: rs, rz: rs, h: 1.65, ridge: 0.01, over: 2.5, curl: 1.0, rows: 5, segs: 12, mats: roofMats(K), y: roof1Y, eaveBoard: true }));
  const pl = plaque('逍遥楼', 4.6, 1.25); pl.position.set(r1 + 0.15, y + f1h - 1.35, 0); pl.rotation.y = Math.PI / 2; m.add(pl);
  y += f1h;

  // ---- 平座回廊（白石/木栏） + 第二重檐 ----
  m.add(box((r1 + 1.4) * 2, 0.42, (r1 + 1.4) * 2, K.woodGold, y + 0.21));
  m.add(balustrade({ sides: 4, rx: r1 + 1.15, rz: r1 + 1.15, y: y + 0.42, mats: K, post: 1.05, panel: 0.72, pitch: 1.55 }));
  m.add(balustrade({ sides: 4, rx: r1 + 0.55, rz: r1 + 0.55, y: y + 0.42, mats: K, mat: K.woodGold, postMat: K.woodGold, post: 0.95, panel: 0.55, pitch: 1.45 }));
  y += 0.42;

  const f2h = 5.8, r2 = 8.0;
  m.add(box(r2 * 2 - 0.6, f2h, r2 * 2 - 0.6, K.wallDim, y + f2h / 2));
  m.add(colonnade({ sides: 4, rx: r2, rz: r2, y, h: f2h, mats: W, pitch: pitch1, r: colR * 0.88, beam: true }));
  m.add(latticeWall({ sides: 4, rx: r2 - 0.3, rz: r2 - 0.3, y: y + 0.4, h: f2h * 0.76, mats: { ...K, lattice: K.latticeWood }, inset: 0.05 }));
  m.add(dougong({ sides: 4, rx: r2 + 0.1, rz: r2 + 0.1, y: y + f2h - 0.48, pitch: 1.42, mats: W, scale: 0.95 }));
  const roof2Y = y + f2h - 0.1;
  m.add(polyRoof({ sides: 4, rx: r2, rz: r2, h: 1.9, ridge: 0.01, over: 2.7, curl: 1.08, rows: 5, segs: 12, mats: roofMats(K), y: roof2Y }));
  y += f2h;

  // ---- 顶层短墙 + 歇山顶（第三重檐） ----
  const f3h = 3.0, r3 = 6.8;
  m.add(box(r3 * 2 - 0.5, f3h, r3 * 2 - 0.5, K.wallDim, y + f3h / 2));
  m.add(colonnade({ sides: 4, rx: r3, rz: r3, y, h: f3h, mats: W, pitch: pitch1 - 0.15, r: colR * 0.82, beam: true }));
  m.add(dougong({ sides: 4, rx: r3 + 0.1, rz: r3 + 0.1, y: y + f3h - 0.35, pitch: 1.38, mats: W, scale: 0.98 }));
  const roof3Y = y + f3h + 0.05;
  const ridgeLen = 6.8;
  m.add(polyRoof({ sides: 4, rx: r3, rz: r3, h: 5.15, ridge: ridgeLen, over: 2.85, curl: 1.22, rows: 7, segs: 14, mats: roofMats(K), y: roof3Y }));
  m.add(gableEnds(r3 - 0.25, roof3Y + 0.55, 3.9, r3 + 2.65, K.woodGold));
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 1.6, 10), K.gold);
  fin.position.y = roof3Y + 5.15 + 1.4; m.add(fin);
  const top = roof3Y + 5.15 + 2.6;

  // 檐角挂灯 + 一层红灯笼
  const lampMat = K.gold.clone(); lampMat.userData = { night: { color: 0xffd060, intensity: 2.4 } };
  const lampPts = [];
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    lampPts.push([sx * (rs + 2.35), roof1Y - 0.05, sz * (rs + 2.35)], [sx * (r2 + 2.55), roof2Y - 0.05, sz * (r2 + 2.55)], [sx * (r3 + 2.75), roof3Y + 0.2, sz * (r3 + 2.75)]);
  }
  m.add(eaveLamps(lampPts, 0, lampMat));
  const lps = [];
  for (let z = -7; z <= 7; z += 3.5) lps.push([rs + 1.5, roof1Y - 1.1, z], [-rs - 1.5, roof1Y - 1.1, z]);
  for (let x = -7; x <= 7; x += 3.5) lps.push([x, roof1Y - 1.1, rs + 1.5], [x, roof1Y - 1.1, -rs - 1.5]);
  m.add(lanterns(lps, K, 0.36));

  // 地面投光灯（夜景）
  const lights = [];
  for (const [x, z] of [[36, 28], [-36, 28], [36, -28], [-36, -28]]) {
    const sp = new THREE.SpotLight(0xffc978, 140, 130, 0.48, 0.65, 1.2);
    sp.position.set(x, 2, z); sp.target.position.set(0, TH + 12, 0); m.add(sp, sp.target); lights.push(sp);
  }
  m.userData.lights = lights;

  m.rotation.y = ry;
  g.add(m);

  // ---- 南侧广场 + 门楼（保留原逻辑，略调尺寸） ----
  {
    const k = -Math.round(ry / (Math.PI / 2)), snapped = ry + k * Math.PI / 2;
    const P = new THREE.Group(); P.rotation.y = snapped; g.add(P);
    const PL = 44, PW = 34, z0 = (k % 2 === 0 ? TD : TW) + 1;
    P.add(box(PW, 0.6, PL, K.paving, 0.3).translateZ(z0 + PL / 2));
    for (const sx of [-1, 1]) {
      const w = box(0.6, 2.2, PL - 8, K.wall, 1.7); w.position.set(sx * (PW / 2 - 0.3), 0, z0 + PL / 2 - 4); P.add(w);
      const cap = box(1.1, 0.35, PL - 8, K.tileRoof, 2.9); cap.position.set(sx * (PW / 2 - 0.3), 0, z0 + PL / 2 - 4); P.add(cap);
    }
    const gate = new THREE.Group(); gate.position.set(0, 0.6, z0 + PL - 4);
    const gw = 15, gd = 6, gh = 5.2;
    gate.add(box(gw, gh, gd, K.wall, gh / 2));
    gate.add(colonnade({ sides: 4, rx: gw / 2, rz: gd / 2, y: 0, h: gh, mats: W, pitch: 3.0, r: 0.24 }));
    gate.add(latticeWall({ sides: 4, rx: gw / 2 - 0.2, rz: gd / 2 - 0.2, y: 0.3, h: gh * 0.78, mats: K, faces: [0, 2] }));
    gate.add(dougong({ sides: 4, rx: gw / 2 + 0.1, rz: gd / 2 + 0.1, y: gh - 0.5, pitch: 1.5, mats: W, scale: 0.7 }));
    gate.add(polyRoof({ sides: 4, rx: gw / 2, rz: gd / 2, h: 2.6, ridge: gw * 0.55, over: 1.6, curl: 0.7, rows: 4, segs: 8, mats: roofMats(K), y: gh - 0.1 }));
    const gp = plaque('逍遥楼', 3.0, 0.9); gp.position.set(0, gh - 1.1, gd / 2 + 0.4); gate.add(gp);
    P.add(gate);
  }
  g.position.set(cx, 0, cz);
  g.userData.top = top;
  return g;
}

export function night(group, on) {
  applyNight(group, on);
  const seen = new Set();
  group.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const mat of mats) {
      if (seen.has(mat)) continue;
      seen.add(mat);
      if (woodMats?.has(mat)) {
        mat.emissive.setHex(on ? 0xffa640 : 0);
        mat.emissiveIntensity = on ? (mat === K?.woodGlow ? 0.85 : 0.68) : 0;
        mat.needsUpdate = true;
      } else if (mat === K?.wallDim) {
        mat.emissive.setHex(on ? 0x5a4028 : 0);
        mat.emissiveIntensity = on ? 0.1 : 0;
        mat.needsUpdate = true;
      } else if (mat === K?.latticeWood) {
        mat.emissive.setHex(on ? 0xffb050 : 0);
        mat.emissiveIntensity = on ? 0.85 : 0;
        mat.emissiveMap = on ? mat.map : null;
        mat.needsUpdate = true;
      } else if (mat === K?.marble) {
        mat.emissive.setHex(on ? 0xc8b890 : 0);
        mat.emissiveIntensity = on ? 0.18 : 0;
        mat.needsUpdate = true;
      } else if (mat === K?.tileRoof) {
        mat.emissive.setHex(on ? 0x1a1c20 : 0);
        mat.emissiveIntensity = on ? 0.05 : 0;
        mat.needsUpdate = true;
      }
    }
  });
}
