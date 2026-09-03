// 古南门精模：39.4×19.4×5.3 m 石城台 + 券洞 + 榕树楼 + 千年古榕。
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, colonnade, latticeWall, plaque } from './kit.js';
import { ringAngle } from '../lib.js';

let K;
const roofMats = (K) => ({ roof: K.tile, ridge: K.ridge, eaveWood: K.eaveWood });

const archShape = (w, h) => {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2);
  sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0);
  return sh;
};

function stonePlatform(mats) {
  const grp = new THREE.Group();
  const L = 39.4, D = 19.4, H = 5.3;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, H); s.lineTo(-L / 2, H); s.closePath();
  const hole = archShape(2.9, 3.5);
  s.holes.push(hole);
  const plat = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
  plat.translate(0, 0, -D / 2);
  grp.add(new THREE.Mesh(plat, mats.stoneBase));

  // 券洞门框
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry((() => {
    const o = archShape(2.9 * 1.12, 3.5 * 1.06); o.holes.push(archShape(2.9, 3.5)); return o;
  })(), { depth: 0.35, bevelEnabled: false }), mats.marble);
  frame.position.set(0, 0, D / 2 + 0.12);
  grp.add(frame);
  const inner = new THREE.Mesh(new THREE.ExtrudeGeometry((() => {
    const o = archShape(2.9 * 1.12, 3.5 * 1.06); o.holes.push(archShape(2.9, 3.5)); return o;
  })(), { depth: 0.35, bevelEnabled: false }), mats.marble);
  inner.position.set(0, 0, -D / 2 - 0.12);
  inner.rotation.y = Math.PI;
  grp.add(inner);

  // 垛口：沿台顶四边
  const merG = new THREE.BoxGeometry(1.3, 0.85, 0.75);
  const ms = [], m4 = new THREE.Matrix4();
  for (let x = -L / 2 + 1.0; x <= L / 2 - 0.9; x += 2.5) for (const z of [-D / 2 + 0.45, D / 2 - 0.45]) { m4.makeTranslation(x, H + 0.42, z); ms.push(m4.clone()); }
  for (let z = -D / 2 + 3.2; z <= D / 2 - 3.0; z += 2.5) for (const x of [-L / 2 + 0.45, L / 2 - 0.45]) { m4.makeRotationY(Math.PI / 2); m4.setPosition(x, H + 0.42, z); ms.push(m4.clone()); }
  const mer = new THREE.InstancedMesh(merG, mats.stoneBase, ms.length);
  ms.forEach((mm, i) => mer.setMatrixAt(i, mm));
  grp.add(mer);

  // 背面（−x）登城阶
  const back = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 1.1 - i * 0.04), mats.stoneBase);
    step.position.set(-L / 2 - 0.55 - i * 0.34, 0.12 + i * 0.22, -3 + i * 0.06);
    back.add(step);
  }
  grp.add(back);
  return { grp, H, L, D };
}

function rongshuHall(mats, y0) {
  const grp = new THREE.Group();
  const h = 4.2, rx = 6, rz = 4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(12, h, 8), mats.wall);
  body.position.y = y0 + h / 2;
  grp.add(body);
  grp.add(colonnade({ sides: 4, rx: rx + 0.5, rz: rz + 0.5, y: y0, h, mats, pitch: 2.8, r: 0.22 }));
  grp.add(latticeWall({ sides: 4, rx: rx - 0.3, rz: rz - 0.3, y: y0 + 0.35, h: h * 0.78, mats, inset: 0.06 }));
  const ty = y0 + h;
  grp.add(dougong({ sides: 4, rx: rx + 0.6, rz: rz + 0.6, y: ty - 0.5, pitch: 1.4, mats, scale: 0.85 }));
  grp.add(polyRoof({ sides: 4, rx, rz, h: 3.2, ridge: 7, over: 1.85, curl: 0.8, rows: 6, segs: 10, mats: roofMats(mats), y: ty - 0.15 }));
  const pl = plaque('古南门', 3.0, 0.95);
  pl.position.set(0, y0 + h * 0.55, rz + 0.55);
  const pl2 = plaque('榕城古荫', 3.6, 0.95);
  pl2.position.set(0, y0 + h * 0.55, -rz - 0.55); pl2.rotation.y = Math.PI;
  grp.add(pl, pl2);
  return grp;
}

function ancientBanyan(mats) {
  const tree = new THREE.Group();
  const greens = [0x3f6b33, 0x4a7a3a, 0x37602c, 0x456b38];
  // 主干 + 板根
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.5, 10, 12), mats.trunk ?? mats.eaveWood);
  trunk.position.y = 5;
  tree.add(trunk);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 3.5, 6), mats.trunk ?? mats.eaveWood);
    root.position.set(Math.cos(a) * 2.2, 1.2, Math.sin(a) * 2.2);
    root.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    tree.add(root);
  }
  // 冠幅：12 个椭球 + 粗枝
  for (let i = 0; i < 12; i++) {
    const a = i * 0.95 + 0.3;
    const rr = i === 0 ? 0 : 5.5 + (i % 4) * 1.6;
    const r = i === 0 ? 8 : 4.2 + (i % 3) * 0.9;
    const cr = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshStandardMaterial({ color: greens[i % 4], roughness: 0.95 }));
    cr.scale.set(1.05, 0.62, 1.05);
    cr.position.set(Math.cos(a) * rr, 12.5 - (i % 3) * 1.2 + (i === 0 ? 1.5 : 0), Math.sin(a) * rr);
    tree.add(cr);
    if (i > 1 && i % 2) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.75, 11, 6), mats.trunk ?? mats.eaveWood);
      br.position.set(Math.cos(a) * rr * 0.55, 7.5, Math.sin(a) * rr * 0.55);
      br.rotation.set(Math.sin(a) * 0.65, a * 0.15, -Math.cos(a) * 0.65);
      tree.add(br);
    }
  }
  tree.position.set(-34, 0, 4);
  return tree;
}

export function build({ F, TEX }) {
  K ??= kitMats(TEX);
  K.trunk = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95 });
  const g = new THREE.Group();
  const [cx, cz] = F.rongshulou.c;
  const ry = ringAngle(F.rongshulou.o);
  const m = new THREE.Group();

  const { grp: plat, H } = stonePlatform(K);
  m.add(plat);
  m.add(rongshuHall(K, H));
  m.add(ancientBanyan(K));

  const l1 = new THREE.PointLight(0xffc67a, 16, 50, 1.6);
  l1.position.set(0, H + 6, 0);
  const l2 = new THREE.PointLight(0x88aa66, 8, 35, 1.6);
  l2.position.set(-28, 8, 8);
  m.add(l1, l2);

  m.rotation.y = ry;
  g.add(m);
  g.position.set(cx, 0, cz);
  g.userData.top = 14;
  return g;
}
export const night = applyNight;
