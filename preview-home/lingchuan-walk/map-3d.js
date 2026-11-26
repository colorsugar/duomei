// ============================================================================
// 灵川全境 · 真实 30m DEM 3D 立体纸艺活地图引擎 v2
// 1. 紧凑 4:5 真实 WGS84 等角墨卡托投影（与 4096x5120 母版 / 4x5 超清瓦片 100% 比特级同步）
// 2. 全境 1.0x 大气铺满视口 + 0.85x~12.0x 无级定点缩放（直达 200m/500m 村落溪谷微距）
// 3. 全部 12 乡镇 + 76 处风物按 OSM 实测真坐标落位，绝不乱堆
// 4. 随放大自适应物理尺寸 + 实时屏幕空间防遮挡渐进释放（放大拉开距离再逐级弹出，永不互挡！）
// ============================================================================

import { TOWNSHIPS, MAP_EXTRA_POIS, GROK_EXTRA_42, WATER_LABELS } from './map-townships.js';
import { createMapAtmosphere } from './map-atmo.js';
import { createMapProps } from './map-props.js';
import { createRegionHighlight } from './map-region.js';
import { createStreetBlock } from './map-street.js';

// 桂林全境（市辖 17 个县区）连成一张：1:1 墨卡托画框，8x8 张 1024 瓦片（scripts/build-guilin-atlas.py）
// 世界尺寸按旧画框（1.14° 宽 = 40 单位）的比例放大，缩放档位、立绘大小在各处保持原样
const MAP_W = 40.0 * (111.82 - 109.30) / 1.14;
const MAP_D = MAP_W;

// 真实 WGS84 Web Mercator 投影参数（与 scripts/build-lingchuan-dem.py / map-geo.json 100% 一致）
const LON_MIN = 109.30;
const LON_MAX = 111.82;
const LAT_CENTER = 25.33;
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

// 实测东西地理宽度约 74.8 km -> 1 世界单位 ≈ 2.671 km
const REAL_WIDTH_KM = (LON_MAX - LON_MIN) * 111.32 * Math.cos(LAT_CENTER * DEG2RAD);
const KM_PER_WORLD_UNIT = REAL_WIDTH_KM / MAP_W;

const TILE_COLS = 8;
const TILE_ROWS = 8;
// 倍率仍按原灵川县画框计（1.0 = 灵川全县铺满），各处远近阈值不变；
// 桂林全境（17 个县区）总览在 OVERVIEW_ZOOM；1.0 仍是灵川一县铺满
const OVERVIEW_ZOOM_WIDE = 0.33;
const OVERVIEW_ZOOM_TALL = 0.36; // 竖屏手机：全市南北长，略放大铺满屏宽
const OVERVIEW_ZOOM = (typeof window !== 'undefined' && window.innerWidth / Math.max(1, window.innerHeight) < 0.75) ? OVERVIEW_ZOOM_TALL : OVERVIEW_ZOOM_WIDE;
const MIN_ZOOM = 0.30;
const MAX_ZOOM = (typeof window !== 'undefined' && window.innerWidth / Math.max(1, window.innerHeight) < 0.75) ? 80.0 : 40.0; // 全图仍只到 BASE_MAX_ZOOM，只有正阳步行街、东西巷一带能再放大（见 zoomCap）
const BASE_MAX_ZOOM = 12.0;
const ALL_MAX_ZOOM = 20.0; // 全图统一能放到 20 倍（灵川和市区手感一致）；街区一带仍能到 MAX_ZOOM
// 街区近景时这两张是老城重点，不再整张藏掉，只在街区自身约 150m 内略缩（见 inBlock）
const STREET_BLOCK_RADIUS = 0.05; // 世界单位，约 150m
const STREET_MIN_SCALE = 0.8;
const MAX_DEM_HEIGHT = 1.58;

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

/** 32 原景 OSM 实测真实 WGS84 坐标（全县自然分散 5~18 公里，零拍脑袋错位！） */
const LANDMARK_COORDS = {
  // 大圩镇域（北起熊村 25.238，南至古东瀑布 25.113，横跨 14 km！）
  'lc-32': [110.4573, 25.2379], // 熊村古圩与彩调 (OSM 实测熊村!)
  'lc-01': [110.4224, 25.1902], // 大圩古镇老街 (OSM 大圩镇)
  'lc-02': [110.4258, 25.1782], // 万寿桥 (老街南端马河口)
  'lc-03': [110.4125, 25.1765], // 毛洲岛 (OSM 毛洲岛江心洲!)
  'lc-04': [110.4570, 25.1868], // 东漓古村 (OSM 实测东漓古村!)
  'lc-06': [110.4500, 25.1745], // 东漓腐竹手作 (东漓南大埠片区)
  'lc-07': [110.4085, 25.1580], // 大圩草莓岛 (滩子坪江岸)
  'lc-05': [110.4560, 25.1135], // 漓江古东瀑布 (OSM 实测漓江古东景区!)
  // 潮田乡域（北起太平村 25.233，南至南圩穿岩 25.095，横跨 15 km！）
  'lc-15': [110.5330, 25.2332], // 太平古村 (OSM 实测太平村!)
  'lc-13': [110.4945, 25.1925], // 潮田桃花岛 (潮田西河湾)
  'lc-16': [110.5060, 25.1665], // 潮田柑橘 (S202 沿线连片果山)
  'lc-14': [110.4860, 25.0950], // 南圩穿岩 (潮田最南端冠岩暗河上游!)
  // 海洋乡域（横跨海洋山脉 15 km！）
  'lc-08': [110.5628, 25.3094], // 海洋百万银杏 (OSM 海洋乡)
  'lc-10': [110.5560, 25.3260], // 白果老鸭汤 (海洋乡北)
  'lc-09': [110.6250, 25.2980], // 画眉弄古银杏 (小平乐东侧深山古林!)
  // 大境瑶族乡域（沿 G357 东西横跨 18 km 高山！）
  'lc-30': [110.5774, 25.2038], // 大境瑶族服饰 (OSM 大境乡)
  'lc-11': [110.5940, 25.2360], // 大境雾凇 (李家寨/葡萄岭高岭!)
  'lc-12': [110.6780, 25.1960], // 大野神境·大野瀑布 (大境东部深峡!)
  'lc-34': [110.6140, 25.1820], // 林下仿野生灵芝 (OSM 永同村林区!)
  'lc-33': [110.6480, 25.1660], // 五色糯米饭 (大境东南瑶寨)
  // 灵田镇域（南北横跨 10 km 古商道！）
  'lc-25': [110.4875, 25.4224], // 长岗岭古商道 (OSM 实测下长岗村!)
  'lc-28': [110.4723, 25.3441], // 灵田走牌灯 (OSM 灵田镇街上村!)
  // 九屋镇 & 青狮潭
  'lc-24': [110.2664, 25.5343], // 江头村爱莲家祠 (OSM 实测江头洲!)
  'lc-26': [110.2145, 25.5340], // 青狮潭碧湖 (OSM 实测青狮潭水库中心!)
  'lc-27': [110.2580, 25.5760], // 龙门瀑布 (九屋北东源/石洞峡谷!)
  // 兰田瑶族乡
  'lc-31': [110.1966, 25.6097], // 兰田瑶族服饰 (OSM 实测兰田乡!)
  'lc-29': [110.2085, 25.6265], // 兰田糯禾舞草龙 (兰田东北山谷)
  // 三街镇、潭下镇、灵川镇、定江镇
  'lc-20': [110.3849, 25.4685], // 三街古圩 (OSM 实测三街镇!)
  'lc-17': [110.2822, 25.4545], // 潭下砂糖桔 (OSM 实测潭下镇!)
  'lc-22': [110.3170, 25.4079], // 甘棠公园 (OSM 实测甘棠江公园!)
  'lc-23': [110.3320, 25.3960], // 千年桂林 (县城东侧)
  'lc-19': [110.3064, 25.3605], // 八里街夜市 (OSM 实测八里街!)
};

