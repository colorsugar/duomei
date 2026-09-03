// 象鼻山精模（叠加模式）：山体由基础模型的 SDF（含水月洞）一次生成，这里只加周边——
// 山脚环山石径 + 园灯。夜景：山体投光 + 洞内暖光。
import * as THREE from 'three';
import { kitMats, applyNight } from './kit.js';
import { XBS } from '../landmarks.js';

export const mode = 'augment';
let K;
export function build({ TEX }) {
  K ??= kitMats(TEX);
  const g = new THREE.Group();
  const { cx, cz } = XBS;

  // 环山石径（椭圆带）+ 园灯
  const rx = 52, rz = 72, xc = cx - 12, zc = cz + 4, w = 2.6, n = 64, pos = [], idx = []; // 东侧贴漓江岸
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, x = xc + Math.cos(a) * rx, z = zc + Math.sin(a) * rz;
    const nx = Math.cos(a), nz = Math.sin(a);
    pos.push(x + nx * w / 2, 0.55, z + nz * w / 2, x - nx * w / 2, 0.55, z - nz * w / 2);
    if (i) { const a0 = (i - 1) * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
  }
  const path = new THREE.BufferGeometry(); path.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); path.setIndex(idx); path.computeVertexNormals();
  g.add(new THREE.Mesh(path, K.concrete));
  const lampG = new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6).translate(0, 1.6, 0);
  const lamps = new THREE.InstancedMesh(lampG, K.dark, 12), bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), K.lantern, 12), m4 = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = xc + Math.cos(a) * (rx + 2.2), z = zc + Math.sin(a) * (rz + 2.2); m4.makeTranslation(x, 0.5, z); lamps.setMatrixAt(i, m4); m4.makeTranslation(x, 3.9, z); bulbs.setMatrixAt(i, m4); }
  g.add(lamps, bulbs);

  // 夜景：洞内暖光 + 三盏投光
  const cave = new THREE.PointLight(0xffc070, 30, 45, 1.6); cave.position.set(cx + 50, 6, cz - 58);
  g.add(cave);
  for (const [x, z] of [[cx + 110, cz - 40], [cx + 20, cz - 150], [cx - 110, cz + 40]]) {
    const sp = new THREE.SpotLight(0xfff0d8, 1700, 260, 0.42, 0.6, 1.2);
    sp.position.set(x, 3, z); sp.target.position.set(cx, 34, cz - 10);
    g.add(sp, sp.target);
  }

  g.userData.top = 55 + 13.6;
  return g;
}
export const night = applyNight;
