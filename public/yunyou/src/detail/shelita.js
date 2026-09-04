// 舍利塔精模：唐开元寺舍利塔（明洪武重建），喇嘛塔式，高 13.2 m：三层方形须弥座（底 7 m）、四面佛龛、覆钵塔身、
// 十三天相轮、铜宝盖宝珠；周边石铺场地与石栏。夜景：暖光投射。
import * as THREE from 'three';
import { kitMats, applyNight, balustrade, V2 } from './kit.js';

let K;
export function build({ F, TEX }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  const [cx, cz] = F.shelita.c;
  // 场地
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 22), K.concrete); plaza.position.y = 0.25; g.add(plaza);
  g.add(balustrade({ sides: 4, rx: 10.8, rz: 10.8, y: 0.5, mats: K, post: 1.0, panel: 0.6, pitch: 1.8 }));
  // 三层方形须弥座（束腰）
  const tiers = [[7.0, 1.1, 0.5], [6.2, 0.5, 1.6], [5.4, 1.0, 2.1], [6.0, 0.5, 3.1], [5.0, 1.0, 3.6]];
  for (const [w, h, y] of tiers) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), K.stoneBase); m.position.y = y + h / 2; g.add(m); }
  // 四面佛龛（拱形凹龛 + 小佛）
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
    const sh = new THREE.Shape(); sh.moveTo(-0.7, 0); sh.lineTo(0.7, 0); sh.lineTo(0.7, 1.2); sh.absarc(0, 1.2, 0.7, 0, Math.PI, false); sh.lineTo(-0.7, 0);
    const niche = new THREE.Mesh(new THREE.ShapeGeometry(sh), K.dark); niche.position.set(nx * 2.92, 5.0, nz * 2.92); niche.rotation.y = Math.atan2(nx, nz); g.add(niche);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 4, 8), K.gold); fo.position.set(nx * 2.75, 5.7, nz * 2.75); g.add(fo);
  }
  // 覆钵塔身 + 十三天 + 宝盖 + 宝珠
  const body = new THREE.Mesh(new THREE.LatheGeometry([V2(2.0, 4.6), V2(2.75, 5.4), V2(2.85, 6.4), V2(2.4, 7.6), V2(1.5, 8.5), V2(1.2, 8.6)], 28), K.wall);
  g.add(body);
  const neck = new THREE.Mesh(new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => V2(1.25 - i * 0.055, 8.6 + i * 0.26)), 20), K.wall);
  g.add(neck);
  for (let i = 0; i < 13; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.2 - i * 0.055, 0.06, 6, 24), K.dark); r.rotation.x = Math.PI / 2; r.position.y = 8.75 + i * 0.26; g.add(r); }
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 24), K.copperDark); canopy.position.y = 12.5; g.add(canopy);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), K.copper); pearl.position.y = 13.1; g.add(pearl);
  // 夜景投光
  for (const [x, z] of [[9, 9], [-9, -9]]) { const sp = new THREE.SpotLight(0xffe2b0, 320, 40, 0.5, 0.6, 1.2); sp.position.set(x, 1, z); sp.target.position.set(0, 7, 0); g.add(sp, sp.target); }

  g.position.set(cx, 0, cz);
  g.userData.top = 13.5;
  // Fit physical height; previous accumulated tiers exceeded the documented height.
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  const actualHeight = bounds.max.y - bounds.min.y;
  if (actualHeight > 0) g.scale.y *= 13.2 / actualHeight;
  g.userData.top = 13.2;
  return g;
}
export const night = applyNight;
