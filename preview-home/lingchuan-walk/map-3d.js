// ============================================================================
// 灵川全境 · 真实 30m DEM 3D 立体纸艺活地图引擎（Three.js + 高清分块瓦片 LOD + 真地图定点缩放）
// 1. 统一真实 WGS84 等角墨卡托投影（与 scripts/build-lingchuan-dem.py / map-geo.json 100% 同步）
// 2. 真实 30m DEM 地形网格 + L0 (1536x2048) + 3x4 高清分块瓦片 (1024x1024) 动态视锥加载（放大 4x~6x 零模糊）
// 3. 真地图手势：Ray-Plane 1:1 地面拖拽、光标/双指中点定点缩放 (0.85x~6.0x)、双击平滑放大、脱手惯性
// 4. 三级语义缩放 LOD + 全部 76 处工笔立绘（34 一级 + 42 新增二级按需懒加载）弹簧铰链弹起
// ============================================================================

import { TOWNSHIPS, MAP_EXTRA_POIS, GROK_EXTRA_42, WATER_LABELS } from './map-townships.js';

const MAP_W = 27.0;
const MAP_D = 36.0; // 精确 3:4，匹配 3072x4096 真实 DEM 母版与 3x4 1024x1024 高清瓦片

// 真实 WGS84 Web Mercator 投影参数（与 map-geo.json 比特级一致）
const LON_MIN = 110.045;
const LON_MAX = 110.835;
const LAT_CENTER = 25.405;
const DEG2RAD = Math.PI / 180;

function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI * 0.25 + latDeg * DEG2RAD * 0.5));
}

const MX_MIN = LON_MIN * DEG2RAD;
const MX_MAX = LON_MAX * DEG2RAD;
const MY_SPAN = (MX_MAX - MX_MIN) * (MAP_D / MAP_W);
const MY_CENTER = mercY(LAT_CENTER);
const MY_MAX = MY_CENTER + MY_SPAN * 0.5;
const MY_MIN = MY_CENTER - MY_SPAN * 0.5;

// 实测东西地理宽度约 79.4 km -> 1 世界单位 ≈ 2.941 km
const REAL_WIDTH_KM = (LON_MAX - LON_MIN) * 111.32 * Math.cos(LAT_CENTER * DEG2RAD);
const KM_PER_WORLD_UNIT = REAL_WIDTH_KM / MAP_W;

const TILE_COLS = 3;
const TILE_ROWS = 4;
const MIN_ZOOM = 0.85;
const MAX_ZOOM = 6.0;
const MAX_DEM_HEIGHT = 1.72; // 真实山峦在 3D 宣纸桌面上的优雅雕塑高度

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

/** 真实 WGS84 经纬度 -> 3D 宣纸沙盘世界坐标 (x, z) 与归一化 UV (u, v) */
export function lonLatToWorld(lon, lat) {
  const u = (lon * DEG2RAD - MX_MIN) / (MX_MAX - MX_MIN);
  const v = (MY_MAX - mercY(lat)) / (MY_MAX - MY_MIN);
  return {
    x: (u - 0.5) * MAP_W,
    z: (v - 0.5) * MAP_D,
    u,
    v,
  };
}

/** 兼容百分比坐标转换 */
export function pctToWorld(px, py) {
  return {
    x: (px / 100 - 0.5) * MAP_W,
    z: (py / 100 - 0.5) * MAP_D,
  };
}

