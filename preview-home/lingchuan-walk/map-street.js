// ============================================================================
// 街区近景：正阳步行街、东西巷一带的路与楼块，街心一座朱红钢架钟塔
// 数据：map-street.json（scripts/bake-street-block.py 从 OpenStreetMap 预烘，只留几何）
//   OSM 没有楼高：按楼的类别在范围内随机，只为立体，不是实测。
//   钟塔坐标是估的（街心位置），不是实测；塔高、年代一概不写。
// 性能：路和楼合并成一个 BufferGeometry、一个 Mesh；镜头不在这一带或放得不够大时整个不建、不画。
// ============================================================================

const SHOW_ZOOM_A = 5.5; // 开始淡入
const SHOW_ZOOM_B = 8.5; // 完全显示
const NEAR_R = 0.5; // 镜头离街区中心多近（世界单位，约 1.4km）算「在这一带」
const WALL = '#E8DCC2';
const ROOF = '#B9876A';
const ROOF_SPECIAL = '#B2705A';
const ROAD_COL = ['#F3E6C4', '#E4D6B2', '#D2C4A6']; // 步行路、小径、车行路
const ROAD_W = [0.0062, 0.0030, 0.0052]; // 世界单位；比真实略宽，远一点才看得见
const M = 0.00035; // 1 米 ≈ 0.00035 世界单位
const H_EXAG = 2.4; // 楼高垂直夸张

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createStreetBlock({ THREE, scene, lonLatToWorld, sampleElevation, dataUrl = './map-street.json' }) {
  const center = lonLatToWorld(110.2945, 25.2795);
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  let data = null;
  let loading = false;
  let mesh = null;
  let clock = null;
  let mat = null;
  let ground = []; // 每个顶点的 xz 与离地高度，DEM 到后重算 y
  let alpha = 0;

  function toWorld(x, y) {
    return lonLatToWorld(data.o[0] + x / data.k, data.o[1] + y / data.k);
  }

  // 楼：按类别随机楼高（米），同一栋永远同一个高度
  function bHeightM(kind, i) {
    const r = (Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1;
    const u = Math.abs(r);
    return kind === 1 ? 14 + u * 10 : 8 + u * 14;
  }

  function build() {
    const pos = [];
    const col = [];
    const idx = [];
    const meta = []; // [wx, wz, lift]
    const c = new THREE.Color();
    const push = (wx, wz, lift, color) => {
      pos.push(wx, 0, wz);
      c.set(color);
      col.push(c.r, c.g, c.b);
      meta.push(wx, wz, lift);
      return meta.length / 3 - 1;
    };

    // ---- 路：每段折线展成带状 ----
    for (const [cls, flat] of data.roads) {
      const w = ROAD_W[cls] * 0.5;
      const pts = [];
      for (let i = 0; i < flat.length; i += 2) {
        const p = toWorld(flat[i], flat[i + 1]);
        pts.push([p.x, p.z]);
      }
      if (pts.length < 2) continue;
      const lift = 0.010 + cls * 0.0006;
      let prev = -1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        let dx = b[0] - a[0];
        let dz = b[1] - a[1];
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        const nx = -dz * w;
        const nz = dx * w;
        const i0 = push(pts[i][0] + nx, pts[i][1] + nz, lift, ROAD_COL[cls]);
        const i1 = push(pts[i][0] - nx, pts[i][1] - nz, lift, ROAD_COL[cls]);
        if (prev >= 0) idx.push(prev, prev + 1, i0, prev + 1, i1, i0);
        prev = i0;
      }
    }

    // ---- 楼：墙四面 + 平屋顶 ----
    data.b.forEach(([kind, flat], bi) => {
      const ring = [];
      for (let i = 0; i < flat.length; i += 2) {
        const p = toWorld(flat[i], flat[i + 1]);
        ring.push(new THREE.Vector2(p.x, p.z));
      }
      const h = bHeightM(kind, bi) * M * H_EXAG;
      const lift = 0.006;
      const roofCol = kind === 1 ? ROOF_SPECIAL : ROOF;
      // 墙
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const v0 = push(a.x, a.y, lift, WALL);
        const v1 = push(b.x, b.y, lift, WALL);
        const v2 = push(b.x, b.y, lift + h, WALL);
        const v3 = push(a.x, a.y, lift + h, WALL);
        idx.push(v0, v1, v2, v0, v2, v3);
      }
      // 屋顶
      const tris = THREE.ShapeUtils.triangulateShape(ring, []);
      const base = meta.length / 3;
      for (const p of ring) push(p.x, p.y, lift + h, roofCol);
      for (const t of tris) idx.push(base + t[0], base + t[1], base + t[2]);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    ground = meta;
    mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    refresh();

    clock = buildClock();
    group.add(clock);
    refresh();
  }

  // 朱红钢架钟塔：四根斜腿、几道横撑、顶上收尖、中上部一面圆钟、塔脚毛石底座
  function buildClock() {
    const g = new THREE.Group();
    const w = lonLatToWorld(data.clock.lon, data.clock.lat);
    g.position.set(w.x, 0, w.z);
    g.userData.est = true; // 位置是估的
    g.scale.setScalar(1.25);
    const red = new THREE.MeshLambertMaterial({ color: '#C8321F' });
    const stone = new THREE.MeshLambertMaterial({ color: '#A79F8C' });
    const face = new THREE.MeshLambertMaterial({ color: '#FFF6DD', side: THREE.DoubleSide });
    const dark = new THREE.MeshLambertMaterial({ color: '#3B2F2A' });
    const H = 0.028;
    const b0 = 0.0030;
    const b1 = 0.0012;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0050, 0.0016, 8), stone);
    base.position.y = 0.0008;
    g.add(base);
    const y0 = 0.0016;
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? 1 : -1;
      const sz = i < 2 ? 1 : -1;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.00022, 0.00032, 1, 5), red);
      const bx = sx * b0; const bz = sz * b0;
      const tx = sx * b1; const tz = sz * b1;
      const top = new THREE.Vector3(tx, H * 0.78, tz);
      const bot = new THREE.Vector3(bx, y0, bz);
      const mid = bot.clone().add(top).multiplyScalar(0.5);
      leg.position.copy(mid);
      leg.scale.y = top.distanceTo(bot);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
      g.add(leg);
    }
    // 横撑 + 斜撑成网
    const addBar = (a, b, r = 0.00014) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 4), red);
      bar.position.copy(a.clone().add(b).multiplyScalar(0.5));
      bar.scale.y = a.distanceTo(b);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(bar);
    };
    const at = (i, t) => {
      const sx = i % 2 ? 1 : -1;
      const sz = i < 2 ? 1 : -1;
      const k = b0 + (b1 - b0) * t;
      return new THREE.Vector3(sx * k, y0 + (H * 0.78 - y0) * t, sz * k);
    };
    const order = [0, 1, 3, 2];
    for (const t of [0.0, 0.35, 0.7]) {
      for (let j = 0; j < 4; j++) addBar(at(order[j], t), at(order[(j + 1) % 4], t));
    }
    for (const [t0, t1] of [[0, 0.35], [0.35, 0.7]]) {
      for (let j = 0; j < 4; j++) {
        addBar(at(order[j], t0), at(order[(j + 1) % 4], t1));
        addBar(at(order[(j + 1) % 4], t0), at(order[j], t1));
      }
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0016, H * 0.26, 4), red);
    tip.position.y = H * 0.78 + H * 0.13;
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
    // 圆钟：南北两面
    for (const s of [1, -1]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.0024, 20), face);
      disc.position.set(0, H * 0.58, s * 0.0016);
      if (s < 0) disc.rotation.y = Math.PI;
      g.add(disc);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.0027, 20), red);
      ring.position.set(0, H * 0.58, s * 0.00165);
      if (s < 0) ring.rotation.y = Math.PI;
      g.add(ring);
    }
    // 钟下悬着的深色圆钟
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.0010, 8, 6), dark);
    bell.position.set(0, H * 0.40, 0);
    g.add(bell);
    g.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = true; });
    return g;
  }

  /** DEM 载入后重算高度；路和楼贴着地形抬一点点，避免和地形抢深度 */
  function refresh() {
    if (!mesh) return;
    const arr = mesh.geometry.attributes.position;
    for (let i = 0; i < arr.count; i++) {
      const wx = ground[i * 3];
      const wz = ground[i * 3 + 1];
      arr.setY(i, sampleElevation(wx, wz) + ground[i * 3 + 2]);
    }
    arr.needsUpdate = true;
    mesh.geometry.computeVertexNormals(); // 高度变了，墙面法线要重算（建时 y 全是 0）
    if (clock) clock.position.y = sampleElevation(clock.position.x, clock.position.z) + 0.006;
  }

  /** 镜头在这一带的程度 0..1：离得近且放得足够大。供立绘淡出用 */
  function nearK(tx, tz, zoom) {
    const d = Math.hypot(tx - center.x, tz - center.z);
    return smoothstep(NEAR_R * 1.4, NEAR_R * 0.6, d) * smoothstep(SHOW_ZOOM_A, SHOW_ZOOM_B, zoom);
  }

  /** 这一带最多能放大到多少（别处仍是原来的上限） */
  function zoomCap(tx, tz, base, max) {
    const d = Math.hypot(tx - center.x, tz - center.z);
    return base + (max - base) * smoothstep(NEAR_R * 1.6, NEAR_R * 0.7, d);
  }

  function update(tx, tz, zoom) {
    const k = nearK(tx, tz, zoom);
    if (k > 0.01 && !data && !loading) {
      loading = true;
      fetch(dataUrl)
        .then((r) => r.json())
        .then((j) => { data = j; build(); })
        .catch(() => { loading = false; });
    }
    alpha += (k - alpha) * 0.2;
    if (!mat) return;
    mat.opacity = alpha;
    group.visible = alpha > 0.02;
  }

  return { update, refresh, nearK, zoomCap, center };
}
