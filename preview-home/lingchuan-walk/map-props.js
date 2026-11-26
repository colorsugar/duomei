// ============================================================================
// 灵川全境地图 · 纸艺小景（立体书式的满山剪纸树、村落小屋）
// - 林地按真实高程密度（map-props.json，由 scripts/build-lingchuan-paper.py 生成）铺满山坡
// - 树种按十二乡画境换：海洋银杏、潮田桃花、大境雪松、潭下柑橘、三街红枫、大圩凤尾竹……
// - 真实村落点位（OpenStreetMap）上摆白墙青瓦的桂北小屋
// - 全部程序绘制成白边剪纸贴图，零额外图片下载；每种一张 InstancedMesh
// ============================================================================

import { REALMS } from './map-atmo.js';

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 剪纸贴图：先画形状，再整体外扩一圈白纸边 + 底部投影
// ---------------------------------------------------------------------------
const TEX_W = 128;
const TEX_H = 160;

function paperCut(draw) {
  const inner = document.createElement('canvas');
  inner.width = TEX_W;
  inner.height = TEX_H;
  const g = inner.getContext('2d');
  draw(g);
  const out = document.createElement('canvas');
  out.width = TEX_W;
  out.height = TEX_H;
  const o = out.getContext('2d');
  // 白纸边：形状轮廓向外扩 3px
  o.save();
  o.shadowColor = '#FFFDF6';
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) {
    o.drawImage(inner, dx, dy);
  }
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = '#FFFBF0';
  o.fillRect(0, 0, TEX_W, TEX_H);
  o.restore();
  o.drawImage(inner, 0, 0);
  // 纸纹
  o.globalCompositeOperation = 'source-atop';
  const r = mulberry32(7);
  for (let i = 0; i < 260; i++) {
    o.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(60,40,20,0.05)';
    o.fillRect(r() * TEX_W, r() * TEX_H, 1 + r() * 3, 1);
  }
  return out;
}

function trunk(g, col = '#7A5234', w = 7, top = 92) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(64 - w * 0.5, 152);
  g.lineTo(64 - w * 0.35, top);
  g.lineTo(64 + w * 0.35, top);
  g.lineTo(64 + w * 0.5, 152);
  g.closePath();
  g.fill();
}

