// ============================================================================
// 灵川全境 · 3D 立体纸艺活地图引擎（Three.js 宣纸立雕沙盘 + 靠近弹起工笔立绘）
// 融合「宣纸全境立雕地图」美学与「纸艺长卷」的 3D 自由漫游、缩放与立绘铰链弹起交互
// ============================================================================

import { TOWNSHIPS, MAP_EXTRA_POIS, WATER_LABELS } from './map-townships.js';

const MAP_W = 27.0;
const MAP_D = 36.16; // 精确贴合 lingchuan-map-base.webp (896 x 1200)

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

class PopSpring {
  constructor(stiffness = 150, damping = 16.5) {
    this.k = stiffness;
    this.d = damping;
    this.p = 0;
    this.v = 0;
    this.target = 0;
  }
  step(dt) {
    const a = (this.target - this.p) * this.k - this.v * this.d;
    this.v += a * dt;
    this.p += this.v * dt;
    if (Math.abs(this.target - this.p) < 0.001 && Math.abs(this.v) < 0.001) {
      this.p = this.target;
      this.v = 0;
    }
    return this.p;
  }
}

/** 百分比坐标 (0..100) 映射到 3D 宣纸沙盘世界坐标 (x, z) */
export function pctToWorld(px, py) {
  return {
    x: (px / 100 - 0.5) * MAP_W,
    z: (py / 100 - 0.5) * MAP_D,
  };
}

/**
 * 温和真实的 3D 地形高度函数：匹配灵川全境立雕底图的山川走势
 * 西北兰田高峰隆起、青狮潭微微凹陷如碧玉镜湖、东侧海洋与东南大境山岭起伏、河谷平润
 */
function sampleElevation(wx, wz) {
  const nx = wx / (MAP_W * 0.5); // -1..1
  const nz = wz / (MAP_D * 0.5); // -1..1

  const g = (cx, cz, sx, sz, amp) => {
    const dx = (nx - cx) / sx;
    const dz = (nz - cz) / sz;
    return amp * Math.exp(-(dx * dx + dz * dz));
  };

  let h = 0.04;
  // 西北兰田瑶山峰峦
  h += g(-0.62, -0.64, 0.34, 0.30, 1.38);
  h += g(-0.74, -0.22, 0.28, 0.34, 1.08);
  // 青狮潭水库凹陷（平滑镜面湖盆）
  h -= g(-0.46, -0.44, 0.24, 0.22, 0.55);
  // 东北海洋山脉与银杏岭
  h += g(0.64, -0.34, 0.38, 0.34, 1.24);
  h += g(0.56, -0.08, 0.32, 0.28, 1.05);
  // 中南部山脊（灵川与潮田之间）
  h += g(0.24, 0.06, 0.26, 0.22, 0.72);
  // 东南大境高岭
  h += g(0.76, 0.44, 0.30, 0.30, 1.20);
  // 甘棠江 / 漓江 / 潮田河谷轻压平润
  h -= g(-0.08, 0.14, 0.24, 0.52, 0.22);
  h -= g(0.32, 0.32, 0.22, 0.24, 0.18);

  // 四边柔和回落到 0，无缝衔接宣纸桌底
  const edgeX = 1 - smoothstep(0.78, 0.99, Math.abs(nx));
  const edgeZ = 1 - smoothstep(0.80, 0.99, Math.abs(nz));
  return Math.max(0, h) * edgeX * edgeZ;
}

/** 围绕乡镇中心为多张立绘生成自然错落的 3D 摆放偏移（避免叠成一团） */
const RING_OFFSETS = [
  [0.0, -0.2],
  [-1.95, 0.85],
  [2.05, 0.65],
  [-1.35, -1.65],
  [1.65, -1.45],
  [0.25, 1.85],
  [-2.65, -0.55],
  [2.65, -0.35],
  [-0.95, 2.35],
];

/** 潮田乡专属精调偏移，让 6 张核心立绘完美对应桃花、柑橘、穿岩、古村、山村、舞狮位置 */
const CHAOTIAN_OFFSETS = {
  'lc-13': [-1.4, -1.15],          // 桃花岛
  'lc-14': [0.55, -1.75],          // 南圩穿岩
  'lc-15': [1.85, -0.35],          // 太平古村
  'lc-16': [1.25, 1.25],           // 潮田柑橘
  'poi-dashankou': [-1.55, 0.95],  // 大山口村 · 冰泉与傩祭
  'poi-chaotian-folk': [-0.15, 1.65], // 潮田节庆与桂北狮舞
};

