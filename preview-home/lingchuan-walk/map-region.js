// ============================================================================
// 县区高光：聚焦某县区时沿真实边界描一道朱砂线，线内一圈淡金晕向里化开
// 边界数据：map-bounds.json（scripts/build-guilin-bounds.py 生成）
// 线宽随缩放换算，屏幕上始终约 3px 线 + 36px 晕
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
  }

  return { setTown, update, refresh };
}