function blobCrown(g, base, light, dark, dots, dotCol) {
  const r = mulberry32(base.length * 31 + light.length);
  const lobes = [[64, 62, 38], [40, 78, 26], [88, 78, 26], [52, 44, 24], [78, 46, 24], [64, 92, 28]];
  g.fillStyle = dark;
  for (const [x, y, rr] of lobes) {
    g.beginPath();
    g.arc(x + 2, y + 4, rr, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = base;
  for (const [x, y, rr] of lobes) {
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  // 受光的一侧
  g.fillStyle = light;
  for (const [x, y, rr] of lobes.slice(0, 4)) {
    g.beginPath();
    g.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.55, 0, Math.PI * 2);
    g.fill();
  }
  // 剪纸叶脉刻线
  g.strokeStyle = dark;
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = 34 + r() * 60;
    const y = 36 + r() * 62;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 5, y - 6, x + 10, y - 3);
    g.stroke();
  }
  if (dots) {
    g.fillStyle = dotCol;
    for (let i = 0; i < dots; i++) {
      g.beginPath();
      g.arc(30 + r() * 68, 34 + r() * 70, 2.6 + r() * 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function pine(g, base, light, dark, snow) {
  trunk(g, '#6B4A30', 6, 120);
  const tiers = [[132, 46], [108, 40], [84, 33], [60, 25], [38, 17]];
  for (const [y, hw] of tiers) {
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(64, y - hw * 1.25);
    g.lineTo(64 + hw + 2, y + 3);
    g.lineTo(64 - hw + 2, y + 3);
    g.closePath();
    g.fill();
    g.fillStyle = base;
    g.beginPath();
    g.moveTo(64, y - hw * 1.3);
    g.lineTo(64 + hw, y);
    g.lineTo(64 - hw, y);
    g.closePath();
    g.fill();
    g.fillStyle = light;
    g.beginPath();
    g.moveTo(64, y - hw * 1.3);
    g.lineTo(64 - hw, y);
    g.lineTo(64 - hw * 0.3, y);
    g.closePath();
    g.fill();
    if (snow) {
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.moveTo(64, y - hw * 1.3);
      g.lineTo(64 + hw * 0.55, y - hw * 0.55);
      g.lineTo(64 + hw * 0.2, y - hw * 0.45);
      g.lineTo(64 - hw * 0.1, y - hw * 0.6);
      g.lineTo(64 - hw * 0.6, y - hw * 0.5);
      g.closePath();
      g.fill();
    }
  }
}

const KINDS = {
  round: (g) => { trunk(g); blobCrown(g, '#79B35E', '#A3D07A', '#4F8A46'); },
  ginkgo: (g) => { trunk(g, '#6E4A2A'); blobCrown(g, '#F0BC2E', '#FFE07A', '#C98A16', 14, '#FFF0A8'); },
  peach: (g) => { trunk(g, '#6E4636'); blobCrown(g, '#F4A7BC', '#FFD3DF', '#D97893', 18, '#FFFFFF'); },
  orange: (g) => { trunk(g); blobCrown(g, '#5E9E4E', '#86C068', '#3E7438', 16, '#FF8E1E'); },
  maple: (g) => { trunk(g, '#6A3E26'); blobCrown(g, '#E06A3A', '#F7A15A', '#A9402A', 8, '#FFD08A'); },
  pine: (g) => pine(g, '#3F7F5B', '#5FA477', '#2A5E44'),
  snowpine: (g) => pine(g, '#4D7C72', '#8DB1A8', '#355C55', true),
  bamboo: (g) => {
    const r = mulberry32(11);
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 9 + r() * 4;
      const lean = (r() - 0.5) * 18;
      g.strokeStyle = i % 2 ? '#5C9A52' : '#7CB862';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x, 152);
      g.quadraticCurveTo(x + lean * 0.3, 90, x + lean, 22);
      g.stroke();
      g.fillStyle = '#6FAF5A';
      for (let k = 0; k < 6; k++) {
        const y = 30 + k * 16 + r() * 6;
        const xx = x + lean * (1 - (y - 22) / 130);
        g.beginPath();
        g.ellipse(xx + 9, y, 11, 3.2, -0.5, 0, Math.PI * 2);
        g.ellipse(xx - 9, y + 5, 11, 3.2, 0.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
  willow: (g) => {
    trunk(g, '#6E5236', 7, 70);
    g.strokeStyle = '#8CC46A';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = 30 + i * 4.4;
      g.beginPath();
      g.moveTo(64, 46);
      g.quadraticCurveTo(x, 36, x - 2 + (i % 3), 112 + (i % 4) * 8);
      g.stroke();
    }
    g.fillStyle = '#A8D682';
    g.beginPath();
    g.ellipse(64, 46, 30, 16, 0, 0, Math.PI * 2);
    g.fill();
  },
  guihua: (g) => { trunk(g, '#5E4030', 8, 96); blobCrown(g, '#4E8F4A', '#78B65E', '#336B3A', 26, '#F4B81E'); },
  banyan: (g) => {
    // 榕树：宽冠 + 垂下的气根
    trunk(g, '#6B5340', 12, 84);
    g.strokeStyle = '#8A6A4E';
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = 28 + i * 12;
      g.beginPath();
      g.moveTo(x, 84);
      g.lineTo(x + (i % 2 ? 2 : -2), 126 + (i % 3) * 8);
      g.stroke();
    }
    blobCrown(g, '#3F8A4A', '#6DB25E', '#2A6638');
  },
  apt: (g) => {
    // 城区楼房：多层浅色楼 + 一排排窗 + 屋顶水箱
    g.fillStyle = '#E9E2D2';
    g.fillRect(34, 40, 60, 110);
    g.fillStyle = '#D3C9B4';
    g.fillRect(34, 40, 12, 110);
    g.fillStyle = '#B8553F';
    g.fillRect(30, 34, 68, 8);
    g.fillStyle = '#8F9AA3';
    g.fillRect(70, 24, 14, 12);
    for (let y = 52; y < 140; y += 18) {
      for (let x = 52; x < 90; x += 15) {
        g.fillStyle = (x + y) % 3 === 0 ? '#FFD27A' : '#6F8CA3';
        g.fillRect(x, y, 9, 11);
      }
    }
  },
  shop: (g) => {
    // 骑楼商铺：三层 + 青瓦檐 + 红灯笼
    g.fillStyle = '#F2E4C6';
    g.fillRect(22, 70, 84, 80);
    g.fillStyle = '#4A5560';
    g.fillRect(16, 62, 96, 10);
    g.fillStyle = '#C9553A';
    g.fillRect(22, 112, 84, 6);
    g.fillStyle = '#7A5A3E';
    for (let x = 30; x < 100; x += 24) g.fillRect(x, 124, 14, 26);
    for (let x = 30; x < 100; x += 24) {
      g.fillStyle = '#6F8CA3';
      g.fillRect(x, 82, 14, 18);
    }
    g.fillStyle = '#E0412C';
    g.beginPath();
    g.arc(30, 120, 5, 0, Math.PI * 2);
    g.arc(98, 120, 5, 0, Math.PI * 2);
    g.fill();
  },
  house: (g) => {
    // 桂北白墙青瓦：马头墙 + 小窗
    g.fillStyle = '#F4EEE2';
    g.fillRect(26, 84, 76, 64);
    g.fillStyle = '#E2D8C6';
    g.fillRect(26, 84, 14, 64);
    g.fillStyle = '#4A5560';
    g.beginPath();
    g.moveTo(18, 88);
    g.lineTo(64, 52);
    g.lineTo(110, 88);
    g.closePath();
    g.fill();
    g.fillStyle = '#66737E';
    g.fillRect(18, 84, 92, 6);
    g.fillStyle = '#3B3330';
    g.fillRect(56, 116, 16, 32);
    g.fillStyle = '#FFD27A';
    g.fillRect(36, 100, 12, 10);
    g.fillRect(80, 100, 12, 10);
  },
  woodhouse: (g) => {
    // 瑶家木楼：杉木板壁 + 吊脚
    g.fillStyle = '#7A5338';
    g.fillRect(22, 132, 6, 18);
    g.fillRect(100, 132, 6, 18);
    g.fillStyle = '#A8754C';
    g.fillRect(20, 78, 88, 56);
    g.strokeStyle = '#86593A';
    g.lineWidth = 2;
    for (let x = 28; x < 108; x += 9) {
      g.beginPath();
      g.moveTo(x, 80);
      g.lineTo(x, 132);
      g.stroke();
    }
    g.fillStyle = '#3F3A36';
    g.beginPath();
    g.moveTo(10, 82);
    g.lineTo(64, 46);
    g.lineTo(118, 82);
    g.closePath();
    g.fill();
    g.fillStyle = '#FFCF73';
    g.fillRect(50, 96, 28, 14);
  },
};

// 每境树种配比
const REALM_TREES = {
  lantian: { pine: 4, bamboo: 3, round: 3 },
  gongping: { pine: 5, round: 3, bamboo: 2 },
  jiuwu: { round: 4, willow: 3, bamboo: 3 },
  sanjie: { maple: 4, round: 4, pine: 2 },
  tanxia: { orange: 6, round: 4 },
  'lingchuan-zhen': { willow: 5, round: 5 },
  dingjiang: { round: 5, willow: 3, orange: 2 },
  lingtian: { maple: 4, round: 4, pine: 2 },
  haiyang: { ginkgo: 7, round: 2, pine: 1 },
  daxu: { bamboo: 5, round: 3, willow: 2 },
  chaotian: { peach: 6, orange: 2, round: 2 },
  dajing: { snowpine: 6, pine: 4 },
  'guilin-city': { guihua: 4, banyan: 2, round: 3, willow: 2, orange: 1 },
  yanshan: { round: 4, peach: 2, orange: 2, bamboo: 2 },
  lingui: { round: 4, willow: 3, bamboo: 3 },
  yangshuo: { bamboo: 5, round: 3, willow: 2 },
  lipu: { round: 5, bamboo: 3, orange: 2 },
  pingle: { round: 4, bamboo: 4, willow: 2 },
  gongcheng: { peach: 5, round: 3, orange: 2 },
  yongfu: { round: 5, bamboo: 3, pine: 2 },
  longsheng: { pine: 4, bamboo: 4, round: 2 },
  ziyuan: { maple: 3, pine: 4, round: 3 },
  'xing-an': { willow: 3, round: 4, bamboo: 3 },
  quanzhou: { round: 4, pine: 3, willow: 3 },
  guanyang: { pine: 5, round: 3, bamboo: 2 },
};
// 城区小景（楼房聚类 + 滨水垂柳），数据在 map-props.json 的 city 键，由 scripts/build-city-props.py 生成
const CITY_TREES = { guihua: 5, banyan: 2, round: 3, orange: 1 };
const CITY_HOUSES = { apt: 4, shop: 3, house: 3 };
const REALM_HOUSE = { lantian: 'woodhouse', dajing: 'woodhouse', gongping: 'woodhouse', longsheng: 'woodhouse' };

export function createMapProps({ THREE, scene, lonLatToWorld, sampleElevation, standees, isMobile, mapW, mapD, maxAniso }) {
  const group = new THREE.Group();
  group.name = 'lc-props';
  scene.add(group);

  const realmW = REALMS.map((r) => {
    const w = lonLatToWorld(r.lon, r.lat);
    return { id: r.id, x: w.x, z: w.z, w2: r.weight * 4.0 };
  });
  const realmAt = (x, z) => {
    let best = realmW[0];
    let bd = Infinity;
    for (const r of realmW) {
      const d = (r.x - x) ** 2 + (r.z - z) ** 2 - r.w2;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best.id;
  };

  const mats = {};
  for (const [k, fn] of Object.entries(KINDS)) {
    const tex = new THREE.CanvasTexture(paperCut(fn));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, maxAniso || 1);
    mats[k] = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  }

  const avoid = [];
  for (const st of standees) avoid.push([st.wx, st.wz, 0.62]);
  // 立绘南侧（镜头一侧）留得更宽，免得前排树挡住立绘
  const blocked = (x, z) => avoid.some(([ax, az, r]) => {
    const dz = z - az;
    const ez = dz > 0 ? dz / 1.9 : dz;
    return (ax - x) ** 2 + ez * ez < r * r;
  });

  const items = {}; // kind -> [{x,z,h,yaw,flip}]
  const push = (kind, x, z, h, yaw, flip) => {
    (items[kind] ||= []).push({ x, z, h, yaw, flip });
  };
  const pickKind = (table, r) => {
    let sum = 0;
    for (const v of Object.values(table)) sum += v;
    let t = r * sum;
    for (const [k, v] of Object.entries(table)) {
      t -= v;
      if (t <= 0) return k;
    }
    return 'round';
  };

  let built = false;
  let meshes = [];

  async function load() {
    let data;
    try {
      const res = await fetch('./map-props.json', { cache: 'force-cache' });
      data = await res.json();
    } catch {
      return;
    }
    const [GW, GH] = data.grid;
    const cw = mapW / GW;
    const ch = mapD / GH;
    const rnd = mulberry32(450323);
    // 密度按每格面积换算（旧格 0.5 单位见方），保证同一缩放下树林疏密不变
    const density = (isMobile ? 2.4 : 3.6) * (cw * ch) / 0.25 * 0.62;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx;
        const f = data.forest[i];
        const low = data.lowland[i];
        let n = Math.round(f * density + low * density * 0.18 + (rnd() - 0.5));
        if (n <= 0) continue;
        const cx = -mapW / 2 + (gx + 0.5) * cw;
        const cz = -mapD / 2 + (gy + 0.5) * ch;
        const realm = realmAt(cx, cz);
        const table = REALM_TREES[realm] || REALM_TREES.lingtian;
        for (let k = 0; k < n; k++) {
          const x = cx + (rnd() - 0.5) * cw;
          const z = cz + (rnd() - 0.5) * ch;
          if (blocked(x, z)) continue;
          const kind = pickKind(table, rnd());
          push(kind, x, z, 0.36 + rnd() * 0.2, (rnd() - 0.5) * 0.5, rnd() < 0.5);
        }
      }
    }
    for (const [lon, lat, size] of data.villages) {
      const w = lonLatToWorld(lon, lat);
      const realm = realmAt(w.x, w.z);
      const hk = REALM_HOUSE[realm] || 'house';
      const nh = size === 3 ? 7 : size === 2 ? 4 : 2;
      for (let k = 0; k < nh; k++) {
        const a = rnd() * Math.PI * 2;
        const rr = 0.08 + rnd() * (size === 3 ? 0.4 : 0.2);
        const x = w.x + Math.cos(a) * rr;
        const z = w.z + Math.sin(a) * rr * 0.8;
        if (blocked(x, z)) continue;
        push(hk, x, z, 0.2 + rnd() * 0.06, (rnd() - 0.5) * 0.6, rnd() < 0.5);
      }
      const table = REALM_TREES[realm] || REALM_TREES.lingtian;
      for (let k = 0; k < 2; k++) {
        const x = w.x + (rnd() - 0.5) * 0.3;
        const z = w.z + (rnd() - 0.5) * 0.24;
        if (!blocked(x, z)) push(pickKind(table, rnd()), x, z, 0.34 + rnd() * 0.12, 0, rnd() < 0.5);
      }
    }

    if (data.city) {
      // 独立随机序列，不影响灵川等地已有树屋的位置
      const rc = mulberry32(450300);
      const mob = isMobile ? 0.6 : 1;
      for (const [lon, lat, n] of data.city.blocks) {
        const w = lonLatToWorld(lon, lat);
        const nh = Math.round((2 + Math.min(6, Math.ceil(n / 6))) * mob);
        for (let k = 0; k < nh; k++) {
          const x = w.x + (rc() - 0.5) * 0.14;
          const z = w.z + (rc() - 0.5) * 0.11;
          if (blocked(x, z)) continue;
          const kind = pickKind(CITY_HOUSES, rc());
          push(kind, x, z, (kind === 'apt' ? 0.2 : 0.15) + rc() * 0.07, (rc() - 0.5) * 0.4, rc() < 0.5);
        }
        const nt = Math.round((2 + Math.min(3, Math.floor(n / 10))) * mob);
        for (let k = 0; k < nt; k++) {
          const x = w.x + (rc() - 0.5) * 0.16;
          const z = w.z + (rc() - 0.5) * 0.13;
          if (blocked(x, z)) continue;
          push(pickKind(CITY_TREES, rc()), x, z, 0.3 + rc() * 0.14, (rc() - 0.5) * 0.4, rc() < 0.5);
        }
      }
      // 河湖岸：垂柳为主，间植桂花
      for (const [lon, lat] of data.city.water) {
        if (rc() > 0.7 * mob) continue;
        const w = lonLatToWorld(lon, lat);
        const x = w.x + (rc() - 0.5) * 0.05;
        const z = w.z + (rc() - 0.5) * 0.05;
        if (blocked(x, z)) continue;
        push(rc() < 0.72 ? 'willow' : 'guihua', x, z, 0.34 + rc() * 0.12, (rc() - 0.5) * 0.4, rc() < 0.5);
      }
    }

    const geo = new THREE.PlaneGeometry(TEX_W / TEX_H, 1);
    geo.translate(0, 0.5, 0);
    for (const [kind, list] of Object.entries(items)) {
      const mesh = new THREE.InstancedMesh(geo, mats[kind], list.length);
      mesh.frustumCulled = false;
      mesh.userData.list = list;
      group.add(mesh);
      meshes.push(mesh);
    }
    built = true;
    syncHeights();
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  let grow = 0.5;
  function writeMatrices() {
    for (const mesh of meshes) {
      const list = mesh.userData.list;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        e3.set(0, it.yaw, 0);
        q.setFromEuler(e3);
        v3.set(it.x, it.y, it.z);
        s3.set(it.h * (it.flip ? -1 : 1), it.h * grow, it.h);
        m4.compose(v3, q, s3);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function syncHeights() {
    if (!built) return;
    for (const mesh of meshes) {
      for (const it of mesh.userData.list) it.y = sampleElevation(it.x, it.z) - 0.004;
    }
    writeMatrices();
  }

  // 总览时小景压低成一层细密纹理；放大后逐渐立起
  function update(zoom) {
    if (!built) return;
    const g = 0.3 + 0.7 * Math.min(1, Math.max(0, (zoom - 1.0) / 1.8));
    if (Math.abs(g - grow) < 0.015) return;
    grow = g;
    writeMatrices();
  }

  load();
  return { group, syncHeights, update, patch: (fn) => Object.values(mats).forEach(fn) };
}