/** 创建带柔和宣纸圆角白边的卡片式纸雕纹理（用于大山口村、舞狮等插画卡立绘） */
function buildFramedPaperTexture(THREE, img, maxAniso) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);

  // 底部手裁宣纸白边轮廓（拱形圆窗卡片感，与工笔镂空立绘浑然一体）
  const pad = 28;
  const w = 512 - pad * 2;
  const h = 446;
  const x = pad;
  const y = 36;
  const r = 46;

  g.save();
  g.shadowColor = 'rgba(42, 33, 22, 0.16)';
  g.shadowBlur = 12;
  g.shadowOffsetY = 4;
  g.fillStyle = '#FAF5EA';
  g.beginPath();
  g.roundRect(x - 12, y - 12, w + 24, h + 24, r + 10);
  g.fill();
  g.restore();

  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.clip();
  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    g.fillStyle = '#EAE0CC';
    g.fillRect(x, y, w, h);
  }
  g.restore();

  // 宣纸细墨边框
  g.strokeStyle = 'rgba(179, 38, 30, 0.34)';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(x + 2, y + 2, w - 4, h - 4, r - 2);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso || 4);
  return tex;
}

export function createInteractive3DMap({
  THREE,
  renderer,
  canvas,
  getViewport,
  images,
  landmarksById,
  makePaperMaterial,
  buildDieCutTexture,
  maxAniso,
  isMobile,
  onSelectLandmark,
  onSelectExtra,
  onFocusTownChange,
  onCameraZoomChange,
  onProjectUI,
  isModeActive,
  isBlockingOverlayOpen,
}) {
  const scene = new THREE.Scene();
  const PAPER_HEX = '#F5F0E3';
  scene.background = new THREE.Color(PAPER_HEX);
  scene.fog = new THREE.FogExp2(PAPER_HEX, 0.0085);

  const initView = getViewport();
  const camera = new THREE.PerspectiveCamera(40, initView.w / Math.max(1, initView.h), 0.5, 220);

  // 柔和晨光 + 宣纸天光（与立雕底图左上受光 100% 同向）
  const hemi = new THREE.HemisphereLight('#FFFDF8', '#D9CCB5', 1.18);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight('#FFF6E3', 1.48);
  keyLight.position.set(-16, 28, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  keyLight.shadow.camera.near = 6;
  keyLight.shadow.camera.far = 75;
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 24;
  keyLight.shadow.camera.bottom = -24;
  keyLight.shadow.bias = -0.0006;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#D9ECE7', 0.42);
  fillLight.position.set(18, 14, -14);
  scene.add(fillLight);

  // 1) 无限无缝宣纸桌底
  const tableGeo = new THREE.PlaneGeometry(360, 360);
  tableGeo.rotateX(-Math.PI / 2);
  const tableMat = new THREE.MeshBasicMaterial({ color: PAPER_HEX, fog: false });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.y = -0.08;
  scene.add(tableMesh);

  // 2) 3D 起伏宣纸立雕沙盘网格（带四边无缝羽化融纸）
  const terrainGeo = new THREE.PlaneGeometry(MAP_W, MAP_D, 72, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, sampleElevation(x, z));
  }
  terrainGeo.computeVertexNormals();

  // 使用 Canvas 生成带边缘羽化透明通道的宣纸立雕纹理，彻底消除任何矩形接缝
  const baseImg = images['map/lingchuan-map-base'];
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = baseImg ? Math.min(1024, baseImg.width) : 896;
  mapCanvas.height = baseImg ? Math.min(1372, baseImg.height) : 1200;
  const mg = mapCanvas.getContext('2d');
  if (baseImg) {
    mg.drawImage(baseImg, 0, 0, mapCanvas.width, mapCanvas.height);
  } else {
    mg.fillStyle = PAPER_HEX;
    mg.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  }
  // 边缘柔和羽化入宣纸底
  mg.globalCompositeOperation = 'destination-in';
  const fadeMask = document.createElement('canvas');
  fadeMask.width = mapCanvas.width;
  fadeMask.height = mapCanvas.height;
  const fg = fadeMask.getContext('2d');
  fg.fillStyle = '#000';
  fg.fillRect(0, 0, fadeMask.width, fadeMask.height);
  const edgeFeather = (grad) => {
    fg.globalCompositeOperation = 'destination-in';
    fg.fillStyle = grad;
    fg.fillRect(0, 0, fadeMask.width, fadeMask.height);
  };
  const gx = fg.createLinearGradient(0, 0, fadeMask.width, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)');
  gx.addColorStop(0.06, 'rgba(0,0,0,1)');
  gx.addColorStop(0.94, 'rgba(0,0,0,1)');
  gx.addColorStop(1, 'rgba(0,0,0,0)');
  edgeFeather(gx);
  const gy = fg.createLinearGradient(0, 0, 0, fadeMask.height);
  gy.addColorStop(0, 'rgba(0,0,0,0)');
  gy.addColorStop(0.06, 'rgba(0,0,0,1)');
  gy.addColorStop(0.94, 'rgba(0,0,0,1)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  edgeFeather(gy);
  mg.drawImage(fadeMask, 0, 0);

  const mapTex = new THREE.CanvasTexture(mapCanvas);
  mapTex.colorSpace = THREE.SRGBColorSpace;
  mapTex.anisotropy = Math.min(8, maxAniso || 4);

  const terrainMat = new THREE.MeshLambertMaterial({
    map: mapTex,
    transparent: true,
    color: new THREE.Color('#FFFCF7'),
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 3) 放置全部 34 处工笔纸艺立体弹起立绘（32 景 + 大山口村 + 潮田舞狮）
  const standees = [];
  const pickMeshes = [];
  const placedIds = new Set();

  function addMapStandee({ id, kind, title, category, townId, wx, wz, imgKey, entry, poi, featured, heightScale = 1 }) {
    if (placedIds.has(id)) return;
    placedIds.add(id);

    const wy = sampleElevation(wx, wz);
    const root = new THREE.Group();
    root.position.set(wx, wy, wz);

    // 宣纸折叠小底座片
    const tabGeo = new THREE.PlaneGeometry(1.15 * heightScale, 0.36 * heightScale);
    tabGeo.rotateX(-Math.PI / 2);
    const tabMat = new THREE.MeshLambertMaterial({
      color: '#F7F1E5',
      transparent: true,
      opacity: 0.75,
    });
    const tabMesh = new THREE.Mesh(tabGeo, tabMat);
    tabMesh.position.set(0, 0.03, 0.08);
    tabMesh.receiveShadow = true;
    root.add(tabMesh);

    const hingeGroup = new THREE.Group();
    // 初始平伏贴纸
    hingeGroup.rotation.x = -Math.PI * 0.48;
    root.add(hingeGroup);

    const scaleGroup = new THREE.Group();
    hingeGroup.add(scaleGroup);

    let frontTex;
    let backTex;
    let aspect = 1.0;

    if (imgKey.startsWith('map/')) {
      frontTex = buildFramedPaperTexture(THREE, images[imgKey], maxAniso);
      backTex = frontTex;
      aspect = 1.0;
    } else {
      const built = buildDieCutTexture(imgKey, { rim: true, kraftBack: false }, maxAniso);
      frontTex = built.tex;
      aspect = built.aspect || 1.0;
      backTex = buildDieCutTexture(imgKey, { rim: true, kraftBack: true, flipX: true }, maxAniso).tex;
    }

    const baseH = (featured ? 2.55 : 2.18) * heightScale;
    const baseW = baseH * clamp(aspect, 0.72, 1.38);

    const frontGeo = new THREE.PlaneGeometry(baseW, baseH);
    frontGeo.translate(0, baseH * 0.5, 0);
    const frontMat = makePaperMaterial({
      map: frontTex,
      transparent: true,
      alphaTest: 0.28,
      side: THREE.FrontSide,
      color: new THREE.Color('#ffffff'),
    });
    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    scaleGroup.add(frontMesh);

    const backGeo = new THREE.PlaneGeometry(baseW, baseH);
    backGeo.rotateY(Math.PI);
    backGeo.translate(0, baseH * 0.5, -0.035);
    const backMat = makePaperMaterial({
      map: backTex,
      transparent: true,
      alphaTest: 0.28,
      side: THREE.FrontSide,
      color: new THREE.Color('#ffffff'),
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    scaleGroup.add(backMesh);

    scene.add(root);

    const item = {
      id,
      kind,
      title,
      category,
      townId,
      wx,
      wy,
      wz,
      baseH,
      featured: Boolean(featured),
      entry,
      poi,
      root,
      hingeGroup,
      scaleGroup,
      tabMesh,
      frontMesh,
      frontMat,
      flap: new PopSpring(155, 16.5),
      hop: 0,
      phase: Math.random() * Math.PI * 2,
    };
    frontMesh.userData.mapStandee = item;
    pickMeshes.push(frontMesh);
    standees.push(item);
  }

  // 先种潮田乡专属 6 处核心立绘，再种其余 11 乡镇全部 32 景立绘
  const chaotianTown = TOWNSHIPS.find((t) => t.id === 'chaotian');
  const ctCenter = pctToWorld(chaotianTown.x, chaotianTown.y);
  for (const poiId of ['poi-dashankou', 'poi-chaotian-folk']) {
    const poi = MAP_EXTRA_POIS.find((p) => p.id === poiId);
    if (!poi) continue;
    const [ox, oz] = CHAOTIAN_OFFSETS[poiId] || [0, 0];
    const shortTitle = poiId === 'poi-dashankou' ? '大山口村' : '潮田狮舞民俗';
    addMapStandee({
      id: poi.id,
      kind: 'extra',
      title: shortTitle,
      category: poi.category,
      townId: 'chaotian',
      wx: ctCenter.x + ox,
      wz: ctCenter.z + oz,
      imgKey: poi.img,
      poi,
      featured: true,
      heightScale: 1.02,
    });
  }

  for (const town of TOWNSHIPS) {
    const center = pctToWorld(town.x, town.y);
    const lids = town.landmarks || [];
    lids.forEach((lid, idx) => {
      const entry = landmarksById.get(lid);
      if (!entry) return;
      let ox = 0;
      let oz = 0;
      if (town.id === 'chaotian' && CHAOTIAN_OFFSETS[lid]) {
        [ox, oz] = CHAOTIAN_OFFSETS[lid];
      } else {
        const slot = RING_OFFSETS[idx % RING_OFFSETS.length];
        ox = slot[0] * (town.id === 'daxu' ? 0.92 : 0.85);
        oz = slot[1] * (town.id === 'daxu' ? 0.92 : 0.85);
      }
      addMapStandee({
        id: lid,
        kind: 'landmark',
        title: entry.spec.title,
        category: entry.spec.category,
        townId: town.id,
        wx: clamp(center.x + ox, -MAP_W * 0.44, MAP_W * 0.44),
        wz: clamp(center.z + oz, -MAP_D * 0.44, MAP_D * 0.44),
        imgKey: entry.spec.img,
        entry,
        featured: idx === 0 || town.featured,
        heightScale: idx === 0 ? 1.0 : 0.9,
      });
    });
  }

  // 4) 地域氛围飘飞粒子（桃花瓣 / 海洋银杏叶 / 大境微雪 / 漓江青岚，随焦点区域自动切换）
  const PARTICLE_N = isMobile ? 75 : 130;
  const pPos = new Float32Array(PARTICLE_N * 3);
  const pVel = new Float32Array(PARTICLE_N * 3);
  const pSeed = new Float32Array(PARTICLE_N);
  for (let i = 0; i < PARTICLE_N; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * MAP_W * 0.85;
    pPos[i * 3 + 1] = 0.6 + Math.random() * 7.5;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * MAP_D * 0.85;
    pVel[i * 3] = (Math.random() - 0.5) * 0.45;
    pVel[i * 3 + 1] = -(0.22 + Math.random() * 0.35);
    pVel[i * 3 + 2] = 0.15 + Math.random() * 0.35;
    pSeed[i] = Math.random() * 6.28;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

  const pTexCanvas = document.createElement('canvas');
  pTexCanvas.width = 48;
  pTexCanvas.height = 48;
  const pg = pTexCanvas.getContext('2d');
  const pGrad = pg.createRadialGradient(24, 24, 2, 24, 24, 22);
  pGrad.addColorStop(0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  pGrad.addColorStop(1, 'rgba(255,255,255,0)');
  pg.fillStyle = pGrad;
  pg.beginPath();
  pg.ellipse(24, 24, 20, 14, 0.4, 0, Math.PI * 2);
  pg.fill();

  const pMat = new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(pTexCanvas),
    size: 0.42,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    color: new THREE.Color('#F0B8BF'),
  });
  const particleSystem = new THREE.Points(pGeo, pMat);
  scene.add(particleSystem);

  const REGION_COLORS = {
    chaotian: new THREE.Color('#F2B2BA'), // 桃花粉
    haiyang: new THREE.Color('#E3AF3D'),  // 银杏金
    dajing: new THREE.Color('#DCEAF2'),   // 雾凇雪青
    lantian: new THREE.Color('#F2C272'),  // 瑶灯暖金
    lingtian: new THREE.Color('#F0BC68'), // 牌灯暖黄
    default: new THREE.Color('#97BEB5'),  // 青绿水岚
  };
  const curParticleCol = REGION_COLORS.default.clone();

  // 5) 自由滑动 + 惯性 + 双指缩放 + 滚轮俯冲相机状态
  const townWorlds = TOWNSHIPS.map((t) => {
    const w = pctToWorld(t.x, t.y);
    return { town: t, wx: w.x, wy: sampleElevation(w.x, w.z), wz: w.z };
  });
  const waterWorlds = WATER_LABELS.map((w) => {
    const p = pctToWorld(w.x, w.y);
    return { ...w, wx: p.x, wy: sampleElevation(p.x, p.z) + 0.12, wz: p.z };
  });

  const camState = {
    tx: 0,
    tz: 0.6,
    targetTx: 0,
    targetTz: 0.6,
    vx: 0,
    vz: 0,
    zoom: 1.0,       // 1.0 = 全境俯瞰, 2.2~3.5 = 立体长卷近览弹起立绘!
    targetZoom: 1.0,
    category: 'all',
    nearestTownId: 'chaotian',
    lockedTownId: null,
    lastReportedZoom: 1.0,
  };

  function getPanBounds(z) {
    // 缩小全境时允许轻柔偏移，放大后可畅游全县每一个角落
    const factor = clamp((z - 0.85) / 1.4, 0.28, 1.05);
    return {
      maxX: MAP_W * 0.44 * factor,
      maxZ: MAP_D * 0.44 * factor,
    };
  }

  function flyToTown(townId, zoomLevel = 2.45) {
    const tw = townWorlds.find((x) => x.town.id === townId);
    if (!tw) return;
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = townId;
    camState.targetTx = tw.wx;
    camState.targetTz = tw.wz;
    camState.targetZoom = clamp(zoomLevel, 1.0, 3.6);
    if (camState.nearestTownId !== townId) {
      camState.nearestTownId = townId;
      onFocusTownChange?.(townId);
    }
  }

  function resetOverview() {
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = null;
    camState.targetTx = 0;
    camState.targetTz = 0.6;
    camState.targetZoom = 1.0;
  }

  function nudgeZoom(delta) {
    camState.targetZoom = clamp(camState.targetZoom + delta, 1.0, 3.6);
    if (camState.targetZoom <= 1.05) {
      camState.targetTx = lerp(camState.targetTx, 0, 0.5);
      camState.targetTz = lerp(camState.targetTz, 0.6, 0.5);
      camState.lockedTownId = null;
    }
  }

  function setCategory(cat) {
    camState.category = cat || 'all';
  }

  // 6) 1:1 跟手单指拖拽（带惯性）+ 双指捏合缩放 + 滚轮缩放 + 3D 立绘精准点选
  const pointers = new Map();
  let dragMoved = false;
  let downX = 0;
  let downY = 0;
  let lastMoveTime = performance.now();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const projV = new THREE.Vector3();

  function getWorldPerPixel() {
    const { h } = getViewport();
    const dist = computeCamDistance(camState.zoom, getViewport());
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * dist;
    return visibleH / Math.max(320, h);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture?.(e.pointerId);
    camState.vx = 0;
    camState.vz = 0;
    lastMoveTime = performance.now();

    if (pointers.size === 1) {
      dragMoved = false;
      downX = e.clientX;
      downY = e.clientY;
    } else if (pointers.size === 2) {
      dragMoved = true;
      const pts = Array.from(pointers.values());
      pinchStartDist = Math.max(12, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      pinchStartZoom = camState.targetZoom;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    if (!pointers.has(e.pointerId)) return;

    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.max(12, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      camState.targetZoom = clamp(pinchStartZoom * (dist / pinchStartDist), 1.0, 3.6);
      return;
    }

    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) {
      dragMoved = true;
      camState.lockedTownId = null;
    }

    const now = performance.now();
    const moveDt = clamp((now - lastMoveTime) / 1000, 0.006, 0.08);
    lastMoveTime = now;

    const wpp = getWorldPerPixel();
    const wxDelta = -dx * wpp * 1.05;
    const wzDelta = -dy * wpp * 1.28;
    const bounds = getPanBounds(camState.targetZoom);
    camState.targetTx = clamp(camState.targetTx + wxDelta, -bounds.maxX, bounds.maxX);
    camState.targetTz = clamp(camState.targetTz + wzDelta, -bounds.maxZ, bounds.maxZ);
    camState.vx = lerp(camState.vx, wxDelta / moveDt, 0.45);
    camState.vz = lerp(camState.vz, wzDelta / moveDt, 0.45);
  });

  function onPointerFinish(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size === 0 && isModeActive() && !isBlockingOverlayOpen()) {
      const since = (performance.now() - lastMoveTime) / 1000;
      if (!dragMoved) {
        // 3D Raycaster 精准点选立起来的纸雕立绘！
        const { w, h } = getViewport();
        ndc.set((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(pickMeshes, false);
        let picked = null;
        for (const hit of hits) {
          const st = hit.object.userData.mapStandee;
          if (!st || st.flap.p < 0.22) continue;
          picked = st;
          break;
        }
        if (picked) {
          picked.hop = 1.0;
          camState.targetTx = picked.wx;
          camState.targetTz = picked.wz;
          if (camState.targetZoom < 2.2) camState.targetZoom = 2.35;
          if (picked.kind === 'landmark' && picked.entry) {
            onSelectLandmark?.(picked.entry);
          } else if (picked.kind === 'extra' && picked.poi) {
            onSelectExtra?.(picked.poi);
          }
        }
      } else if (since < 0.09) {
        // 保留柔和脱手惯性
        camState.vx = clamp(camState.vx, -28, 28);
        camState.vz = clamp(camState.vz, -28, 28);
      } else {
        camState.vx = 0;
        camState.vz = 0;
      }
    }
  }
  canvas.addEventListener('pointerup', onPointerFinish);
  canvas.addEventListener('pointercancel', onPointerFinish);

  canvas.addEventListener('wheel', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    camState.targetZoom = clamp(camState.targetZoom * factor, 1.0, 3.6);
    if (camState.targetZoom <= 1.04) {
      camState.targetTx = lerp(camState.targetTx, 0, 0.3);
      camState.targetTz = lerp(camState.targetTz, 0.6, 0.3);
      camState.lockedTownId = null;
    }
  }, { passive: false });

  function computeCamDistance(zoom, view) {
    const aspect = view.w / Math.max(1, view.h);
    const fov = aspect < 0.75 ? 45 : 38;
    const vTan = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
    const hTan = vTan * aspect;
    // 动态保底水平视野覆盖全部 12 乡镇（从西边兰田/九屋到东边海洋/大境一屏尽览！）
    const fitWidthDist = 14.2 / Math.max(0.16, hTan);
    const fitHeightDist = 17.8 / Math.max(0.28, vTan);
    const baseDist = Math.max(41.0, fitWidthDist, fitHeightDist * 0.88);
    // 放大到 zoom = 2.55 时推近到与手机/桌面一致的 14~16m 立体长卷微缩距离
    const closeDist = aspect < 0.75 ? 16.5 : 14.5;
    const zT = clamp((zoom - 1.0) / 1.8, 0, 1);
    const smoothT = zT * zT * (3 - 2 * zT);
    const targetDist = lerp(baseDist, closeDist, smoothT);
    return zoom > 2.8 ? targetDist * (2.8 / zoom) : targetDist;
  }

  function resize(w, h) {
    camera.aspect = w / Math.max(1, h);
    camera.fov = w / Math.max(1, h) < 0.75 ? 45 : 38;
    camera.updateProjectionMatrix();
  }

  // 7) 每帧更新与渲染：镜头俯冲、纸艺长卷式立绘铰链弹起、地域微粒子、3D->2D 实时标签投影
  const projectedTowns = [];
  const projectedWaters = [];
  const projectedStandees = [];

  function updateAndRender(dt, time) {
    const view = getViewport();
    const desiredAspect = view.w / Math.max(1, view.h);
    if (Math.abs(camera.aspect - desiredAspect) > 0.01) resize(view.w, view.h);

    // 脱手顺滑惯性滑行 + 边界柔夹
    if (pointers.size === 0 && (Math.abs(camState.vx) > 0.04 || Math.abs(camState.vz) > 0.04)) {
      const bounds = getPanBounds(camState.targetZoom);
      camState.targetTx = clamp(camState.targetTx + camState.vx * dt, -bounds.maxX, bounds.maxX);
      camState.targetTz = clamp(camState.targetTz + camState.vz * dt, -bounds.maxZ, bounds.maxZ);
      const decay = Math.exp(-5.4 * dt);
      camState.vx *= decay;
      camState.vz *= decay;
    }

    const followK = 1 - Math.exp(-8.5 * dt);
    camState.tx = lerp(camState.tx, camState.targetTx, followK);
    camState.tz = lerp(camState.tz, camState.targetTz, followK);
    camState.zoom = lerp(camState.zoom, camState.targetZoom, followK);

    // 桌面宽屏把地图视觉中心微微左移一点，让右侧宣纸侧笺完美留白
    const deskShiftX = view.w >= 920 ? (4.4 / Math.pow(camState.zoom, 0.75)) : 0;
    const dist = computeCamDistance(camState.zoom, view);
    // 远观全境 62° 清晰俯瞰；放大推近时自动压低至 34°「纸艺长卷」沉浸仰望视角！
    const zoomT = smoothstep(1.05, 2.55, camState.zoom);
    const pitchRad = THREE.MathUtils.degToRad(lerp(62, 34, zoomT));

    const lookX = camState.tx + deskShiftX;
    const lookZ = camState.tz;
    const lookY = sampleElevation(camState.tx, camState.tz) * 0.45 + lerp(0.1, 0.55, zoomT);

    camera.position.set(
      lookX,
      lookY + Math.sin(pitchRad) * dist,
      lookZ + Math.cos(pitchRad) * dist
    );
    camera.lookAt(lookX, lookY, lookZ - lerp(0, 1.1, zoomT));

    // 查找当前焦点最近的乡镇（自动驱动右侧/底部风物浮条与地域粒子色彩）
    let bestTown = townWorlds[0];
    let bestDistSq = Infinity;
    for (const tw of townWorlds) {
      const dx = tw.wx - camState.tx;
      const dz = tw.wz - camState.tz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestTown = tw;
      }
    }
    const focusTownId = camState.lockedTownId || bestTown.town.id;
    if (focusTownId !== camState.nearestTownId) {
      camState.nearestTownId = focusTownId;
      onFocusTownChange?.(focusTownId);
    }

    if (Math.abs(camState.zoom - camState.lastReportedZoom) > 0.04) {
      camState.lastReportedZoom = camState.zoom;
      onCameraZoomChange?.(camState.zoom);
    }

    // 核心长卷魔法：靠近焦点 OR 放大推近 OR 选中分类 -> 立绘弹簧铰链咔哒站起！
    const popRadius = lerp(5.4, 9.8, zoomT);
    const cat = camState.category;

    projectedStandees.length = 0;

    for (const st of standees) {
      const dx = st.wx - camState.tx;
      const dz = st.wz - camState.tz;
      const d = Math.hypot(dx, dz);
      const catMatch = cat === 'all' || st.category === cat;

      let targetPop = 0;
      if (!catMatch) {
        targetPop = 0;
      } else if (camState.zoom > 1.24) {
        // 放大浏览时：焦点半径内的立绘全部优雅站起，像立体书在脚下徐徐展开！
        if (d < popRadius) {
          targetPop = 1.0;
        } else if (d < popRadius + 3.2) {
          targetPop = 0.35 * (1 - (d - popRadius) / 3.2);
        }
      } else {
        // 全境俯瞰时：若开启分类筛选，则高亮该分类立绘微微探头；否则仅当前焦点乡镇代表立绘轻启，保持全境清雅通透
        if (cat !== 'all') {
          targetPop = st.featured ? 0.72 : 0.42;
        } else if (st.townId === focusTownId && st.featured) {
          targetPop = 0.68;
        } else if (d < 4.2 && st.featured) {
          targetPop = 0.48;
        } else {
          targetPop = 0;
        }
      }

      st.flap.target = targetPop;
      const p = clamp(st.flap.step(dt), 0, 1.15);

      const vis = p > 0.03;
      st.root.visible = vis;
      if (!vis) continue;

      // 铰链角度：-86°（平伏贴纸） -> 0°（立体站直）+ 轻柔呼吸微晃
      const breath = Math.sin(time * 1.9 + st.phase) * 0.025 * p;
      st.hingeGroup.rotation.x = lerp(-Math.PI * 0.48, 0, clamp(p, 0, 1)) + breath;

      // 微微面向镜头偏转，增强 3D 纸雕立体可读性
      const faceYaw = Math.atan2(camera.position.x - st.wx, Math.max(4.0, camera.position.z - st.wz));
      st.root.rotation.y = clamp(faceYaw * 0.35, -0.32, 0.32);

      // 点选欢快微跃
      if (st.hop > 0.005) {
        st.hop *= Math.exp(-7.5 * dt);
      } else {
        st.hop = 0;
      }
      const sc = lerp(0.55, 1.0, smoothstep(0.05, 0.85, p)) * (1 + st.hop * 0.14);
      st.scaleGroup.scale.setScalar(sc);
      st.root.position.y = st.wy + st.hop * 0.36;
      st.tabMesh.material.opacity = clamp(p * 0.85, 0, 0.82);

      // 收集完全立起的立绘用于屏幕防重叠纸签投影
      if (p > 0.58 && (camState.zoom > 1.32 || cat !== 'all')) {
        projV.set(st.wx, st.wy + st.baseH * sc + 0.28, st.wz).project(camera);
        if (projV.z > 0.05 && projV.z < 0.992) {
          const sx = (projV.x * 0.5 + 0.5) * view.w;
          const sy = (-projV.y * 0.5 + 0.5) * view.h;
          if (sx > 28 && sx < view.w - 28 && sy > 84 && sy < view.h - 110) {
            projectedStandees.push({
              id: st.id,
              kind: st.kind,
              title: st.title,
              featured: st.featured,
              sx,
              sy,
              dist: d,
            });
          }
        }
      }
    }

    // 地域氛围飘飞粒子更新
    const targetCol = REGION_COLORS[focusTownId] || REGION_COLORS.default;
    curParticleCol.lerp(targetCol, 1 - Math.exp(-3.0 * dt));
    pMat.color.copy(curParticleCol);
    pMat.opacity = lerp(0.28, 0.72, zoomT);

    const posArr = pGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_N; i++) {
      const ix = i * 3;
      posArr[ix] += (pVel[ix] + Math.sin(time * 0.9 + pSeed[i]) * 0.28) * dt;
      posArr[ix + 1] += pVel[ix + 1] * dt;
      posArr[ix + 2] += (pVel[ix + 2] + Math.cos(time * 0.75 + pSeed[i]) * 0.22) * dt;
      if (posArr[ix + 1] < 0.25) {
        posArr[ix] = camState.tx + (Math.random() - 0.5) * 20;
        posArr[ix + 1] = 5.5 + Math.random() * 4.5;
        posArr[ix + 2] = camState.tz + (Math.random() - 0.5) * 20;
      }
    }
    pGeo.attributes.position.needsUpdate = true;

    // 渲染 3D 宣纸立雕沙盘
    renderer.render(scene, camera);

    // 投影 12 个乡镇与水系题字到屏幕 2D（每帧零抖动贴合 3D 山川）
    projectedTowns.length = 0;
    for (const tw of townWorlds) {
      projV.set(tw.wx, tw.wy + 0.22, tw.wz).project(camera);
      const visible = projV.z > 0.05 && projV.z < 0.995;
      projectedTowns.push({
        id: tw.town.id,
        sx: (projV.x * 0.5 + 0.5) * view.w,
        sy: (-projV.y * 0.5 + 0.5) * view.h,
        visible,
      });
    }

    projectedWaters.length = 0;
    for (const w of waterWorlds) {
      projV.set(w.wx, w.wy, w.wz).project(camera);
      projectedWaters.push({
        sx: (projV.x * 0.5 + 0.5) * view.w,
        sy: (-projV.y * 0.5 + 0.5) * view.h,
        visible: projV.z > 0.05 && projV.z < 0.995 && camState.zoom < 2.2,
      });
    }

    projectedStandees.sort((a, b) => a.dist - b.dist);

    onProjectUI?.({
      towns: projectedTowns,
      waters: projectedWaters,
      standees: projectedStandees,
      zoom: camState.zoom,
      focusTownId,
    });
  }

  function triggerStandeeById(kind, id) {
    const st = standees.find((x) => x.id === id);
    if (st) {
      st.hop = 1.0;
      camState.targetTx = st.wx;
      camState.targetTz = st.wz;
      if (camState.targetZoom < 2.3) camState.targetZoom = 2.45;
      if (st.kind === 'landmark' && st.entry) onSelectLandmark?.(st.entry);
      else if (st.kind === 'extra' && st.poi) onSelectExtra?.(st.poi);
    }
  }

  return {
    updateAndRender,
    resize,
    flyToTown,
    resetOverview,
    nudgeZoom,
    setCategory,
    triggerStandeeById,
    getState: () => ({ ...camState }),
  };
}
