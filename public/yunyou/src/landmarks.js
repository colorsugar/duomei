// 逐个地标手工建模。尺寸取自公开资料（见 data/landmarks.js 的 desc），平面位置/朝向取自 OSM 足迹（data/geo.js FOOT）。
import * as THREE from 'three';
import { karstHill, sdfHill, sdRoundBox, sdEllipsoid, sdCone, smin, fbm, fbm3, pagoda, bottlePagoda, hall, extrudeRing, ringAngle, TEX } from './lib.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const tex = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

export function makeMaterials() {
  const M = {
    stone: (() => { const t = tex(TEX.stone, 1 / 4, 1 / 4); return std({ map: t, bumpMap: t, bumpScale: 0.6, roughness: 0.95 }); })(),        // 拉伸体：UV 为米；一张料石图 ≈ 4 m（6 层石）
    stoneBox: (() => { const t = tex(TEX.stone, 8, 1); return std({ map: t, bumpMap: t, bumpScale: 0.6, roughness: 0.95 }); })(),             // 盒体：UV 0..1
    tile: std({ map: TEX.tile, bumpMap: TEX.tile, bumpScale: 0.4, roughness: 0.85 }),
    wall: std({ color: 0xf1ebdf, roughness: 0.9 }),
    column: std({ color: 0x9c3a2b, roughness: 0.7 }),
    wood: std({ color: 0x6f4632, roughness: 0.8 }),
    lattice: std({ color: 0x4a2c1e, roughness: 0.85 }),
    rail: std({ color: 0x8b5a3c, roughness: 0.8 }),
    ridge: std({ color: 0x2c2f33, roughness: 0.8 }),
    marble: std({ color: 0xf1eee6, roughness: 0.55 }),
    pale: std({ color: 0xd8d0c1, roughness: 0.9 }),
    concrete: std({ color: 0xdad7cf, roughness: 0.85 }),
    dark: std({ color: 0x2b2724, roughness: 0.9 }),
    copper: std({ map: tex(TEX.copper, 4, 1), metalness: 0.7, roughness: 0.35 }),
    copperRoof: std({ map: tex(TEX.copper, 6, 1), color: 0xf6d38a, metalness: 0.8, roughness: 0.3 }),
    glaze: std({ map: tex(TEX.glaze, 4, 1), roughness: 0.3 }),
    glazeRoof: std({ color: 0x4b7f92, roughness: 0.25, metalness: 0.2 }),
    silver: std({ color: 0xcfd6dc, metalness: 0.6, roughness: 0.4 }),
    brick: (() => { const t = tex(TEX.brick, 6, 2); return std({ map: t, bumpMap: t, bumpScale: 0.3, roughness: 0.9 }); })(),
    leaf: std({ color: 0x3f6b33, roughness: 0.95 }),
    trunk: std({ color: 0x5a4636, roughness: 0.95 }),
  };
  M.hallGray = { stone: M.stoneBox, marble: M.marble, wall: M.wall, column: M.column, wood: M.wood, lattice: M.lattice, rail: M.rail, roof: M.tile, ridge: M.ridge };
  return M;
}

const ellipse = (cx, cz, rx, rz, n = 36) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]; });
const at = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };

// Photo-guided reconstruction: broad vegetated back, lower river-facing head,
// a thick flared trunk and an irregular THROUGH cave at the north-east end.
// Geometry is baked by scripts/bake-yunyou.mjs; no million-voxel startup work.
export const XBS = { cx: -198, cz: 1450, box: { x0: -280, x1: -106, y0: -8, y1: 66, z0: 1350, z1: 1534 } };
XBS.sdf = (x, y, z) => {
  const px = x - XBS.cx, pz = z - XBS.cz;
  // Elliptical cliff footprint with a sloping, rounded crown (not a cuboid).
  const outline = Math.hypot((px + 10) / 58, (pz - 10) / 68) / (1 + .06 * fbm(px * .04, pz * .04, 11));
  const crown = 55 * Math.pow(Math.max(0, 1 - Math.pow(Math.min(outline, 1), 2.7)), .67)
    + 4.8 * fbm(px * .075, pz * .075, 7);
  let d = Math.max((outline - 1) * 48, y - crown, -y - 5);
  d = smin(d, sdEllipsoid(px - 25, y - 24, pz + 29, 39, 26, 37), 13);
  // Water Moon Cave opens east/west. Rotate only the head/trunk coordinates;
  // the trunk points north toward the confluence, not sideways out of the flank.
  const hx = 51 - (pz + 58), hz = px - 109;
  d = smin(d, sdEllipsoid(hx - 27, y - 22, hz + 47, 29, 24, 27), 10);
  // Upper rock bridge is deep: cave never becomes a detached thin ring.
  d = smin(d, sdRoundBox(hx - 52, y - 24, hz + 59, 25, 13, 14, 7), 6);
  d = smin(d, sdCone(hx, y, hz, [68, 29, -59], [72, -4, -62], 10.5, 12), 5);
  const strata = .12 * Math.sin(y * .8 + 4 * fbm(px * .06, pz * .06, 4));
  const grooves = 1.5 * fbm(px * .32 + y * .008, pz * .32, 9);
  if (Math.abs(d) < 5) d += strata + grooves + 1.05 * fbm3(x * .095, y * .05, z * .095, 3);
  // Arch profile extends below the waterline; slightly irregular flattened vault.
  const caveX = hx - 51 + .7 * Math.sin(hz * .12);
  const arch = (Math.pow(Math.abs(caveX / 7.2), 2.3) + Math.pow(Math.abs((y - 3.7) / 10.2), 2.3) - 1) * 5;
  const tunnel = arch + .16 * Math.sin(y * 1.8 + hz * .6);
  return Math.max(d, -tunnel);
};
export function xiangbishan(F, M, bakedHill) {
  const g = new THREE.Group();
  const { cx, cz, sdf, box } = XBS;
  const hill = bakedHill || sdfHill({ sdf, box, res: 40, seed: 3, cx, cz });
  g.add(hill);
  const px = -184, pz = 1432;
  g.add(at(bottlePagoda(13.6, M.pale), px, hill.userData.heightAt(px, pz) - .35, pz));
  g.userData.top = 68.6;
  return g;
}

// 日塔：九层八角铜塔 41 m；月塔：七层八角琉璃塔 35 m。均立于杉湖小岛石台上。
export function twinPagodas(F, M) {
  const ri = pagoda({ h: 41, tiers: 9, r0: 9.2, taper: 0.5, mats: { body: M.copper, roof: M.copperRoof, trim: M.copperRoof, dark: M.dark } });
  const yu = pagoda({ h: 35, tiers: 7, r0: 7.8, taper: 0.55, mats: { body: M.glaze, roof: M.glazeRoof, trim: M.silver, dark: M.dark, rail: M.silver } });
  const base = (r) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.6, 1.4, 8), M.marble); b.position.y = 0.7; return b; };
  const gr = new THREE.Group(), gy = new THREE.Group();
  gr.add(base(13), at(ri, 0, 1.4, 0));
  gy.add(base(11), at(yu, 0, 1.4, 0));
  at(gr, F.rita.c[0], 0, F.rita.c[1]);
  at(gy, F.yueta.c[0], 0, F.yueta.c[1]);
  gr.userData.top = 42; gy.userData.top = 36;
  return { rita: gr, yueta: gy };
}

// 逍遥楼：二层三檐楼阁，高 24 m，面阔进深 22 m，1.5 m 台基。仿唐：青瓦、朱柱、白壁。
export function xiaoyaolou(F, M) {
  const g = hall([
    { w: 15.6, d: 15.6, h: 6.6, cw: 20, cd: 20, roof: { h: 1.7, ridge: 8, over: 1.7 } },
    { w: 15.2, d: 15.2, h: 5.5, cw: 18, cd: 18, balcony: true, roof: { h: 1.8, ridge: 7, over: 2.1 } },
    { w: 14.3, d: 14.3, h: 2.25, cw: 16, cd: 16, roof: { h: 4.25, ridge: 7, over: 2.8, rise: 4.25 } },
  ], M.hallGray, { baseH: 1.5, baseW: 29, baseD: 29 });
  g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g);
  g.scale.y=21/(bounds.max.y-bounds.min.y);
  at(g,F.xiaoyaolou.c[0],3,F.xiaoyaolou.c[1],ringAngle(F.xiaoyaolou.o)+Math.PI/2);
  const root=new THREE.Group(),base=new THREE.Mesh(new THREE.BoxGeometry(37,3,42),M.stone);
  base.position.set(F.xiaoyaolou.c[0],1.5,F.xiaoyaolou.c[1]);base.rotation.y=g.rotation.y;root.add(base,g);
  root.userData.top=24;return root;
}

