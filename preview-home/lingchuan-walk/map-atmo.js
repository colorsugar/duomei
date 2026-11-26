// ============================================================================
// 灵川全境地图 · 地域画境氛围（对齐纸艺长卷的「海洋金秋 / 潮田桃花 / 大境雾凇」）
// 1) 地色：按真实地理范围给 DEM 地形调色（海洋山林转金、潮田平坝缀桃红、大境高岭覆霜），放大后铺落叶/花瓣细点
// 2) 光与雾：镜头落进某个画境时，主光、天光、雾色与桌面宣纸同步染成该境色调，放大时雾更浓、层次更深
// 3) 飘落物：银杏叶 / 桃花瓣 / 雪絮实例化翻飞，屏幕尺寸随镜头距离恒定
// 4) 剪纸银杏：海洋乡各银杏古村背后种上长卷同款白边剪纸银杏树
// 5) 屏幕氛围层：顶部暖雾、四角晕染与一道缓慢扫过的秋光（纯 CSS，合成层动画）
// ============================================================================

const PAPER = '#F5F0E3';

// 十二乡十二境：每个乡镇一种长卷同款的季候画境。中心取乡镇驻地真实经纬度（与 map-geo.json 一致），
// 地色按加权 Voronoi 分区上色，边界经噪声扰动并做水彩积色，全境总览即可一眼分出十二种色境。
// p: [林冠增益, 高处转白, 落点密度(格/单位), 落点高低偏好(-1 低处 … +1 高处)]
// q: [褪色(水墨), 落点亮度]
export const REALMS = [
  { id: 'lantian', epithet: '瑶岭云海', lon: 110.1966, lat: 25.6097, weight: 1.6, wash: 0.64,
    tint: '#6F8FB8', speckCol: '#FFFFFF', p: [0.30, 0.42, 0, 1], q: [0.18, 1.0],
    haze: '#E3E9F1', light: '#E8EEFF', fx: 'mist', overlay: '176, 196, 222', glow: '232, 238, 250' },
  { id: 'gongping', epithet: '湖光杉影', lon: 110.1571, lat: 25.4931, weight: 0.9, wash: 0.60,
    tint: '#2E9C8E', speckCol: '#E8F59A', p: [0.55, 0.0, 14, -0.6], q: [0.0, 1.0],
    haze: '#E1EEE9', light: '#F0FFF6', fx: 'firefly', overlay: '150, 200, 186', glow: '226, 244, 236' },
  { id: 'jiuwu', epithet: '江头荷风', lon: 110.251, lat: 25.5302, weight: 0.7, wash: 0.56,
    tint: '#7DBB86', speckCol: '#F4A3B8', p: [0.45, 0.0, 18, -0.9], q: [0.0, 1.0],
    haze: '#EAF1E6', light: '#FFF4F2', fx: 'lotus', overlay: '196, 222, 192', glow: '246, 236, 236' },
  { id: 'sanjie', epithet: '古驿红秋', lon: 110.3849, lat: 25.4685, weight: 0.9, wash: 0.60,
    tint: '#C9683F', speckCol: '#D9402A', p: [0.50, 0.0, 16, -0.7], q: [0.06, 1.0],
    haze: '#F3E3D6', light: '#FFE4CC', fx: 'redleaf', overlay: '222, 168, 140', glow: '252, 230, 212' },
  { id: 'tanxia', epithet: '柑橘满坡', lon: 110.2822, lat: 25.4545, weight: 0.5, wash: 0.60,
    tint: '#EE9A2C', speckCol: '#FF8418', p: [0.55, 0.0, 22, -0.3], q: [0.0, 1.0],
    haze: '#F6E8D2', light: '#FFE9C4', fx: 'blossom', overlay: '240, 196, 140', glow: '255, 238, 210' },
  { id: 'lingchuan-zhen', epithet: '甘棠春柳', lon: 110.3217, lat: 25.4129, weight: 0.4, wash: 0.56,
    tint: '#A6CE6A', speckCol: '#F6F3DC', p: [0.50, 0.0, 16, -0.6], q: [0.0, 1.0],
    haze: '#EEF2E2', light: '#FBFFE8', fx: 'catkin', overlay: '206, 226, 176', glow: '244, 248, 228' },
  { id: 'dingjiang', epithet: '八里灯市', lon: 110.2996, lat: 25.3381, weight: 0.7, wash: 0.58,
    tint: '#A57BB8', speckCol: '#FFC566', p: [0.35, 0.0, 20, -1], q: [0.10, 1.35],
    haze: '#EDE3EE', light: '#FFE2CF', fx: 'lantern', overlay: '196, 170, 206', glow: '250, 226, 214' },
  { id: 'lingtian', epithet: '走牌灯火', lon: 110.4723, lat: 25.3441, weight: 0.9, wash: 0.60,
    tint: '#D9533A', speckCol: '#FFD36A', p: [0.42, 0.0, 16, -0.8], q: [0.04, 1.3],
    haze: '#F4E1DA', light: '#FFDCC4', fx: 'spark', overlay: '226, 160, 140', glow: '255, 226, 206' },
  { id: 'haiyang', epithet: '银杏金秋', lon: 110.585, lat: 25.302, weight: 1.4, wash: 0.72,
    tint: '#E9AE33', speckCol: '#F7C22E', p: [0.50, 0.0, 20, -0.2], q: [0.0, 1.15],
    haze: '#F4DFAE', light: '#FFE0A0', fx: 'ginkgo', overlay: '236, 196, 112', glow: '255, 226, 150' },
  { id: 'daxu', epithet: '漓江烟雨', lon: 110.4224, lat: 25.1891, weight: 1.0, wash: 0.54,
    tint: '#8FB3A8', speckCol: '#EEF3F5', p: [0.30, 0.12, 0, 0], q: [0.15, 1.0],
    haze: '#E4EAEC', light: '#EEF4F8', fx: 'rain', overlay: '170, 190, 198', glow: '230, 238, 242' },
  { id: 'chaotian', epithet: '桃源花溪', lon: 110.5086, lat: 25.2, weight: 0.6, wash: 0.62,
    tint: '#F29BB0', speckCol: '#F7B6C6', p: [0.30, 0.0, 22, -0.9], q: [0.0, 1.05],
    haze: '#F6E4E2', light: '#FFE8E6', fx: 'petal', overlay: '238, 186, 196', glow: '255, 222, 228' },
  { id: 'dajing', epithet: '高岭雾凇', lon: 110.6, lat: 25.2038, weight: 1.0, wash: 0.54,
    tint: '#D6E6F0', speckCol: '#FFFFFF', p: [0.45, 0.78, 26, 1], q: [0.30, 1.0],
    haze: '#EAF0F3', light: '#EEF4FF', fx: 'snow', overlay: '208, 222, 232', glow: '240, 246, 255' },
];
// 桂林市区三境：老城（秀峰叠彩象山七星）、雁山、临桂
REALMS.push(
  { id: 'guilin-city', epithet: '山水城郭', lon: 110.296, lat: 25.272, weight: 1.1, wash: 0.50,
    tint: '#4FA595', speckCol: '#F4C542', p: [0.45, 0.0, 18, -0.4], q: [0.0, 1.15],
    haze: '#E4EFE9', light: '#FFF4D8', fx: 'osmanthus', overlay: '160, 206, 190', glow: '250, 240, 212' },
  { id: 'yanshan', epithet: '雁山花畴', lon: 110.33, lat: 25.10, weight: 1.2, wash: 0.52,
    tint: '#C2C45A', speckCol: '#F2D43A', p: [0.40, 0.0, 22, -0.9], q: [0.0, 1.1],
    haze: '#F1EED6', light: '#FFF6D6', fx: 'blossom', overlay: '214, 210, 150', glow: '252, 246, 214' },
  { id: 'lingui', epithet: '会仙湿地', lon: 110.10, lat: 25.15, weight: 2.4, wash: 0.50,
    tint: '#5DAFA8', speckCol: '#DDF2A0', p: [0.45, 0.0, 12, -0.7], q: [0.0, 1.0],
    haze: '#E2EEEA', light: '#F2FFF8', fx: 'firefly', overlay: '160, 206, 198', glow: '228, 244, 238' },

  // 桂林其余十县：每县一境，取县域中心，色调按各县最出名的风物
  { id: 'yangshuo', epithet: '碧莲群峰', lon: 110.45, lat: 24.85, weight: 1.4, wash: 0.52,
    tint: '#5E9E8A', speckCol: '#EEF3F5', p: [0.40, 0.10, 0, 0], q: [0.04, 1.0],
    haze: '#E3ECEA', light: '#EEF6F4', fx: 'mist', overlay: '168, 200, 190', glow: '232, 242, 238' },
  { id: 'lipu', epithet: '荔江芋乡', lon: 110.4, lat: 24.5, weight: 1.2, wash: 0.52,
    tint: '#9A86B8', speckCol: '#E8DDF4', p: [0.40, 0.0, 14, -0.6], q: [0.04, 1.0],
    haze: '#ECE6F0', light: '#F6EEFF', fx: 'firefly', overlay: '196, 182, 216', glow: '242, 236, 250' },
  { id: 'pingle', epithet: '三江汇流', lon: 110.8, lat: 24.58, weight: 1.2, wash: 0.52,
    tint: '#6FA7B5', speckCol: '#EEF3F5', p: [0.35, 0.05, 0, 0], q: [0.04, 1.0],
    haze: '#E2EBEE', light: '#EEF4F8', fx: 'rain', overlay: '170, 196, 204', glow: '230, 238, 242' },
  { id: 'gongcheng', epithet: '桃红油茶', lon: 110.9, lat: 24.97, weight: 1.3, wash: 0.52,
    tint: '#EE8FA6', speckCol: '#F7B6C6', p: [0.35, 0.0, 22, -0.8], q: [0.04, 1.0],
    haze: '#F6E4E4', light: '#FFE8E6', fx: 'petal', overlay: '238, 186, 196', glow: '255, 222, 228' },
  { id: 'yongfu', epithet: '福寿果乡', lon: 109.93, lat: 25.05, weight: 1.4, wash: 0.52,
    tint: '#8DB860', speckCol: '#E8F59A', p: [0.50, 0.0, 14, -0.4], q: [0.04, 1.0],
    haze: '#E8F0DE', light: '#F6FFE6', fx: 'blossom', overlay: '190, 214, 160', glow: '240, 248, 226' },
  { id: 'longsheng', epithet: '龙脊梯田', lon: 110.04, lat: 25.85, weight: 1.6, wash: 0.52,
    tint: '#D4B24A', speckCol: '#F7D26A', p: [0.45, 0.20, 18, 0.4], q: [0.04, 1.0],
    haze: '#F1E8CC', light: '#FFF0C8', fx: 'mist', overlay: '226, 206, 140', glow: '252, 240, 206' },
  { id: 'ziyuan', epithet: '丹霞资江', lon: 110.62, lat: 26.05, weight: 1.3, wash: 0.52,
    tint: '#C8663E', speckCol: '#E0603A', p: [0.45, 0.0, 16, 0.2], q: [0.04, 1.0],
    haze: '#F3E2D6', light: '#FFE4CC', fx: 'redleaf', overlay: '222, 168, 140', glow: '252, 230, 212' },
  { id: 'xing-an', epithet: '灵渠秦韵', lon: 110.62, lat: 25.66, weight: 1.3, wash: 0.52,
    tint: '#86B47C', speckCol: '#F6F3DC', p: [0.45, 0.0, 16, -0.6], q: [0.04, 1.0],
    haze: '#EAF1E4', light: '#FBFFE8', fx: 'catkin', overlay: '196, 222, 186', glow: '244, 248, 228' },
  { id: 'quanzhou', epithet: '湘源北去', lon: 111.05, lat: 25.95, weight: 1.6, wash: 0.52,
    tint: '#6E9BB0', speckCol: '#EEF3F5', p: [0.40, 0.08, 0, 0], q: [0.04, 1.0],
    haze: '#E3EAEE', light: '#EEF4FA', fx: 'mist', overlay: '170, 192, 206', glow: '232, 238, 244' },
  { id: 'guanyang', epithet: '都庞山色', lon: 111.05, lat: 25.47, weight: 1.2, wash: 0.52,
    tint: '#7C9D6E', speckCol: '#FFFFFF', p: [0.50, 0.30, 0, 1], q: [0.04, 1.0],
    haze: '#E6ECE4', light: '#F0F6EE', fx: 'mist', overlay: '184, 204, 178', glow: '236, 242, 234' },
);