class PopSpring {
  constructor(stiffness = 155, damping = 16.5) {
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

/** 32 原景精确真实地理落位（经纬度基于乡镇中心 + 真实村景方位，确保全县分布精准自然） */
const LANDMARK_COORDS = {
  // 大圩镇 (110.4105, 25.1820)
  'lc-01': [110.4120, 25.1845], // 大圩古镇
  'lc-02': [110.4190, 25.1775], // 万寿桥
  'lc-03': [110.4025, 25.1660], // 毛洲岛
  'lc-04': [110.4310, 25.1995], // 东漓古村
  'lc-05': [110.4480, 25.1585], // 古东瀑布
  'lc-06': [110.4345, 25.1745], // 东漓腐竹 / 手作
  'lc-07': [110.3910, 25.1885], // 大圩草莓岛
  'lc-32': [110.4535, 25.1940], // 熊村古圩与彩调
  // 海洋乡 (110.5631, 25.3092)
  'lc-08': [110.5631, 25.3092], // 海洋银杏
  'lc-09': [110.5840, 25.3245], // 画眉弄银杏
  'lc-10': [110.5425, 25.3220], // 白果老鸭汤
  // 大境瑶族乡 (110.5789, 25.2036)
  'lc-11': [110.5855, 25.2265], // 大境雾凇
  'lc-12': [110.5665, 25.1890], // 大野神境
  'lc-30': [110.5760, 25.2036], // 大境瑶族服饰
  'lc-33': [110.6010, 25.1975], // 五色糯米饭
  'lc-34': [110.5520, 25.2005], // 林下仿野生灵芝
  // 潮田乡 (110.5090, 25.1997)
  'lc-13': [110.4955, 25.2065], // 桃花岛
  'lc-14': [110.5140, 25.2205], // 南圩穿岩
  'lc-15': [110.5250, 25.1955], // 太平古村
  'lc-16': [110.5050, 25.1815], // 潮田柑橘
  // 潭下镇 (110.2843, 25.4551)
  'lc-17': [110.2843, 25.4551], // 潭下砂糖桔
  // 定江镇 (110.2998, 25.3377)
  'lc-19': [110.2998, 25.3377], // 八里街夜市
  // 三街镇 (110.3867, 25.4689)
  'lc-20': [110.3867, 25.4689], // 三街古圩
  // 灵川镇 (110.3152, 25.3976)
  'lc-22': [110.3152, 25.3976], // 甘棠公园
  'lc-23': [110.3265, 25.3880], // 千年桂林
  // 九屋镇 & 公平乡
  'lc-24': [110.2375, 25.5150], // 江头村爱莲家祠
  'lc-26': [110.2055, 25.5540], // 青狮潭碧湖
  'lc-27': [110.2155, 25.5245], // 龙门瀑布
  // 灵田镇 (110.4702, 25.3482)
  'lc-25': [110.4702, 25.3482], // 长岗岭古商道
  'lc-28': [110.4600, 25.3600], // 灵田走牌灯
  // 兰田瑶族乡 (110.1980, 25.6092)
  'lc-29': [110.1980, 25.6092], // 兰田糯禾舞草龙
  'lc-31': [110.1860, 25.6050], // 兰田瑶族服饰
};

const EXTRA_CORE_COORDS = {
  'poi-dashankou': [110.4895, 25.1820],
  'poi-chaotian-folk': [110.5110, 25.1975],
};

/** 创建带柔和宣纸圆角白边的卡片式纸雕纹理（用于大山口村、舞狮等插画卡立绘） */
function buildFramedPaperTexture(THREE, img, maxAniso) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);

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

/** 从动态懒加载的透明工笔 PNG/WebP 生成手裁宣纸白边纸雕纹理（与 app.js buildDieCutTexture 风格 100% 统一） */
function buildLazyDieCutTexture(THREE, img, { rim = true, kraftBack = false, flipX = false } = {}, maxAniso = 4) {
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const iw = Math.max(2, Math.round((img.width || 400) * scale));
  const ih = Math.max(2, Math.round((img.height || 400) * scale));
  const pad = rim ? 14 : 4;
  const cw = iw + pad * 2;
  const ch = ih + pad * 2;

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  g.clearRect(0, 0, cw, ch);

  if (rim) {
    // Draw crisp warm xuan-paper die-cut silhouette rim
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const og = off.getContext('2d');
    og.save();
    if (flipX) {
      og.translate(cw, 0);
      og.scale(-1, 1);
    }
    og.drawImage(img, pad, pad, iw, ih);
    og.restore();
    og.globalCompositeOperation = 'source-in';
    og.fillStyle = kraftBack ? '#EFE6D4' : '#FAF5E8';
    og.fillRect(0, 0, cw, ch);

    const rad = 5.5;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      g.drawImage(off, Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
  }

  g.save();
  if (flipX) {
    g.translate(cw, 0);
    g.scale(-1, 1);
  }
  if (kraftBack) {
    g.globalAlpha = 0.22;
    g.drawImage(img, pad, pad, iw, ih);
  } else {
    g.drawImage(img, pad, pad, iw, ih);
  }
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso || 4);
  return { tex, aspect: cw / Math.max(1, ch) };
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
  scene.fog = new THREE.FogExp2(PAPER_HEX, 0.0068);

  const initView = getViewport();
  const camera = new THREE.PerspectiveCamera(40, initView.w / Math.max(1, initView.h), 0.35, 260);
  const simCamera = new THREE.PerspectiveCamera(40, initView.w / Math.max(1, initView.h), 0.35, 260);

  // 柔和晨光 + 宣纸天光（与真实 DEM 左上受光 100% 同向）
  const hemi = new THREE.HemisphereLight('#FFFDF8', '#DDD1BC', 1.24);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight('#FFF7E6', 1.38);
  keyLight.position.set(-18, 30, 14);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  keyLight.shadow.camera.near = 6;
  keyLight.shadow.camera.far = 85;
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 24;
  keyLight.shadow.camera.bottom = -24;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#DAEBE6', 0.44);
  fillLight.position.set(18, 15, -14);
  scene.add(fillLight);

  // --------------------------------------------------------------------------
  // 1) 真实 30m DEM 高度采样器（加载 lingchuan-dem-height.png 后无缝升级全部网格高度）
  // --------------------------------------------------------------------------
  let demGrid = null;
  let demW = 0;
  let demH = 0;

  function sampleElevation(wx, wz) {
    const u = clamp(wx / MAP_W + 0.5, 0, 1);
    const v = clamp(wz / MAP_D + 0.5, 0, 1);
    if (demGrid && demW > 1 && demH > 1) {
      const fx = u * (demW - 1);
      const fy = v * (demH - 1);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(demW - 1, x0 + 1);
      const y1 = Math.min(demH - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;
      const h00 = demGrid[y0 * demW + x0];
      const h10 = demGrid[y0 * demW + x1];
      const h01 = demGrid[y1 * demW + x0];
      const h11 = demGrid[y1 * demW + x1];
      const h = lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), ty);
      return h * MAX_DEM_HEIGHT;
    }
    // 加载前 100ms 内的温和默认地形过渡
    const edge = smoothstep(0.02, 0.14, u) * smoothstep(0.02, 0.14, 1 - u) *
                 smoothstep(0.02, 0.14, v) * smoothstep(0.02, 0.14, 1 - v);
    return 0.18 * edge;
  }

  // --------------------------------------------------------------------------
  // 2) 无限无缝宣纸桌底 + 真实 DEM 3D 主沙盘 (L0 1536x2048)
  // --------------------------------------------------------------------------
  const tableGeo = new THREE.PlaneGeometry(420, 420);
  tableGeo.rotateX(-Math.PI / 2);
  const tableMat = new THREE.MeshBasicMaterial({ color: PAPER_HEX, fog: false });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.y = -0.06;
  scene.add(tableMesh);

  // 程序化四边柔边 alphaMap：让 3D 沙盘边缘 100% 柔和融进无限 #F5F0E3 宣纸桌底，零矩形接缝
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = 128;
  alphaCanvas.height = 128;
  const ag = alphaCanvas.getContext('2d');
  ag.fillStyle = '#FFFFFF';
  ag.fillRect(0, 0, 128, 128);
  const fadeSide = (grad) => {
    ag.globalCompositeOperation = 'destination-in';
    ag.fillStyle = grad;
    ag.fillRect(0, 0, 128, 128);
  };
  const ax = ag.createLinearGradient(0, 0, 128, 0);
  ax.addColorStop(0, 'rgba(0,0,0,0)');
  ax.addColorStop(0.10, 'rgba(0,0,0,1)');
  ax.addColorStop(0.90, 'rgba(0,0,0,1)');
  ax.addColorStop(1, 'rgba(0,0,0,0)');
  fadeSide(ax);
  const ay = ag.createLinearGradient(0, 0, 0, 128);
  ay.addColorStop(0, 'rgba(0,0,0,0)');
  ay.addColorStop(0.10, 'rgba(0,0,0,1)');
  ay.addColorStop(0.90, 'rgba(0,0,0,1)');
  ay.addColorStop(1, 'rgba(0,0,0,0)');
  fadeSide(ay);
  // AlphaMap in Three.js reads green channel, so flatten transparent pixels onto black
  const alphaFlat = document.createElement('canvas');
  alphaFlat.width = 128;
  alphaFlat.height = 128;
  const afg = alphaFlat.getContext('2d');
  afg.fillStyle = '#000000';
  afg.fillRect(0, 0, 128, 128);
  afg.drawImage(alphaCanvas, 0, 0);
  const terrainAlphaMap = new THREE.CanvasTexture(alphaFlat);

