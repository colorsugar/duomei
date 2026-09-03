// 木龙塔精模：仿宋七层八角楼阁式砖塔，约 40 m。砖身 + 木门窗 + 平座朱栏 + 斗拱 + 灰瓦曲檐；两层石台基 + 汉白玉栏板；塔刹相轮宝珠。
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, balustrade, polyCorners, edge, V2 } from './kit.js';

let K;
const arch = (w, h) => {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2);
  sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0);
  return sh;
};

export function build({ F, TEX }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  const [cx, cz] = F.mulongta.c;

  const base = (r, h, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r / Math.cos(Math.PI / 8), r / Math.cos(Math.PI / 8) + 0.25, h, 8), mat);
    m.rotation.y = Math.PI / 8; m.position.y = y + h / 2; return m;
  };
  g.add(base(8.5, 1.0, 0, K.stoneBase), base(6.8, 1.0, 1.0, K.stoneBase));
  g.add(balustrade({ sides: 8, rx: 8.2, y: 1.0, mats: K, post: 1.0, panel: 0.65, pitch: 1.5 }));

  let y = 2.0;
  const tiers = 7;
  const bells = [];
  for (let i = 0; i < tiers; i++) {
    const r = 5.4 - i * (2.2 / 6);
    const th = 5.2 - i * (1.4 / 6);
    const bodyH = th - 1.25;
    const R = r / Math.cos(Math.PI / 8);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, bodyH, 8), K.brick);
    body.rotation.y = Math.PI / 8; body.position.y = y + bodyH / 2;
    g.add(body);

    const corners = polyCorners(8, r);
    for (let f = 0; f < 8; f++) {
      const A = corners[f], B = corners[(f + 1) % 8], e = edge(A, B);
      const dw = Math.min(2.0, e.L * 0.38), dh = bodyH * 0.58;
      const outer = arch(dw * 1.14, dh * 1.05); outer.holes.push(arch(dw, dh));
      const door = new THREE.Mesh(new THREE.ShapeGeometry(arch(dw, dh)), K.dark);
      const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.18, bevelEnabled: false }), K.eaveWood);
      for (const [m, off] of [[frame, 0.02], [door, 0.03]]) {
        m.position.set(e.cx + e.nx * off, y + bodyH * 0.14, e.cz + e.nz * off);
        m.rotation.y = Math.atan2(e.nx, e.nz); g.add(m);
      }
    }

    const colG = new THREE.CylinderGeometry(0.14, 0.16, bodyH, 8);
    const cols = new THREE.InstancedMesh(colG, K.eaveWood, 8), m4 = new THREE.Matrix4();
    corners.forEach(([x, z], k) => { m4.makeTranslation(x, y + bodyH / 2, z); cols.setMatrixAt(k, m4); });
    g.add(cols);

    if (i > 0) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry((r + 1.2) / Math.cos(Math.PI / 8), (r + 0.85) / Math.cos(Math.PI / 8), 0.35, 8), K.eaveWood);
      plate.rotation.y = Math.PI / 8; plate.position.y = y + 0.18; g.add(plate);
      g.add(balustrade({ sides: 8, rx: r + 1.1, y: y + 0.35, mats: K, mat: K.lacquer, postMat: K.eaveWood, post: 0.95, panel: 0.55, pitch: 1.2 }));
      g.add(dougong({ sides: 8, rx: r + 1.05, y: y + 0.15, pitch: 1.3, mats: { lacquer: K.eaveWood }, scale: 0.65 }));
    }

    g.add(dougong({ sides: 8, rx: r + 0.08, y: y + bodyH - 0.95, pitch: 1.35, mats: { lacquer: K.eaveWood }, scale: 0.72 }));
    const roof = polyRoof({
      sides: 8, rx: r, h: 1.25, over: 1.75, curl: 0.7, rows: 5, segs: 8,
      mats: { roof: K.tile, ridge: K.ridge, eaveWood: K.eaveWood, finial: K.gold }, y: y + bodyH - 0.08,
    });
    if (i < tiers - 1) roof.children.forEach((c) => { if (c.geometry?.type === 'LatheGeometry') c.visible = false; });
    g.add(roof);

    const eaveR = r + 1.75;
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) * Math.PI / 4;
      bells.push([Math.sin(a) * eaveR, y + bodyH + 0.55, Math.cos(a) * eaveR]);
    }
    y += th;
  }

  const bellG = new THREE.ConeGeometry(0.07, 0.22, 6);
  const bellIm = new THREE.InstancedMesh(bellG, K.gold, bells.length);
  const bm = new THREE.Matrix4();
  bells.forEach((p, i) => { bm.makeTranslation(p[0], p[1], p[2]); bellIm.setMatrixAt(i, bm); });
  g.add(bellIm);

  const top = y + 0.7;
  const sha = new THREE.Mesh(new THREE.LatheGeometry([
    V2(1.2, 0), V2(1.05, 0.45), V2(0.75, 0.8), V2(0.95, 1.15), V2(0.55, 1.65), V2(0.28, 1.9), V2(0.28, 4.2), V2(0.7, 4.35), V2(0.55, 4.6), V2(0.18, 4.75), V2(0.01, 5.4),
  ], 14), K.gold);
  sha.position.y = top; g.add(sha);
  for (let k = 0; k < 5; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.035, 0.07, 6, 14), K.gold);
    ring.rotation.x = Math.PI / 2; ring.position.y = top + 2.0 + k * 0.32; g.add(ring);
  }
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), K.gold);
  pearl.position.y = top + 5.5; g.add(pearl);

  const l1 = new THREE.PointLight(0xffb870, 22, 55, 1.6); l1.position.set(0, 18, 0);
  g.add(l1);

  g.position.set(cx, 0, cz);
  g.userData.top = 41;
  return g;
}
export const night = applyNight;
