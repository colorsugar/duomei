import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, ROADS, WATER, GREEN, FOOT } from '/yunyou/data/geo.js';
import { makeTextures, extrudeRing, flatRing, pointInRing, ringBBox, hash } from '/yunyou/src/lib.js';
import { createCityMaterial, cityUV } from '/yunyou/src/city-material.js';
import { createWaterfront } from '/yunyou/src/waterfront.js';
import { createUrbanTrees } from '/yunyou/src/urban-trees.js';
import { parkBuildingOwner } from '/yunyou/src/building-ownership.js';
import { ORIGIN_XY, worldToLocal } from './geo-utils.js';

const RADIUS = 1800;
const ORIGIN_WX = FOOT.xiaoyaolou.c[0];
const ORIGIN_WZ = FOOT.xiaoyaolou.c[1];

function localRing(ring) {
  return ring.map(([x, z]) => worldToLocal(x, z));
}

function inRadiusWorld(cx, cz) {
  return Math.hypot(cx - ORIGIN_WX, cz - ORIGIN_WZ) <= RADIUS;
}

function ringInRadius(ring) {
  const bb = ringBBox(ring);
  const cx = (bb.x0 + bb.x1) / 2;
  const cz = (bb.z0 + bb.z1) / 2;
  return inRadiusWorld(cx, cz);
}