// 正阳门落位：OSM 门楼足迹比城墙线深（南缘即城墙线），门楼中心投影到最近的城墙段上，和墙体对齐
export function zhengyangAnchor(F) {
  const ring = F.wangcheng.o, [gx, gz] = F.zhengyangmen.c;
  let best = { d: Infinity };
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((gx - a[0]) * dx + (gz - a[1]) * dz) / L2)), x = a[0] + dx * t, z = a[1] + dz * t, d = Math.hypot(gx - x, gz - z);
    if (d < best.d) best = { d, seg: i, x, z, angle: Math.atan2(-dz, dx) };
  }
  return best;
}
// 靖江王城：料石城墙（高 7.9 m、厚 5.5 m）沿 OSM 轮廓，四门城楼，承运门/承运殿，独秀峰 66 m
export function wangchengWalls(F, M) {
  const g = new THREE.Group();
  const ring = F.wangcheng.o, H = 7.9, T = 5.5;
  const geos = [];
  const m4 = new THREE.Matrix4();
  const merlons = [];
  // 正阳门是落地门楼（拱门在地面贯通），城墙在它两侧断开 30 m
  const { x: px, z: pz } = zhengyangAnchor(F), R = 15, segs = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1];
    // 线段与半径 R 的圆求交，保留圆外部分
    const fx = a[0] - px, fz = a[1] - pz, A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - R * R, D = B * B - 4 * A * C;
    if (D <= 0) { segs.push([a, b]); continue; }
    const t1 = Math.max(0, (-B - Math.sqrt(D)) / (2 * A)), t2 = Math.min(1, (-B + Math.sqrt(D)) / (2 * A));
    if (t2 <= 0 || t1 >= 1) { segs.push([a, b]); continue; }
    if (t1 > 0) segs.push([a, [a[0] + dx * t1, a[1] + dz * t1]]);
    if (t2 < 1) segs.push([[a[0] + dx * t2, a[1] + dz * t2], b]);
  }
  for (const [[ax, az], [bx, bz]] of segs) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 1) continue;
    const nx = -dz / L * T / 2, nz = dx / L * T / 2;
    geos.push(extrudeRing([[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]], H));
    for (let s = 1.2; s < L; s += 2.6) for (const side of [-1, 1]) {
      const x = ax + dx / L * s + side * nx * 0.85, z = az + dz / L * s + side * nz * 0.85;
      m4.makeRotationY(Math.atan2(-dz, dx)); m4.setPosition(x, H + 0.45, z);
      merlons.push(m4.clone());
    }
  }
  for (const ge of geos) g.add(new THREE.Mesh(ge, M.stone));
  const mer = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.9, 0.8), M.stone, merlons.length);
  merlons.forEach((m, i) => mer.setMatrixAt(i, m));
  g.add(mer);
  return g;
}
export function duxiufengPeak(F) {
  return karstHill({ ring: F.duxiufeng.o, peaks: [{ x: 138, z: -343, h: 66, r: 48, k: 0.6 }], margin: 13, floor: 0.2, seed: 11, rough: 0.07 });
}
export function wangcheng(F, M) {
  const g = new THREE.Group();
  const H = 7.9;
  g.add(wangchengWalls(F, M));
  // 城门：正阳门(端礼门) 城台 11 m + 二层城楼；承运门 城台 + 单层门楼；东华/西华/广智门 单层门楼
  const gate = (foot, towerFloors, platH) => {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(extrudeRing(foot.o, platH), M.stone));
    const t = hall(towerFloors, M.hallGray);
    at(t, foot.c[0], platH, foot.c[1], ringAngle(foot.o));
    grp.add(t);
    return grp;
  };
  g.add(gate(F.zhengyangmen, [
    { w: 26, d: 11, h: 5.5, cw: 28, cd: 13, roof: { h: 2.6, ridge: 16, over: 2 } },
    { w: 22, d: 9, h: 4.5, cw: 23, cd: 10, balcony: true, roof: { h: 4.2, ridge: 14, over: 2.2, rise: 4.2 } },
  ], 11));
  g.add(gate(F.chengyunmen, [{ w: 20, d: 8, h: 6, cw: 22, cd: 10, roof: { h: 4.2, ridge: 12, over: 2.2, rise: 4.2 } }], 5));
  const side = (x, z, ry) => { const t = hall([{ w: 16, d: 7, h: 5, cw: 17, cd: 8, roof: { h: 3.6, ridge: 9, over: 1.8, rise: 3.6 } }], M.hallGray); at(t, x, H, z, ry); g.add(t); };
  side(244.3, 8.0, Math.PI / 2 - 0.14);      // 东华门(体仁)
  side(-77.7, -32.7, Math.PI / 2 - 0.14);    // 西华门(遵义)
  side(147.7, -436.3, -0.14);                // 广智门(后贡)
  // 承运殿：2.2 m 须弥座台基 + 单层大殿
  const dian = new THREE.Group();
  dian.add(new THREE.Mesh(extrudeRing(F.chengyundian.o, 2.2), M.marble));
  const hallM = hall([{ w: 42, d: 20, h: 9, cw: 44, cd: 22, roof: { h: 6.5, ridge: 26, over: 2.6, rise: 6.5 } }], M.hallGray);
  at(hallM, F.chengyundian.c[0], 2.2, F.chengyundian.c[1], ringAngle(F.chengyundian.o));
  dian.add(hallM);
  g.add(dian);
  // 独秀峰 66 m，峰顶独秀亭（六角小亭，非塔——独秀峰历来无塔）
  const peak = duxiufengPeak(F);
  g.add(peak);
  const ting = hall([{ w: 4.5, d: 4.5, h: 3.2, cw: 5, cd: 5, roof: { h: 2.6, ridge: 0, over: 1.2, rise: 2.6 } }], M.hallGray, { colPitch: 2.5 });
  g.add(at(ting, 138, peak.userData.heightAt(138, -343) - 0.3, -343));
  g.userData.top = 66 + 6;
  return g;
}

