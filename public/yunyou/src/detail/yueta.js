// 月塔精模：杉湖七级八角琉璃塔，高 35 m。白琉璃塔身 + 大面玻璃窗 + 银色平座栏板 + 斗拱 + 青绿琉璃瓦曲檐；银顶塔刹；
// 石台基 + 汉白玉栏板。夜景：银白光。（日塔为金、月塔为银，日月并峙）
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, balustrade, polyCorners, edge, V2 } from './kit.js';

let K;
export function build({ F, TEX }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  const [cx, cz] = F.yueta.c;
  const oct = (r, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r / Math.cos(Math.PI / 8), r / Math.cos(Math.PI / 8) + 0.25, h, 8), mat); m.rotation.y = Math.PI / 8; m.position.y = y + h / 2; return m; };

  // 台基
  g.add(oct(11.5, 1.2, 0, K.stoneBase), oct(9.0, 1.2, 1.2, K.marble));
  g.add(balustrade({ sides: 8, rx: 11.0, y: 1.2, mats: K, post: 1.1, panel: 0.7, pitch: 1.6 }));
  for (let k = 0; k < 4; k++) {
    const st = new THREE.Group();
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.5), K.stoneBase); s.position.set(0, 0.1 + i * 0.2, 11.5 + 1.6 - i * 0.32); st.add(s); }
    st.rotation.y = k * Math.PI / 2; g.add(st);
  }

  let y = 2.4;
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const r = 5.8 - i * 0.36, th = 4.5 - i * 0.18, bodyH = th - 1.25, R = r / Math.cos(Math.PI / 8);
    // 白琉璃塔身
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, bodyH, 8), K.glaze);
    body.rotation.y = Math.PI / 8; body.position.y = y + bodyH / 2; g.add(body);
    // 每面大玻璃窗 + 银框
    const corners = polyCorners(8, r);
    for (let f = 0; f < 8; f++) {
      const A = corners[f], B = corners[(f + 1) % 8], e = edge(A, B);
      const ww = e.L * 0.56, wh = bodyH * 0.6;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.3, wh + 0.3, 0.14), K.silver);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.1), K.lattice); // 雕花彩绘门窗
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.08, wh, 0.16), K.silver);
      for (const [m, off] of [[frame, 0.05], [glass, 0.1], [mull, 0.12]]) { m.position.set(e.cx + e.nx * off, y + bodyH * 0.5, e.cz + e.nz * off); m.rotation.y = Math.atan2(e.nx, e.nz); g.add(m); }
    }
    // 角柱（银）
    const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.17, bodyH, 8), K.silver, 8), m4 = new THREE.Matrix4();
    corners.forEach(([x, z], k) => { m4.makeTranslation(x, y + bodyH / 2, z); cols.setMatrixAt(k, m4); });
    g.add(cols);
    if (i > 0) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry((r + 1.4) / Math.cos(Math.PI / 8), (r + 0.9) / Math.cos(Math.PI / 8), 0.38, 8), K.marble);
      plate.rotation.y = Math.PI / 8; plate.position.y = y + 0.19; g.add(plate);
      g.add(balustrade({ sides: 8, rx: r + 1.25, y: y + 0.38, mats: K, mat: K.silver, postMat: K.silver, post: 1.0, panel: 0.55, pitch: 1.3 }));
    }
    g.add(dougong({ sides: 8, rx: r + 0.1, y: y + bodyH - 1.0, pitch: 1.4, mats: { lacquer: K.silver }, scale: 0.7 }));
    const roof = polyRoof({ sides: 8, rx: r, h: 1.3, over: 1.8, curl: 0.7, rows: 5, segs: 8, mats: { roof: K.glazeRoof, ridge: K.silver, eaveWood: K.silver, finial: K.silver }, y: y + bodyH - 0.1 });
    if (i < tiers - 1) roof.children.forEach((c) => { if (c.geometry?.type === 'LatheGeometry') c.visible = false; });
    g.add(roof);
    y += th;
  }
  // 塔刹（银）
  const top = y + 0.8;
  const sha = new THREE.Mesh(new THREE.LatheGeometry([V2(1.4, 0), V2(1.2, 0.5), V2(0.85, 0.9), V2(1.05, 1.3), V2(0.6, 1.9), V2(0.3, 2.2), V2(0.3, 4.6), V2(0.8, 4.8), V2(0.65, 5.1), V2(0.22, 5.3), V2(0.01, 6.0)], 16), K.silver);
  sha.position.y = top; g.add(sha);
  for (let k = 0; k < 5; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 - k * 0.05, 0.08, 6, 16), K.silver); ring.rotation.x = Math.PI / 2; ring.position.y = top + 2.4 + k * 0.42; g.add(ring); }
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), K.silver); pearl.position.y = top + 6.1; g.add(pearl);

  const l1 = new THREE.PointLight(0xdbe9ff, 22, 60, 1.6); l1.position.set(0, 20, 0);
  const l2 = new THREE.PointLight(0xdbe9ff, 12, 40, 1.6); l2.position.set(0, 7, 0);
  g.add(l1, l2);

  g.position.set(cx, 0, cz);
  g.userData.top = top + 6.5;
  return g;
}
export const night = applyNight;