const EXTRA_CORE_COORDS = {
  'poi-dashankou': [110.4955, 25.1345], // 大山口村 (潮田南谷官坪沿线)
  'poi-chaotian-folk': [110.5145, 25.1945], // 潮田狮舞民俗 (潮田乡南)
};

/** 创建带柔和宣纸圆角白边的卡片式纸雕纹理 */
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

/** 从动态懒加载的透明工笔 WebP 生成手裁宣纸白边纸雕纹理 */
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
  onTourStep,
}) {
  const scene = new THREE.Scene();
  const PAPER_HEX = '#F5F0E3';
  scene.background = new THREE.Color(PAPER_HEX);
  scene.fog = new THREE.FogExp2(PAPER_HEX, 0.0058);

  const initView = getViewport();
  const camera = new THREE.PerspectiveCamera(40, initView.w / Math.max(1, initView.h), 0.2, 420);
  const simCamera = new THREE.PerspectiveCamera(40, initView.w / Math.max(1, initView.h), 0.2, 420);

  const hemi = new THREE.HemisphereLight('#FFFDF8', '#DDD1BC', 1.24);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight('#FFF7E6', 1.38);
  keyLight.position.set(-18, 30, 14);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  keyLight.shadow.camera.near = 4;
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
  // 1) 真实 30m DEM 高度采样器
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
    const edge = smoothstep(0.02, 0.14, u) * smoothstep(0.02, 0.14, 1 - u) *
                 smoothstep(0.02, 0.14, v) * smoothstep(0.02, 0.14, 1 - v);
    return 0.14 * edge;
  }

  // --------------------------------------------------------------------------
  // 2) 无缝宣纸桌底 + 真实 DEM 3D 沙盘 (L0 1600x2000)
  // --------------------------------------------------------------------------
  const tableGeo = new THREE.PlaneGeometry(440, 440);
  tableGeo.rotateX(-Math.PI / 2);
  const tableMat = new THREE.MeshBasicMaterial({ color: PAPER_HEX, fog: false });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.y = -0.06;
  // 桌底宣纸不再绘制：县界外与沙盘四缘已在地形着色器里溶进雾色，桌面会在远处显出一块偏亮的矩形
  tableMesh.visible = false;
  scene.add(tableMesh);

  // 程序化四边柔边 alphaMap：彻底隐去沙盘边缘，融进无限宣纸桌面
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
  ax.addColorStop(0.08, 'rgba(0,0,0,1)');
  ax.addColorStop(0.92, 'rgba(0,0,0,1)');
  ax.addColorStop(1, 'rgba(0,0,0,0)');
  fadeSide(ax);
  const ay = ag.createLinearGradient(0, 0, 0, 128);
  ay.addColorStop(0, 'rgba(0,0,0,0)');
  ay.addColorStop(0.08, 'rgba(0,0,0,1)');
  ay.addColorStop(0.92, 'rgba(0,0,0,1)');
  ay.addColorStop(1, 'rgba(0,0,0,0)');
  fadeSide(ay);
  const alphaFlat = document.createElement('canvas');
  alphaFlat.width = 128;
  alphaFlat.height = 128;
  const afg = alphaFlat.getContext('2d');
  afg.fillStyle = '#000000';
  afg.fillRect(0, 0, 128, 128);
  afg.drawImage(alphaCanvas, 0, 0);
  const terrainAlphaMap = new THREE.CanvasTexture(alphaFlat);

  const terrainGeo = new THREE.PlaneGeometry(MAP_W, MAP_D, isMobile ? 280 : 352, isMobile ? 280 : 352);
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

  // 地域画境氛围（海洋金秋 / 潮田桃花 / 大境雾凇）：地色、光雾、飘落物、剪纸银杏、屏幕氛围层
  const atmo = createMapAtmosphere({
    THREE,
    scene,
    hemi,
    keyLight,
    tableMat,
    isMobile,
    lonLatToWorld,
    sampleElevation,
    baseImg,
    buildDieCutTexture,
    maxAniso,
    host: document.getElementById('map-stage'),
    mapW: MAP_W,
    mapD: MAP_D,
  });
  atmo.patchMaterial(terrainMat);
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // --------------------------------------------------------------------------
  // 3) 4x5 (20张) 1024x1024 超清分块瓦片 LOD（4096x5120 2097万像素，放大 10x~12x 锐利！）
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
        state: 'idle',
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

        const geo = new THREE.PlaneGeometry(tileW, tileD, isMobile ? 35 : 44, isMobile ? 35 : 44); // 与地形网格同格点（地形 352/280 段 ÷ 8），否则瓦片比地形粗，喀斯特处地形顶穿瓦片，露出糊的 L0 底图（手机 z30 白楔形）
        geo.rotateX(-Math.PI / 2);
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
        atmo.patchMaterial(mat);
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
  // 4) 全部 76 处真实地理工笔立绘 + 未展开时的轻雅纸面圆点标记
  // --------------------------------------------------------------------------
  const standees = [];
  // 点选的立绘优先站起，不被近旁立绘挤掉
  let selectedStandeeId = null;
  const pickMeshes = [];
  const placedIds = new Set();

  // 共享轻巧纸面待展开圆点几何（当某点因当前缩放尚近而退让时，提示此处有更多风物，放大即立起！）
  const dotGeo = new THREE.CircleGeometry(0.11, 14);
  dotGeo.rotateX(-Math.PI / 2);

  // 仅对完全重合坐标做极微小 0.14 单位 (~370m) 避重，100% 忠实于真实地理位置！
  function microDeOverlap(wx, wz, minDist = 0.14) {
    let x = clamp(wx, -MAP_W * 0.47, MAP_W * 0.47);
    let z = clamp(wz, -MAP_D * 0.47, MAP_D * 0.47);
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const s of standees) {
        const dx = x - s.wx;
        const dz = z - s.wz;
        const d = Math.hypot(dx, dz);
        if (d < minDist) {
          const ang = d > 0.001 ? Math.atan2(dz, dx) : (standees.length * 2.39996);
          const push = (minDist - d) * 0.6 + 0.02;
          x = clamp(x + Math.cos(ang) * push, -MAP_W * 0.47, MAP_W * 0.47);
          z = clamp(z + Math.sin(ang) * push, -MAP_D * 0.47, MAP_D * 0.47);
          moved = true;
        }
      }
      if (!moved) break;
    }
    return { wx: x, wz: z };
  }

  function attachStandeeMeshes(item, frontTex, backTex, aspect) {
    const baseH = item.baseH;
    const baseW = baseH * clamp(aspect, 0.72, 1.38);
    item.baseW = baseW; // 供屏幕空间防遮挡按真实宽度判碰撞

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
    backGeo.translate(0, baseH * 0.5, -0.025);
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

    const pos = microDeOverlap(wx, wz, 0.14);
    const wy = sampleElevation(pos.wx, pos.wz);
    const root = new THREE.Group();
    root.position.set(pos.wx, wy, pos.wz);

    // 宣纸折叠小底座片
    const tabGeo = new THREE.PlaneGeometry(0.88 * heightScale, 0.26 * heightScale);
    tabGeo.rotateX(-Math.PI / 2);
    const tabMat = new THREE.MeshLambertMaterial({
      color: '#F7F1E5',
      transparent: true,
      opacity: 0.72,
    });
    const tabMesh = new THREE.Mesh(tabGeo, tabMat);
    tabMesh.position.set(0, 0.02, 0.04);
    tabMesh.receiveShadow = true;

    // 纸面待展开轻巧圆点（当被防遮挡算法暂时退让时浮现，告诉用户继续放大即可看到更多风物！）
    const dotMat = new THREE.MeshBasicMaterial({
      color: tier === 1 ? '#B3261E' : '#1F5E5B',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.position.set(pos.wx, wy + 0.035, pos.wz);
    dotMesh.visible = false;
    scene.add(dotMesh);

    const hingeGroup = new THREE.Group();
    hingeGroup.rotation.x = -Math.PI * 0.48;
    root.add(hingeGroup);

    const scaleGroup = new THREE.Group();
    scaleGroup.add(tabMesh);
    hingeGroup.add(scaleGroup);
    scene.add(root);

    // 基础标称高度（渲染时会乘以随放大动态收缩的 worldScale，彻底消除巨牌遮挡！）
    const baseH = (featured ? 1.85 : tier === 1 ? 1.65 : 1.48) * heightScale;
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
      dotMesh,
      frontMesh: null,
      frontMat: null,
      texState: lazy ? 'lazy' : 'ready',
      flap: new PopSpring(155, 16.5),
      isShown: false,
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

  // A) 潮田核心两处专志卡片立绘
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
      heightScale: 0.94,
      lazy: false,
    });
  }

  // B) 全部 32 处一级行卷核心立绘（OSM 实测真实 WGS84 坐标）
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
        heightScale: idx === 0 ? 1.0 : 0.92,
        lazy: false,
      });
    });
  }

  // C) 全部 42 处 Grok 新增工笔风物立绘（按真实分布随放大逐步唤醒，绝不遮挡！）
  // 主城区风物挤在几公里内：立绘缩小些，放大时能多站起几幅
  const cityTownIds = new Set(TOWNSHIPS.filter((t) => t.city).map((t) => t.id));
  for (const extra of GROK_EXTRA_42) {
    const w = lonLatToWorld(extra.lon, extra.lat);
    const cityShrink = cityTownIds.has(extra.townId) ? 0.92 : 1;
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
      featured: Boolean(extra.featured),
      tier: extra.tier || 2,
      // 数据里写了 heightScale 就直接用它；没写才按默认 0.92 并让城区略小
      heightScale: Number.isFinite(extra.heightScale) ? extra.heightScale : 0.92 * cityShrink,
      lazy: true,
    });
  }

  atmo.buildDecor(standees);

  // 纸艺小景：满山剪纸树 + 真实村落小屋（按十二境换树种）
  const props = createMapProps({ THREE, scene, lonLatToWorld, sampleElevation, standees, isMobile, mapW: MAP_W, mapD: MAP_D, maxAniso });

  // 县区高光：城区与十县用自身边界，灵川各乡镇统一圈灵川县
  const townById = new Map(TOWNSHIPS.map((t) => [t.id, t]));
  const region = createRegionHighlight({
    THREE, scene, lonLatToWorld, sampleElevation,
    regionOfTown: (id) => {
      const t = townById.get(id);
      if (!t) return null;
      return (t.city || t.countyLevel) ? t.id : 'lingchuan';
    },
  });
  const street = createStreetBlock({ THREE, scene, lonLatToWorld, sampleElevation, isMobile });
  const notifyFocus = (id) => {
    region.setTown(id);
    onFocusTownChange?.(id);
  };

  // --------------------------------------------------------------------------
  // 5) 真实 12 乡镇与 4 条水脉世界坐标 + 异步加载真实 30m DEM 高度图
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
    region.refresh();
    street.refresh();
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
      st.dotMesh.position.y = st.wy + 0.035;
    }
    for (const tw of townWorlds) {
      tw.wy = sampleElevation(tw.wx, tw.wz);
    }
    for (const ww of waterWorlds) {
      ww.wy = sampleElevation(ww.wx, ww.wz) + 0.14;
    }
    props?.syncHeights();
  }

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
  // 6) 地域氛围飘飞粒子
  // --------------------------------------------------------------------------
  const PARTICLE_N = isMobile ? 65 : 110;
  const pPos = new Float32Array(PARTICLE_N * 3);
  const pVel = new Float32Array(PARTICLE_N * 3);
  const pSeed = new Float32Array(PARTICLE_N);
  for (let i = 0; i < PARTICLE_N; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * MAP_W * 0.85;
    pPos[i * 3 + 1] = 0.8 + Math.random() * 6.0;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * MAP_D * 0.85;
    pVel[i * 3] = (Math.random() - 0.5) * 0.30;
    pVel[i * 3 + 1] = -(0.16 + Math.random() * 0.25);
    pVel[i * 3 + 2] = 0.10 + Math.random() * 0.24;
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
    size: 0.30,
    transparent: true,
    opacity: 0.52,
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
  // 7) 大气全境相机数学 + 真地图定点缩放引擎 (0.85x ~ 12.0x)
  // --------------------------------------------------------------------------
  // 桂林全市几何中心约在画框正中，略偏南
  const HOME_TX = 0.0;
  const HOME_TZ = 2.4;

  const camState = {
    tx: HOME_TX,
    tz: HOME_TZ,
    targetTx: HOME_TX,
    targetTz: HOME_TZ,
    vx: 0,
    vz: 0,
    zoom: OVERVIEW_ZOOM,
    targetZoom: OVERVIEW_ZOOM,
    category: 'all',
    nearestTownId: 'chaotian',
    lockedTownId: 'chaotian',
    lastReportedZoom: OVERVIEW_ZOOM,
    desktopPanelOpen: true,
    panelShiftFactor: 1.0,
    yaw: 0,
  };

  function getPanBounds(z) {
    const factor = clamp((z - 0.25) / 1.1, 0.30, 1.12);
    return {
      maxX: MAP_W * 0.49 * factor,
      maxZ: MAP_D * 0.49 * factor,
    };
  }

  function computeCamPose(tx, tz, zoom, view, panelFactor = camState.panelShiftFactor, yaw = camState.yaw) {
    const aspect = view.w / Math.max(1, view.h);
    const fov = aspect < 0.75 ? 43 : 37;
    const vTan = Math.tan(fov * DEG2RAD * 0.5);
    const hTan = vTan * aspect;

    // 紧致大气全境视距：1.0x 时整块灵川全境雄浑铺满 76%~84% 可用视口，不再显小！
    const fitWidthDist = 11.4 / Math.max(0.16, hTan);
    const fitHeightDist = 14.6 / Math.max(0.26, vTan);
    // 手机竖屏：按县域真实东西宽度（约 27 世界单位）铺满屏宽，西端公平/兰田、东端大境都要在 1.0× 全境里看得见；
    // 原先 44 的封顶在 390px 竖屏上只露出中间约六成县域。
    const baseDist = aspect < 0.75
      ? clamp(13.4 / Math.max(0.12, hTan), 30.2, 80.0)
      : Math.max(30.2, Math.min(44.0, Math.max(fitWidthDist, fitHeightDist * 0.90)));

    // 0.85x(超全境) -> 1.0x(大气全境) -> 3.0x(乡镇近览) -> 6.0x(村落深游) -> 12.0x(200m微距!)
    const dist = baseDist / Math.pow(clamp(zoom, MIN_ZOOM, MAX_ZOOM), 1.06);

    // 俯角随缩放过渡：全境 66° 清朗真地图俯瞰 -> 中近景 38° 立体纸艺长卷 -> 深度微距保持 34° 让地理空间清晰展开！
    const zoomT = smoothstep(1.06, 3.2, zoom);
    const pitchDeg = lerp(66, 34, zoomT);
    const pitchRad = pitchDeg * DEG2RAD;

    const deskShiftX = view.w >= 920 ? (3.5 * panelFactor / Math.pow(Math.max(0.85, zoom), 0.90)) : 0;
    const lookX = tx + deskShiftX;
    const lookZ = tz;
    // 超过 12 倍（只有街区一带能到）视点抬高、前移都按倍率平方收回，否则街区会掉出画面
    const hiZ = zoom > BASE_MAX_ZOOM ? Math.pow(BASE_MAX_ZOOM / zoom, 2) : 1;
    const lookY = sampleElevation(tx, tz) * 0.42 + lerp(0.04, 0.24, zoomT) * hiZ;

    // yaw：漫游时镜头绕视点轻轻摆动，平时为 0
    const posX = lookX + Math.sin(yaw) * Math.cos(pitchRad) * dist;
    const posY = lookY + Math.sin(pitchRad) * dist;
    const posZ = lookZ + Math.cos(yaw) * Math.cos(pitchRad) * dist;
    const aimZ = lookZ - lerp(0, 0.35, zoomT) * hiZ;

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

  function screenToGround(clientX, clientY, cam = camera) {
    const { w, h } = getViewport();
    ndc.set((clientX / Math.max(1, w)) * 2 - 1, -(clientY / Math.max(1, h)) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    const ok = raycaster.ray.intersectPlane(groundPlane, hitPt);
    return ok ? { x: hitPt.x, z: hitPt.z } : null;
  }

  function zoomAtScreenPoint(clientX, clientY, newZoom) {
    const clampedZ = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const view = getViewport();

    const curPose = computeCamPose(camState.targetTx, camState.targetTz, camState.targetZoom, view);
    applyPoseToCamera(simCamera, curPose);
    const p0 = screenToGround(clientX, clientY, simCamera);

    camState.targetZoom = clampedZ;
    camState.lockedTownId = null;

    if (p0) {
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

  function flyToTown(townId, zoomLevel = 2.85, lonLat = null) {
    const tw = townWorlds.find((x) => x.town.id === townId);
    if (!tw) return;
    const at = lonLat ? lonLatToWorld(lonLat[0], lonLat[1]) : { x: tw.wx, z: tw.wz };
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = townId;
    camState.targetTx = at.x;
    camState.targetTz = at.z;
    camState.targetZoom = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
    if (camState.nearestTownId !== townId) {
      camState.nearestTownId = townId;
      notifyFocus(townId);
    }
  }

  function resetOverview() {
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = 'chaotian';
    camState.targetTx = HOME_TX;
    camState.targetTz = HOME_TZ;
    camState.targetZoom = OVERVIEW_ZOOM;
  }

  function nudgeZoom(factorOrDelta) {
    const view = getViewport();
    const cx = view.w >= 920 && camState.desktopPanelOpen ? (view.w - 380) * 0.5 : view.w * 0.5;
    const cy = view.h * 0.5;
    const nextZ = factorOrDelta > 0
      ? camState.targetZoom * 1.55
      : camState.targetZoom / 1.55;
    zoomAtScreenPoint(cx, cy, nextZ);
  }

  function setCategory(cat) {
    camState.category = cat || 'all';
  }

  function setDesktopPanelOpen(open) {
    camState.desktopPanelOpen = Boolean(open);
  }

  // --------------------------------------------------------------------------
  // 8) 1:1 Ray-Plane 地面拖曳 + 双指中点定点缩放 + 滚轮定点缩放 + 双击放大 + 立绘点选
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

  // 手指落在地图上方的乡镇签 / 立绘浮签上时，同样交给地图处理拖拽与双指缩放；
  // 否则 iOS 会把这次捏合当成整页缩放（刷新后还会保留，加载页也跟着放大偏位）。
  const GESTURE_PASSTHROUGH = '.lc-atlas-hud .lc-pin, .lc-atlas-hud .lc-standee-tag';
  const overlayPointers = new Set();
  let suppressOverlayClick = false;

  function onPointerDown(e, fromOverlay) {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fromOverlay) {
      overlayPointers.add(e.pointerId);
    } else {
      canvas.setPointerCapture?.(e.pointerId);
    }
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
  }
  canvas.addEventListener('pointerdown', (e) => onPointerDown(e, false));
  window.addEventListener('pointerdown', (e) => {
    if (e.target === canvas) return;
    const el = e.target instanceof Element ? e.target : null;
    if (!el || !el.closest(GESTURE_PASSTHROUGH) || el.closest('.lc-zoom-panel')) return;
    onPointerDown(e, true);
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    if (!pointers.has(e.pointerId)) return;

    const prev = pointers.get(e.pointerId);
    const prevX = prev.x;
    const prevY = prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

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
    const hadOverlay = overlayPointers.size > 0;
    overlayPointers.delete(e.pointerId);
    if (pointers.size < 2) {
      lastPinchDist = 0;
      lastPinchMid = null;
    }

    if (pointers.size === 0 && isModeActive() && !isBlockingOverlayOpen()) {
      const since = (performance.now() - lastMoveTime) / 1000;
      // 起手在浮签上：没拖动就让浮签自己的 click 生效；拖动/捏合过则吞掉随后那次 click
      if (hadOverlay && !dragMoved) return;
      if (hadOverlay && dragMoved) {
        suppressOverlayClick = true;
        setTimeout(() => { suppressOverlayClick = false; }, 400);
      }
      if (!dragMoved) {
        const { w, h } = getViewport();
        ndc.set((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(pickMeshes, false);
        let picked = null;
        for (const hit of hits) {
          const st = hit.object.userData.mapStandee;
          if (!st || st.flap.p < 0.24) continue;
          picked = st;
          break;
        }
        if (picked) {
          picked.hop = 1.0;
          selectedStandeeId = picked.id;
          camState.targetTx = picked.wx;
          camState.targetTz = picked.wz;
          if (camState.targetZoom < 2.8) camState.targetZoom = 3.2;
          if (picked.kind === 'landmark' && picked.entry) {
            onSelectLandmark?.(picked.entry);
          } else if (picked.kind === 'extra' && picked.poi) {
            onSelectExtra?.(picked.poi);
          }
          lastTapTime = 0;
          return;
        }

        const now = performance.now();
        if (now - lastTapTime < 320 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 28) {
          const nextZ = camState.targetZoom < 8.5 ? camState.targetZoom * 1.9 : 1.0;
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
        const maxSpeed = 28 / Math.max(0.9, Math.sqrt(camState.zoom));
        camState.vx = clamp(camState.vx, -maxSpeed, maxSpeed);
        camState.vz = clamp(camState.vz, -maxSpeed, maxSpeed);
      } else {
        camState.vx = 0;
        camState.vz = 0;
      }
    }
  }
  window.addEventListener('pointerup', onPointerFinish);
  window.addEventListener('pointercancel', onPointerFinish);
  window.addEventListener('click', (e) => {
    if (!suppressOverlayClick) return;
    const el = e.target instanceof Element ? e.target : null;
    if (!el || !el.closest(GESTURE_PASSTHROUGH)) return;
    suppressOverlayClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // iOS Safari 无视 user-scalable=no：地图模式下拦住系统的整页捏合缩放
  const blockPageZoom = (e) => {
    if (isModeActive()) e.preventDefault();
  };
  document.addEventListener('gesturestart', blockPageZoom, { passive: false });
  document.addEventListener('gesturechange', blockPageZoom, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1 && isModeActive()) e.preventDefault();
  }, { passive: false });

  // 滚轮落在地图上方的乡镇签 / 立绘浮签上时同样定点缩放（这些签可点击，会挡住 canvas 的 wheel）
  const WHEEL_PASSTHROUGH = '.lc-atlas-hud .lc-pin, .lc-atlas-hud .lc-standee-tag';
  window.addEventListener('wheel', (e) => {
    if (e.target === canvas) return;
    const el = e.target instanceof Element ? e.target : null;
    if (!el || !el.closest(WHEEL_PASSTHROUGH) || el.closest('.lc-zoom-panel')) return;
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    e.preventDefault();
    const rawDelta = clamp(e.deltaY, -160, 160);
    zoomAtScreenPoint(e.clientX, e.clientY, camState.targetZoom * Math.exp(-rawDelta * 0.0024));
  }, { passive: false });

  canvas.addEventListener('wheel', (e) => {
    if (!isModeActive() || isBlockingOverlayOpen()) return;
    e.preventDefault();
    const rawDelta = clamp(e.deltaY, -160, 160);
    const factor = Math.exp(-rawDelta * 0.0024);
    zoomAtScreenPoint(e.clientX, e.clientY, camState.targetZoom * factor);
  }, { passive: false });

  function resize(w, h) {
    camera.aspect = w / Math.max(1, h);
    camera.fov = w / Math.max(1, h) < 0.75 ? 43 : 37;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------------------------
  // 9) 每帧更新：4x5 超清瓦片 LOD + 屏幕空间实时防遮挡逐级释放立绘！
  // --------------------------------------------------------------------------
  const projectedTowns = [];
  const projectedWaters = [];
  const projectedStandees = [];

  function updateTileLod() {
    const z = camState.zoom;
    // 全市底图 L0 每单位像素比旧画框低，提早换上细瓦片
    const wantTiles = z > 0.92;
    const tileAlpha = smoothstep(0.96, 1.3, z);
    const viewRad = (14.0 / Math.max(1.0, z)) + 4.8;

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

  // ——— 自动漫游 ———
  // 一站一站飞过去：远的航段先拉高再落下，到站后缓缓推近、镜头左右轻摆，立绘跳一下，题签说出这里是哪。
  // 任何拖拽、滚轮、按键都会停下；开场 9 秒没人动就自己开始，停过之后要闲 45 秒才再起。
  const TOUR_STOPS = [
    { overview: true, hold: 4.2 },
    { id: 'gl-xiangbishan', zoom: 7.6 },
    { id: 'gl-riyueshuangta', zoom: 7.6 },
    { id: 'gl-duxiufeng', zoom: 7.6 },
    { id: 'gl-muglonghu', zoom: 7.2 },
    { id: 'gl-mifen', zoom: 8.2 },
    { id: 'gl-qixing', zoom: 7.2 },
    { id: 'lc-01', zoom: 5.6 },
    { id: 'lc-13', zoom: 5.4 },
    { id: 'lc-15', zoom: 5.4 },
    { id: 'lc-08', zoom: 5.2 },
    { id: 'lc-11', zoom: 5.2 },
  ];
  const tourParams = new URLSearchParams(window.location.search);
  const tourAutoAllowed = tourParams.get('tour') === '1' || (
    tourParams.get('tour') !== '0'
    && !navigator.webdriver
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const tour = {
    on: false, idx: -1, phase: 'fly', t: 0, dur: 1, hold: 6,
    from: null, to: null, dip: 0, st: null, stop: null,
    idle: 0, everRan: false, yawPhase: 0,
  };

  function tourBegin(idx, guard = 0) {
    const n = TOUR_STOPS.length;
    const stop = TOUR_STOPS[((idx % n) + n) % n];
    let tx;
    let tz;
    let zoom;
    let st = null;
    if (stop.overview) {
      tx = HOME_TX; tz = HOME_TZ; zoom = OVERVIEW_ZOOM;
    } else {
      st = standees.find((x) => x.id === stop.id);
      if (!st) {
        if (guard < n) tourBegin(idx + 1, guard + 1);
        else stopTour();
        return;
      }
      tx = st.wx; tz = st.wz; zoom = stop.zoom;
      if (st.texState === 'lazy') ensureStandeeTexture(st);
    }
    const dist = Math.hypot(tx - camState.tx, tz - camState.tz);
    tour.idx = ((idx % n) + n) % n;
    tour.stop = stop;
    tour.st = st;
    tour.from = { tx: camState.tx, tz: camState.tz, lz: Math.log(camState.zoom) };
    tour.to = { tx, tz, lz: Math.log(zoom) };
    // 航程越远，中途拉得越高，看得见一路的山水
    tour.dip = clamp(dist / 12, 0, 1.25);
    tour.dur = clamp(2.6 + dist * 0.2, 2.8, 6.2);
    tour.hold = stop.hold || 6.2;
    tour.phase = 'fly';
    tour.t = 0;
    camState.vx = 0;
    camState.vz = 0;
    camState.lockedTownId = st ? st.townId : null;
    if (tour.on) onTourStep?.({ active: true });
  }

  function startTour() {
    if (tour.on) return;
    tour.on = true;
    tour.everRan = true;
    tour.idle = 0;
    // 从离当前视点最近的那一站接着走，免得一开始就横穿全图
    let best = 0;
    let bestD = Infinity;
    TOUR_STOPS.forEach((stop, i) => {
      const st = stop.overview ? null : standees.find((x) => x.id === stop.id);
      const wx = st ? st.wx : HOME_TX;
      const wz = st ? st.wz : HOME_TZ;
      const d = Math.hypot(wx - camState.tx, wz - camState.tz) + (stop.overview && camState.zoom > 1.2 ? 99 : 0);
      if (d < bestD) { bestD = d; best = i; }
    });
    tourBegin(best);
    onTourStep?.({ active: true });
  }

  function stopTour() {
    tour.idle = 0;
    if (!tour.on) return;
    tour.on = false;
    camState.targetTx = camState.tx;
    camState.targetTz = camState.tz;
    camState.targetZoom = camState.zoom;
    onTourStep?.(null);
  }

  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function tourUpdate(dt) {
    if (!tour.on) {
      camState.yaw = lerp(camState.yaw, 0, 1 - Math.exp(-2.2 * dt));
      if (tourAutoAllowed && pointers.size === 0 && !isBlockingOverlayOpen?.()) {
        tour.idle += dt;
        if (tour.idle > (tour.everRan ? 45 : 9)) startTour();
      }
      return;
    }
    if (isBlockingOverlayOpen?.()) return;
    tour.t += dt;
    let tx;
    let tz;
    let lz;
    let yawTarget = 0;
    if (tour.phase === 'fly') {
      const e = clamp(tour.t / tour.dur, 0, 1);
      const pe = easeInOut(e);
      tx = lerp(tour.from.tx, tour.to.tx, pe);
      tz = lerp(tour.from.tz, tour.to.tz, pe);
      lz = lerp(tour.from.lz, tour.to.lz, easeInOut(e)) - tour.dip * Math.sin(Math.PI * e);
      if (e >= 1) {
        tour.phase = 'hold';
        tour.t = 0;
        tour.yawPhase = 0;
        if (tour.st) {
          selectedStandeeId = tour.st.id;
          tour.st.hop = 1.0;
        }
        const st = tour.st;
        const info = st ? (st.poi || st.entry?.spec || {}) : null;
        const town = st ? TOWNSHIPS.find((t) => t.id === st.townId) : null;
        onTourStep?.({
          active: true,
          index: tour.idx,
          total: TOUR_STOPS.length,
          title: st ? st.title : '桂林全境',
          place: st ? (town?.name || '') : '十七县区',
          line: st ? (info?.tagline || '') : '漓江自北向南，穿城而过。',
        });
      }
    } else {
      const h = clamp(tour.t / tour.hold, 0, 1);
      tx = tour.to.tx;
      tz = tour.to.tz;
      lz = tour.to.lz + 0.12 * easeInOut(h);
      tour.yawPhase += dt;
      yawTarget = 0.13 * Math.sin(tour.yawPhase * 0.55) * Math.min(1, tour.yawPhase / 1.5);
      if (h >= 1) tourBegin(tour.idx + 1);
    }
    camState.tx = camState.targetTx = tx;
    camState.tz = camState.targetTz = tz;
    camState.zoom = camState.targetZoom = clamp(Math.exp(lz), MIN_ZOOM, MAX_ZOOM);
    camState.yaw = lerp(camState.yaw, yawTarget, 1 - Math.exp(-3 * dt));
  }

  // 用户一动就停下漫游（点漫游钮本身除外）
  const interruptTour = (e) => {
    if (e?.target?.closest?.('#lc-tour-btn')) return;
    stopTour();
  };
  window.addEventListener('pointerdown', interruptTour, true);
  window.addEventListener('wheel', interruptTour, { capture: true, passive: true });
  window.addEventListener('keydown', interruptTour, true);

  function updateAndRender(dt, time) {
    const view = getViewport();
    const desiredAspect = view.w / Math.max(1, view.h);
    if (Math.abs(camera.aspect - desiredAspect) > 0.01) resize(view.w, view.h);

    if (pointers.size === 0 && (Math.abs(camState.vx) > 0.03 || Math.abs(camState.vz) > 0.03)) {
      const bounds = getPanBounds(camState.targetZoom);
      camState.targetTx = clamp(camState.targetTx + camState.vx * dt, -bounds.maxX, bounds.maxX);
      camState.targetTz = clamp(camState.targetTz + camState.vz * dt, -bounds.maxZ, bounds.maxZ);
      const decay = Math.exp(-5.8 * dt);
      camState.vx *= decay;
      camState.vz *= decay;
    }

    tourUpdate(dt);

    {
      const cap = Math.max(ALL_MAX_ZOOM, street.zoomCap(camState.targetTx, camState.targetTz, BASE_MAX_ZOOM, MAX_ZOOM));
      if (camState.targetZoom > cap) camState.targetZoom = cap;
    }

    const followK = 1 - Math.exp(-10.5 * dt);
    camState.tx = lerp(camState.tx, camState.targetTx, followK);
    camState.tz = lerp(camState.tz, camState.targetTz, followK);
    camState.zoom = lerp(camState.zoom, camState.targetZoom, followK);
    camState.panelShiftFactor = lerp(camState.panelShiftFactor, camState.desktopPanelOpen ? 1.0 : 0.0, followK);
    region.update(camState.zoom, dt);
    street.update(camState.tx, camState.tz, camState.zoom, camera.position);
    const streetK = street.nearK(camState.tx, camState.tz, camState.zoom);

    const pose = computeCamPose(camState.tx, camState.tz, camState.zoom, view, camState.panelShiftFactor);
    applyPoseToCamera(camera, pose);
    // 地图变大后主光的阴影框跟着视点走，远看时放宽
    {
      const sr = 22 * clamp(1 / Math.max(0.01, camState.zoom), 1, 3.2);
      const sc = keyLight.shadow.camera;
      if (Math.abs(sc.right - sr) > 0.5) {
        sc.left = -sr; sc.right = sr; sc.top = sr * 1.09; sc.bottom = -sr * 1.09; sc.far = 85 + sr * 2;
        sc.updateProjectionMatrix();
      }
      keyLight.position.set(pose.lookX - 18, 30, pose.lookZ + 14);
      keyLight.target.position.set(pose.lookX, 0, pose.lookZ);
      keyLight.target.updateMatrixWorld();
    }

    updateTileLod();

    // 查找焦点最近乡镇
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
      notifyFocus(focusTownId);
    }

    if (Math.abs(camState.zoom - camState.lastReportedZoom) > 0.04) {
      camState.lastReportedZoom = camState.zoom;
      onCameraZoomChange?.(camState.zoom);
    }

    // ========================================================================
    // 核心真地图渐进释放引擎（屏幕空间防遮挡消隐 + 随放大自适应物理尺度）
    // 放大越深，真实地理距离越宽，原本因近而退让的风物才逐级优雅站起，永不互挡！
    // ========================================================================
    const z = camState.zoom;
    const cat = camState.category;
    const rightBound = (view.w >= 920 && camState.desktopPanelOpen) ? (view.w - 388) : view.w;

    // 随缩放自适应收缩立绘物理高度：屏幕尺寸舒适一致，地面占地随放大急剧缩小，彻底拉开真实山川间隔！
    // 立绘屏幕尺寸基本恒定（相机距离 ∝ 1/z^1.06），放大时只拉开地理间距，不跟着变大挤成一团
    // 超过 12 倍（只有街区一带能到）只缓缓收，屏幕上的立绘不再变小（相机距离 ∝ 1/z^1.06，指数 0.4 抵消后略增）
    const worldScale = clamp(1.36 / Math.pow(Math.max(1.0, z), 0.62), 0.24, 0.86) * (z > BASE_MAX_ZOOM ? Math.pow(BASE_MAX_ZOOM / z, 0.4) : 1);

    // 屏幕空间最小防挡间距（像素）：确保每幅工笔立绘完整露脸不叠压
    const minGapX = isMobile ? 86 : 116;
    const minGapY = isMobile ? 76 : 98;
    const cityFocus = cityTownIds.has(camState.lockedTownId || camState.nearestTownId);
    const maxActiveStandees = (isMobile ? 9 : 13) + (cityFocus ? (isMobile ? 3 : 5) : 0);
    const topSafe = isMobile ? 150 : 76; // 手机顶部有比例尺条（约到 140px），立绘和浮签别压它
    const bottomSafe = isMobile ? 130 : 94; // 手机底部卡片约 130px

    // Step 1: 收集当前倍率与视野内有资格登场的候选立绘，并投影屏幕坐标
    const candidates = [];
    const wakeAllTier1 = z > 1.32 || cat !== 'all';
    const wakeTier2 = z > 2.15 || (cat !== 'all' && z > 1.45);

    for (const st of standees) {
      const catMatch = cat === 'all' || st.category === cat;
      if (!catMatch) {
        st.isShown = false;
        st.dotMesh.visible = false;
        continue;
      }

      const eligibleZoom = st.tier === 1 ? wakeAllTier1 : wakeTier2;
      if (!eligibleZoom) {
        st.isShown = false;
        st.dotMesh.visible = false;
        continue;
      }

      const dx = st.wx - camState.tx;
      const dz = st.wz - camState.tz;
      const d = Math.hypot(dx, dz);

      projV.set(st.wx, st.wy + st.baseH * worldScale * 0.45, st.wz).project(camera);
      const inScreen = projV.z > 0.02 && projV.z < 1;
      const sx = (projV.x * 0.5 + 0.5) * view.w;
      const sy = (-projV.y * 0.5 + 0.5) * view.h;
      // 安全框按立绘整框判：脚在底卡之上，头（含顶部浮签约 34px）在顶栏之下
      projV.set(st.wx, st.wy, st.wz).project(camera);
      const syFoot = (-projV.y * 0.5 + 0.5) * view.h;
      projV.set(st.wx, st.wy + st.baseH * worldScale, st.wz).project(camera);
      const syHead = (-projV.y * 0.5 + 0.5) * view.h - 34;
      // 左右按立绘整宽判（含右侧面板）：被切的一半就退让；已站起者放宽一点防抖
      projV.set(st.wx + (st.baseW || st.baseH * 1.15) * worldScale * 0.5, st.wy + st.baseH * worldScale * 0.5, st.wz).project(camera);
      const halfW = Math.abs((projV.x * 0.5 + 0.5) * view.w - sx) * (st.isShown ? 1.2 : 1.35); // 实测画面比 baseW 宽（纸边、透视），留余量
      const inSafeBox = inScreen && sx - halfW > 6 && sx + halfW < rightBound - 6 && syHead > topSafe && syFoot < view.h - bottomSafe;

      if (!inSafeBox) {
        st.isShown = false;
        st.dotMesh.visible = false;
        continue;
      }

      // 优先级分数：已站起(防抖) + 一级核心地标 + 焦点乡镇 + 离屏中心近
      const priority =
        (st.id === selectedStandeeId ? 200 : 0) +
        (st.id === 'gl-xuewang' && streetK > 0.3 ? 60 : 0) +
        (st.tier === 1 ? 40 : 0) +
        (cityTownIds.has(st.townId) ? (st.tier === 1 ? 30 : 8) : 0) +
        (st.featured ? 18 : 0) +
        (st.townId === focusTownId ? 10 : 0) +
        (st.isShown ? 12 : 0) -
        d * 4.5;

      // 立绘在屏幕上的真实尺寸（底边到顶边投影）+ 顶部浮签约 34px，用于防遮挡
      projV.set(st.wx, st.wy, st.wz).project(camera);
      const syBase = (-projV.y * 0.5 + 0.5) * view.h;
      projV.set(st.wx, st.wy + st.baseH * worldScale, st.wz).project(camera);
      const syTop = (-projV.y * 0.5 + 0.5) * view.h;
      const hPx = Math.max(0, syBase - syTop) + 34;
      const wPx = Math.max(0, syBase - syTop) * ((st.baseW || st.baseH * 1.15) / st.baseH) * 1.15;

      st._scr = { sx, sy, w: wPx, h: hPx };
      candidates.push({ st, sx, sy, d, priority, hPx, wPx, wasShown: st.isShown });
    }

    candidates.sort((a, b) => b.priority - a.priority);

    // Step 2: 屏幕空间防遮挡贪心放行（挡脸者退让并化为纸面微点，继续放大拉开距离即自动站起！）
    const accepted = [];
    const acceptedSet = new Set();

    for (const c of candidates) {
      // 已站起者给予 15% 滞回宽容，避免临界缩放抖动
      const hyst = c.st.isShown ? 0.94 : 1.0;
      let collides = accepted.length >= maxActiveStandees;
      if (!collides) {
        for (const prev of accepted) {
          const gx = Math.max(minGapX, (c.wPx + prev.wPx) * 0.5 + 8) * hyst;
          const gy = Math.max(minGapY, (c.hPx + prev.hPx) * 0.5 + 4) * hyst;
          if (Math.abs(c.sx - prev.sx) < gx && Math.abs(c.sy - prev.sy) < gy) {
            collides = true;
            break;
          }
        }
      }

      if (!collides) {
        // 获准站起！若为二级懒加载立绘，立刻触发加载
        if (c.st.texState === 'lazy') ensureStandeeTexture(c.st);
        accepted.push(c);
        acceptedSet.add(c.st.id);
        c.st.isShown = true;
        c.st.dotMesh.visible = false;
      } else {
        // 被更高优先级立绘在当前倍率下挡住 -> 优雅退让，只在纸面亮一颗极小微点提示「放大可现」
        c.st.isShown = false;
        c.st.dotMesh.visible = z > 1.55;
        c.st.dotMesh.scale.setScalar(clamp(1.2 / Math.pow(z, 0.72), 0.18, 0.95));
      }
    }

    // Step 2b: 新站起的立绘若与仍在折叠退场的立绘重叠，等对方倒下再站起（双指缩放过程中不出现短暂叠压）
    const leaving = [];
    for (const st of standees) {
      if (st.root.visible && st._scr && st.flap.p > 0.12 && !acceptedSet.has(st.id)) leaving.push(st._scr);
    }
    if (leaving.length) {
      for (const c of accepted) {
        if (c.wasShown) continue;
        for (const r of leaving) {
          if (Math.abs(c.sx - r.sx) < (c.wPx + r.w) * 0.5 + 6 && Math.abs(c.sy - r.sy) < (c.hPx + r.h) * 0.5 + 2) {
            acceptedSet.delete(c.st.id);
            c.st.isShown = false;
            break;
          }
        }
      }
    }

    // Step 3: 驱动 76 处立绘弹簧物理 + 收集已站起立绘的防重叠浮签
    projectedStandees.length = 0;

    for (const st of standees) {
      const wantPop = acceptedSet.has(st.id) && st.texState === 'ready';
      st.flap.target = wantPop ? 1.0 : 0.0;
      const p = clamp(st.flap.step(dt), 0, 1.15);

      const vis = p > 0.03 && st.texState === 'ready';
      st.root.visible = vis;
      if (!vis) continue;

      const breath = Math.sin(time * 1.85 + st.phase) * 0.02 * p;
      st.hingeGroup.rotation.x = lerp(-Math.PI * 0.48, 0, clamp(p, 0, 1)) + breath;

      const faceYaw = Math.atan2(camera.position.x - st.wx, Math.max(2.0, camera.position.z - st.wz));
      st.root.rotation.y = clamp(faceYaw * 0.34, -0.32, 0.32);

      if (st.hop > 0.005) {
        st.hop *= Math.exp(-7.5 * dt);
      } else {
        st.hop = 0;
      }
      // 街区近景：这一带其余立绘也缩小，别盖住街
      const inBlock = Math.hypot(st.wx - street.center.x, st.wz - street.center.z) < STREET_BLOCK_RADIUS;
      const sc = lerp(0.50, 1.0, smoothstep(0.05, 0.85, p)) * worldScale * (inBlock ? Math.max(STREET_MIN_SCALE, 1 - 0.2 * streetK) : 1) * (1 + st.hop * 0.14) * (st.id === 'gl-xiangbishan' ? Math.max(0.001, 1 - street.xiangbiK()) : 1); // 象鼻山近景试点淡入时立绘让位
      st.scaleGroup.scale.setScalar(sc);
      st.root.position.y = st.wy + st.hop * 0.24 * worldScale;
      st.tabMesh.material.opacity = clamp(p * 0.78, 0, 0.76);

      if (p > 0.56) {
        projV.set(st.wx, st.wy + st.baseH * sc + 0.14 * worldScale, st.wz).project(camera);
        if (projV.z > 0.02 && projV.z < 1) {
          const sx = (projV.x * 0.5 + 0.5) * view.w;
          const sy = (-projV.y * 0.5 + 0.5) * view.h;
          if (sx > 28 && sx < rightBound - 28 && sy > (isMobile ? 158 : 84) && sy < view.h - (isMobile ? 130 : 110)) {
            const d = Math.hypot(st.wx - camState.tx, st.wz - camState.tz);
            projectedStandees.push({
              id: st.id,
              kind: st.kind,
              title: st.title,
              featured: st.featured,
              tier: st.tier,
              sx,
              sy,
              dist: d,
              box: st._scr ? { sx: st._scr.sx, sy: st._scr.sy, w: st._scr.w * p, h: st._scr.h * p } : null,
            });
          }
        }
      }
    }

    // 地域氛围飘飞粒子更新
    const targetCol = REGION_COLORS[focusTownId] || REGION_COLORS.default;
    curParticleCol.lerp(targetCol, 1 - Math.exp(-3.0 * dt));
    pMat.color.copy(curParticleCol);
    pMat.opacity = lerp(0.20, 0.55, pose.zoomT);

    const posArr = pGeo.attributes.position.array;
    const pSpread = clamp(16 / Math.sqrt(Math.max(1, z)), 3.5, 16);
    for (let i = 0; i < PARTICLE_N; i++) {
      const ix = i * 3;
      posArr[ix] += (pVel[ix] + Math.sin(time * 0.9 + pSeed[i]) * 0.20) * dt;
      posArr[ix + 1] += pVel[ix + 1] * dt;
      posArr[ix + 2] += (pVel[ix + 2] + Math.cos(time * 0.75 + pSeed[i]) * 0.16) * dt;
      if (posArr[ix + 1] < 0.20) {
        posArr[ix] = camState.tx + (Math.random() - 0.5) * pSpread;
        posArr[ix + 1] = 3.8 + Math.random() * 3.5;
        posArr[ix + 2] = camState.tz + (Math.random() - 0.5) * pSpread;
      }
    }
    pGeo.attributes.position.needsUpdate = true;

    props.update(z);
    atmo.update(dt, time, { tx: camState.tx, tz: camState.tz, zoom: z, pose, camera, worldScale });

    renderer.render(scene, camera);

    // 实时精准地理比例尺
    const visH = 2 * Math.tan(camera.fov * DEG2RAD * 0.5) * pose.dist;
    const worldPerPx = visH / Math.max(300, view.h);
    const kmPer100Px = worldPerPx * 100 * KM_PER_WORLD_UNIT;

    projectedTowns.length = 0;
    for (const tw of townWorlds) {
      projV.set(tw.wx, tw.wy + 0.20, tw.wz).project(camera);
      const visible = projV.z > 0.02 && projV.z < 1;
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
        visible: projV.z > 0.02 && projV.z < 1 && z < 8,
      });
    }

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
      selectedStandeeId = st.id;
      camState.targetTx = st.wx;
      camState.targetTz = st.wz;
      if (camState.targetZoom < (st.tier === 2 ? 4.2 : 3.0)) {
        camState.targetZoom = st.tier === 2 ? 4.8 : 3.2;
      }
      if (st.kind === 'landmark' && st.entry) onSelectLandmark?.(st.entry);
      else if (st.kind === 'extra' && st.poi) onSelectExtra?.(st.poi);
    }
  }

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
    startTour,
    stopTour,
    isTouring: () => tour.on,
    getState: () => ({
      touring: tour.on,
      tourIdx: tour.idx,
      ...camState,
      loadedTiles: tiles.filter((t) => t.state === 'ready').length,
      totalStandees: standees.length,
      readyStandees: standees.filter((s) => s.texState === 'ready').length,
      activeStandees: standees.filter((s) => s.isShown).length,
    }),
  };
}