// 伏波山：长 120 m、宽 60 m、高 63 m，东临漓江为陡壁
export function fuboshan(F, M) {
  const g = karstHill({ ring: ellipse(596, -392, 33, 62), peaks: [{ x: 598, z: -398, h: 63, r: 58, k: 0.7 }], margin: 11, floor: 0.3, seed: 5, rough: 0.07 });
  g.userData.top = 63;
  return g;
}

// 叠彩山：明月峰 73 m、仙鹤峰、四望山、于越山四峰，足迹取公园范围
export function diecaishan(F, M) {
  const g = karstHill({ ring: F.diecaishan.o, res: 4, margin: 30, floor: 0.18, seed: 7, rough: 0.09,
    peaks: [{ x: 543, z: -1132, h: 73, r: 72, k: 0.75 }, { x: 218, z: -1176, h: 62, r: 62, k: 0.8 }, { x: 222, z: -1060, h: 48, r: 56, k: 0.9 }, { x: 450, z: -1012, h: 56, r: 60, k: 0.85 }] });
  g.userData.top = 73;
  return g;
}

// 古南门：方石城台 39.4×19.4×5.3 m，券洞宽 2.9 高 3.5 m，上为单檐歇山榕树楼；门前千年古榕（高 18.6 m、冠幅 32 m）
export function gunanmen(F, M) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-19.7, 0); s.lineTo(19.7, 0); s.lineTo(19.7, 5.3); s.lineTo(-19.7, 5.3); s.closePath();
  const arch = new THREE.Path();
  arch.moveTo(-1.45, 0); arch.lineTo(-1.45, 2.05); arch.absarc(0, 2.05, 1.45, Math.PI, 0, true); arch.lineTo(1.45, 0); arch.closePath();
  s.holes.push(arch);
  const plat = new THREE.ExtrudeGeometry(s, { depth: 19.4, bevelEnabled: false });
  plat.translate(0, 0, -9.7);
  const ry = ringAngle(F.rongshulou.o);
  g.add(at(new THREE.Mesh(plat, M.stone), 0, 0, 0, ry));
  const lou = hall([{ w: 12, d: 8, h: 4.2, cw: 13, cd: 9, roof: { h: 3.2, ridge: 7, over: 1.8, rise: 3.2 } }], M.hallGray);
  g.add(at(lou, 0, 5.3, 0, ry));
  // 古榕：位于门西侧湖岸
  const tree = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 9, 10), M.trunk); tr.position.y = 4.5;
  tree.add(tr);
  // 冠幅 32 m 的榕树冠：多球叠成，顶 18.6 m
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, rr = i === 0 ? 0 : 7 + (i % 3) * 2.2, r = i === 0 ? 9 : 5.5 + (i % 4) * 0.9;
    const cr = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), std({ color: [0x3f6b33, 0x4a7a3a, 0x37602c][i % 3], roughness: 0.95 }));
    cr.scale.y = 0.7;
    cr.position.set(Math.cos(a) * rr, 12.5 - (i % 3) * 1.2 + (i === 0 ? 1.2 : 0), Math.sin(a) * rr);
    tree.add(cr);
    if (i > 0 && i % 2) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 12, 6), M.trunk); br.position.set(Math.cos(a) * rr * 0.6, 8, Math.sin(a) * rr * 0.6); br.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); tree.add(br); }
  }
  g.add(at(tree, -30, 0, 6));
  at(g, F.rongshulou.c[0], 0, F.rongshulou.c[1]);
  g.userData.top = 13;
  return g;
}