export const REALM_EPITHET = Object.fromEntries(REALMS.map((r) => [r.id, r.epithet]));
const RN = REALMS.length;

// 海洋乡银杏古村（与地图立绘同一套 OSM 实测坐标）
const GINKGO_VILLAGES = [
  [110.5765, 25.3240], // 大桐木湾（大庙塘）白果王
  [110.5628, 25.3094], // 海洋乡街
  [110.5485, 25.2980], // 农家晒秋
  [110.6060, 25.2860], // 小平乐
  [110.6250, 25.2980], // 画眉弄
  [110.6520, 25.2650], // 思安头
];

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
// 飘飞物贴图（程序绘制，零额外下载）
// ---------------------------------------------------------------------------
function radial(g, stops, r = 22) {
  const grad = g.createRadialGradient(0, 0, 0.5, 0, 0, r);
  for (const [o, c] of stops) grad.addColorStop(o, c);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
}
function petalPath(g, c0, c1, c2) {
  const grad = g.createRadialGradient(0, 6, 2, 0, 0, 24);
  grad.addColorStop(0, c0);
  grad.addColorStop(0.6, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 22);
  g.bezierCurveTo(-20, 8, -16, -20, -4, -22);
  g.lineTo(0, -16);
  g.lineTo(4, -22);
  g.bezierCurveTo(16, -20, 20, 8, 0, 22);
  g.closePath();
  g.fill();
}
function drawFxTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  if (kind === 'ginkgo') {
    const grad = g.createLinearGradient(0, 22, 0, -26);
    grad.addColorStop(0, '#D99418');
    grad.addColorStop(0.55, '#F2C238');
    grad.addColorStop(1, '#FBE07A');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 14);
    g.quadraticCurveTo(-24, -2, -25, -18);
    g.quadraticCurveTo(-13, -27, -2, -22);
    g.lineTo(0, -15);
    g.lineTo(2, -22);
    g.quadraticCurveTo(13, -27, 25, -18);
    g.quadraticCurveTo(24, -2, 0, 14);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(176, 112, 20, 0.45)';
    g.lineWidth = 0.8;
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      g.moveTo(0, 13);
      g.lineTo(i * 5.2, -19 + Math.abs(i) * 0.9);
      g.stroke();
    }
    g.strokeStyle = '#B07A1A';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 13);
    g.quadraticCurveTo(2, 22, -1, 30);
    g.stroke();
  } else if (kind === 'redleaf') {
    // 红叶：卵形叶 + 叶脉
    const grad = g.createLinearGradient(-14, 22, 14, -24);
    grad.addColorStop(0, '#9E3A1E');
    grad.addColorStop(0.5, '#D2602E');
    grad.addColorStop(1, '#EE9A48');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 22);
    g.bezierCurveTo(-19, 8, -15, -16, 0, -26);
    g.bezierCurveTo(15, -16, 19, 8, 0, 22);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(120, 40, 18, 0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 22);
    g.lineTo(0, -22);
    for (let i = -3; i <= 2; i++) {
      g.moveTo(0, i * 6);
      g.lineTo(-9, i * 6 - 6);
      g.moveTo(0, i * 6);
      g.lineTo(9, i * 6 - 6);
    }
    g.stroke();
  } else if (kind === 'petal') {
    petalPath(g, '#FDE6EC', '#F7B3C4', '#EE8CA6');
  } else if (kind === 'lotus') {
    petalPath(g, '#FFF6F8', '#F9CBD6', '#EB8FA9');
  } else if (kind === 'blossom') {
    // 柑橘花：五瓣小白花 + 金蕊
    g.fillStyle = '#FFFDF6';
    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate((i / 5) * Math.PI * 2);
      g.beginPath();
      g.ellipse(0, -12, 7.5, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    radial(g, [[0, '#FFD54A'], [0.6, '#F2B21C'], [1, 'rgba(242,178,28,0)']], 8);
  } else if (kind === 'osmanthus') {
    // 桂花：四瓣小金花
    g.fillStyle = '#F2B81E';
    for (let i = 0; i < 4; i++) {
      g.save();
      g.rotate((i / 4) * Math.PI * 2 + 0.4);
      g.beginPath();
      g.ellipse(0, -9, 7, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    radial(g, [[0, '#FFE58A'], [0.6, '#F7C433'], [1, 'rgba(247,196,51,0)']], 7);
  } else if (kind === 'snow') {
    radial(g, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(250,253,255,0.85)'], [1, 'rgba(240,246,255,0)']]);
  } else if (kind === 'catkin') {
    // 柳絮：细丝绒团
    radial(g, [[0, 'rgba(255,255,250,0.95)'], [0.35, 'rgba(252,252,244,0.55)'], [1, 'rgba(250,250,240,0)']], 18);
    g.strokeStyle = 'rgba(255,255,248,0.7)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
      g.stroke();
    }
  } else if (kind === 'mist') {
    // 云絮：横向拉长的柔团
    g.scale(1.5, 0.62);
    radial(g, [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(248,250,255,0.42)'], [1, 'rgba(244,248,255,0)']], 21);
  } else if (kind === 'firefly') {
    radial(g, [[0, 'rgba(255,255,220,1)'], [0.18, 'rgba(236,255,150,0.95)'], [0.5, 'rgba(180,240,120,0.25)'], [1, 'rgba(160,230,110,0)']]);
  } else if (kind === 'lantern') {
    // 灯市暖光：圆灯笼芯 + 光晕
    radial(g, [[0, 'rgba(255,248,214,1)'], [0.22, 'rgba(255,196,96,0.95)'], [0.55, 'rgba(240,120,60,0.30)'], [1, 'rgba(230,90,50,0)']]);
  } else if (kind === 'spark') {
    radial(g, [[0, 'rgba(255,250,220,1)'], [0.2, 'rgba(255,200,90,0.95)'], [0.5, 'rgba(240,90,40,0.35)'], [1, 'rgba(220,60,30,0)']], 16);
  } else if (kind === 'rain') {
    // 烟雨：细长斜丝
    const grad = g.createLinearGradient(0, -30, 0, 30);
    grad.addColorStop(0, 'rgba(220,232,240,0)');
    grad.addColorStop(0.5, 'rgba(236,244,250,0.9)');
    grad.addColorStop(1, 'rgba(220,232,240,0)');
    g.fillStyle = grad;
    g.rotate(0.18);
    g.fillRect(-1.1, -30, 2.2, 60);
  } else {
    radial(g, [[0, 'rgba(232,246,240,0.95)'], [0.5, 'rgba(196,226,214,0.55)'], [1, 'rgba(196,226,214,0)']]);
  }
  return c;
}

// size/fall/sway/spin 均乘镜头距离，屏幕观感恒定；fall < 0 为上升（灯火、萤光）
// bill: 始终正对镜头（光点、雨丝）；add: 叠加发光
const FX_PROFILE = {
  ginkgo: { size: 0.021, fall: 0.034, sway: 0.030, spin: 2.4, opacity: 0.95, n: 1 },
  redleaf: { size: 0.019, fall: 0.036, sway: 0.032, spin: 2.6, opacity: 0.92, n: 0.8 },
  petal: { size: 0.016, fall: 0.026, sway: 0.034, spin: 2.0, opacity: 0.92, n: 1 },
  lotus: { size: 0.017, fall: 0.022, sway: 0.030, spin: 1.6, opacity: 0.9, n: 0.7 },
  blossom: { size: 0.013, fall: 0.024, sway: 0.030, spin: 1.8, opacity: 0.95, n: 0.8 },
  osmanthus: { size: 0.008, fall: 0.020, sway: 0.028, spin: 1.6, opacity: 0.95, n: 0.9 },
  snow: { size: 0.010, fall: 0.022, sway: 0.016, spin: 0.4, opacity: 0.85, n: 1 },
  catkin: { size: 0.014, fall: 0.006, sway: 0.030, spin: 0.5, opacity: 0.8, n: 0.7 },
  mist: { size: 0.16, fall: 0.0, sway: 0.020, spin: 0, opacity: 0.42, n: 0.35, bill: true, drift: 0.035 },
  firefly: { size: 0.011, fall: -0.004, sway: 0.020, spin: 0, opacity: 0.95, n: 0.6, bill: true, add: true, blink: true },
  lantern: { size: 0.017, fall: -0.016, sway: 0.010, spin: 0, opacity: 0.95, n: 0.55, bill: true, add: true, blink: true },
  spark: { size: 0.010, fall: -0.040, sway: 0.022, spin: 0, opacity: 1.0, n: 0.8, bill: true, add: true, blink: true },
  rain: { size: 0.030, fall: 0.30, sway: 0.0, spin: 0, opacity: 0.5, n: 1, bill: true },
  jade: { size: 0.012, fall: 0.012, sway: 0.016, spin: 0.3, opacity: 0.45, n: 0.6 },
};

// ---------------------------------------------------------------------------
// 地形调色着色器片段：加权 Voronoi 十二境 + 噪声扰动边界 + 水彩边缘积色 + 颜料颗粒
// ---------------------------------------------------------------------------
const FRAG_PARS = /* glsl */ `
varying vec3 vAtmoW;
uniform vec4 uRA[${RN}];
uniform vec3 uRT[${RN}];
uniform vec3 uRS[${RN}];
uniform vec4 uRP[${RN}];
uniform vec2 uRQ[${RN}];
uniform float uAtmoGlobal;
uniform float uAtmoSpeck;
uniform float uAtmoFocus;
uniform vec2 uAtmoFocusXZ;
uniform sampler2D uAtmoMask;
uniform float uAtmoTime;
uniform float uAtmoZoom;
float atmoOut = 0.0;
float atmoHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float atmoNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = atmoHash(i);
  float b = atmoHash(i + vec2(1.0, 0.0));
  float c = atmoHash(i + vec2(0.0, 1.0));
  float d = atmoHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 atmoRealm(int i, vec3 cc, float lum, float foliage, float hgt, vec2 xz) {
  vec3 tint = uRT[i];
  vec4 P = uRP[i];
  vec2 Q = uRQ[i];
  vec3 base = mix(cc, vec3(lum), Q.x);
  float tl = max(0.18, dot(tint, vec3(0.299, 0.587, 0.114)));
  vec3 wash = clamp(tint * (lum / tl) * 1.04, 0.0, 1.0);
  vec3 g = mix(base, wash, clamp(uRA[i].w * (0.62 + P.x * foliage), 0.0, 0.95));
  float frost = P.y * smoothstep(0.12, 0.62, hgt);
  g = mix(g, mix(vec3(min(1.0, lum * 1.12 + 0.1)), tint, 0.25), frost);
  if (P.z > 0.5) {
    vec2 cell = xz * P.z;
    vec2 id = floor(cell);
    vec2 f = fract(cell) - 0.5;
    vec2 off = vec2(atmoHash(id + 7.1), atmoHash(id + 3.3)) - 0.5;
    float sp = (1.0 - smoothstep(0.08, 0.22, length(f - off * 0.6))) * step(0.8, atmoHash(id)) * (0.5 + 0.5 * atmoNoise(xz * 1.3));
    float bias = P.w > 0.0 ? hgt : 1.0 - hgt;
    sp *= mix(1.0, smoothstep(0.1, 0.7, bias), abs(P.w));
    g = mix(g, uRS[i] * Q.y, clamp(sp * uAtmoSpeck * 0.7, 0.0, 1.0));
  }
  return g;
}
`;

const FRAG_APPLY = /* glsl */ `
{
  vec3 c0 = diffuseColor.rgb;
  float lum = dot(c0, vec3(0.299, 0.587, 0.114));
  float mx = max(c0.r, max(c0.g, c0.b));
  float sat = mx - min(c0.r, min(c0.g, c0.b));
  float foliage = clamp((c0.g - max(c0.r, c0.b)) * 5.0, 0.0, 1.0);
  float water = clamp((c0.b - max(c0.r, c0.g)) * 9.0, 0.0, 1.0);
  float inside = texture2D(uAtmoMask, vAtmoW.xz / vec2(__MW__, __MD__) + 0.5).r;
  atmoOut = 1.0 - inside;
  float hgt = clamp(vAtmoW.y / 1.58, 0.0, 1.0);
  vec2 xz = vAtmoW.xz;
  vec2 wp = xz + (vec2(atmoNoise(xz * 0.55), atmoNoise(xz * 0.55 + 19.3)) - 0.5) * 1.5
               + (vec2(atmoNoise(xz * 2.1 + 5.0), atmoNoise(xz * 2.1 + 41.0)) - 0.5) * 0.4;
  float d1 = 1e9;
  float d2 = 1e9;
  int i1 = 0;
  int i2 = 0;
  for (int i = 0; i < ${RN}; i++) {
    vec2 dv = wp - uRA[i].xy;
    float d = dot(dv, dv) - uRA[i].z;
    if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; }
    else if (d < d2) { d2 = d; i2 = i; }
  }
  float gap = d2 - d1;
  vec3 g1 = atmoRealm(i1, c0, lum, foliage, hgt, xz);
  vec3 g2 = atmoRealm(i2, c0, lum, foliage, hgt, xz);
  vec3 g = mix(g2, g1, 0.5 + 0.5 * smoothstep(0.0, 2.6, gap));
  // 水彩积色：分区交界处颜料沉淀成一道略深的毛边
  float edge = (1.0 - smoothstep(0.05, 0.7, gap)) * (0.6 + 0.4 * atmoNoise(xz * 5.0));
  g *= 1.0 - 0.10 * edge * uAtmoGlobal;
  // 颜料颗粒
  float gran = atmoNoise(xz * 9.0) * 0.6 + atmoNoise(xz * 23.0) * 0.4;
  g *= 0.955 + 0.09 * gran;
  // 镜头所在境放大时再加浓
  float focusW = uAtmoFocus * (1.0 - smoothstep(2.0, 4.5, distance(xz, uAtmoFocusXZ)));
  float amt = clamp(uAtmoGlobal + focusW * 0.35, 0.0, 1.0) * inside * (1.0 - water * 0.7);
  diffuseColor.rgb = mix(c0, g, amt);
  // 江湖水面：缓缓流动的粼光
  if (water > 0.05) {
    vec2 q = xz * vec2(5.5, 9.0) + vec2(uAtmoTime * 0.35, uAtmoTime * 0.12);
    float rip = atmoNoise(q) * atmoNoise(q * 1.9 + 7.0);
    float glint = smoothstep(0.42, 0.62, rip) * (0.55 + 0.45 * sin(uAtmoTime * 1.7 + xz.x * 3.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.99, 1.0), glint * water * 0.55);
  }
  // 云影：大片的云影慢慢掠过山野（总览时最明显）
  float cs = atmoNoise(xz * 0.16 + vec2(uAtmoTime * 0.018, uAtmoTime * 0.007)) * 0.65
           + atmoNoise(xz * 0.41 + vec2(uAtmoTime * 0.03, -uAtmoTime * 0.01)) * 0.35;
  float cloudShade = smoothstep(0.52, 0.78, cs) * (1.0 - smoothstep(1.2, 3.0, uAtmoZoom)) * inside;
  diffuseColor.rgb *= 1.0 - cloudShade * 0.16;
}
`;

const FRAG_FOG = /* glsl */ `
#ifdef USE_FOG
{
  // 县界外宣纸与地形四缘：溶进雾色，县域如长卷浮在纸上，消掉矩形硬边
  vec2 uvw = vAtmoW.xz / vec2(__MW__, __MD__) + 0.5;
  float ed = min(min(uvw.x, 1.0 - uvw.x), min(uvw.y, 1.0 - uvw.y));
  float edgeF = 1.0 - smoothstep(0.0, 0.12, ed);
  float melt = max(edgeF, atmoOut);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, melt);
}
#endif
`;

export function createMapAtmosphere({
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
  host,
  mapW = 40,
  mapD = 40,
}) {
  // -------------------------------------------------------------------------
  // 共享 uniforms（地形 L0 与 20 张瓦片共用）
  // -------------------------------------------------------------------------
  const realmWorld = REALMS.map((r) => {
    const w = lonLatToWorld(r.lon, r.lat);
    return { ...r, wx: w.x, wz: w.z, w2: r.weight * 4.0, hazeCol: new THREE.Color(r.haze), lightCol: new THREE.Color(r.light) };
  });
  const haiyangRealm = realmWorld.find((r) => r.id === 'haiyang');
  const col = (hex) => new THREE.Color(hex);

  const uniforms = {
    uRA: { value: realmWorld.map((r) => new THREE.Vector4(r.wx, r.wz, r.w2, r.wash)) },
    uRT: { value: realmWorld.map((r) => col(r.tint)) },
    uRS: { value: realmWorld.map((r) => col(r.speckCol)) },
    uRP: { value: realmWorld.map((r) => new THREE.Vector4(...r.p)) },
    uRQ: { value: realmWorld.map((r) => new THREE.Vector2(...r.q)) },
    uAtmoGlobal: { value: 0.6 },
    uAtmoSpeck: { value: 0 },
    uAtmoFocus: { value: 0 },
    uAtmoFocusXZ: { value: new THREE.Vector2() },
    uAtmoMask: { value: null },
    uAtmoTime: { value: 0 },
    uAtmoZoom: { value: 1 },
  };

  function patchMaterial(mat) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, r) => {
      prev?.(shader, r);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vAtmoW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvAtmoW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAG_APPLY}`.replace(/__MW__/g, mapW.toFixed(1)).replace(/__MD__/g, mapD.toFixed(1)))
        .replace('#include <fog_fragment>', `#include <fog_fragment>\n${FRAG_FOG}`.replace(/__MW__/g, mapW.toFixed(1)).replace(/__MD__/g, mapD.toFixed(1)));
    };
    const prevKey = mat.customProgramCacheKey?.bind(mat);
    mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|lc-atmo-v4`;
    mat.needsUpdate = true;
  }

  // -------------------------------------------------------------------------
  // 光、雾与桌面宣纸的基准色
  // -------------------------------------------------------------------------
  const base = {
    hemi: hemi.color.clone(),
    hemiI: hemi.intensity,
    key: keyLight.color.clone(),
    keyI: keyLight.intensity,
    paper: new THREE.Color(PAPER),
    fogDensity: scene.fog.density,
  };
  const curHaze = base.paper.clone();
  const curLight = base.key.clone();
  const tmpCol = new THREE.Color();

  // -------------------------------------------------------------------------
  // 飘落物（实例化翻飞的叶/瓣/雪）
  // -------------------------------------------------------------------------
  const FX_N = isMobile ? 70 : 130;
  const fxTextures = {};
  for (const k of Object.keys(FX_PROFILE)) {
    const tex = new THREE.CanvasTexture(drawFxTexture(k));
    tex.colorSpace = THREE.SRGBColorSpace;
    fxTextures[k] = tex;
  }
  const fxMat = new THREE.MeshBasicMaterial({
    map: fxTextures.jade,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
  const fxMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), fxMat, FX_N);
  fxMesh.frustumCulled = false;
  fxMesh.renderOrder = 8;
  scene.add(fxMesh);
  const rnd = mulberry32(20261126);
  const fx = Array.from({ length: FX_N }, () => ({
    x: 0, y: -99, z: 0,
    ax: rnd() - 0.5, ay: rnd() - 0.5, az: rnd() - 0.5,
    rot: rnd() * 6.28,
    spin: 0.6 + rnd() * 0.8,
    s: 0.7 + rnd() * 0.6,
    ph: rnd() * 6.28,
    v: 0.75 + rnd() * 0.5,
  }));
  let fxKind = 'jade';
  let fxTargetKind = 'jade';
  let fxAlpha = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();

  function respawn(p, anchor, spread, initial, prof) {
    p.x = anchor.x + (rnd() - 0.5) * 2 * spread.x;
    p.z = anchor.z + (rnd() * 1.6 - 1.1) * spread.z;
    const top = anchor.y + spread.h;
    if (prof.fall < 0) {
      // 上升类（灯火、萤光）：从地面附近升起
      const g = sampleElevation(p.x, p.z);
      p.y = initial ? lerp(g, top, rnd()) : g + 0.02 + rnd() * spread.h * 0.1;
    } else if (prof.fall === 0) {
      // 云絮：悬在半山
      p.y = anchor.y + spread.h * (0.12 + rnd() * 0.35);
      if (!initial) p.x = anchor.x - spread.x * 1.25;
    } else {
      p.y = initial ? lerp(anchor.y + spread.h * 0.1, top, rnd()) : top * (0.85 + rnd() * 0.15);
    }
  }

  // -------------------------------------------------------------------------
  // 剪纸银杏（海洋乡古村背后 + 山间散植）
  // -------------------------------------------------------------------------
  const decor = [];
  const decorGroup = new THREE.Group();
  scene.add(decorGroup);
  let insideTest = null;
  if (baseImg && baseImg.naturalWidth) {
    try {
      const cw = 400;
      const ch = Math.round(400 * baseImg.naturalHeight / baseImg.naturalWidth);
      const cv = document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      const cg = cv.getContext('2d', { willReadFrequently: true });
      cg.drawImage(baseImg, 0, 0, cw, ch);
      const data = cg.getImageData(0, 0, cw, ch).data;
      insideTest = (u, v) => {
        const px = clamp(Math.round(u * (cw - 1)), 0, cw - 1);
        const py = clamp(Math.round(v * (ch - 1)), 0, ch - 1);
        const i = (py * cw + px) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const paperDist = Math.abs(r - 245) + Math.abs(g - 240) + Math.abs(b - 227);
        const water = b > g + 4 && b > r;
        return paperDist > 40 && !water;
      };
      // 县域蒙版：只给县界内上色，界外宣纸保持素净
      const mk = document.createElement('canvas');
      mk.width = cw;
      mk.height = ch;
      const mg = mk.getContext('2d');
      const md = mg.createImageData(cw, ch);
      for (let i = 0; i < data.length; i += 4) {
        const pd = Math.abs(data[i] - 245) + Math.abs(data[i + 1] - 240) + Math.abs(data[i + 2] - 227);
        const v = pd > 40 ? 255 : 0;
        md.data[i] = md.data[i + 1] = md.data[i + 2] = v;
        md.data[i + 3] = 255;
      }
      mg.putImageData(md, 0, 0);
      const mb = document.createElement('canvas');
      mb.width = cw;
      mb.height = ch;
      const mbg = mb.getContext('2d');
      mbg.filter = 'blur(2.5px)';
      mbg.drawImage(mk, 0, 0);
      const maskTex = new THREE.CanvasTexture(mb);
      maskTex.flipY = false;
      maskTex.needsUpdate = true;
      uniforms.uAtmoMask.value = maskTex;
    } catch {
      insideTest = null;
    }
  }

  function buildDecor(standees) {
    if (!buildDieCutTexture) return;
    const keys = ['cut-ginkgo-tall', 'cut-ginkgo', 'cut-ginkgo-leaning'];
    const mats = [];
    for (const k of keys) {
      try {
        const built = buildDieCutTexture(k, { rim: true, kraftBack: false }, maxAniso);
        if (!built?.tex) continue;
        mats.push({
          aspect: built.aspect || 0.7,
          mat: new THREE.MeshLambertMaterial({
            map: built.tex,
            alphaTest: 0.45,
            side: THREE.DoubleSide,
          }),
        });
      } catch {
        /* 缺图则跳过 */
      }
    }
    if (!mats.length) return;

    const standeeXZ = standees.map((s) => [s.wx, s.wz]);
    const tooCloseToStandee = (x, z, r) => standeeXZ.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < r);
    const r2 = mulberry32(5288);
    const spots = [];

    // 古村背后：每村 3 株，偏北（镜头从南看过去即在立绘身后）
    for (const [lon, lat] of GINKGO_VILLAGES) {
      const w = lonLatToWorld(lon, lat);
      const offs = [[-0.95, -0.55], [0.1, -1.05], [1.0, -0.5]];
      for (const [dx, dz] of offs) {
        spots.push({ x: w.x + dx * (0.85 + r2() * 0.3), z: w.z + dz * (0.85 + r2() * 0.3), big: true });
      }
    }
    // 山间散植：海洋山谷地内随机，避开立绘与县界外
    const hy = haiyangRealm;
    let guard = 0;
    while (spots.length < (isMobile ? 34 : 42) && guard++ < 600) {
      const a = r2() * Math.PI * 2;
      const rr = Math.sqrt(r2()) * 2.6;
      const x = hy.wx + Math.cos(a) * rr;
      const z = hy.wz + Math.sin(a) * rr;
      if (tooCloseToStandee(x, z, 0.75)) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 0.32)) continue;
      spots.push({ x, z, big: false });
    }

    for (const sp of spots) {
      if (tooCloseToStandee(sp.x, sp.z, 0.55)) continue;
      if (insideTest) {
        const u = (sp.x / mapW) + 0.5;
        const v = (sp.z / mapD) + 0.5;
        if (!insideTest(u, v)) continue;
      }
      const pick = mats[Math.floor(r2() * mats.length)];
      const h = sp.big ? 1.0 + r2() * 0.3 : 0.72 + r2() * 0.3;
      const geo = new THREE.PlaneGeometry(h * clamp(pick.aspect, 0.5, 1.3), h);
      geo.translate(0, h * 0.5, 0);
      const mesh = new THREE.Mesh(geo, pick.mat);
      mesh.visible = false;
      mesh.scale.setScalar(0.001);
      if (r2() < 0.5) mesh.scale.x *= -1;
      decorGroup.add(mesh);
      decor.push({ mesh, x: sp.x, z: sp.z, flip: mesh.scale.x < 0 ? -1 : 1, delay: r2() * 0.25 });
    }
  }

  // -------------------------------------------------------------------------
  // 屏幕氛围层（CSS）
  // -------------------------------------------------------------------------
  let overlay = null;
  if (host) {
    overlay = document.createElement('div');
    overlay.className = 'lc-atmo';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<i class="lc-atmo-sweep"></i><i class="lc-tilt lc-tilt-top"></i><i class="lc-tilt lc-tilt-bot"></i>';
    host.insertBefore(overlay, host.firstChild);
  }
  let lastOverlayKey = '';

  // -------------------------------------------------------------------------
  // 每帧更新
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // 山间流云：总览时在高山上空飘几团白云，放大后散去
  // -------------------------------------------------------------------------
  const cloudTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d');
    const r = mulberry32(31);
    for (let i = 0; i < 26; i++) {
      const x = 40 + r() * 176;
      const y = 50 + r() * 40 - Math.abs(x - 128) * 0.12;
      const rad = 18 + r() * 30;
      const gr = g.createRadialGradient(x, y, 1, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0, fog: false, toneMapped: false });
  const clouds = [];
  {
    const r = mulberry32(77);
    for (let i = 0; i < (isMobile ? 9 : 14); i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), cloudMat);
      m.renderOrder = 9;
      const s = 4.5 + r() * 5;
      m.scale.set(s, s, 1);
      m.userData = { x: (r() - 0.5) * mapW * 0.7, z: (r() - 0.5) * mapD * 0.6, y: 3.2 + r() * 1.6, v: 0.10 + r() * 0.12 };
      scene.add(m);
      clouds.push(m);
    }
  }

  function update(dt, time, { tx, tz, zoom, pose, camera, worldScale }) {
    uniforms.uAtmoTime.value = time;
    uniforms.uAtmoZoom.value = zoom;
    const cloudA = 1 - smoothstep(0.8, 1.5, zoom);
    cloudMat.opacity = cloudA * 0.85;
    for (const m of clouds) {
      m.visible = cloudA > 0.02;
      if (!m.visible) continue;
      const u = m.userData;
      u.x += u.v * dt;
      if (u.x > mapW * 0.38) u.x = -mapW * 0.38;
      m.position.set(u.x, u.y, u.z);
      m.quaternion.copy(camera.quaternion);
    }
    // 1) 地色强度：全境总览即显十二境，放大后铺满并加浓镜头所在一境
    uniforms.uAtmoGlobal.value = lerp(0.82, 0.92, smoothstep(1.15, 2.6, zoom));
    uniforms.uAtmoSpeck.value = smoothstep(2.0, 3.8, zoom);

    // 2) 镜头所在画境（与着色器同一套加权 Voronoi）
    const zf = smoothstep(1.2, 2.4, zoom);
    let dom = null;
    let d1 = Infinity;
    let d2 = Infinity;
    for (const r of realmWorld) {
      const d = (r.wx - tx) ** 2 + (r.wz - tz) ** 2 - r.w2;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        dom = r;
      } else if (d < d2) {
        d2 = d;
      }
    }
    const domW = zf * smoothstep(0.0, 1.6, d2 - d1);
    uniforms.uAtmoFocus.value = lerp(uniforms.uAtmoFocus.value, domW, 1 - Math.exp(-3 * dt));
    if (dom) uniforms.uAtmoFocusXZ.value.set(dom.wx, dom.wz);

    const k = 1 - Math.exp(-2.4 * dt);
    tmpCol.copy(base.paper);
    if (dom) tmpCol.lerp(dom.hazeCol, domW);
    curHaze.lerp(tmpCol, k);
    scene.fog.color.copy(curHaze);
    if (scene.background?.isColor) scene.background.copy(curHaze);
    tableMat.color.copy(curHaze);
    scene.fog.density = lerp(base.fogDensity * 0.45, 0.0125, smoothstep(0.75, 3.6, zoom));

    tmpCol.copy(base.key);
    if (dom) tmpCol.lerp(dom.lightCol, domW * 0.85);
    curLight.lerp(tmpCol, k);
    keyLight.color.copy(curLight);
    keyLight.intensity = base.keyI + (dom && dom.id === 'haiyang' ? 0.16 * domW : 0);
    hemi.color.copy(base.hemi).lerp(curHaze, 0.35 * domW);

    // 3) 飘飞物：每境一种（银杏 / 桃瓣 / 雾凇雪 / 云絮 / 萤光 / 荷瓣 / 红叶 / 橘花 / 柳絮 / 灯火 / 火星 / 烟雨）
    fxTargetKind = dom && domW > 0.18 ? dom.fx : 'jade';
    const wantAlpha = fxTargetKind === 'jade' ? 0.5 * zf : clamp(domW * 1.25, 0, 1);
    if (fxTargetKind !== fxKind) {
      fxAlpha = Math.max(0, fxAlpha - dt * 2.5);
      if (fxAlpha <= 0.01) {
        fxKind = fxTargetKind;
        const pf = FX_PROFILE[fxKind];
        fxMat.map = fxTextures[fxKind];
        fxMat.blending = pf.add ? THREE.AdditiveBlending : THREE.NormalBlending;
        fxMat.needsUpdate = true;
        for (const p of fx) p.y = -99;
      }
    } else {
      fxAlpha = lerp(fxAlpha, wantAlpha, 1 - Math.exp(-2.0 * dt));
    }
    const prof = FX_PROFILE[fxKind];
    fxMat.opacity = fxAlpha * prof.opacity;
    fxMesh.visible = fxMat.opacity > 0.01;

    if (fxMesh.visible) {
      const dist = pose.dist;
      const hTan = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
      const anchor = { x: pose.lookX, y: pose.lookY, z: pose.lookZ ?? tz };
      const camH = camera.position.y - pose.lookY;
      const spread = { x: dist * hTan * 1.15, z: dist * 0.55, h: camH * 0.62 };
      const size = dist * prof.size;
      const fall = dist * prof.fall;
      const sway = dist * prof.sway;
      const drift = dist * (prof.drift || 0);
      const activeN = Math.round(FX_N * prof.n);
      const top = anchor.y + spread.h;
      for (let i = 0; i < FX_N; i++) {
        const p = fx[i];
        if (i >= activeN) {
          s3.setScalar(0);
          m4.compose(v3.set(0, -99, 0), q.identity(), s3);
          fxMesh.setMatrixAt(i, m4);
          continue;
        }
        if (p.y < -50) respawn(p, anchor, spread, true, prof);
        p.y -= fall * p.v * dt;
        p.x += (Math.sin(time * 0.9 + p.ph) * sway + sway * 0.6 + drift * p.v) * dt;
        p.z += Math.cos(time * 0.7 + p.ph) * sway * 0.5 * dt;
        p.rot += prof.spin * p.spin * dt;
        const ground = sampleElevation(p.x, p.z);
        const out = Math.abs(p.x - anchor.x) > spread.x * 1.3 || p.z - anchor.z > spread.z * 0.9 || anchor.z - p.z > spread.z * 1.6;
        if ((prof.fall > 0 && p.y < ground + 0.02) || (prof.fall < 0 && p.y > top) || out) {
          respawn(p, anchor, spread, false, prof);
        }
        let sc = size * p.s;
        if (prof.blink) sc *= 0.55 + 0.45 * Math.max(0, Math.sin(time * (1.6 + p.spin) + p.ph * 3));
        if (prof.bill) {
          q.copy(camera.quaternion);
        } else {
          e3.set(p.rot * p.ax * 1.6, p.rot * p.ay * 1.6 + p.ph, p.rot * p.az * 1.6 + Math.sin(time * 1.3 + p.ph) * 0.6);
          q.setFromEuler(e3);
        }
        v3.set(p.x, p.y, p.z);
        s3.set(sc * (prof.fall === 0 ? 1.0 : 1), sc * (fxKind === 'rain' ? 2.4 : 1), sc);
        m4.compose(v3, q, s3);
        fxMesh.setMatrixAt(i, m4);
      }
      fxMesh.instanceMatrix.needsUpdate = true;
    }

    // 4) 剪纸银杏：镜头靠近海洋乡、放大到 1.7× 以上时逐株立起
    if (decor.length) {
      const hy = haiyangRealm;
      const near = 1 - smoothstep(4.0, 7.0, Math.hypot(hy.wx - tx, hy.wz - tz));
      const grow = smoothstep(1.7, 2.5, zoom) * near;
      decorGroup.visible = grow > 0.01;
      if (decorGroup.visible) {
        const ws = worldScale;
        for (const d of decor) {
          const g = clamp((grow - d.delay) / (1 - d.delay), 0, 1);
          d.mesh.visible = g > 0.01;
          if (!d.mesh.visible) continue;
          const sc = ws * (0.35 + 0.65 * g);
          d.mesh.scale.set(sc * d.flip, sc * (0.2 + 0.8 * g), sc);
          d.mesh.position.set(d.x, sampleElevation(d.x, d.z) - 0.01, d.z);
          const faceYaw = Math.atan2(camera.position.x - d.x, Math.max(2.0, camera.position.z - d.z));
          d.mesh.rotation.y = clamp(faceYaw * 0.34, -0.32, 0.32) + Math.sin(time * 0.8 + d.x * 3.1) * 0.02;
        }
      }
    }

    // 5) 屏幕氛围层
    if (overlay) {
      const a = dom ? domW : 0;
      const ov = dom ? dom.overlay : '220, 232, 226';
      const glow = dom ? dom.glow : '236, 244, 240';
      const fxName = dom && domW > 0.18 ? dom.fx : 'jade';
      const alpha = dom ? a : 0.55 * zf;
      const tilt = smoothstep(1.6, 3.0, zoom);
      const key = `${ov}|${fxName}|${alpha.toFixed(2)}|${tilt.toFixed(2)}`;
      if (key !== lastOverlayKey) {
        lastOverlayKey = key;
        overlay.style.setProperty('--atmo-rgb', ov);
        overlay.style.setProperty('--atmo-glow', glow);
        overlay.style.setProperty('--atmo-a', alpha.toFixed(2));
        overlay.style.setProperty('--tilt', tilt.toFixed(2));
        overlay.dataset.fx = fxName;
      }
    }
  }

  return { patchMaterial, buildDecor, update };
}
