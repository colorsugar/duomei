// 日塔精模：杉湖九级八角铜塔，通高 41 m。逐层：铜板塔身 + 八面拱门 + 平座栏板 + 斗拱 + 铜瓦曲檐翘角；塔刹相轮宝珠；
// 两层石台基 + 汉白玉栏板 + 四面台阶。夜景：铜面金光（自发光 + 泛光）。
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, balustrade, polyCorners, edge, V2 } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let K;
// 拱门轮廓（底边中点在原点）
const arch = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0); return sh; };
export function build({ F, TEX, lm }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  const [cx, cz] = F.rita.c;
  const S = 8, apo = (r) => r; // 用内切半径描述八角

  // ---- 台基：两层八角石台 + 栏板 + 四面台阶 ----
  const base = (r, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r / Math.cos(Math.PI / 8), r / Math.cos(Math.PI / 8) + 0.3, h, 8), mat); m.rotation.y = Math.PI / 8; m.position.y = y + h / 2; return m; };
  g.add(base(13.5, 1.2, 0, K.stoneBase), base(10.5, 1.3, 1.2, K.stoneBase));
  g.add(balustrade({ sides: 8, rx: 13.0, y: 1.2, mats: K, post: 1.1, panel: 0.7, pitch: 1.6 }));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, st = new THREE.Group();
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.5), K.stoneBase); s.position.set(0, 0.1 + i * 0.2, 13.5 + 1.6 - i * 0.32); st.add(s); }
    st.rotation.y = a; g.add(st);
  }
  // 灯柱
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) * Math.PI / 4, lp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), K.dark); pole.position.y = 2.5; lp.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), K.lantern); bulb.position.y = 3.9; lp.add(bulb);
    lp.position.set(Math.sin(a) * 12.4, 1.2, Math.cos(a) * 12.4); g.add(lp);
  }

  // ---- 九层塔身 ----
  let y = 2.5;
  const tiers = 9;
  for (let i = 0; i < tiers; i++) {
    const r = 6.6 - i * 0.36, th = 4.6 - i * 0.2, bodyH = th - 1.3;
    const R = r / Math.cos(Math.PI / 8);
    // 铜板塔身
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, bodyH, 8), K.copper);
    body.rotation.y = Math.PI / 8; body.position.y = y + bodyH / 2;
    g.add(body);
    // 八面拱门/窗 + 门框
    const corners = polyCorners(8, r);
    for (let f = 0; f < 8; f++) {
      const A = corners[f], B = corners[(f + 1) % 8], e = edge(A, B);
      const dw = Math.min(2.2, e.L * 0.42), dh = bodyH * 0.62;
      const outer = arch(dw * 1.16, dh * 1.06); outer.holes.push(arch(dw, dh));
      const door = new THREE.Mesh(new THREE.ShapeGeometry(arch(dw, dh)), K.dark);
      const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.2, bevelEnabled: false }), K.copperDark);
      for (const [m, off] of [[frame, 0.02], [door, 0.03]]) { m.position.set(e.cx + e.nx * off, y + bodyH * 0.12, e.cz + e.nz * off); m.rotation.y = Math.atan2(e.nx, e.nz); g.add(m); }
    }
    // 角柱
    const colG = new THREE.CylinderGeometry(0.16, 0.18, bodyH, 8);
    const cols = new THREE.InstancedMesh(colG, K.copperDark, 8), m4 = new THREE.Matrix4();
    corners.forEach(([x, z], k) => { m4.makeTranslation(x, y + bodyH / 2, z); cols.setMatrixAt(k, m4); });
    g.add(cols);
    // 平座 + 栏板（首层为台基栏板，略）
    if (i > 0) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry((r + 1.5) / Math.cos(Math.PI / 8), (r + 1.0) / Math.cos(Math.PI / 8), 0.4, 8), K.copperDark);
      plate.rotation.y = Math.PI / 8; plate.position.y = y + 0.2; g.add(plate);
      g.add(balustrade({ sides: 8, rx: r + 1.35, y: y + 0.4, mats: K, mat: K.copperDark, postMat: K.copper, post: 1.0, panel: 0.6, pitch: 1.3 }));
    }
    // 斗拱 + 铜瓦曲檐
    g.add(dougong({ sides: 8, rx: r + 0.1, y: y + bodyH - 1.05, pitch: 1.4, mats: { lacquer: K.copperDark }, scale: 0.75 }));
    const roof = polyRoof({ sides: 8, rx: r, h: 1.35, over: 1.9, curl: 0.75, rows: 5, segs: 8, mats: { roof: K.copperDark, ridge: K.copper, eaveWood: K.copperDark, finial: K.gold }, y: y + bodyH - 0.1 });
    if (i < tiers - 1) roof.children.forEach((c) => { if (c.geometry?.type === 'LatheGeometry') c.visible = false; }); // 中间层不要宝顶
    g.add(roof);
    y += th;
  }
  // ---- 塔刹：须弥座 + 覆钵 + 相轮七重 + 宝盖 + 宝珠 ----
  const top = y + 0.9;
  const sha = new THREE.Mesh(new THREE.LatheGeometry([V2(1.6, 0), V2(1.4, 0.5), V2(1.0, 0.9), V2(1.25, 1.3), V2(0.7, 1.9), V2(0.35, 2.2), V2(0.35, 5.0), V2(0.9, 5.2), V2(0.75, 5.5), V2(0.25, 5.7), V2(0.01, 6.6)], 16), K.gold);
  sha.position.y = top; g.add(sha);
  for (let k = 0; k < 7; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 - k * 0.04, 0.09, 6, 16), K.gold); ring.rotation.x = Math.PI / 2; ring.position.y = top + 2.4 + k * 0.36; g.add(ring); }
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), K.gold); pearl.position.y = top + 6.7; g.add(pearl);

  // 夜景补光
  const l1 = new THREE.PointLight(0xffb043, 25, 70, 1.6); l1.position.set(0, 24, 0);
  const l2 = new THREE.PointLight(0xffc870, 15, 40, 1.6); l2.position.set(0, 8, 0);
  g.add(l1, l2);

  g.position.set(cx, 0, cz);
  g.userData.top = top + 7;
  // Fit physical height; previous accumulated tiers exceeded the documented height.
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  const actualHeight = bounds.max.y - bounds.min.y;
  if (actualHeight > 0) g.scale.y *= 41 / actualHeight;
  g.userData.top = 41;
  return g;
}
export const night = applyNight;