function ribbon(lines, width, y) {
  const pos = [];
  const idx = [];
  for (const pts of lines) {
    if (pts.length < 2) continue;
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [ax, az] = pts[Math.max(i - 1, 0)];
      const [bx, bz] = pts[Math.min(i + 1, pts.length - 1)];
      let dx = bx - ax;
      let dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const nx = -dz * (width / 2);
      const nz = dx * (width / 2);
      pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function overWaterLocal(x, z, waterPolys) {
  return waterPolys.some((p) => pointInRing(x, z, p.o) && !p.h.some((h) => pointInRing(x, z, h)));
}

/** 逍遥楼原点 ~1.8km 内的云游城市 + 滨江 */
export async function createLocalCity({ mobile = false } = {}) {
  const group = new THREE.Group();
  group.name = 'xiaoyao-city';

  const waterPolys = WATER.filter((p) => ringInRadius(p.o))
    .filter((p) => {
      const bb = ringBBox(p.o);
      const [lx, lz] = worldToLocal((bb.x0 + bb.x1) / 2, (bb.z0 + bb.z1) / 2);
      const onPlaza = lx > -35 && lx < 35 && lz > -5 && lz < 38;
      return !onPlaza && (lz > 22 || lx > 35);
    })
    .map((p) => ({
      o: localRing(p.o),
      h: (p.h || []).map((hr) => localRing(hr)),
    }));

  const waterBoxes = waterPolys.map((p) => ringBBox(p.o));
  const dryRuns = (lines, cls) =>
    lines.flatMap((pts) => {
      const runs = [];
      let run = [];
      for (let i = 0; i < pts.length; i++) {
        const mx = i > 0 ? (pts[i][0] + pts[i - 1][0]) / 2 : 0;
        const mz = i > 0 ? (pts[i][1] + pts[i - 1][1]) / 2 : 0;
        const wet = i > 0 && overWaterLocal(mx, mz, waterPolys);
        if (wet) {
          if (run.length > 1) runs.push(run);
          run = [pts[i]];
        } else run.push(pts[i]);
      }
      if (run.length > 1) runs.push(run);
      return runs;
    });

  const roadSpec = {
    trunk: [14, 0x5b6265],
    primary: [11, 0x555c5e],
    secondary: [8, 0x656b6b],
    tertiary: [6, 0x6b706c],
    minor: [4.5, 0x777970],
    pedestrian: [3, 0xe6dfd0],
  };
  for (const [cls, [w, color]] of Object.entries(roadSpec)) {
    const localRoads = ROADS[cls].map((pts) => pts.map(([x, z]) => worldToLocal(x, z)));
    const segs = dryRuns(localRoads, cls);
    if (!segs.length) continue;
    const m = new THREE.Mesh(
      ribbon(segs, w, 0.72),
      new THREE.MeshStandardMaterial({ color, roughness: 1 })
    );
    m.receiveShadow = true;
    group.add(m);
  }

  const modelled = ['xiaoyaolou', 'chengyundian', 'chengyunmen', 'zhengyangmen'].map((k) => FOOT[k]?.c).filter(Boolean);
  const palette = [0xe2d8c8, 0xd5cfc0, 0xd0d2cc, 0xddd4c4, 0xc8ccd2, 0xe0d6c6].map((c) => new THREE.Color(c));
  const cityRoof = new THREE.Color(0x7a7e7c);
  const campusWall = new THREE.Color(0xe4c46c);
  const campusRoof = new THREE.Color(0x4a5056);
  const bGeos = [];
  const cityMat = createCityMaterial();
  BUILDINGS.forEach((b, i) => {
    if (!ringInRadius(b.o)) return;
    const bb = ringBBox(b.o);
    const cx = (bb.x0 + bb.x1) / 2;
    const cz = (bb.z0 + bb.z1) / 2;
    if (parkBuildingOwner(b.o)) return;
    if (modelled.some(([x, z]) => Math.hypot(x - cx, z - cz) < 28)) return;
    const ring = localRing(b.o);
    const g = extrudeRing(ring, b.h);
    cityUV(g);
    const inWangcheng = pointInRing(cx, cz, FOOT.wangcheng.o);
    const c = inWangcheng ? campusWall : palette[Math.floor(hash(i) * palette.length)];
    const n = g.attributes.position.count;
    const day = new Float32Array(n * 3);
    const normal = g.attributes.normal;
    const roof = inWangcheng ? campusRoof : cityRoof;
    for (let k = 0; k < n; k++) {
      const dv = normal.getY(k) > 0.5 ? roof : c;
      day.set([dv.r, dv.g, dv.b], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(day, 3));
    bGeos.push(g);
  });
  if (bGeos.length) {
    const mesh = new THREE.Mesh(mergeGeometries(bGeos), cityMat);
    mesh.castShadow = !mobile;
    mesh.receiveShadow = true;
    group.add(mesh);
    bGeos.forEach((g) => g.dispose());
  }

  const greenMat = new THREE.MeshStandardMaterial({ color: 0x7fa85e, roughness: 0.92 });
  const greenGeos = GREEN.filter((p) => ringInRadius(p.o)).map((p) => flatRing(localRing(p.o), p.h.map(localRing), 0.22));
  if (greenGeos.length) {
    const green = new THREE.Mesh(mergeGeometries(greenGeos), greenMat);
    green.receiveShadow = true;
    group.add(green);
    greenGeos.forEach((g) => g.dispose());
  }

  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.92 });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(56, 64), plazaMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.02, 18);
  plaza.receiveShadow = true;
  group.add(plaza);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a9590, roughness: 0.95 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(52, 2.8, 3.5), wallMat);
  wall.position.set(0, 1.4, 28);
  wall.receiveShadow = true;
  group.add(wall);

  const TEX = makeTextures();
  const waterfront = createWaterfront(TEX);
  waterfront.group.position.set(-ORIGIN_XY[0], 0, -ORIGIN_XY[1]);
  group.add(waterfront.group);

  const treePts = [];
  for (let i = 0; i < 48; i++) {
    const ang = hash(`xt${i}`) * Math.PI * 2;
    const r = 80 + hash(`xr${i}`) * 1600;
    const wx = ORIGIN_WX + Math.sin(ang) * r;
    const wz = ORIGIN_WZ - Math.cos(ang) * r;
    if (!inRadiusWorld(wx, wz)) continue;
    const [lx, lz] = worldToLocal(wx, wz);
    if (overWaterLocal(lx, lz, waterPolys)) continue;
    treePts.push([lx, lz, 0, 3.2 + hash(`xs${i}`) * 1.2, 'camphor']);
  }
  try {
    const trees = await createUrbanTrees(treePts.slice(0, mobile ? 80 : 140));
    group.add(trees);
    group.userData.updateTrees = trees.userData.update;
  } catch (e) {
    console.warn('urban trees', e);
  }

  return {
    group,
    cityMat,
    waterfront,
    waterPolys,
    setNight(on) {
      cityMat.userData.setNight?.(on ? 1 : 0);
      waterfront.setNight(on ? 1 : 0);
    },
    update(camera) {
      group.userData.updateTrees?.(camera);
    },
  };
}
