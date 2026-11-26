// ============================================================================
// 街区近景：正阳步行街、东西巷一带的路与楼块，街心一座朱红钢架钟塔
// 数据：map-street.json（scripts/bake-street-block.py 从 OpenStreetMap 预烘，只留几何）
//   OSM 没有楼高：按楼的类别在范围内随机，只为立体，不是实测。
//   钟塔坐标是估的（街心位置），不是实测；塔高、年代一概不写。
// 另有两层（同一入口，同一套 nearK/zoomCap 淡入）：
//   城区核心高清叠层：约 3x3km 的 OSM 纸艺图（scripts/build-city-core.py 生成），镜头靠近城区且放大才淡入、才下载。
//   象鼻山近景试点：z>10 时淡入的小场景（山 + 水月洞 + 江面倒影 + 竹筏），用 hj-xiangbi-* 两张分层图做 billboard。
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

// 城区核心叠层范围（来自 img/map/city-core.json，脚本重跑后要同步）
const CORE_LON = [110.278099, 110.307901];
const CORE_LAT = [25.262525, 25.289474];
const CORE_ZOOM_A = 2.4; // 开始淡入
const CORE_ZOOM_B = 4.2; // 完全显示
const XB_LL = [110.2915, 25.2701]; // 象鼻山（同 map-city.js 立绘坐标）
const XB_ZOOM_A = 9.5;
const XB_ZOOM_B = 11;
const XB_W = 0.34; // billboard 宽（世界单位，比实物夸张，立绘风格）

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createStreetBlock({ THREE, scene, lonLatToWorld, sampleElevation, isMobile = false, dataUrl = './map-street.json' }) {
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
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
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
    coreHeights();
    xbHeights();
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


  // ---------------- 城区核心高清叠层 ----------------
  const cA = lonLatToWorld(CORE_LON[0], CORE_LAT[1]); // 西北角
  const cB = lonLatToWorld(CORE_LON[1], CORE_LAT[0]); // 东南角
  const core = { cx: (cA.x + cB.x) / 2, cz: (cA.z + cB.z) / 2, hw: Math.abs(cB.x - cA.x) / 2, hd: Math.abs(cB.z - cA.z) / 2, mesh: null, loading: false, alpha: 0 };
  const CORE_SEG = 40;
  const CORE_LIFT = 0.009;

  function coreK(tx, tz, zoom) {
    const d = Math.max(Math.abs(tx - core.cx) / core.hw, Math.abs(tz - core.cz) / core.hd);
    return smoothstep(1.7, 1.0, d) * smoothstep(CORE_ZOOM_A, CORE_ZOOM_B, zoom);
  }

  function coreHeights() {
    if (!core.mesh) return;
    const arr = core.mesh.geometry.attributes.position;
    for (let i = 0; i < arr.count; i++) {
      arr.setY(i, sampleElevation(core.cx + arr.getX(i), core.cz + arr.getZ(i)) + CORE_LIFT);
    }
    arr.needsUpdate = true;
  }

  function loadCore() {
    core.loading = true;
    new THREE.TextureLoader().load(isMobile ? './img/map/city-core-m.webp' : './img/map/city-core-l.webp', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const geo = new THREE.PlaneGeometry(core.hw * 2, core.hd * 2, CORE_SEG, CORE_SEG);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.MeshLambertMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      });
      core.mesh = new THREE.Mesh(geo, m);
      core.mesh.position.set(core.cx, 0, core.cz);
      core.mesh.frustumCulled = false;
      core.mesh.renderOrder = 1;
      core.mesh.receiveShadow = true;
      core.mesh.visible = false;
      scene.add(core.mesh);
      coreHeights();
    }, undefined, () => { core.loading = false; });
  }

  // ---------------- 象鼻山近景试点 ----------------
  const xb = { g: null, loading: false, alpha: 0, mats: [], pos: lonLatToWorld(XB_LL[0], XB_LL[1]) };

  function xbK(tx, tz, zoom) {
    const d = Math.hypot(tx - xb.pos.x, tz - xb.pos.z);
    return smoothstep(0.55, 0.25, d) * smoothstep(XB_ZOOM_A, XB_ZOOM_B, zoom);
  }

  function loadXb() {
    xb.loading = true;
    const dir = isMobile ? './img/m/' : './img/';
    const loader = new THREE.TextureLoader();
    const load = (n) => new Promise((ok, no) => loader.load(`${dir}hj-xiangbi-${n}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; ok(t); }, undefined, no));
    Promise.all([load('mid1'), load('fg1')]).then(([mid, raft]) => {
      const g = new THREE.Group();
      const mk = (tex, w, color, opacity) => {
        const h = w * tex.image.height / tex.image.width;
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, alphaTest: 0.02, color, side: THREE.DoubleSide, depthWrite: false });
        mat.userData.max = opacity;
        xb.mats.push(mat);
        return { mat, w, h };
      };
      const M0 = mk(mid, XB_W, '#F4F0E4', 1);
      const hill = new THREE.Mesh(new THREE.PlaneGeometry(M0.w, M0.h).translate(0, M0.h / 2, 0), M0.mat);
      hill.renderOrder = 3;
      g.add(hill);
      // 江面倒影：平铺在水面上，朝镜头一侧展开，上下颠倒、压低饱和
      const M1 = mk(mid, XB_W, '#9ED4D2', 0.42);
      const refl = new THREE.Mesh(new THREE.PlaneGeometry(M1.w, M1.h * 0.8).translate(0, M1.h * 0.4, 0), M1.mat);
      refl.rotation.x = Math.PI / 2;
      refl.scale.x = -1;
      refl.position.y = 0.002;
      refl.renderOrder = 2;
      g.add(refl);
      // 竹筏
      const M2 = mk(raft, 0.09, '#F4F0E4', 1);
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(M2.w, M2.h).translate(0, M2.h / 2, 0), M2.mat);
      rf.position.set(0.08, 0, M0.h * 0.55);
      rf.renderOrder = 4;
      g.add(rf);
      g.visible = false;
      xb.g = g;
      scene.add(g);
      xbHeights();
    }).catch(() => { xb.loading = false; });
  }

  function xbHeights() {
    if (xb.g) xb.g.position.set(xb.pos.x, sampleElevation(xb.pos.x, xb.pos.z) + CORE_LIFT, xb.pos.z);
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

  function update(tx, tz, zoom, camPos) {
    const k = nearK(tx, tz, zoom);
    if (k > 0.01 && !data && !loading) {
      loading = true;
      fetch(dataUrl)
        .then((r) => r.json())
        .then((j) => { data = j; build(); })
        .catch(() => { loading = false; });
    }
    alpha += (k - alpha) * 0.2;
    if (mat) {
      mat.opacity = alpha;
      group.visible = alpha > 0.02;
    }

    const ck = coreK(tx, tz, zoom);
    if (ck > 0.01 && !core.mesh && !core.loading) loadCore();
    core.alpha += (ck - core.alpha) * 0.2;
    if (core.mesh) {
      core.mesh.material.opacity = core.alpha;
      core.mesh.visible = core.alpha > 0.02;
    }

    const bk = xbK(tx, tz, zoom);
    if (bk > 0.01 && !xb.g && !xb.loading) loadXb();
    xb.alpha += (bk - xb.alpha) * 0.2;
    if (xb.g) {
      for (const m of xb.mats) m.opacity = xb.alpha * m.userData.max;
      xb.g.visible = xb.alpha > 0.02;
      if (camPos) xb.g.rotation.y = Math.atan2(camPos.x - xb.pos.x, camPos.z - xb.pos.z);
    }
  }

  /** 象鼻山试点的淡入程度 0..1（map-3d 用它让同处的立绘让位） */
  const xiangbiK = () => xb.alpha;

  return { update, refresh, nearK, zoomCap, center, xiangbiK };
}