  const terrainGeo = new THREE.PlaneGeometry(MAP_W, MAP_D, 112, 148);
  terrainGeo.rotateX(-Math.PI / 2);

  function applyDemToPlaneGeo(geo, yOffset = 0) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, sampleElevation(x, z) + yOffset);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  applyDemToPlaneGeo(terrainGeo, 0);

  // L0 全境高清纹理（优先使用真实 30m DEM 渲染的 lingchuan-dem-l0.webp）
  const texLoader = new THREE.TextureLoader();
  const baseImg = images['map/lingchuan-dem-l0'] || images['map/lingchuan-map-base'];
  let l0Tex;
  if (baseImg) {
    l0Tex = new THREE.Texture(baseImg);
    l0Tex.needsUpdate = true;
  } else {
    l0Tex = texLoader.load('./img/map/lingchuan-dem-l0.webp');
  }
  l0Tex.colorSpace = THREE.SRGBColorSpace;
  l0Tex.anisotropy = Math.min(8, maxAniso || 4);
  l0Tex.minFilter = THREE.LinearMipmapLinearFilter;
  l0Tex.magFilter = THREE.LinearFilter;

  const terrainMat = new THREE.MeshLambertMaterial({
    map: l0Tex,
    alphaMap: terrainAlphaMap,
    transparent: true,
    color: new THREE.Color('#FFFDF9'),
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // --------------------------------------------------------------------------
  // 3) 3x4 高清分块瓦片 LOD 子网格系统 (每片 1024x1024，放大 4x~6x 刀锋锐利零模糊！)
  // --------------------------------------------------------------------------
  const tileGroup = new THREE.Group();
  scene.add(tileGroup);

  const tileW = MAP_W / TILE_COLS;
  const tileD = MAP_D / TILE_ROWS;
  const tiles = [];

  for (let r = 0; r < TILE_ROWS; r++) {
    for (let c = 0; c < TILE_COLS; c++) {
      const cx = -MAP_W * 0.5 + (c + 0.5) * tileW;
      const cz = -MAP_D * 0.5 + (r + 0.5) * tileD;
      tiles.push({
        r,
        c,
        cx,
        cz,
        url: `./img/map/tiles/tile-${r}-${c}.webp`,
        state: 'idle', // idle | loading | ready | error
        mesh: null,
        mat: null,
        geo: null,
      });
    }
  }

  function ensureTileLoaded(tile) {
    if (tile.state !== 'idle') return;
    tile.state = 'loading';
    texLoader.load(
      tile.url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, maxAniso || 4);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;

        const geo = new THREE.PlaneGeometry(tileW, tileD, 28, 28);
        geo.rotateX(-Math.PI / 2);
        // Shift vertices into exact world coordinates so sampleElevation aligns 100% with base mesh
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i) + tile.cx;
          const wz = pos.getZ(i) + tile.cz;
          pos.setXYZ(i, wx, sampleElevation(wx, wz) + 0.012, wz);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({
          map: tex,
          color: new THREE.Color('#FFFDF9'),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1.5,
          polygonOffsetUnits: -2.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.visible = false;
        tileGroup.add(mesh);

        tile.geo = geo;
        tile.mat = mat;
        tile.mesh = mesh;
        tile.state = 'ready';
      },
      undefined,
      () => {
        tile.state = 'error';
      }
    );
  }

  // --------------------------------------------------------------------------
  // 4) 放置全部 76 处工笔纸艺立体弹起立绘（32 原景 + 2 潮田专志 + 42 Grok 新增）
  //    一级立绘 (34 处) 首屏就绪；二级立绘 (42 处) 在靠近放大或筛亮时按需懒加载！
  // --------------------------------------------------------------------------
  const standees = [];
  const pickMeshes = [];
  const placedIds = new Set();

  // 防重叠最小间距微调（防止同镇多个立绘在 3D 沙盘上互相穿插）
  function resolveNonOverlap(wx, wz, minDist = 0.72) {
    let x = clamp(wx, -MAP_W * 0.45, MAP_W * 0.45);
    let z = clamp(wz, -MAP_D * 0.45, MAP_D * 0.45);
    for (let iter = 0; iter < 5; iter++) {
      let pushed = false;
      for (const s of standees) {
        const dx = x - s.wx;
        const dz = z - s.wz;
        const d = Math.hypot(dx, dz);
        if (d < minDist) {
          const ang = d > 0.001 ? Math.atan2(dz, dx) : (standees.length * 2.39996);
          const push = (minDist - d) * 0.65 + 0.06;
          x = clamp(x + Math.cos(ang) * push, -MAP_W * 0.45, MAP_W * 0.45);
          z = clamp(z + Math.sin(ang) * push, -MAP_D * 0.45, MAP_D * 0.45);
          pushed = true;
        }
      }
      if (!pushed) break;
    }
    return { wx: x, wz: z };
  }

  function attachStandeeMeshes(item, frontTex, backTex, aspect) {
    const baseH = item.baseH;
    const baseW = baseH * clamp(aspect, 0.72, 1.38);

    const frontGeo = new THREE.PlaneGeometry(baseW, baseH);
    frontGeo.translate(0, baseH * 0.5, 0);
    const frontMat = makePaperMaterial({
      map: frontTex,
      transparent: true,
      alphaTest: 0.26,
      side: THREE.FrontSide,
      color: new THREE.Color('#ffffff'),
    });
    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    frontMesh.userData.mapStandee = item;
    item.scaleGroup.add(frontMesh);

    const backGeo = new THREE.PlaneGeometry(baseW, baseH);
    backGeo.rotateY(Math.PI);
    backGeo.translate(0, baseH * 0.5, -0.03);
    const backMat = makePaperMaterial({
      map: backTex,
      transparent: true,
      alphaTest: 0.26,
      side: THREE.FrontSide,
      color: new THREE.Color('#ffffff'),
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    item.scaleGroup.add(backMesh);

    item.frontMesh = frontMesh;
    item.frontMat = frontMat;
    item.texState = 'ready';
    pickMeshes.push(frontMesh);
  }

  function ensureStandeeTexture(item) {
    if (item.texState !== 'lazy') return;
    item.texState = 'loading';
    const url = isMobile ? `./img/m/${item.imgKey}.webp` : `./img/${item.imgKey}.webp`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      images[item.imgKey] = img;
      const frontBuilt = buildLazyDieCutTexture(THREE, img, { rim: true, kraftBack: false }, maxAniso);
      const backBuilt = buildLazyDieCutTexture(THREE, img, { rim: true, kraftBack: true, flipX: true }, maxAniso);
      attachStandeeMeshes(item, frontBuilt.tex, backBuilt.tex, frontBuilt.aspect);
    };
    img.onerror = () => {
      item.texState = 'error';
    };
    img.src = url;
  }

  function addMapStandee({
    id, kind, title, category, townId, wx, wz, imgKey, entry, poi, featured, tier = 1, heightScale = 1, lazy = false,
  }) {
    if (placedIds.has(id)) return;
    placedIds.add(id);

    const pos = resolveNonOverlap(wx, wz, tier === 1 ? 0.68 : 0.62);
    const wy = sampleElevation(pos.wx, pos.wz);
    const root = new THREE.Group();
    root.position.set(pos.wx, wy, pos.wz);

    // 宣纸折叠小底座片
    const tabGeo = new THREE.PlaneGeometry(0.92 * heightScale, 0.28 * heightScale);
    tabGeo.rotateX(-Math.PI / 2);
    const tabMat = new THREE.MeshLambertMaterial({
      color: '#F7F1E5',
      transparent: true,
      opacity: 0.72,
    });
    const tabMesh = new THREE.Mesh(tabGeo, tabMat);
    tabMesh.position.set(0, 0.025, 0.06);
    tabMesh.receiveShadow = true;
    root.add(tabMesh);

    const hingeGroup = new THREE.Group();
    hingeGroup.rotation.x = -Math.PI * 0.48;
    root.add(hingeGroup);

    const scaleGroup = new THREE.Group();
    hingeGroup.add(scaleGroup);
    scene.add(root);

    const baseH = (featured ? 2.15 : tier === 1 ? 1.85 : 1.55) * heightScale;
    const item = {
      id,
      kind,
      title,
      category,
      townId,
      tier,
      wx: pos.wx,
      wy,
      wz: pos.wz,
      baseH,
      imgKey,
      featured: Boolean(featured),
      entry,
      poi,
      root,
      hingeGroup,
      scaleGroup,
      tabMesh,
      frontMesh: null,
      frontMat: null,
      texState: lazy ? 'lazy' : 'ready',
      flap: new PopSpring(155, 16.5),
      hop: 0,
      phase: Math.random() * Math.PI * 2,
    };

    if (!lazy) {
      if (imgKey.startsWith('map/')) {
        const frontTex = buildFramedPaperTexture(THREE, images[imgKey], maxAniso);
        attachStandeeMeshes(item, frontTex, frontTex, 1.0);
      } else {
        const built = buildDieCutTexture(imgKey, { rim: true, kraftBack: false }, maxAniso);
        const backTex = buildDieCutTexture(imgKey, { rim: true, kraftBack: true, flipX: true }, maxAniso).tex;
        attachStandeeMeshes(item, built.tex, backTex, built.aspect || 1.0);
      }
    }

    standees.push(item);
  }

  // A) 潮田核心两处专志卡片立绘（大山口村 + 潮田狮舞）
  for (const poiId of ['poi-dashankou', 'poi-chaotian-folk']) {
    const poi = MAP_EXTRA_POIS.find((p) => p.id === poiId);
    if (!poi) continue;
    const [lon, lat] = EXTRA_CORE_COORDS[poiId];
    const w = lonLatToWorld(lon, lat);
    addMapStandee({
      id: poi.id,
      kind: 'extra',
      title: poiId === 'poi-dashankou' ? '大山口村' : '潮田狮舞民俗',
      category: poi.category,
      townId: 'chaotian',
      wx: w.x,
      wz: w.z,
      imgKey: poi.img,
      poi,
      featured: true,
      tier: 1,
      heightScale: 0.96,
      lazy: false,
    });
  }

  // B) 全部 32 处一级行卷核心立绘（真实地理 WGS84 坐标）
  for (const town of TOWNSHIPS) {
    const lids = town.landmarks || [];
    lids.forEach((lid, idx) => {
      const entry = landmarksById.get(lid);
      if (!entry) return;
      const ll = LANDMARK_COORDS[lid] || [town.lon, town.lat];
      const w = lonLatToWorld(ll[0], ll[1]);
      addMapStandee({
        id: lid,
        kind: 'landmark',
        title: entry.spec.title,
        category: entry.spec.category,
        townId: town.id,
        wx: w.x,
        wz: w.z,
        imgKey: entry.spec.img,
        entry,
        featured: idx === 0 || town.featured,
        tier: 1,
        heightScale: idx === 0 ? 1.0 : 0.90,
        lazy: false,
      });
    });
  }

  // C) 全部 42 处 Grok 新增工笔风物立绘（二级精游立绘，按需懒加载，零首屏卡顿！）
  for (const extra of GROK_EXTRA_42) {
    const w = lonLatToWorld(extra.lon, extra.lat);
    addMapStandee({
      id: extra.id,
      kind: 'extra',
      title: extra.title,
      category: extra.category,
      townId: extra.townId,
      wx: w.x,
      wz: w.z,
      imgKey: extra.img,
      poi: extra,
      featured: false,
      tier: 2,
      heightScale: 0.92,
      lazy: true,
    });
  }

  // --------------------------------------------------------------------------
  // 5) 真实 12 乡镇与 4 条水脉世界坐标 + 异步加载真实 30m DEM 高度图同步刷新高度
  // --------------------------------------------------------------------------
  const townWorlds = TOWNSHIPS.map((t) => {
    const w = lonLatToWorld(t.lon, t.lat);
    return { town: t, wx: w.x, wy: sampleElevation(w.x, w.z), wz: w.z };
  });
  const waterWorlds = WATER_LABELS.map((w) => {
    const p = lonLatToWorld(w.lon, w.lat);
    return { ...w, wx: p.x, wy: sampleElevation(p.x, p.z) + 0.14, wz: p.z };
  });

  function syncAllHeightsToDem() {
    applyDemToPlaneGeo(terrainGeo, 0);
    for (const tile of tiles) {
      if (tile.geo) {
        const pos = tile.geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wz = pos.getZ(i);
          pos.setY(i, sampleElevation(wx, wz) + 0.012);
        }
        pos.needsUpdate = true;
        tile.geo.computeVertexNormals();
      }
    }
    for (const st of standees) {
      st.wy = sampleElevation(st.wx, st.wz);
      st.root.position.y = st.wy;
    }
    for (const tw of townWorlds) {
      tw.wy = sampleElevation(tw.wx, tw.wz);
    }
    for (const ww of waterWorlds) {
      ww.wy = sampleElevation(ww.wx, ww.wz) + 0.14;
    }
  }

  // 异步载入 33KB 真实 30m DEM 高度图
  const demImg = new Image();
  demImg.crossOrigin = 'anonymous';
  demImg.onload = () => {
    const hc = document.createElement('canvas');
    hc.width = demImg.width;
    hc.height = demImg.height;
    const hg = hc.getContext('2d');
    hg.drawImage(demImg, 0, 0);
    const data = hg.getImageData(0, 0, hc.width, hc.height).data;
    demW = hc.width;
    demH = hc.height;
    demGrid = new Float32Array(demW * demH);
    for (let i = 0; i < demGrid.length; i++) {
      demGrid[i] = data[i * 4] / 255.0;
    }
    syncAllHeightsToDem();
  };
  demImg.src = './img/map/lingchuan-dem-height.png';

  // --------------------------------------------------------------------------
  // 6) 地域氛围飘飞粒子（桃花瓣 / 海洋银杏叶 / 大境雾凇 / 漓江青岚）
  // --------------------------------------------------------------------------
  const PARTICLE_N = isMobile ? 70 : 120;
  const pPos = new Float32Array(PARTICLE_N * 3);
  const pVel = new Float32Array(PARTICLE_N * 3);
  const pSeed = new Float32Array(PARTICLE_N);
  for (let i = 0; i < PARTICLE_N; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * MAP_W * 0.85;
    pPos[i * 3 + 1] = 0.8 + Math.random() * 6.5;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * MAP_D * 0.85;
    pVel[i * 3] = (Math.random() - 0.5) * 0.35;
    pVel[i * 3 + 1] = -(0.18 + Math.random() * 0.28);
    pVel[i * 3 + 2] = 0.12 + Math.random() * 0.28;
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
    size: 0.36,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    color: new THREE.Color('#97BEB5'),
  });
  scene.add(new THREE.Points(pGeo, pMat));

  const REGION_COLORS = {
    chaotian: new THREE.Color('#F2B2BA'),
    haiyang: new THREE.Color('#E3AF3D'),
    dajing: new THREE.Color('#DCEAF2'),
    lantian: new THREE.Color('#F2C272'),
    lingtian: new THREE.Color('#F0BC68'),
    default: new THREE.Color('#97BEB5'),
  };
  const curParticleCol = REGION_COLORS.default.clone();

  // --------------------------------------------------------------------------
  // 7) 相机数学与真地图定点缩放引擎 (0.85x ~ 6.0x)
  // --------------------------------------------------------------------------
  // 灵川县真实重心微偏西（县城灵川镇附近）
  const HOME_TX = -0.35;
  const HOME_TZ = 0.85;

  const camState = {
    tx: HOME_TX,
    tz: HOME_TZ,
    targetTx: HOME_TX,
    targetTz: HOME_TZ,
    vx: 0,
    vz: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    category: 'all',
    nearestTownId: 'chaotian',
    lockedTownId: 'chaotian',
    lastReportedZoom: 1.0,
    desktopPanelOpen: true,
    panelShiftFactor: 1.0,
  };

  function getPanBounds(z) {
    const factor = clamp((z - 0.72) / 1.15, 0.25, 1.08);
    return {
      maxX: MAP_W * 0.48 * factor,
      maxZ: MAP_D * 0.48 * factor,
    };
  }

  function computeCamPose(tx, tz, zoom, view, panelFactor = camState.panelShiftFactor) {
    const aspect = view.w / Math.max(1, view.h);
    const fov = aspect < 0.75 ? 45 : 38;
    const vTan = Math.tan(fov * DEG2RAD * 0.5);
    const hTan = vTan * aspect;

    // 1.0x 全境时保底完整容纳全部 12 乡镇（最西公平/兰田到最东海洋/大境，最北兰田到最南大圩）
    const fitWidthDist = 14.5 / Math.max(0.16, hTan);
    const fitHeightDist = 18.6 / Math.max(0.28, vTan);
    const baseDist = Math.max(41.5, fitWidthDist, fitHeightDist * 0.90);

    // 连续平滑对数型缩放距离曲线：0.85x(超全境) -> 1.0x(全境) -> 2.4x(乡镇长卷) -> 6.0x(村落微距高清瓦片!)
    const dist = baseDist / Math.pow(clamp(zoom, MIN_ZOOM, MAX_ZOOM), 1.08);

    // 俯角随缩放平滑过渡：远观 64° 清晰真地图俯瞰 -> 中近景 36° 纸艺长卷 -> 5x~6x 保持 31° 既见立绘又见锐利地面
    const zoomT = smoothstep(1.02, 2.75, zoom);
    const pitchDeg = lerp(64, 31, zoomT);
    const pitchRad = pitchDeg * DEG2RAD;

    const deskShiftX = view.w >= 920 ? (4.1 * panelFactor / Math.pow(Math.max(0.85, zoom), 0.85)) : 0;
    const lookX = tx + deskShiftX;
    const lookZ = tz;
    const lookY = sampleElevation(tx, tz) * 0.45 + lerp(0.05, 0.35, zoomT);

    const posX = lookX;
    const posY = lookY + Math.sin(pitchRad) * dist;
    const posZ = lookZ + Math.cos(pitchRad) * dist;
    const aimZ = lookZ - lerp(0, 0.55, zoomT);

    return { fov, aspect, dist, pitchRad, zoomT, posX, posY, posZ, lookX, lookY, aimZ };
  }

  function applyPoseToCamera(cam, pose) {
    if (Math.abs(cam.aspect - pose.aspect) > 0.005 || Math.abs(cam.fov - pose.fov) > 0.1) {
      cam.aspect = pose.aspect;
      cam.fov = pose.fov;
      cam.updateProjectionMatrix();
    }
    cam.position.set(pose.posX, pose.posY, pose.posZ);
    cam.lookAt(pose.lookX, pose.lookY, pose.aimZ);
    cam.updateMatrixWorld();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const projV = new THREE.Vector3();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPt = new THREE.Vector3();

  /** 精确计算屏幕像素 (clientX, clientY) 射线落在地面 y=0 平面上的世界坐标 */
  function screenToGround(clientX, clientY, cam = camera) {
    const { w, h } = getViewport();
    ndc.set((clientX / Math.max(1, w)) * 2 - 1, -(clientY / Math.max(1, h)) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    const ok = raycaster.ray.intersectPlane(groundPlane, hitPt);
    return ok ? { x: hitPt.x, z: hitPt.z } : null;
  }

  /**
   * 真地图核心：围绕屏幕锚点 (clientX, clientY) 定点缩放！
   * 缩放前后锚点对应的真实地理点纹丝不动，零漂移。
   */
  function zoomAtScreenPoint(clientX, clientY, newZoom) {
    const clampedZ = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const view = getViewport();

    // 1) 在当前目标姿态下求锚点对应的真实地面坐标 P0
    const curPose = computeCamPose(camState.targetTx, camState.targetTz, camState.targetZoom, view);
    applyPoseToCamera(simCamera, curPose);
    const p0 = screenToGround(clientX, clientY, simCamera);

    camState.targetZoom = clampedZ;
    camState.lockedTownId = null;

    if (p0) {
      // 2) 在新缩放倍数下求同一屏幕像素对应的新地面坐标 P1，精准补偿差值！
      const nextPose = computeCamPose(camState.targetTx, camState.targetTz, clampedZ, view);
      applyPoseToCamera(simCamera, nextPose);
      const p1 = screenToGround(clientX, clientY, simCamera);
      if (p1) {
        const bounds = getPanBounds(clampedZ);
        camState.targetTx = clamp(camState.targetTx + (p0.x - p1.x), -bounds.maxX, bounds.maxX);
        camState.targetTz = clamp(camState.targetTz + (p0.z - p1.z), -bounds.maxZ, bounds.maxZ);
      }
    }

    if (clampedZ <= 1.02) {
      camState.targetTx = lerp(camState.targetTx, HOME_TX, 0.25);
      camState.targetTz = lerp(camState.targetTz, HOME_TZ, 0.25);
    }
  }

  function flyToTown(townId, zoomLevel = 2.65) {
    const tw = townWorlds.find((x) => x.town.id === townId);
    if (!tw) return;
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = townId;
    camState.targetTx = tw.wx;
    camState.targetTz = tw.wz;
    camState.targetZoom = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
    if (camState.nearestTownId !== townId) {
      camState.nearestTownId = townId;
      onFocusTownChange?.(townId);
    }
  }

  function resetOverview() {
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = null;
    camState.targetTx = HOME_TX;
    camState.targetTz = HOME_TZ;
    camState.targetZoom = 1.0;
  }

  function nudgeZoom(factorOrDelta) {
    const view = getViewport();
    const cx = view.w >= 920 && camState.desktopPanelOpen ? (view.w - 380) * 0.5 : view.w * 0.5;
    const cy = view.h * 0.5;
    // 兼容 +/- 按钮按倍数缩放（更符合真地图手感）
    const nextZ = factorOrDelta > 0
      ? camState.targetZoom * 1.48
      : camState.targetZoom / 1.48;
    zoomAtScreenPoint(cx, cy, nextZ);
  }

  function setCategory(cat) {
    camState.category = cat || 'all';
  }

  function setDesktopPanelOpen(open) {
    camState.desktopPanelOpen = Boolean(open);
  }

  // --------------------------------------------------------------------------
  // 8) 1:1 Ray-Plane 地面拖曳 + 双指捏合中点定点缩放 + 滚轮定点缩放 + 双击放大 + 立绘点选
  // --------------------------------------------------------------------------
  const pointers = new Map();
  let dragMoved = false;
  let downX = 0;
  let downY = 0;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let lastMoveTime = performance.now();
  let lastPinchDist = 0;
  let lastPinchMid = null;

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
      lastPinchDist = Math.max(12, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      lastPinchMid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    if (!pointers.has(e.pointerId)) return;

    const prev = pointers.get(e.pointerId);
    const prevX = prev.x;
    const prevY = prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    // 双指捏合：同时支持中点定点缩放 + 双指平移！
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.max(12, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const mid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };

      if (lastPinchMid) {
        const gPrev = screenToGround(lastPinchMid.x, lastPinchMid.y, camera);
        const gCurr = screenToGround(mid.x, mid.y, camera);
        if (gPrev && gCurr) {
          const bounds = getPanBounds(camState.targetZoom);
          camState.targetTx = clamp(camState.targetTx + (gPrev.x - gCurr.x), -bounds.maxX, bounds.maxX);
          camState.targetTz = clamp(camState.targetTz + (gPrev.z - gCurr.z), -bounds.maxZ, bounds.maxZ);
        }
      }
      if (lastPinchDist > 12) {
        const ratio = dist / lastPinchDist;
        if (Math.abs(ratio - 1) > 0.002) {
          zoomAtScreenPoint(mid.x, mid.y, camState.targetZoom * ratio);
        }
      }
      lastPinchDist = dist;
      lastPinchMid = mid;
      return;
    }

    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) {
      dragMoved = true;
      camState.lockedTownId = null;
    }

    const now = performance.now();
    const moveDt = clamp((now - lastMoveTime) / 1000, 0.006, 0.08);
    lastMoveTime = now;

    // 精确 Ray-Plane 1:1 地面拖曳（绝不漂移，任何俯角与缩放倍率下都粘在指尖！）
    const gPrev = screenToGround(prevX, prevY, camera);
    const gCurr = screenToGround(e.clientX, e.clientY, camera);
    if (gPrev && gCurr) {
      const wxDelta = clamp(gPrev.x - gCurr.x, -8, 8);
      const wzDelta = clamp(gPrev.z - gCurr.z, -8, 8);
      const bounds = getPanBounds(camState.targetZoom);
      camState.targetTx = clamp(camState.targetTx + wxDelta, -bounds.maxX, bounds.maxX);
      camState.targetTz = clamp(camState.targetTz + wzDelta, -bounds.maxZ, bounds.maxZ);
      camState.vx = lerp(camState.vx, wxDelta / moveDt, 0.45);
      camState.vz = lerp(camState.vz, wzDelta / moveDt, 0.45);
    }
  });

  function onPointerFinish(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      lastPinchDist = 0;
      lastPinchMid = null;
    }

    if (pointers.size === 0 && isModeActive() && !isBlockingOverlayOpen()) {
      const since = (performance.now() - lastMoveTime) / 1000;
      if (!dragMoved) {
        // 1) 优先 3D Raycaster 精准点选立起来的纸雕立绘！
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
          if (camState.targetZoom < 2.3) camState.targetZoom = 2.65;
          if (picked.kind === 'landmark' && picked.entry) {
            onSelectLandmark?.(picked.entry);
          } else if (picked.kind === 'extra' && picked.poi) {
            onSelectExtra?.(picked.poi);
          }
          lastTapTime = 0;
          return;
        }

        // 2) 未点中立绘时，检测双击地图 -> 平滑定点放大！
        const now = performance.now();
        if (now - lastTapTime < 320 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 28) {
          const nextZ = camState.targetZoom < 4.5 ? camState.targetZoom * 1.85 : 1.0;
          if (nextZ <= 1.05) {
            resetOverview();
          } else {
            zoomAtScreenPoint(e.clientX, e.clientY, nextZ);
          }
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          lastTapX = e.clientX;
          lastTapY = e.clientY;
        }
      } else if (since < 0.09) {
        const maxSpeed = 30 / Math.max(0.9, Math.sqrt(camState.zoom));
        camState.vx = clamp(camState.vx, -maxSpeed, maxSpeed);
        camState.vz = clamp(camState.vz, -maxSpeed, maxSpeed);
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
    // 兼顾触控板精细双指滚轮与鼠标滚轮刻度
    const rawDelta = clamp(e.deltaY, -160, 160);
    const factor = Math.exp(-rawDelta * 0.0022);
    zoomAtScreenPoint(e.clientX, e.clientY, camState.targetZoom * factor);
  }, { passive: false });

  function resize(w, h) {
    camera.aspect = w / Math.max(1, h);
    camera.fov = w / Math.max(1, h) < 0.75 ? 45 : 38;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------------------------
  // 9) 每帧更新与渲染：分块高清瓦片 LOD + 三级语义立绘弹起 + 实时地理比例尺 + 3D->2D 标签
  // --------------------------------------------------------------------------
  const projectedTowns = [];
  const projectedWaters = [];
  const projectedStandees = [];

  function updateTileLod() {
    const z = camState.zoom;
    const wantTiles = z > 1.38;
    const tileAlpha = smoothstep(1.42, 1.92, z);

    // 视野在地面上的大致覆盖半径（世界单位）
    const viewRad = (15.5 / Math.max(1.0, z)) + 5.8;

    for (const tile of tiles) {
      const dx = Math.abs(tile.cx - camState.tx);
      const dz = Math.abs(tile.cz - camState.tz);
      const inRange = dx < (tileW * 0.5 + viewRad) && dz < (tileD * 0.5 + viewRad);

      if (wantTiles && inRange) {
        ensureTileLoaded(tile);
      }
      if (tile.mesh && tile.mat) {
        const show = wantTiles && inRange && tileAlpha > 0.02;
        tile.mesh.visible = show;
        if (show) {
          tile.mat.opacity = tileAlpha;
        }
      }
    }
  }

  function updateAndRender(dt, time) {
    const view = getViewport();
    const desiredAspect = view.w / Math.max(1, view.h);
    if (Math.abs(camera.aspect - desiredAspect) > 0.01) resize(view.w, view.h);

    // 脱手柔和惯性滑行
    if (pointers.size === 0 && (Math.abs(camState.vx) > 0.03 || Math.abs(camState.vz) > 0.03)) {
      const bounds = getPanBounds(camState.targetZoom);
      camState.targetTx = clamp(camState.targetTx + camState.vx * dt, -bounds.maxX, bounds.maxX);
      camState.targetTz = clamp(camState.targetTz + camState.vz * dt, -bounds.maxZ, bounds.maxZ);
      const decay = Math.exp(-5.8 * dt);
      camState.vx *= decay;
      camState.vz *= decay;
    }

    const followK = 1 - Math.exp(-10.5 * dt);
    camState.tx = lerp(camState.tx, camState.targetTx, followK);
    camState.tz = lerp(camState.tz, camState.targetTz, followK);
    camState.zoom = lerp(camState.zoom, camState.targetZoom, followK);
    camState.panelShiftFactor = lerp(camState.panelShiftFactor, camState.desktopPanelOpen ? 1.0 : 0.0, followK);

    const pose = computeCamPose(camState.tx, camState.tz, camState.zoom, view, camState.panelShiftFactor);
    applyPoseToCamera(camera, pose);

    // 更新 3x4 高清瓦片分块 LOD（放大 4x~6x 始终清晰！）
    updateTileLod();

    // 查找当前焦点最近的乡镇
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

    // 三级语义缩放 LOD + 全部 76 处立绘铰链弹起！
    // Level 1 (0.85~1.50x): 全境清雅，仅焦点乡主立绘轻启（或筛亮分类代表立绘）
    // Level 2 (1.50~2.60x): 乡镇近览，一级核心立绘全部优雅立起
    // Level 3 (2.60~6.00x): 村落深游，全部 42 枚 Grok 新增二级立绘按需懒加载并如立体画册层层绽放！
    const z = camState.zoom;
    const tier1Radius = clamp(12.0 / Math.pow(z, 0.55), 3.8, 9.2);
    const tier2Radius = clamp(10.5 / Math.pow(z, 0.65), 2.8, 6.2);
    const cat = camState.category;

    // 极近微距下（z > 3.2）微缩立绘高度，避免糊屏，呈现精致纸艺微缩沙盘感！
    const closeSizeDamp = z > 2.8 ? clamp(1.0 - (z - 2.8) * 0.11, 0.56, 1.0) : 1.0;

    projectedStandees.length = 0;

    for (const st of standees) {
      const dx = st.wx - camState.tx;
      const dz = st.wz - camState.tz;
      const d = Math.hypot(dx, dz);
      const catMatch = cat === 'all' || st.category === cat;

      let targetPop = 0;
      if (!catMatch) {
        targetPop = 0;
      } else if (st.tier === 1) {
        if (z > 1.24) {
          if (d < tier1Radius) targetPop = 1.0;
          else if (d < tier1Radius + 2.6) targetPop = 0.35 * (1 - (d - tier1Radius) / 2.6);
        } else if (cat !== 'all') {
          targetPop = st.featured ? 0.72 : 0.40;
        }
      } else {
        // 二级 42 枚 Grok 新增风物立绘：推近到 z > 2.35（或筛选到该分类且 z > 1.55）时按需懒加载并优雅弹起！
        const wakeZoom = cat !== 'all' ? 1.55 : 2.35;
        if (z > wakeZoom && d < tier2Radius) {
          if (st.texState === 'lazy') ensureStandeeTexture(st);
          if (st.texState === 'ready') {
            targetPop = smoothstep(wakeZoom, wakeZoom + 0.65, z);
          }
        }
      }

      st.flap.target = targetPop;
      const p = clamp(st.flap.step(dt), 0, 1.15);

      const vis = p > 0.03 && st.texState === 'ready';
      st.root.visible = vis;
      if (!vis) continue;

      const breath = Math.sin(time * 1.85 + st.phase) * 0.022 * p;
      st.hingeGroup.rotation.x = lerp(-Math.PI * 0.48, 0, clamp(p, 0, 1)) + breath;

      const faceYaw = Math.atan2(camera.position.x - st.wx, Math.max(3.0, camera.position.z - st.wz));
      st.root.rotation.y = clamp(faceYaw * 0.36, -0.34, 0.34);

      if (st.hop > 0.005) {
        st.hop *= Math.exp(-7.5 * dt);
      } else {
        st.hop = 0;
      }
      const sc = lerp(0.52, 1.0, smoothstep(0.05, 0.85, p)) * closeSizeDamp * (1 + st.hop * 0.14);
      st.scaleGroup.scale.setScalar(sc);
      st.root.position.y = st.wy + st.hop * 0.32;
      st.tabMesh.material.opacity = clamp(p * 0.80, 0, 0.78);

      // 收集完全立起的立绘用于屏幕防重叠纸签投影
      if (p > 0.56 && (z > 1.35 || cat !== 'all')) {
        projV.set(st.wx, st.wy + st.baseH * sc + 0.22, st.wz).project(camera);
        if (projV.z > 0.04 && projV.z < 0.992) {
          const sx = (projV.x * 0.5 + 0.5) * view.w;
          const sy = (-projV.y * 0.5 + 0.5) * view.h;
          if (sx > 28 && sx < view.w - 28 && sy > 84 && sy < view.h - 112) {
            projectedStandees.push({
              id: st.id,
              kind: st.kind,
              title: st.title,
              featured: st.featured,
              tier: st.tier,
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
    pMat.opacity = lerp(0.24, 0.65, pose.zoomT);

    const posArr = pGeo.attributes.position.array;
    const pSpread = clamp(18 / Math.sqrt(Math.max(1, z)), 6, 18);
    for (let i = 0; i < PARTICLE_N; i++) {
      const ix = i * 3;
      posArr[ix] += (pVel[ix] + Math.sin(time * 0.9 + pSeed[i]) * 0.24) * dt;
      posArr[ix + 1] += pVel[ix + 1] * dt;
      posArr[ix + 2] += (pVel[ix + 2] + Math.cos(time * 0.75 + pSeed[i]) * 0.18) * dt;
      if (posArr[ix + 1] < 0.25) {
        posArr[ix] = camState.tx + (Math.random() - 0.5) * pSpread;
        posArr[ix + 1] = 4.5 + Math.random() * 4.0;
        posArr[ix + 2] = camState.tz + (Math.random() - 0.5) * pSpread;
      }
    }
    pGeo.attributes.position.needsUpdate = true;

    // 渲染 3D 真实 DEM 宣纸立雕沙盘
    renderer.render(scene, camera);

    // 实时精准地理比例尺（屏幕中心水平 100px 对应的真实公里数）
    const visH = 2 * Math.tan(camera.fov * DEG2RAD * 0.5) * pose.dist;
    const worldPerPx = visH / Math.max(300, view.h);
    const kmPer100Px = worldPerPx * 100 * KM_PER_WORLD_UNIT;

    // 投影 12 个乡镇与 4 条真实水系题字到屏幕 2D
    projectedTowns.length = 0;
    for (const tw of townWorlds) {
      projV.set(tw.wx, tw.wy + 0.22, tw.wz).project(camera);
      const visible = projV.z > 0.04 && projV.z < 0.995;
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
        rot: w.rot || 0,
        visible: projV.z > 0.04 && projV.z < 0.995 && z < 2.9,
      });
    }

    // 排序：靠近中心且一级优先，但在 z > 2.8 深游时让最近的二级精游立绘也充分展示浮签
    projectedStandees.sort((a, b) => a.dist - b.dist);

    onProjectUI?.({
      towns: projectedTowns,
      waters: projectedWaters,
      standees: projectedStandees,
      zoom: z,
      kmPer100Px,
      focusTownId,
      standeeCount: standees.length,
    });
  }

  function triggerStandeeById(kind, id) {
    const st = standees.find((x) => x.id === id);
    if (st) {
      if (st.texState === 'lazy') ensureStandeeTexture(st);
      st.hop = 1.0;
      camState.targetTx = st.wx;
      camState.targetTz = st.wz;
      if (camState.targetZoom < (st.tier === 2 ? 3.2 : 2.5)) {
        camState.targetZoom = st.tier === 2 ? 3.45 : 2.65;
      }
      if (st.kind === 'landmark' && st.entry) onSelectLandmark?.(st.entry);
      else if (st.kind === 'extra' && st.poi) onSelectExtra?.(st.poi);
    }
  }

  /** 供自动化巡检脚本或深链直接飞往任意经纬度与倍率（含 4x~6x 高清瓦片验证） */
  function setCameraView({ lon, lat, zoom, townId } = {}) {
    camState.vx = 0;
    camState.vz = 0;
    if (townId) {
      const tw = townWorlds.find((x) => x.town.id === townId);
      if (tw) {
        camState.targetTx = tw.wx;
        camState.targetTz = tw.wz;
        camState.lockedTownId = townId;
      }
    } else if (typeof lon === 'number' && typeof lat === 'number') {
      const w = lonLatToWorld(lon, lat);
      camState.targetTx = w.x;
      camState.targetTz = w.z;
      camState.lockedTownId = null;
    }
    if (typeof zoom === 'number') {
      camState.targetZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    }
  }

  return {
    updateAndRender,
    resize,
    flyToTown,
    resetOverview,
    nudgeZoom,
    setCategory,
    setDesktopPanelOpen,
    setCameraView,
    triggerStandeeById,
    getState: () => ({
      ...camState,
      loadedTiles: tiles.filter((t) => t.state === 'ready').length,
      totalStandees: standees.length,
      readyStandees: standees.filter((s) => s.texState === 'ready').length,
    }),
  };
}
