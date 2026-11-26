// ============================================================================
// 县区高光：聚焦某县区时沿真实边界描一道朱砂线，线内一圈淡金晕向里化开
// 边界数据：map-bounds.json（scripts/build-guilin-bounds.py 生成）
// 线宽随缩放换算，屏幕上始终约 3px 线 + 36px 晕
// 另含城区「两江四湖」水带（createCityWater），由 createRegionHighlight 一并建、一并每帧更新
// ============================================================================

const VERT = /* glsl */`
  attribute vec2 aDir;
  attribute float aSide;
  uniform float uWidth;
  uniform float uScale;
  varying float vSide;
  void main() {
    vSide = aSide;
    vec3 p = position;
    p.xz += aDir * aSide * uWidth * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG_LINE = /* glsl */`
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vSide;
  void main() {
    float a = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
    gl_FragColor = vec4(uColor, a * uAlpha);
  }
`;

const FRAG_BAND = /* glsl */`
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vSide;
  void main() {
    float a = pow(1.0 - clamp(vSide, 0.0, 1.0), 1.8);
    gl_FragColor = vec4(uColor, a * uAlpha);
  }
`;

export function createRegionHighlight({ THREE, scene, lonLatToWorld, sampleElevation, regionOfTown }) {
  let bounds = null;
  let loading = null;
  let currentId = null;
  let wantId = null;
  let group = null;
  let alpha = 0;
  let targetAlpha = 0;

  const lineMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG_LINE,
    uniforms: {
      uWidth: { value: 0.05 }, uScale: { value: 1 },
      uColor: { value: new THREE.Color('#B3261E') }, uAlpha: { value: 0 },
    },
    transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const water = createCityWater({ THREE, scene, lonLatToWorld, sampleElevation });
  const bandMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG_BAND,
    uniforms: {
      uWidth: { value: 1.0 }, uScale: { value: 1 },
      uColor: { value: new THREE.Color('#E8B04A') }, uAlpha: { value: 0 },
    },
    transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });

  function load() {
    if (!loading) {
      loading = fetch('./map-bounds.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { bounds = j?.bounds || null; })
        .catch(() => { bounds = null; });
    }
    return loading;
  }

  // 世界坐标环，按 0.15 单位重采样，让线贴着起伏的地形走
  function worldRing(ring) {
    const pts = ring.map(([lon, lat]) => lonLatToWorld(lon, lat));
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
    return out;
  }

  function buildStrip(pts, inward, symmetric) {
    const N = pts.length;
    const pos = new Float32Array(N * 2 * 3 + 6);
    const dir = new Float32Array(N * 2 * 2 + 4);
    const side = new Float32Array(N * 2 + 2);
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const p = pts[i % N];
      const prev = pts[(i - 1 + N) % N];
      const next = pts[(i + 1) % N];
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const L = Math.hypot(dx, dz) || 1;
      dx /= L; dz /= L;
      // 向内法线
      const nx = inward > 0 ? -dz : dz;
      const nz = inward > 0 ? dx : -dx;
      const y = sampleElevation(p.x, p.z) + 0.05;
      for (let s = 0; s < 2; s++) {
        const v = i * 2 + s;
        pos[v * 3] = p.x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = p.z;
        dir[v * 2] = nx; dir[v * 2 + 1] = nz;
        side[v] = symmetric ? (s === 0 ? -1 : 1) : s;
      }
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 2));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  function disposeGroup() {
    if (!group) return;
    scene.remove(group);
    group.traverse((o) => o.geometry?.dispose());
    group = null;
  }

  function build(id) {
    disposeGroup();
    currentId = id;
    const rings = bounds?.[id];
    if (!rings) return;
    group = new THREE.Group();
    group.renderOrder = 3;
    for (const ring of rings) {
      const pts = worldRing(ring);
      if (pts.length < 4) continue;
      // 鞋带公式判断环的方向，决定哪边是县区内部
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        area += a.x * b.z - b.x * a.z;
      }
      const inward = area > 0 ? 1 : -1;
      const band = new THREE.Mesh(buildStrip(pts, inward, false), bandMat);
      const line = new THREE.Mesh(buildStrip(pts, inward, true), lineMat);
      band.renderOrder = 3;
      line.renderOrder = 4;
      band.frustumCulled = false;
      line.frustumCulled = false;
      group.add(band, line);
    }
    scene.add(group);
  }

  function setTown(townId) {
    const id = regionOfTown(townId);
    wantId = id;
    if (!id) { targetAlpha = 0; return; }
    load().then(() => {
      if (wantId !== id) return;
      if (currentId !== id) {
        alpha = 0;
        build(id);
      }
      targetAlpha = 1;
    });
  }

  // 每帧：线宽按缩放换算成近似恒定的屏幕宽度；淡入淡出
  function update(zoom, dt = 1 / 60) {
    water.update(zoom, dt);
    const k = 1 - Math.exp(-dt * 5);
    alpha += (targetAlpha - alpha) * k;
    if (alpha < 0.01 && targetAlpha === 0) disposeGroup();
    const s = 1 / Math.max(0.3, zoom);
    lineMat.uniforms.uScale.value = s;
    bandMat.uniforms.uScale.value = s;
    lineMat.uniforms.uAlpha.value = 0.82 * alpha;
    bandMat.uniforms.uAlpha.value = 0.30 * alpha;
  }

  // 高度图到位后重贴一次
  function refresh() {
    if (currentId && bounds) build(currentId);
    water.refresh();
  }

  return { setTown, update, refresh };
}

// ============================================================================
// 两江四湖：漓江城区段、桃花江、榕湖、杉湖、桂湖、木龙湖贴地发光水带
// 数据：map-water.json（scripts/bake-city-water.py 从 OpenStreetMap 预烘，只留几何）
// 湖面淡青 + 粼光；岸线描金，金线上有一点流光；外圈一道青晕，远看也认得出水在哪
// z<1.7 不画、不取数据；z≥2 显示，越近越亮。
// 性能：水面一个 Mesh，岸线/青晕/缺口河道合成一个 Mesh，两个材质
// ============================================================================

const WATER_SHOW_A = 1.7; // 开始淡入
const WATER_SHOW_B = 2.1; // 完全显示
const WATER_LIFT = 0.02; // 离地高度（世界单位），再加 polygonOffset 防闪
const WATER_M = 0.00035; // 1 米 ≈ 0.00035 世界单位（与 map-street.js 一致）

const WATER_FILL_VERT = /* glsl */`
  varying vec2 vW;
  void main() {
    vW = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WATER_FILL_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uTime;
  varying vec2 vW;
  void main() {
    float s = sin(vW.x * 41.0 + uTime * 0.9) * sin(vW.y * 33.0 - uTime * 0.7 + vW.x * 9.0);
    float sh = smoothstep(0.55, 1.0, s);
    vec3 col = mix(uColor, vec3(0.85, 1.0, 1.0), sh * 0.5);
    gl_FragColor = vec4(col, uAlpha * (0.86 + 0.12 * sh));
  }
`;

// aKind：0 岸线金线，1 青晕，2 缺口河道（按真实河宽，太细时按屏幕最小宽）
const WATER_STRIP_VERT = /* glsl */`
  attribute vec2 aDir;
  attribute float aSide;
  attribute float aKind;
  attribute float aU;
  attribute float aW;
  uniform float uScale;
  uniform float uHalo;
  varying float vSide;
  varying float vKind;
  varying float vU;
  void main() {
    vSide = aSide;
    vKind = aKind;
    vU = aU;
    float w = aKind < 0.5 ? 0.045 * uScale : (aKind < 1.5 ? uHalo * uScale : max(aW, 0.012 * uScale));
    vec3 p = position;
    p.xz += aDir * aSide * w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_STRIP_FRAG = /* glsl */`
  uniform vec3 uGold;
  uniform vec3 uCyan;
  uniform vec3 uFill;
  uniform float uAlpha;
  uniform float uTime;
  varying float vSide;
  varying float vKind;
  varying float vU;
  void main() {
    float d = abs(vSide);
    float flow = pow(0.5 + 0.5 * sin(vU * 20.0 - uTime * 1.2), 14.0);
    vec3 col;
    float a;
    if (vKind < 0.5) {
      a = (1.0 - smoothstep(0.45, 1.0, d)) * (0.85 + 0.15 * flow);
      col = mix(uGold, vec3(1.0, 0.95, 0.78), flow * 0.6);
    } else if (vKind < 1.5) {
      a = pow(1.0 - d, 2.0) * 0.5;
      col = uCyan;
    } else {
      a = (1.0 - smoothstep(0.75, 1.0, d)) * (0.72 + 0.2 * flow);
      col = mix(uFill, vec3(1.0), flow * 0.4);
    }
    gl_FragColor = vec4(col, a * uAlpha);
  }
`;

// 地形网格（map-3d.js terrainGeo：电脑 352 段、手机 280 段）在格点之间是线性插值，比 DEM 本身平；
// 河谷处直接取 DEM 会沉到网格下面被挡住。这里按 PlaneGeometry 的三角剖分复算网格面高度，两种段数取高者。
const MAP_SPAN = 40.0 * (111.82 - 109.30) / 1.14; // 与 map-3d.js MAP_W/MAP_D 一致
function gridHeight(sample, x, z, seg) {
  const cell = MAP_SPAN / seg;
  const fx = (x + MAP_SPAN / 2) / cell;
  const fz = (z + MAP_SPAN / 2) / cell;
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const h = (i, k) => sample((ix + i) * cell - MAP_SPAN / 2, (iz + k) * cell - MAP_SPAN / 2);
  // PlaneGeometry 每格两三角：(a,b,d) 与 (b,c,d)，a=(0,0) b=(0,1) c=(1,1) d=(1,0)
  if (tx + tz <= 1) return h(0, 0) + (h(1, 0) - h(0, 0)) * tx + (h(0, 1) - h(0, 0)) * tz;
  return h(1, 1) + (h(0, 1) - h(1, 1)) * (1 - tx) + (h(1, 0) - h(1, 1)) * (1 - tz);
}

function wSmooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createCityWater({ THREE, scene, lonLatToWorld, sampleElevation, dataUrl = './map-water.json' }) {
  let data = null;
  let loading = false;
  let group = null;
  let time = 0;

  const common = {
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, // 须比 map-street.js 城区高清叠层（-3）更靠前，否则湖面被叠层挡住
  };
  const fillMat = new THREE.ShaderMaterial({
    vertexShader: WATER_FILL_VERT,
    fragmentShader: WATER_FILL_FRAG,
    uniforms: { uColor: { value: new THREE.Color('#2FA3B3') }, uAlpha: { value: 0 }, uTime: { value: 0 } },
    ...common,
  });
  const stripMat = new THREE.ShaderMaterial({
    vertexShader: WATER_STRIP_VERT,
    fragmentShader: WATER_STRIP_FRAG,
    uniforms: {
      uScale: { value: 1 }, uHalo: { value: 0.24 }, uAlpha: { value: 0 }, uTime: { value: 0 },
      uGold: { value: new THREE.Color('#D9A032') },
      uCyan: { value: new THREE.Color('#48C6CC') },
      uFill: { value: new THREE.Color('#5EC4CC') },
    },
    ...common,
    polygonOffsetFactor: -5, polygonOffsetUnits: -5,
  });

  function toWorld(arr) {
    const out = [];
    for (let i = 0; i < arr.length; i += 2) {
      const w = lonLatToWorld(data.o[0] + arr[i] / data.k, data.o[1] + arr[i + 1] / data.k);
      out.push({ x: w.x, z: w.z });
    }
    return out;
  }

  // 折线按 0.02 单位重采样，让带子跟着地形走
  function resample(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.02));
      for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function buildFill() {
    const pos = [];
    const idx = [];
    for (const poly of data.fill) {
      const rings = poly.map((r) => toWorld(r).map((p) => new THREE.Vector2(p.x, p.z)));
      const faces = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1));
      const base = pos.length / 3;
      for (const r of rings) for (const v of r) pos.push(v.x, 0, v.y);
      for (const f of faces) idx.push(base + f[0], base + f[1], base + f[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setIndex(idx);
    return g;
  }

  function buildStrips() {
    const pos = []; const dir = []; const side = []; const kind = []; const uu = []; const ww = []; const idx = [];
    const add = (pts, k, w) => {
      const N = pts.length;
      let u = 0;
      for (let i = 0; i < N; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(N - 1, i + 1)];
        let dx = next.x - prev.x;
        let dz = next.z - prev.z;
        const L = Math.hypot(dx, dz) || 1;
        dx /= L; dz /= L;
        if (i > 0) u += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
        const v0 = pos.length / 3;
        for (let s = -1; s <= 1; s += 2) {
          pos.push(pts[i].x, 0, pts[i].z);
          dir.push(-dz, dx);
          side.push(s); kind.push(k); uu.push(u); ww.push(w);
        }
        if (i < N - 1) idx.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2);
      }
    };
    const shores = data.shore.map((s) => resample(toWorld(s)));
    const lines = data.line.map(([wm, l]) => [wm, resample(toWorld(l))]);
    // 先晕后线：同一个 Mesh 里后画的盖在上面
    for (const s of shores) add(s, 1, 0);
    for (const [, l] of lines) add(l, 1, 0);
    for (const [wm, l] of lines) add(l, 2, wm * WATER_M * 0.5);
    for (const s of shores) add(s, 0, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(new Float32Array(dir), 2));
    g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(side), 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(kind), 1));
    g.setAttribute('aU', new THREE.BufferAttribute(new Float32Array(uu), 1));
    g.setAttribute('aW', new THREE.BufferAttribute(new Float32Array(ww), 1));
    g.setIndex(idx);
    return g;
  }

  function lift() {
    if (!group) return;
    for (const m of group.children) {
      const a = m.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i);
        const z = a.getZ(i);
        const y = Math.max(sampleElevation(x, z), gridHeight(sampleElevation, x, z, 352), gridHeight(sampleElevation, x, z, 280));
        a.setY(i, y + WATER_LIFT);
      }
      a.needsUpdate = true;
      m.geometry.computeBoundingSphere();
    }
  }

  function build() {
    group = new THREE.Group();
    const fill = new THREE.Mesh(buildFill(), fillMat);
    const strips = new THREE.Mesh(buildStrips(), stripMat);
    fill.renderOrder = 20;
    strips.renderOrder = 21;
    group.add(fill, strips);
    group.visible = false;
    lift();
    scene.add(group);
  }

  function load() {
    loading = true;
    fetch(dataUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.fill) { data = j; build(); } })
      .catch(() => {});
  }

  function update(zoom, dt) {
    if (!loading && zoom > WATER_SHOW_A * 0.85) load();
    if (!group) return;
    const vis = wSmooth(WATER_SHOW_A, WATER_SHOW_B, zoom);
    group.visible = vis > 0.01;
    if (!group.visible) return;
    time += dt;
    const bright = vis * (0.72 + 0.28 * wSmooth(2.5, 9, zoom));
    const s = 1 / Math.max(0.3, zoom);
    stripMat.uniforms.uScale.value = s;
    // 远景水面只有几像素宽，青晕放宽到 2.2 倍，让人一眼看出两江四湖的位置
    stripMat.uniforms.uHalo.value = 0.24 * (1 + 1.2 * (1 - wSmooth(3, 6, zoom)));
    stripMat.uniforms.uAlpha.value = bright;
    stripMat.uniforms.uTime.value = time;
    fillMat.uniforms.uAlpha.value = bright;
    fillMat.uniforms.uTime.value = time;
  }

  return { update, refresh: lift };
}