// 木龙塔：仿宋（上海龙华塔）七层楼阁式砖塔，约 40 m
export function mulongta(F, M) {
  const g = pagoda({ h: 40, tiers: 7, r0: 5.6, taper: 0.62, spire: 0.16, mats: { body: M.brick, roof: M.tile, trim: M.wood, dark: M.dark, rail: M.rail } });
  at(g, F.mulongta.c[0], 0, F.mulongta.c[1]);
  g.userData.top = 40;
  return g;
}

// 解放桥：284×45 m，五跨空腹式连拱 41.5+61+72+61+41.5，两墩在江中
export function jiefangqiao(F, M) {
  const g = new THREE.Group();
  const ring = F.jiefangqiao.o, ry = ringAngle(ring), [cx, cz] = F.jiefangqiao.c;
  const deckY = 8.2;
  g.add(new THREE.Mesh(extrudeRing(ring, 2.0, deckY), M.concrete));
  const inner = new THREE.Group();
  const spans = [41.5, 61, 72, 61, 41.5];
  let x = -spans.reduce((a, b) => a + b) / 2;
  for (const L of spans) {
    const f = Math.min(6.5, L * 0.1), s = new THREE.Shape();
    s.moveTo(-L / 2, deckY); s.lineTo(L / 2, deckY); s.lineTo(L / 2, 1.2);
    s.quadraticCurveTo(0, 1.2 + 2 * f, -L / 2, 1.2); s.closePath();
    const rib = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 40, bevelEnabled: false }), M.concrete);
    rib.position.set(x + L / 2, 0, -20);
    inner.add(rib);
    x += L;
    if (x < 130) { const pier = new THREE.Mesh(new THREE.BoxGeometry(5, deckY + 1, 42), M.concrete); pier.position.set(x, deckY / 2 - 0.5, 0); inner.add(pier); }
  }
  for (const side of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(284, 1.1, 0.35), M.marble); rail.position.set(0, deckY + 2.5, side * 22.2); inner.add(rail); }
  at(inner, cx, 0, cz, ry);
  g.add(inner);
  g.userData.top = 10;
  return g;
}

// 其它桥：OSM 桥面拉伸；北斗桥为汉白玉曲桥（折线带）
export function bridges(BR, F, M) {
  const g = new THREE.Group();
  for (const b of BR) if (b.n !== '解放桥') g.add(new THREE.Mesh(extrudeRing(b.o, 1.1, 2.4), M.pale));
  const pts = F.beidouqiao.o, w = 3.6;
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i], [ax, az] = pts[Math.max(i - 1, 0)], [bx, bz] = pts[Math.min(i + 1, pts.length - 1)];
    let dx = bx - ax, dz = bz - az; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    pos.push(x - dz * w / 2, 2.0, z + dx * w / 2, x + dz * w / 2, 2.0, z - dx * w / 2);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
  g.add(new THREE.Mesh(bg, M.marble));
  return g;
}

// 舍利塔：宝瓶式，通高 13.2 m
export function shelita(F, M) {
  const g = bottlePagoda(13.2, M.pale);
  at(g, F.shelita.c[0], 0, F.shelita.c[1]);
  g.userData.top = 13.2;
  return g;
}

// 东镇门（宋城墙城门）
export function dongzhenmen(F, M) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(extrudeRing(F.dongzhenmen.o, 7.5), M.stone));
  const t = hall([{ w: 12, d: 6, h: 4, cw: 13, cd: 7, roof: { h: 3, ridge: 7, over: 1.6, rise: 3 } }], M.hallGray);
  at(t, F.dongzhenmen.c[0], 7.5, F.dongzhenmen.c[1], ringAngle(F.dongzhenmen.o));
  g.add(t);
  return g;
}
