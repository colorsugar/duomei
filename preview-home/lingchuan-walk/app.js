import * as THREE from 'three';
import { SEGMENTS, PORTAL_SPECS, LANDMARK_SPECS, COMPANION_SPECS } from './landmarks-data.js';
import { createMapView, extraPoiToCardSpec } from './map-view.js';
import { createInteractive3DMap } from './map-3d.js';
import { sharePayload } from './share-card.js';

// ============================================================================
// Viewport Cache, Asset Path Router & Verified Local Manifest (Zero 404s)
// ============================================================================
let viewW = window.innerWidth || 390;
let viewH = Math.max(1, window.innerHeight || 700);
let viewAspect = viewW / viewH;
const IS_MOBILE = Math.min(viewW, viewH) < 760;

function getAssetUrl(name, forceFull = false) {
  if (!name) return '';
  if (name.startsWith('map/')) return `./img/${name}.webp`;
  const isLc = name.startsWith('lc-');
  if (isLc) {
    return (!forceFull && IS_MOBILE) ? `./img/m/${name}.webp` : `./img/${name}.webp`;
  }
  return (!forceFull && IS_MOBILE) ? `../storybook/img/m/${name}.webp` : `../storybook/img/${name}.webp`;
}

// Collect all unique image keys from 32 lc-* cutouts + backdrops + companion props
const STORYBOOK_ASSETS = [
  'map/lingchuan-dem-l0', 'map/lingchuan-dashankou', 'map/lingchuan-lion-dance',
  'gr-guilin', 'gr-lingchuan',
  'bd-guilin', 'bd-lingchuan', 'hero-karst', 'karst', 'ridge',
  'cut-raft', 'cut-banyan', 'cut-yulongbridge', 'cut-beerfish',
  'cut-oldhouse', 'cut-streethouses', 'cut-mifen-stove', 'cut-shop-wall',
  'cut-ginkgo', 'cut-ginkgo-tall', 'cut-ginkgo-leaning', 'cut-ginkgo-cat', 'cut-ginkgo-shaiqiu', 'cut-youcha',
  'cut-firepit', 'cut-diners', 'cut-stools', 'cut-mifen-bowl', 'cut-mifen-condiments', 'cut-snail', 'cut-pomelo',
];

const ASSET_LIST = Array.from(new Set([
  ...STORYBOOK_ASSETS,
  ...LANDMARK_SPECS.map((s) => s.img),
  ...COMPANION_SPECS.map((s) => s.img),
]));

const IMAGES = {};

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Six-Realm S-Curve Long-Scroll Spine Mathematics (Z_SPAN = 240, z: -2 -> -242)
// ============================================================================
const Z_START = -2.0;
const Z_SPAN = 240.0;

function zFromS(s) {
  return Z_START - s * Z_SPAN;
}

/** Gentle S-curve meandering within [-1.58, +1.58] so forward scenery sits in golden center */
function pathX(z) {
  return 1.32 * Math.sin(-z * 0.072 + 0.30) + 0.25 * Math.sin(-z * 0.165 + 1.05);
}

function pathDXDZ(z) {
  return -1.32 * 0.072 * Math.cos(-z * 0.072 + 0.30) - 0.25 * 0.165 * Math.cos(-z * 0.165 + 1.05);
}

// ============================================================================
// Papertrails 240Hz Spring Hinge & Travelling Wind Gusts
// ============================================================================
class FlapSpring {
  constructor({ p = 0, size = 0.45, jitter = 0 } = {}) {
    const t = clamp((size - 0.12) / 0.58, 0, 1);
    const fs = (1.16 + (0.88 - 1.16) * t) * (1 + jitter * 0.04);
    const wob = 1 + t;
    this.fs = fs;
    this.p = p;
    this.v = 0;
    this.target = p;
    this.locked = p >= 1;
    this.atRest = true;
    this.kUp = 68 * fs * fs;
    this.cUp = 5.1 * fs * (1 - 0.48 * t);
    this.wL = 2 * Math.PI * (4.85 + jitter * 0.4);
    this.zL = 0.044 / Math.sqrt(wob);
    this.dragL = 3.3 / Math.sqrt(wob);
    this.fricL = 2.1 * fs * (1 + 0.72 * t);
    this.kDn = 11.2 * fs * fs;
    this.cDn = 4.8 * fs;
    this.gDn = 5.4 * fs * fs;
    this.antic = 1.1 * fs;
    this.rest = 0.2;
    this.minBounce = 0.48 * fs;
  }

  set(target) {
    if (target === this.target) return;
    if (target === 0 && this.atRest && this.p >= 1) {
      this.v = this.antic;
    }
    this.target = target;
    this.atRest = false;
    if (target === 0) this.locked = false;
  }

  step(dt) {
    if (this.atRest) return this.p;
    const clampedDt = Math.min(dt, 0.05);
    const n = Math.max(1, Math.ceil(clampedDt * 240));
    const h = clampedDt / n;
    for (let i = 0; i < n && !this.atRest; i++) {
      let a;
      if (this.target === 1) {
        if (!this.locked && this.p >= 1) this.locked = true;
        if (this.locked) {
          a = -this.wL * this.wL * (this.p - 1)
            - (2 * this.zL * this.wL + this.dragL * Math.abs(this.v) + this.fricL / (Math.abs(this.v) + 0.05)) * this.v;
        } else {
          a = this.kUp * (1 - this.p) - this.cUp * this.v;
        }
      } else {
        a = -this.kDn * this.p - this.cDn * this.v - this.gDn;
        if (this.v > 0) a -= this.cUp * this.v * Math.min(1, this.p);
        if (this.p > 1) a -= this.wL * this.wL * (this.p - 1) + 2 * this.zL * this.wL * this.v;
      }
      this.v += a * h;
      this.p += this.v * h;
      if (this.p <= 0 && this.target === 0) {
        this.p = 0;
        this.v = this.v < -this.minBounce ? -this.v * this.rest : 0;
        if (this.v === 0) this.atRest = true;
      }
      if (this.target === 1 && Math.abs(this.p - 1) < 0.0018 && Math.abs(this.v) < 0.02) {
        this.p = 1;
        this.v = 0;
        this.atRest = true;
      }
    }
    return this.p;
  }
}

function windSway(time, x, z, ampDeg = 1.2, phase = 0) {
  const wx = x * 0.22;
  const wz = z * 0.22;
  const dx = 0.858;
  const dz = 0.514;
  const gustA = (wx * dx + wz * dz) * 0.44 - time * 0.72 + 1.4 * Math.sin((wz * dx - wx * dz) * 0.25);
  const gustB = (wx * 0.31 - wz * 0.95) * 0.76 - time * 1.22;
  const env = 0.5 + 0.32 * Math.sin(gustA) + 0.18 * Math.sin(gustB);
  const flutter = 3.9 * time + phase - (wx * dx + wz * dz) * 1.1;
  const energy = 0.36 + 0.64 * env;
  return (ampDeg * Math.PI / 180) * (0.45 * (env - 0.3) + energy * (0.55 * Math.sin(flutter) + 0.12 * Math.sin(2.3 * flutter + 1.4)));
}

// ============================================================================
// Rice-Paper Subsurface Lambert Material & Texture Factories
// ============================================================================
const PAPER_UNIFORMS = {
  wrap: { value: 0.36 },
  leak: { value: new THREE.Color('#9A7548') },
  trans: { value: 0.28 },
  transTint: { value: new THREE.Color('#FFD694') },
};

const PAPER_LAMBERT_CHUNK = /* glsl */ `
varying vec3 vViewPosition;
uniform float uPaperWrap;
uniform vec3 uPaperLeak;
uniform float uPaperTrans;
uniform vec3 uPaperTransTint;
float gPaperShadow = 1.0;
struct LambertMaterial { vec3 diffuseColor; float specularStrength; };
void RE_Direct_Lambert(
  const in IncidentLight directLight,
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 geometryClearcoatNormal,
  const in LambertMaterial material,
  inout ReflectedLight reflectedLight
) {
  float nl = dot( geometryNormal, directLight.direction );
  float front = saturate( ( nl + uPaperWrap ) / ( 1.0 + uPaperWrap ) );
  vec3 irradiance = front * directLight.color * mix( uPaperLeak, vec3( 1.0 ), gPaperShadow );
  float back = saturate( ( -nl + 0.12 ) / 1.12 );
  irradiance += back * uPaperTrans * uPaperTransTint * directLight.color * gPaperShadow;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  gPaperShadow = 1.0;
}
void RE_IndirectDiffuse_Lambert(
  const in vec3 irradiance,
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 geometryClearcoatNormal,
  const in LambertMaterial material,
  inout ReflectedLight reflectedLight
) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Lambert
#define RE_IndirectDiffuse RE_IndirectDiffuse_Lambert
`;

let patchedLightsBegin = null;
function getPatchedLightsBegin() {
  if (patchedLightsBegin !== null) return patchedLightsBegin;
  const src = THREE.ShaderChunk.lights_fragment_begin;
  const key = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]';
  const idx = src.indexOf(key);
  if (idx < 0) {
    patchedLightsBegin = src;
    return src;
  }
  const end = src.indexOf(';', idx) + 1;
  const call = src.slice(idx + 'directLight.color *= '.length, end);
  patchedLightsBegin = src.slice(0, idx) + 'gPaperShadow = ' + call + '\n' + src.slice(end);
  return patchedLightsBegin;
}

function makePaperMaterial(params = {}) {
  const mat = new THREE.MeshLambertMaterial(params);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPaperWrap = PAPER_UNIFORMS.wrap;
    shader.uniforms.uPaperLeak = PAPER_UNIFORMS.leak;
    shader.uniforms.uPaperTrans = PAPER_UNIFORMS.trans;
    shader.uniforms.uPaperTransTint = PAPER_UNIFORMS.transTint;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_lambert_pars_fragment>', PAPER_LAMBERT_CHUNK)
      .replace('#include <lights_fragment_begin>', getPatchedLightsBegin());
  };
  mat.customProgramCacheKey = () => 'lingchuan-paper-v3';
  return mat;
}

function createCleanXuanPaperTile(size = 512, seed = 23, baseColor = '#F4EFE6') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = baseColor;
  g.fillRect(0, 0, size, size);

  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 8 + rnd() * 20;
    const ang = rnd() * Math.PI * 2;
    g.strokeStyle = rnd() > 0.45 ? 'rgba(205, 192, 170, 0.12)' : 'rgba(255, 253, 248, 0.22)';
    g.lineWidth = 0.5 + rnd() * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + Math.cos(ang + 0.25) * len * 0.5,
      y + Math.sin(ang + 0.25) * len * 0.5,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len
    );
    g.stroke();
  }
  return c;
}

const cutoutTexCache = new Map();

function buildDieCutTexture(name, { tint = null, flipX = false, rim = true, kraftBack = false } = {}, maxAniso = 4) {
  const key = `${name}|${tint || ''}|${flipX ? 1 : 0}|${rim ? 1 : 0}|${kraftBack ? 1 : 0}`;
  if (cutoutTexCache.has(key)) return cutoutTexCache.get(key);

  const img = IMAGES[name] || IMAGES['lc-08'] || IMAGES['cut-ginkgo'];
  const pad = rim ? 12 : 4;
  const maxDim = IS_MOBILE ? 560 : 880;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 512, img.naturalHeight || 512));
  const dw = Math.max(2, Math.round((img.naturalWidth || 512) * scale));
  const dh = Math.max(2, Math.round((img.naturalHeight || 512) * scale));

  const cw = dw + pad * 2;
  const ch = dh + pad * 2;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');

  const drawSrc = (ctx, ox = 0, oy = 0) => {
    ctx.save();
    if (flipX) {
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, pad + ox, pad + oy, dw, dh);
    ctx.restore();
  };

  if (rim) {
    const rimCanvas = document.createElement('canvas');
    rimCanvas.width = cw;
    rimCanvas.height = ch;
    const rg = rimCanvas.getContext('2d');
    const r = IS_MOBILE ? 3.2 : 4.6;
    const dirs = 12;
    for (let i = 0; i < dirs; i++) {
      const a = (i / dirs) * Math.PI * 2;
      drawSrc(rg, Math.cos(a) * r, Math.sin(a) * r);
    }
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = kraftBack ? '#E2D2B7' : '#FAF5EB';
    rg.fillRect(0, 0, cw, ch);
    g.drawImage(rimCanvas, 0, 0);
  }

  if (kraftBack) {
    const backCanvas = document.createElement('canvas');
    backCanvas.width = cw;
    backCanvas.height = ch;
    const bg = backCanvas.getContext('2d');
    drawSrc(bg, 0, 0);
    bg.globalCompositeOperation = 'source-atop';
    bg.fillStyle = 'rgba(234, 220, 195, 0.58)';
    bg.fillRect(0, 0, cw, ch);
    g.drawImage(backCanvas, 0, 0);
  } else {
    drawSrc(g, 0, 0);
    if (tint) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = tint;
      g.fillRect(0, 0, cw, ch);
      g.restore();
    }
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, ch - pad, 0, ch - pad - dh * 0.14);
    gr.addColorStop(0, 'rgba(58, 40, 20, 0.16)');
    gr.addColorStop(1, 'rgba(58, 40, 20, 0)');
    g.fillStyle = gr;
    g.fillRect(0, ch - pad - dh * 0.16, cw, dh * 0.18 + pad);
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;

  const res = { tex, aspect: cw / ch };
  cutoutTexCache.set(key, res);
  return res;
}

const featheredBdCache = new Map();
function buildFeatheredBackdropTexture(name, { tint = null, flipX = false } = {}, maxAniso = 4) {
  const key = `${name}|${tint || ''}|${flipX ? 1 : 0}`;
  if (featheredBdCache.has(key)) return featheredBdCache.get(key);

  const img = IMAGES[name] || IMAGES['bd-guilin'];
  const maxW = IS_MOBILE ? 768 : 1152;
  const sc = Math.min(1, maxW / Math.max(1, img.naturalWidth || 1024));
  const cw = Math.max(4, Math.round((img.naturalWidth || 1024) * sc));
  const ch = Math.max(4, Math.round((img.naturalHeight || 512) * sc));

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');

  g.save();
  if (flipX) {
    g.translate(cw, 0);
    g.scale(-1, 1);
  }
  g.drawImage(img, 0, 0, cw, ch);
  g.restore();

  if (tint) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = tint;
    g.fillRect(0, 0, cw, ch);
    g.restore();
  }

  g.save();
  g.globalCompositeOperation = 'destination-in';
  const hg = g.createLinearGradient(0, 0, cw, 0);
  hg.addColorStop(0.00, 'rgba(0,0,0,0)');
  hg.addColorStop(0.08, 'rgba(0,0,0,0.28)');
  hg.addColorStop(0.20, 'rgba(0,0,0,1)');
  hg.addColorStop(0.80, 'rgba(0,0,0,1)');
  hg.addColorStop(0.92, 'rgba(0,0,0,0.28)');
  hg.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = hg;
  g.fillRect(0, 0, cw, ch);

  const vg = g.createLinearGradient(0, 0, 0, ch);
  vg.addColorStop(0.00, 'rgba(0,0,0,1)');
  vg.addColorStop(0.84, 'rgba(0,0,0,1)');
  vg.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = vg;
  g.fillRect(0, 0, cw, ch);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  tex.needsUpdate = true;

  const res = { tex, aspect: cw / ch };
  featheredBdCache.set(key, res);
  return res;
}

function makeGroundHaloTexture(hexColor = '#B3261E') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const cx = 128;
  const gr = g.createRadialGradient(cx, cx, 32, cx, cx, 120);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.56, `${hexColor}1E`);
  gr.addColorStop(0.76, `${hexColor}82`);
  gr.addColorStop(0.86, `${hexColor}1A`);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);

  g.strokeStyle = `${hexColor}99`;
  g.lineWidth = 2.0;
  g.beginPath();
  g.arc(cx, cx, 94, 0, Math.PI * 2);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSoftParticleTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [offset, color] of stops) gr.addColorStop(offset, color);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// App & Physics State
// ============================================================================
const state = {
  mode: 'map',             // 'map' | 'walk' | 'depth'
  depthScene: 'haiyang',   // 'haiyang' | 'lijiang' | 'dajing' | 'paideng'

  t: 0.014,
  tTarget: 0.014,
  velT: 0,
  flyToTarget: null,

  panX: 0,
  panXTarget: 0,

  zoom: 1.0,
  zoomTarget: 1.0,

  gyroEnabled: false,
  gyroX: 0,
  gyroY: 0,
  gyroBaseBeta: null,
  gyroBaseGamma: null,

  segmentIdx: 0,
  category: 'all',
  stampedIds: new Set(),
  selectedLandmark: null,
  hoveredLandmark: null,

  // 3-layer fan diorama interactive parallax inside detail card
  fanLookX: 0,
  fanLookY: 0,
  fanLookXTarget: 0,
  fanLookYTarget: 0,

  // 2.5D Painting Realm depth & inertia
  depthWalk: 0.15,
  depthWalkTarget: 0.15,
  velDepth: 0,
  lookX: 0,
  lookY: 0,
  lookXTarget: 0,
  lookYTarget: 0,
};

// ============================================================================
// DOM References
// ============================================================================
const dom = {
  stage: document.getElementById('stage'),
  modeVeil: document.getElementById('mode-veil'),
  chapterSub: document.getElementById('chapter-sub'),
  modeBtns: Array.from(document.querySelectorAll('.mode-btn')),
  gyroBtn: document.getElementById('gyro-btn'),
  filterBar: document.getElementById('filter-bar'),
  filterBtns: Array.from(document.querySelectorAll('.filter-btn')),
  nextPortalBtn: document.getElementById('next-portal-btn'),
  nextPortalLabel: document.getElementById('next-portal-label'),
  stampPill: document.getElementById('stamp-pill'),
  stampCount: document.getElementById('stamp-count'),

  tagSlots: Array.from(document.querySelectorAll('.paper-tag')).map((el) => ({
    el,
    txt: el.querySelector('.tag-txt'),
    entry: null,
    curOp: 0,
  })),
  portalBanner: document.getElementById('portal-banner'),
  portalBannerTxt: document.getElementById('portal-banner-txt'),

  walkDock: document.getElementById('walk-dock'),
  journeyTrack: document.getElementById('journey-track'),
  journeyFill: document.getElementById('journey-fill'),
  journeyThumb: document.getElementById('journey-thumb'),
  chapterNav: document.getElementById('chapter-nav'),
  chapterPills: Array.from(document.querySelectorAll('#walk-dock .chapter-pill')),

  depthDock: document.getElementById('depth-dock'),
  depthTrack: document.getElementById('depth-track'),
  depthFill: document.getElementById('depth-fill'),
  depthThumb: document.getElementById('depth-thumb'),
  depthSceneBtns: Array.from(document.querySelectorAll('[data-depth-scene]')),

  cardBackdrop: document.getElementById('card-backdrop'),
  card: document.getElementById('detail-card'),
  cardDragBar: document.getElementById('card-drag-bar'),
  cardScroll: document.getElementById('card-scroll'),
  cardClose: document.getElementById('card-close'),
  fanWindow: document.getElementById('fan-window'),
  fanBg: document.getElementById('fan-bg'),
  fanMid: document.getElementById('fan-mid'),
  fanFx: document.getElementById('fan-fx'),
  cardImg: document.getElementById('card-img'),
  cardCat: document.getElementById('card-cat'),
  cardZone: document.getElementById('card-zone'),
  cardCode: document.getElementById('card-code'),
  cardTitle: document.getElementById('card-title'),
  cardTagline: document.getElementById('card-tagline'),
  factTown: document.getElementById('fact-town'),
  factSeason: document.getElementById('fact-season'),
  factStat: document.getElementById('fact-stat'),
  cardStory: document.getElementById('card-story'),
  cardTips: document.getElementById('card-tips'),
  cardStampBtn: document.getElementById('card-stamp-btn'),
  cardStampLabel: document.getElementById('card-stamp-label'),
  cardShareBtn: document.getElementById('card-share-btn'),
  cardCloseBottom: document.getElementById('card-close-bottom'),
  cardInlineNote: document.getElementById('card-inline-note'),
  mapStage: document.getElementById('map-stage'),

  loader: document.getElementById('loader'),
  loaderBar: document.getElementById('loader-bar'),
  loaderPct: document.getElementById('loader-pct'),
};

let mapViewApi = null;
let map3dApi = null;

// ============================================================================
// Preloader (60 Assets Loaded Cleanly from Local ./img & ../storybook/img)
// ============================================================================
async function preloadAssets() {
  let done = 0;
  const total = ASSET_LIST.length;
  const step = () => {
    done++;
    const pct = Math.round((done / total) * 100);
    dom.loaderBar.style.transform = `scaleX(${done / total})`;
    dom.loaderPct.textContent = String(pct).padStart(2, '0');
  };

  await Promise.all(ASSET_LIST.map((name) => new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      IMAGES[name] = im;
      step();
      resolve();
    };
    im.onerror = () => {
      const fb = new Image();
      fb.onload = () => { IMAGES[name] = fb; step(); resolve(); };
      fb.onerror = () => { step(); resolve(); };
      fb.src = getAssetUrl(name, true);
    };
    im.src = getAssetUrl(name, false);
  })));
}

// ============================================================================
// Renderer Setup
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(viewW, viewH);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
dom.stage.appendChild(renderer.domElement);

const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

// ============================================================================
// Horizontal-FOV Guarantee Helper (Portrait-First Framing!)
// ============================================================================
function computeWalkFov(aspect) {
  const portraitT = clamp((1.05 - aspect) / 0.58, 0, 1);
  return lerp(42, 54, portraitT);
}

function computeDistScale(aspect) {
  return Math.max(1.0, 0.90 / Math.max(0.46, aspect));
}

// ============================================================================
// MODE 1: Six-Realm Pop-Up Scroll World ("纸艺长卷")
// ============================================================================
const walkScene = new THREE.Scene();
walkScene.background = new THREE.Color('#EBF0EA');
walkScene.fog = new THREE.FogExp2('#EBF0EA', 0.0110);

const walkCamera = new THREE.PerspectiveCamera(computeWalkFov(viewAspect), viewAspect, 0.25, 240);

const walkHemi = new THREE.HemisphereLight('#E4F2EE', '#BBA785', 1.0);
walkScene.add(walkHemi);

const walkKey = new THREE.DirectionalLight('#FFF4DE', 2.2);
walkKey.position.set(14, 26, 18);
walkKey.castShadow = true;
walkKey.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048);
walkKey.shadow.camera.near = 2;
walkKey.shadow.camera.far = 92;
walkKey.shadow.camera.left = -18;
walkKey.shadow.camera.right = 18;
walkKey.shadow.camera.top = 18;
walkKey.shadow.camera.bottom = -18;
walkKey.shadow.bias = -0.0005;
walkKey.shadow.normalBias = 0.035;
walkScene.add(walkKey);
walkScene.add(walkKey.target);

const walkRim = new THREE.DirectionalLight('#C8DCEB', 0.5);
walkRim.position.set(-14, 12, -18);
walkScene.add(walkRim);

const walkStandees = [];
const interactiveMeshes = [];
const landmarkEntries = [];
const landmarkById = new Map();
const portalGates = [];
const marketLights = [];
const swayingLanterns = [];

let boundlessTableMat = null;
let waterShaderMat = null;
let streamShaderMat = null;
let guideSpiritUpdate = null;
let birdsUpdate = null;
let riverMistUpdate = null;
let daySteamUpdate = null;
let mapleAndSnowUpdate = null;
let peachAndGinkgoUpdate = null;
let nightSmokeUpdate = null;
let nightEmbersUpdate = null;
let nightStars = null;

// Scroll surface spans z in [-262, +16] (D=278, center z=-123)
const SCROLL_W = 23.0;
const SCROLL_D = 278.0;
const SCROLL_CZ = -123.0;

function createWaterRibbonMesh(zStart, zEnd, ribbonW, deepHex, shallowHex) {
  const segZ = 68;
  const rPos = [];
  const rUv = [];
  const rIdx = [];
  for (let i = 0; i <= segZ; i++) {
    const u = i / segZ;
    const z = lerp(zStart, zEnd, u);
    const cx = pathX(z) - 0.12;
    rPos.push(cx - ribbonW * 0.5, 0.028, z);
    rPos.push(cx + ribbonW * 0.5, 0.028, z);
    rUv.push(0, u);
    rUv.push(1, u);
    if (i < segZ) {
      const a = i * 2;
      rIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(rUv, 2));
  geo.setIndex(rIdx);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deepHex) },
      uShallow: { value: new THREE.Color(shallowHex) },
      uGlint: { value: new THREE.Color('#FFF9EC') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uGlint;
      varying vec2 vUv;
      void main() {
        float bankMask = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float endMask = smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float flow = vUv.y * 30.0 - uTime * 0.72;
        float w1 = sin(flow + sin(vUv.x * 10.0 + uTime * 0.5) * 1.3);
        float w2 = sin(flow * 1.8 - vUv.x * 16.0 + uTime * 0.85);
        float wave = 0.5 + 0.5 * (w1 * 0.6 + w2 * 0.4);
        vec3 col = mix(uDeep, uShallow, wave * 0.55 + abs(vUv.x - 0.5) * 0.35);
        float glint = smoothstep(0.84, 0.99, wave) * (0.45 + 0.55 * sin(vUv.y * 46.0 + uTime * 1.9));
        col = mix(col, uGlint, glint * 0.52);
        float inkRipple = smoothstep(0.955, 0.996, sin(vUv.x * 26.0 + sin(flow * 0.55) * 1.8));
        col = mix(col, vec3(0.96, 0.99, 0.97), inkRipple * 0.28);
        gl_FragColor = vec4(col, bankMask * endMask * 0.68);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  walkScene.add(mesh);
  return mat;
}

function buildScrollBookAndGround() {
  // 1) Boundless rice-paper mist skirt at y = -0.06 (moves with camera Z so infinite everywhere)
  const skirtGeo = new THREE.PlaneGeometry(640, 640);
  skirtGeo.rotateX(-Math.PI / 2);
  boundlessTableMat = new THREE.MeshBasicMaterial({ color: '#EBF0EA', fog: true });
  const skirtMesh = new THREE.Mesh(skirtGeo, boundlessTableMat);
  skirtMesh.position.set(0, -0.06, SCROLL_CZ);
  walkScene.add(skirtMesh);

  // 2) Continuous Six-Realm Hand-Painted Scroll Canvas (768x4096 mobile / 1024x4096 desktop)
  const cw = IS_MOBILE ? 768 : 1024;
  const ch = 4096;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');

  const zMin = SCROLL_CZ - SCROLL_D / 2; // -262
  const wx = (x) => ((x + SCROLL_W / 2) / SCROLL_W) * cw;
  const wz = (z) => ((z - zMin) / SCROLL_D) * ch;
  const ux = (d) => (d / SCROLL_W) * cw;
  const uz = (d) => (d / SCROLL_D) * ch;

  const paperTile = createCleanXuanPaperTile(512, 31, '#F4EFE6');
  g.fillStyle = g.createPattern(paperTile, 'repeat');
  g.fillRect(0, 0, cw, ch);

  const stampGroundPainting = (imgName, zTop, zBot, alpha = 0.72, tint = null) => {
    const img = IMAGES[imgName];
    if (!img) return;
    const y0 = Math.min(wz(zTop), wz(zBot));
    const y1 = Math.max(wz(zTop), wz(zBot));
    const spanH = Math.max(4, y1 - y0);

    const off = document.createElement('canvas');
    off.width = cw;
    off.height = Math.ceil(spanH);
    const og = off.getContext('2d');

    const tileH = Math.max(cw * 0.62, spanH * 0.45);
    for (let ty = 0; ty < spanH; ty += tileH * 0.85) {
      og.globalAlpha = alpha;
      og.drawImage(img, 0, ty, cw, tileH);
    }
    if (tint) {
      og.globalCompositeOperation = 'source-atop';
      og.fillStyle = tint;
      og.fillRect(0, 0, cw, off.height);
    }
    og.globalCompositeOperation = 'destination-in';
    const mask = og.createLinearGradient(0, 0, 0, off.height);
    mask.addColorStop(0.00, 'rgba(0,0,0,0)');
    mask.addColorStop(0.14, 'rgba(0,0,0,1)');
    mask.addColorStop(0.86, 'rgba(0,0,0,1)');
    mask.addColorStop(1.00, 'rgba(0,0,0,0)');
    og.fillStyle = mask;
    og.fillRect(0, 0, cw, off.height);

    g.drawImage(off, 0, y0);
  };

  // Six-Realm Continuous Landscape Washes (only outdoor gr-guilin & gr-lingchuan!)
  // Realm 1: Lijiang emerald riverbanks (z: +12 .. -44)
  stampGroundPainting('gr-guilin', 12, -45, 0.44, 'rgba(224, 238, 232, 0.44)');
  // Realm 2: Daxu warm antique stone town (z: -39 .. -86)
  stampGroundPainting('gr-guilin', -38, -86, 0.32, 'rgba(238, 228, 210, 0.58)');
  // Realm 3: Ancestral villages, lotus pond & Gantang green lawn (z: -80 .. -126)
  stampGroundPainting('gr-guilin', -80, -126, 0.36, 'rgba(222, 234, 222, 0.52)');
  // Realm 4: Waterfalls & alpine frost snow at Dajing (z: -120 .. -165)
  stampGroundPainting('gr-guilin', -120, -150, 0.42, 'rgba(210, 232, 234, 0.46)');
  stampGroundPainting('gr-lingchuan', -147, -166, 0.34, 'rgba(232, 243, 252, 0.78)');
  // Realm 5: Spring peach blossoms -> Golden autumn ginkgo valley (z: -160 .. -204)
  stampGroundPainting('gr-lingchuan', -160, -176, 0.46, 'rgba(248, 224, 226, 0.46)');
  stampGroundPainting('gr-lingchuan', -171, -204, 0.76, 'rgba(250, 232, 180, 0.28)');
  // Realm 6: Yao folk dusk -> Starry Balijie night-market promenade (z: -198 .. -254)
  stampGroundPainting('gr-lingchuan', -198, -254, 0.38, 'rgba(24, 34, 60, 0.68)');

  const rnd = mulberry32(20261125);

  // ---- Waterway 1 (Realm 1: z +9 .. -42.5) & Waterway 2 (Realm 4: z -121 .. -149) ----
  const paintRiverBed = (zTop, zBot, outerW, coreW, outerCol, coreCol) => {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = outerCol;
    g.lineWidth = ux(outerW);
    g.beginPath();
    for (let z = zTop; z >= zBot; z -= 1.0) {
      const px = wx(pathX(z) - 0.12);
      const py = wz(z);
      if (z === zTop) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();

    g.strokeStyle = coreCol;
    g.lineWidth = ux(coreW);
    g.beginPath();
    for (let z = zTop - 0.5; z >= zBot + 0.5; z -= 1.0) {
      const px = wx(pathX(z) - 0.12);
      const py = wz(z);
      if (z === zTop - 0.5) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
    g.restore();
  };

  paintRiverBed(9.5, -42.5, 6.2, 4.3, 'rgba(138, 178, 168, 0.48)', 'rgba(48, 102, 95, 0.82)');
  paintRiverBed(-121.0, -149.0, 5.4, 3.6, 'rgba(148, 192, 196, 0.45)', 'rgba(46, 108, 122, 0.78)');

  // ---- Winding Hand-Painted Flagstone Trail Across Realms 2, 3, 5, 6 & Frost Trail ----
  const paintStoneStretch = (zStart, zEnd) => {
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(214, 202, 182, 0.68)';
    g.lineWidth = ux(3.0);
    g.beginPath();
    for (let z = zStart; z >= zEnd; z -= 1.0) {
      const px = wx(pathX(z));
      const py = wz(z);
      if (z === zStart) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();

    for (let z = zStart - 0.5; z >= zEnd; z -= 1.05) {
      const cx = pathX(z);
      const dxdz = pathDXDZ(z);
      const ang = Math.atan2(dxdz, 1);
      const isNight = smoothstep(-198, -212, z);
      const isFrost = smoothstep(-146, -152, z) * (1 - smoothstep(-160, -165, z));
      for (let row = -1; row <= 1; row++) {
        const lat = row * 0.85 + (rnd() - 0.5) * 0.14;
        const sx = cx + lat;
        const sz = z + (rnd() - 0.5) * 0.18;
        const warm = 188 + Math.floor(rnd() * 28);
        let rCol = lerp(warm, 78, isNight * 0.62);
        let gCol = lerp(warm - 7, 84, isNight * 0.58);
        let bCol = lerp(warm - 18, 108, isNight * 0.50);
        rCol = Math.round(lerp(rCol, 232, isFrost * 0.7));
        gCol = Math.round(lerp(gCol, 240, isFrost * 0.7));
        bCol = Math.round(lerp(bCol, 248, isFrost * 0.7));

        g.save();
        g.translate(wx(sx), wz(sz));
        g.rotate(-ang * 0.55);
        g.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, 0.42)`;
        const sw = ux(0.72 + rnd() * 0.14);
        const sh = uz(0.72 + rnd() * 0.18);
        g.beginPath();
        g.roundRect(-sw / 2, -sh / 2, sw, sh, Math.min(sw, sh) * 0.24);
        g.fill();
        g.restore();
      }
    }
    g.restore();
  };

  paintStoneStretch(-41.0, -121.5);
  paintStoneStretch(-148.5, -248.0);

  // ---- Seasonal Ground Carpets: Maple (Gudong), Rime Frost (Dajing), Peach Petals & Ginkgo Gold (Haiyang) ----
  g.save();
  // 1) Gudong crimson maple scatter (z: -129 .. -142)
  const mapleCols = ['#C83E2B', '#DF5B38', '#E27A34', '#B32E22'];
  for (let i = 0; i < (IS_MOBILE ? 220 : 380); i++) {
    const lz = -129 - rnd() * 13;
    const lx = pathX(lz) + (rnd() - 0.5) * 11;
    if (Math.abs(lx) > 8.0) continue;
    g.fillStyle = mapleCols[i % mapleCols.length];
    g.globalAlpha = 0.48 + rnd() * 0.35;
    g.beginPath();
    g.arc(wx(lx), wz(lz), ux(0.13 + rnd() * 0.15), 0, Math.PI * 2);
    g.fill();
  }

  // 2) Dajing alpine frost & rime snow patches (z: -150 .. -163)
  for (let i = 0; i < (IS_MOBILE ? 260 : 450); i++) {
    const lz = -150 - rnd() * 13;
    const lx = pathX(lz) + (rnd() - 0.5) * 13;
    if (Math.abs(lx) > 8.2) continue;
    g.fillStyle = i % 2 === 0 ? '#F7FBFF' : '#DCEAF6';
    g.globalAlpha = 0.45 + rnd() * 0.4;
    g.beginPath();
    g.arc(wx(lx), wz(lz), ux(0.14 + rnd() * 0.26), 0, Math.PI * 2);
    g.fill();
  }

  // 3) Haiyang spring pink-white peach petals (z: -163 .. -173)
  const petalCols = ['#F6B8C4', '#FAD4DC', '#FFF5F7', '#EB9AA9'];
  for (let i = 0; i < (IS_MOBILE ? 260 : 460); i++) {
    const lz = -163 - rnd() * 10;
    const lx = pathX(lz) + (rnd() - 0.5) * 12;
    if (Math.abs(lx) > 8.2) continue;
    g.fillStyle = petalCols[i % petalCols.length];
    g.globalAlpha = 0.55 + rnd() * 0.35;
    g.beginPath();
    g.arc(wx(lx), wz(lz), ux(0.12 + rnd() * 0.16), 0, Math.PI * 2);
    g.fill();
  }

  // 4) Haiyang dense golden fallen ginkgo carpet (z: -172 .. -201)
  const ginkgoCols = ['#EAB530', '#F5CC4D', '#D8961E', '#CA8820', '#FCE07B'];
  for (let i = 0; i < (IS_MOBILE ? 950 : 1700); i++) {
    const lz = -172 - rnd() * 29;
    const spread = (rnd() - 0.5) * 13.0;
    const lx = pathX(lz) + spread;
    if (Math.abs(lx) > 8.2) continue;
    const shoulderWeight = 0.45 + 0.55 * smoothstep(0.4, 2.2, Math.abs(spread));
    if (rnd() > shoulderWeight) continue;
    const rad = ux(0.15 + rnd() * 0.22);
    const a = rnd() * Math.PI * 2;
    g.fillStyle = ginkgoCols[i % ginkgoCols.length];
    g.globalAlpha = 0.60 + rnd() * 0.36;
    g.beginPath();
    g.moveTo(wx(lx), wz(lz));
    g.arc(wx(lx), wz(lz), rad, a, a + 1.48);
    g.closePath();
    g.fill();
  }
  g.restore();

  // ---- Realm 6 Warm Amber Ground Lantern & Night-Market Pools ----
  g.save();
  for (const lm of LANDMARK_SPECS) {
    if (lm.segment !== 5) continue;
    const lz = zFromS(lm.s);
    const lx = pathX(lz) + lm.dx * 0.65;
    const rx = ux(4.8);
    const rz = uz(4.8);
    g.save();
    g.translate(wx(lx), wz(lz));
    g.scale(1, rz / rx);
    const pg = g.createRadialGradient(0, 0, rx * 0.06, 0, 0, rx);
    pg.addColorStop(0.0, 'rgba(255, 176, 82, 0.52)');
    pg.addColorStop(0.45, 'rgba(232, 138, 52, 0.22)');
    pg.addColorStop(1.0, 'rgba(232, 138, 52, 0)');
    g.fillStyle = pg;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
  }
  g.restore();

  // ---- Pop-Up Scroll Book Binding Details (绢本装池镶边 + 中缝折痕) ----
  g.save();
  const spineX = wx(0);
  const spineGrad = g.createLinearGradient(spineX - ux(0.28), 0, spineX + ux(0.28), 0);
  spineGrad.addColorStop(0.0, 'rgba(90, 72, 48, 0)');
  spineGrad.addColorStop(0.48, 'rgba(82, 64, 42, 0.13)');
  spineGrad.addColorStop(0.55, 'rgba(255, 252, 244, 0.22)');
  spineGrad.addColorStop(1.0, 'rgba(90, 72, 48, 0)');
  g.fillStyle = spineGrad;
  g.fillRect(spineX - ux(0.3), uz(6), ux(0.6), ch - uz(12));

  g.strokeStyle = 'rgba(156, 126, 82, 0.28)';
  g.lineWidth = Math.max(1.2, ux(0.045));
  for (const bx of [-7.9, 7.9]) {
    g.beginPath();
    g.moveTo(wx(bx), uz(7));
    g.lineTo(wx(bx), ch - uz(7));
    g.stroke();
  }
  g.restore();

  // ---- Soft 4-Side Edge Feather Mask ----
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const hMask = g.createLinearGradient(0, 0, cw, 0);
  hMask.addColorStop(0.00, 'rgba(0,0,0,0)');
  hMask.addColorStop(0.11, 'rgba(0,0,0,0.92)');
  hMask.addColorStop(0.18, 'rgba(0,0,0,1)');
  hMask.addColorStop(0.82, 'rgba(0,0,0,1)');
  hMask.addColorStop(0.89, 'rgba(0,0,0,0.92)');
  hMask.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = hMask;
  g.fillRect(0, 0, cw, ch);

  const vMask = g.createLinearGradient(0, 0, 0, ch);
  vMask.addColorStop(0.00, 'rgba(0,0,0,0)');
  vMask.addColorStop(0.03, 'rgba(0,0,0,1)');
  vMask.addColorStop(0.97, 'rgba(0,0,0,1)');
  vMask.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = vMask;
  g.fillRect(0, 0, cw, ch);
  g.restore();

  const groundTex = new THREE.CanvasTexture(c);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = Math.min(8, MAX_ANISO);

  const scrollGeo = new THREE.PlaneGeometry(SCROLL_W, SCROLL_D, 1, 1);
  scrollGeo.rotateX(-Math.PI / 2);
  const scrollMat = makePaperMaterial({
    map: groundTex,
    transparent: true,
    depthWrite: true,
    color: '#ffffff',
  });
  const scrollMesh = new THREE.Mesh(scrollGeo, scrollMat);
  scrollMesh.position.set(0, 0, SCROLL_CZ);
  scrollMesh.receiveShadow = true;
  walkScene.add(scrollMesh);

  // Animated water ribbons for Realm 1 (Lijiang) & Realm 4 (Qingshitan/Gudong/Longmen stream)
  waterShaderMat = createWaterRibbonMesh(8.0, -42.0, 4.5, '#285B55', '#74ACA2');
  streamShaderMat = createWaterRibbonMesh(-121.5, -148.5, 3.8, '#285E6E', '#7EC0C8');
}

// ============================================================================
// Camera-Following 360° Curved Ink-Wash Horizon (4 Seasonal Epochs, Zero Clipping!)
// ============================================================================
let horizonGroup = null;
const horizonLayers = { river: [], frost: [], autumn: [], night: [] };

function createCurvedBackdropArc(parentGroup, bucket, imgName, {
  x = 0, y = -0.4, z = -46, w = 48, h = 16.5, yaw = 0, bend = 5.2,
  tint = null, flipX = false, baseOpacity = 0.9,
} = {}) {
  const { tex } = buildFeatheredBackdropTexture(imgName, { tint, flipX }, MAX_ANISO);
  const geo = new THREE.PlaneGeometry(w, h, 24, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const nx = vx / (w * 0.5);
    pos.setZ(i, (nx * nx) * bend);
  }
  geo.computeVertexNormals();
  geo.translate(0, h * 0.5, 0);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.renderOrder = 1;
  parentGroup.add(mesh);
  bucket.push({ mesh, mat, baseOpacity });
  return mesh;
}

function buildCurvedHorizon() {
  horizonGroup = new THREE.Group();
  walkScene.add(horizonGroup);

  // River & Ancient Villages Karst Ring (s: 0.00–0.58)
  createCurvedBackdropArc(horizonGroup, horizonLayers.river, 'bd-guilin',  { x: 0.0,   z: -46, w: 50, h: 16.8, yaw: 0.0,   bend: 5.6, baseOpacity: 0.92 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.river, 'bd-guilin',  { x: -22.0, z: -34, w: 34, h: 14.2, yaw: 0.62,  bend: 3.6, flipX: true, baseOpacity: 0.84 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.river, 'ridge',      { x: 22.0,  z: -34, w: 34, h: 13.8, yaw: -0.62, bend: 3.6, baseOpacity: 0.84 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.river, 'hero-karst', { x: -14.5, z: -41, w: 22, h: 12.8, yaw: 0.32,  bend: 2.2, baseOpacity: 0.78 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.river, 'karst',      { x: 14.5,  z: -42, w: 22, h: 12.5, yaw: -0.32, bend: 2.2, baseOpacity: 0.78 });

  // Alpine Rime Frost Mountains (s: 0.58–0.67)
  createCurvedBackdropArc(horizonGroup, horizonLayers.frost, 'bd-guilin', { x: 0.0,   z: -46, w: 50, h: 17.0, yaw: 0.0,   bend: 5.6, tint: 'rgba(218, 236, 250, 0.56)', baseOpacity: 0.92 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.frost, 'ridge',     { x: -22.0, z: -34, w: 34, h: 14.2, yaw: 0.62,  bend: 3.6, tint: 'rgba(224, 240, 252, 0.54)', baseOpacity: 0.84 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.frost, 'ridge',     { x: 22.0,  z: -34, w: 34, h: 14.2, yaw: -0.62, bend: 3.6, flipX: true, tint: 'rgba(224, 240, 252, 0.54)', baseOpacity: 0.84 });

  // Golden Autumn Haiyang Hills (s: 0.665–0.825)
  createCurvedBackdropArc(horizonGroup, horizonLayers.autumn, 'bd-lingchuan', { x: 0.0,   z: -46, w: 50, h: 17.0, yaw: 0.0,   bend: 5.8, baseOpacity: 0.94 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.autumn, 'bd-lingchuan', { x: -22.0, z: -34, w: 34, h: 14.5, yaw: 0.62,  bend: 3.6, flipX: true, baseOpacity: 0.84 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.autumn, 'ridge',        { x: 22.0,  z: -34, w: 34, h: 14.0, yaw: -0.62, bend: 3.6, tint: 'rgba(232,196,128,0.28)', baseOpacity: 0.84 });

  // Deep Indigo Night Silhouettes (s: 0.825–1.00)
  createCurvedBackdropArc(horizonGroup, horizonLayers.night, 'bd-guilin', { x: 0.0,   z: -46, w: 50, h: 17.2, yaw: 0.0,   bend: 5.8, tint: 'rgba(20, 32, 62, 0.58)', baseOpacity: 0.90 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.night, 'ridge',     { x: -22.0, z: -34, w: 34, h: 14.2, yaw: 0.62,  bend: 3.6, tint: 'rgba(20, 32, 62, 0.55)', baseOpacity: 0.82 });
  createCurvedBackdropArc(horizonGroup, horizonLayers.night, 'ridge',     { x: 22.0,  z: -34, w: 34, h: 14.2, yaw: -0.62, bend: 3.6, flipX: true, tint: 'rgba(20, 32, 62, 0.55)', baseOpacity: 0.82 });
}

function updateCurvedHorizon(s, look) {
  if (!horizonGroup) return;
  horizonGroup.position.set(look.x * 0.28, 0, look.z);

  const wFrost  = smoothstep(0.57, 0.62, s) * (1 - smoothstep(0.655, 0.695, s));
  const wAutumn = smoothstep(0.655, 0.70, s) * (1 - smoothstep(0.805, 0.845, s));
  const wNight  = smoothstep(0.805, 0.845, s);
  const wRiver  = Math.max(0, 1 - wFrost - wAutumn - wNight);

  const applyBucket = (bucket, w) => {
    for (const l of bucket) {
      l.mat.opacity = l.baseOpacity * w;
      l.mesh.visible = l.mat.opacity > 0.01;
    }
  };
  applyBucket(horizonLayers.river, wRiver);
  applyBucket(horizonLayers.frost, wFrost);
  applyBucket(horizonLayers.autumn, wAutumn);
  applyBucket(horizonLayers.night, wNight);
}

// ============================================================================
// Hinged Die-Cut Pop-Up Standee Builder
// ============================================================================
function createHingedStandee(spec, isInteractive) {
  const z = zFromS(spec.s);
  const x = pathX(z) + spec.dx;

  const { tex: frontTex, aspect } = buildDieCutTexture(spec.img, {
    tint: spec.tint || null,
    flipX: !!spec.flipX,
    rim: true,
    kraftBack: false,
  }, MAX_ANISO);

  const h = spec.h;
  const w = h * aspect;

  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = spec.yaw || 0;

  const tabW = clamp(w * 0.56, 0.85, 3.0);
  const tabGeo = new THREE.PlaneGeometry(tabW, 0.32);
  tabGeo.rotateX(-Math.PI / 2);
  const tabMat = new THREE.MeshLambertMaterial({
    color: '#F6F0E4',
    transparent: true,
    opacity: 0.86,
  });
  const tabMesh = new THREE.Mesh(tabGeo, tabMat);
  tabMesh.position.set(0, 0.018, 0.11);
  tabMesh.receiveShadow = true;
  root.add(tabMesh);

  const liftGroup = new THREE.Group();
  root.add(liftGroup);

  const hingeGroup = new THREE.Group();
  liftGroup.add(hingeGroup);

  const scaleGroup = new THREE.Group();
  hingeGroup.add(scaleGroup);

  const frontGeo = new THREE.PlaneGeometry(w, h);
  frontGeo.translate(0, h * 0.5, 0);

  const frontMat = makePaperMaterial({
    map: frontTex,
    transparent: true,
    alphaTest: 0.36,
    side: THREE.FrontSide,
    color: new THREE.Color('#ffffff'),
  });
  if (spec.nightGlow) {
    frontMat.emissive = new THREE.Color('#42220A');
    frontMat.emissiveIntensity = 0.42;
  }

  const frontMesh = new THREE.Mesh(frontGeo, frontMat);
  frontMesh.castShadow = true;
  frontMesh.receiveShadow = true;
  scaleGroup.add(frontMesh);

  const { tex: backTex } = buildDieCutTexture(spec.img, {
    tint: spec.tint || null,
    flipX: !spec.flipX,
    rim: true,
    kraftBack: true,
  }, MAX_ANISO);
  const backGeo = new THREE.PlaneGeometry(w, h);
  backGeo.rotateY(Math.PI);
  backGeo.translate(0, h * 0.5, -0.04);
  const backMat = makePaperMaterial({
    map: backTex,
    transparent: true,
    alphaTest: 0.36,
    side: THREE.FrontSide,
    color: new THREE.Color('#ffffff'),
  });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.receiveShadow = true;
  scaleGroup.add(backMesh);

  const jitter = ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5;
  const flap = new FlapSpring({ p: 0, size: clamp(h / 8.5, 0.22, 0.76), jitter });

  const entry = {
    spec,
    x,
    z,
    isInteractive,
    root,
    tabMesh,
    liftGroup,
    hingeGroup,
    scaleGroup,
    frontMesh,
    frontMat,
    backMat,
    flap,
    width: w,
    height: h,
    phase: Math.abs(jitter) * 6.28,
    curScale: 1,
    curLift: 0,
    curShade: 1,
    curOpacity: 1,
    haloMesh: null,
    haloMat: null,
  };

  if (isInteractive) {
    frontMesh.userData.landmark = entry;
    interactiveMeshes.push(frontMesh);
    landmarkById.set(spec.id, entry);

    const accentPalette = ['#2D615B', '#A93024', '#5C6B57', '#2E6B7E', '#C2871E', '#E58A3A'];
    const haloTex = makeGroundHaloTexture(accentPalette[spec.segment] || '#B3261E');
    const haloRad = clamp(w * 0.50, 1.1, 2.4);
    const haloGeo = new THREE.PlaneGeometry(haloRad * 2, haloRad * 2);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.y = 0.036;
    haloMesh.renderOrder = 4;
    root.add(haloMesh);
    entry.haloMesh = haloMesh;
    entry.haloMat = haloMat;

    landmarkEntries.push(entry);
  } else if (spec.linkId) {
    entry.pendingLinkId = spec.linkId;
    interactiveMeshes.push(frontMesh);
  }

  walkScene.add(root);
  walkStandees.push(entry);
  return entry;
}

// ============================================================================
// Crafted Paper Continuity Micro-Vignettes Along S-Curve (Zero Empty Stretches!)
// ============================================================================
function buildScenicContinuityBridges() {
  const rnd = mulberry32(5150);

  // 1) Delicate Cut-Paper Ink-Bamboo & Riverside Reed Clusters along the scroll
  const bambooCanvas = document.createElement('canvas');
  bambooCanvas.width = 160;
  bambooCanvas.height = 220;
  const bg = bambooCanvas.getContext('2d');
  // Cream paper die-cut backing
  bg.lineCap = 'round';
  const drawStalks = (col, lw) => {
    bg.strokeStyle = col;
    bg.lineWidth = lw;
    for (const [bx, lean, topY] of [[54, -18, 28], [82, 8, 18], [108, 24, 38]]) {
      bg.beginPath();
      bg.moveTo(bx, 212);
      bg.quadraticCurveTo(bx + lean * 0.4, 118, bx + lean, topY);
      bg.stroke();
      // Bamboo leaves
      for (let ly = topY + 12; ly < 165; ly += 34) {
        const lx = bx + lean * (1 - (ly - topY) / (212 - topY));
        for (const dir of [-1, 1]) {
          bg.beginPath();
          bg.moveTo(lx, ly);
          bg.quadraticCurveTo(lx + dir * 16, ly - 6, lx + dir * 28, ly + 8);
          bg.stroke();
        }
      }
    }
  };
  drawStalks('#FAF5EB', 11);
  drawStalks('#4B6B5C', 3.5);

  const bambooTex = new THREE.CanvasTexture(bambooCanvas);
  bambooTex.colorSpace = THREE.SRGBColorSpace;
  const bambooMat = makePaperMaterial({ map: bambooTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
  const bambooGeo = new THREE.PlaneGeometry(1.15, 1.58);
  bambooGeo.translate(0, 0.79, 0);

  // Place 34 subtle roadside paper bamboo/reed accents on outer shoulders (dx = ±2.55..3.05)
  const clumpCount = 34;
  const bambooInst = new THREE.InstancedMesh(bambooGeo, bambooMat, clumpCount);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const v4 = new THREE.Vector3();
  const s4 = new THREE.Vector3();

  for (let i = 0; i < clumpCount; i++) {
    const s = 0.018 + (i / clumpCount) * 0.80;
    const z = zFromS(s);
    const side = (i % 2 === 0 ? -1 : 1) * (2.55 + rnd() * 0.45);
    const sc = 0.78 + rnd() * 0.38;
    v4.set(pathX(z) + side, 0, z);
    e4.set(0, side < 0 ? 0.28 : -0.28, 0);
    q4.setFromEuler(e4);
    s4.set(sc, sc, sc);
    m4.compose(v4, q4, s4);
    bambooInst.setMatrixAt(i, m4);
  }
  bambooInst.instanceMatrix.needsUpdate = true;
  walkScene.add(bambooInst);

  // 2) Low Stone Paper Balustrades along Wharf & Ancestral Pond Edges
  const railMat = makePaperMaterial({ color: '#DFD8CA' });
  const railCapMat = makePaperMaterial({ color: '#B7B0A2' });
  for (const sRail of [0.176, 0.346, 0.398, 0.446, 0.512]) {
    for (const side of [-2.35, 2.35]) {
      const rz = zFromS(sRail);
      const rg = new THREE.Group();
      rg.position.set(pathX(rz) + side, 0, rz);
      rg.rotation.y = Math.atan2(-pathDXDZ(rz), -1);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 2.2), railMat);
      slab.position.y = 0.23;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 2.36), railCapMat);
      topBar.position.y = 0.49;
      const postA = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.64, 0.20), railCapMat);
      postA.position.set(0, 0.32, -1.1);
      const postB = postA.clone();
      postB.position.z = 1.1;
      rg.add(slab, topBar, postA, postB);
      walkScene.add(rg);
    }
  }
}

// ============================================================================
// TRUE 3D REAL-TIME PORTAL-IN-PAINTING GATES (WebGL RenderTarget Offscreen Pass!)
// ============================================================================
const portalRT = new THREE.WebGLRenderTarget(IS_MOBILE ? 512 : 640, IS_MOBILE ? 640 : 800, {
  depthBuffer: true,
  stencilBuffer: false,
});
const portalCam = new THREE.PerspectiveCamera(48, 0.8, 0.4, 180);

function makePortalDoorHalfTexture(spec, isRightHalf) {
  const cw = 256;
  const ch = 512;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');

  g.save();
  if (isRightHalf) {
    // Mirror horizontally so left & right doors meet seamlessly along x=0!
    g.translate(cw, 0);
    g.scale(-1, 1);
  }

  // Outer paper-craft architectural frame panel (x=0 is outer pillar, x=cw is center seam!)
  // Carve semi-circular / arched / scroll window hole on the inner side (around x = cw, y = 250)
  g.fillStyle = '#F7F1E4';
  g.fillRect(10, 26, cw - 10, ch - 26);

  // Decorative colored lacquer border frame
  g.fillStyle = spec.frameColor;
  g.fillRect(16, 34, cw - 16, ch - 40);

  // Warm brocade inner mat
  g.fillStyle = '#F5EDE0';
  g.fillRect(34, 54, cw - 34, ch - 76);

  // Ornamental lattice corner fretwork (pure geometric lines, zero gibberish text!)
  g.strokeStyle = spec.trimColor;
  g.lineWidth = 3;
  g.strokeRect(42, 64, cw - 42, ch - 96);
  g.strokeRect(50, 72, 26, 26);
  g.strokeRect(50, ch - 66, 26, 26);

  // Punch out the central portal aperture on the inner edge (cx = cw, cy = 258)
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  if (spec.style === 'goldScroll' || spec.style === 'lanternGate') {
    // Rounded-arch hanging scroll / lantern window
    g.roundRect(cw - 168, 102, 336, 312, 84);
  } else {
    // Classic Chinese Moon Gate / Stone Arch / Silk Fan circular aperture
    g.arc(cw, 258, 168, 0, Math.PI * 2);
  }
  g.fill();

  // Crisp gold/vermilion inner aperture trim ring
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = spec.trimColor;
  g.lineWidth = 6;
  g.beginPath();
  if (spec.style === 'goldScroll' || spec.style === 'lanternGate') {
    g.roundRect(cw - 168, 102, 336, 312, 84);
  } else {
    g.arc(cw, 258, 168, 0, Math.PI * 2);
  }
  g.stroke();

  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, MAX_ANISO);
  return tex;
}

function makePortalPlaqueTexture(sealText, trimHex) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 88;
  const g = c.getContext('2d');

  g.fillStyle = '#FAF4E8';
  g.beginPath();
  g.roundRect(6, 6, 244, 76, 14);
  g.fill();

  g.strokeStyle = trimHex;
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(12, 12, 232, 64, 10);
  g.stroke();

  g.fillStyle = '#1C1916';
  g.font = '500 36px "ZMX","Songti SC","Noto Serif CJK SC",KaiTi,serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(sealText, 128, 46);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPortalGates() {
  for (const spec of PORTAL_SPECS) {
    const z = zFromS(spec.s);
    const x = pathX(z);
    const dxdz = pathDXDZ(z);

    const gateRoot = new THREE.Group();
    gateRoot.position.set(x, 0, z);
    gateRoot.rotation.y = Math.atan2(-dxdz, -1) * 0.35;

    const totalW = 6.4;
    const halfW = totalW * 0.5;
    const totalH = 5.65;

    // Left folding door hinged on outer left pillar (-halfW)
    const leftPivot = new THREE.Group();
    leftPivot.position.set(-halfW, 0, 0);
    const leftGeo = new THREE.PlaneGeometry(halfW, totalH);
    leftGeo.translate(halfW * 0.5, totalH * 0.5, 0);
    const leftMat = makePaperMaterial({
      map: makePortalDoorHalfTexture(spec, false),
      transparent: true,
      alphaTest: 0.03,
      side: THREE.DoubleSide,
    });
    const leftMesh = new THREE.Mesh(leftGeo, leftMat);
    leftMesh.castShadow = true;
    leftPivot.add(leftMesh);
    gateRoot.add(leftPivot);

    // Right folding door hinged on outer right pillar (+halfW)
    const rightPivot = new THREE.Group();
    rightPivot.position.set(halfW, 0, 0);
    const rightGeo = new THREE.PlaneGeometry(halfW, totalH);
    rightGeo.translate(-halfW * 0.5, totalH * 0.5, 0);
    const rightMat = makePaperMaterial({
      map: makePortalDoorHalfTexture(spec, true),
      transparent: true,
      alphaTest: 0.03,
      side: THREE.DoubleSide,
    });
    const rightMesh = new THREE.Mesh(rightGeo, rightMat);
    rightMesh.castShadow = true;
    rightPivot.add(rightMesh);
    gateRoot.add(rightPivot);

    // Top calligraphic plaque ("入古圩" / "寻祠堂" / "入秘境" / "踏金秋" / "赴夜市")
    const plaqueMat = makePaperMaterial({
      map: makePortalPlaqueTexture(spec.seal, spec.trimColor),
      transparent: true,
      alphaTest: 0.03,
    });
    const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.65), plaqueMat);
    plaqueMesh.position.set(0, totalH - 0.14, 0.06);
    gateRoot.add(plaqueMesh);

    // Central Real-Time RenderTarget Portal Lens!
    const isRectArch = spec.style === 'goldScroll' || spec.style === 'lanternGate';
    const lensMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: true,
      uniforms: {
        uPortalTex: { value: portalRT.texture },
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uRimColor: { value: new THREE.Color(spec.trimColor) },
        uRectMode: { value: isRectArch ? 1.0 : 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uPortalTex;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uRimColor;
        uniform float uRectMode;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float d;
          if (uRectMode > 0.5) {
            vec2 q = abs(p) - vec2(0.42, 0.46);
            d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.46;
          } else {
            d = length(p) - 0.90;
          }
          if (d > 0.02) discard;

          // Subtle watercolor ripple distortion right along the inner rim
          float rimBand = smoothstep(-0.22, 0.0, d);
          vec2 ripple = p * 0.012 * sin(d * 24.0 - uTime * 2.6) * rimBand;
          vec2 sampleUv = clamp(vUv + ripple, 0.02, 0.98);

          vec4 texel = texture2D(uPortalTex, sampleUv);
          vec3 col = texel.rgb;

          // Luminous gilt-aura ring along the portal boundary
          float glow = smoothstep(-0.14, -0.01, d) * (0.55 + 0.25 * sin(uTime * 3.0 + p.y * 5.0));
          col = mix(col, uRimColor * 1.35, glow * 0.55);

          float edgeAlpha = 1.0 - smoothstep(-0.02, 0.02, d);
          gl_FragColor = vec4(col, edgeAlpha * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    const lensMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.76, 4.76), lensMat);
    lensMesh.position.set(0, totalH * 0.495, -0.02);
    lensMesh.renderOrder = 8;
    gateRoot.add(lensMesh);

    walkScene.add(gateRoot);
    portalGates.push({
      spec,
      x,
      z,
      totalH,
      gateRoot,
      leftPivot,
      rightPivot,
      leftMat,
      rightMat,
      plaqueMat,
      plaqueMesh,
      lensMesh,
      lensMat,
    });
  }
}

// ============================================================================
// Soulful Pop-Up Guide Companion ("引路灵物")
// ============================================================================
function buildGuideSpirit() {
  const spiritRoot = new THREE.Group();
  walkScene.add(spiritRoot);

  const raftGroup = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: '#D4BC8B' });
  for (let i = -2; i <= 2; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.38, 6), poleMat);
    pole.rotation.x = Math.PI / 2;
    pole.position.set(i * 0.095, 0.05, 0);
    raftGroup.add(pole);
  }
  const awningGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.52, 10, 1, true, 0, Math.PI);
  awningGeo.rotateZ(Math.PI / 2);
  awningGeo.rotateY(Math.PI / 2);
  const awning = new THREE.Mesh(awningGeo, new THREE.MeshLambertMaterial({ color: '#F6EFE2', side: THREE.DoubleSide }));
  awning.position.set(0, 0.12, 0.06);
  raftGroup.add(awning);

  const rippleTex = makeGroundHaloTexture('#A8E2D8');
  const rippleMat = new THREE.MeshBasicMaterial({ map: rippleTex, transparent: true, opacity: 0.5, depthWrite: false });
  const rippleMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.2).rotateX(-Math.PI / 2), rippleMat);
  rippleMesh.position.y = 0.032;
  rippleMesh.renderOrder = 3;
  raftGroup.add(rippleMesh);
  spiritRoot.add(raftGroup);

  const lanternGroup = new THREE.Group();
  const lanternBodyMat = new THREE.MeshStandardMaterial({
    color: '#F29B3E',
    emissive: '#FF9E3D',
    emissiveIntensity: 1.65,
    roughness: 0.7,
    transparent: true,
    opacity: 0.96,
  });
  const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), lanternBodyMat);
  lanternBody.scale.set(0.92, 1.24, 0.92);
  lanternGroup.add(lanternBody);

  const capMat = new THREE.MeshBasicMaterial({ color: '#3A2518' });
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.04, 8), capMat);
  topCap.position.y = 0.19;
  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.04, 8), capMat);
  botCap.position.y = -0.19;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 5), new THREE.MeshBasicMaterial({ color: '#B3261E' }));
  tassel.rotation.x = Math.PI;
  tassel.position.y = -0.28;
  lanternGroup.add(topCap, botCap, tassel);

  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSoftParticleTexture([
      [0.0, 'rgba(255, 224, 156, 0.88)'],
      [0.4, 'rgba(255, 166, 76, 0.34)'],
      [1.0, 'rgba(255, 140, 48, 0.0)'],
    ]),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glowSprite.scale.set(1.45, 1.45, 1);
  lanternGroup.add(glowSprite);

  const guideLight = new THREE.PointLight('#FFA64C', 1.6, 9.5, 1.6);
  lanternGroup.add(guideLight);
  spiritRoot.add(lanternGroup);

  guideSpiritUpdate = (s, time) => {
    const sGuide = clamp(s + 0.011, 0.008, 0.996);
    const gz = zFromS(sGuide);
    const gx = pathX(gz);
    const dxdz = pathDXDZ(gz);
    const heading = Math.atan2(-dxdz, -1);

    const landBlend = smoothstep(0.155, 0.180, sGuide);
    const riverAlpha = 1 - landBlend;

    spiritRoot.position.set(
      gx + lerp(-0.16, 0.0, landBlend) + Math.sin(time * 1.3) * 0.07 * landBlend,
      0,
      gz
    );
    spiritRoot.rotation.y = heading + Math.PI;

    raftGroup.visible = riverAlpha > 0.02;
    if (raftGroup.visible) {
      raftGroup.position.y = 0.02 + Math.sin(time * 2.1) * 0.025;
      raftGroup.rotation.z = Math.sin(time * 1.6) * 0.03;
      raftGroup.scale.setScalar(0.85 + 0.15 * riverAlpha);
      const pulse = 0.88 + 0.18 * Math.sin(time * 2.8);
      rippleMesh.scale.set(pulse, pulse, 1);
      rippleMat.opacity = 0.48 * riverAlpha;
    }

    lanternGroup.position.set(
      Math.sin(time * 1.8) * 0.05,
      lerp(0.35, 1.35 + Math.sin(time * 2.2) * 0.09, landBlend),
      lerp(0.42, 0.0, landBlend)
    );
    lanternGroup.rotation.z = Math.sin(time * 2.4) * 0.08;
    const nightBoost = smoothstep(0.80, 0.86, s);
    guideLight.intensity = lerp(1.3, 3.0, nightBoost);
    glowSprite.scale.setScalar(lerp(1.3, 1.85, nightBoost));
  };
}

// ============================================================================
// Six-Realm Particles & Atmospheres (Birds, Steam, Maple/Snow, Petals/Ginkgo, Night Embers)
// ============================================================================
function makeFanLeafTexture(fillHex, stemHex = null) {
  const lc = document.createElement('canvas');
  lc.width = lc.height = 64;
  const lg = lc.getContext('2d');
  lg.fillStyle = fillHex;
  lg.beginPath();
  lg.moveTo(32, 58);
  lg.arc(32, 58, 46, -2.35, -0.79);
  lg.closePath();
  lg.fill();
  if (stemHex) {
    lg.strokeStyle = stemHex;
    lg.lineWidth = 2.4;
    lg.beginPath();
    lg.moveTo(32, 62);
    lg.lineTo(32, 46);
    lg.stroke();
  }
  const tex = new THREE.CanvasTexture(lc);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildWalkAtmosphereAndParticles() {
  const rnd = mulberry32(9091);

  // 1) Flapping Origami Egrets over Realm 1 & Realm 4 Lakes
  const birdGroup = new THREE.Group();
  const birdMat = new THREE.MeshLambertMaterial({ color: '#2B2824', side: THREE.DoubleSide });
  const birds = [];
  const birdCount = IS_MOBILE ? 3 : 5;
  for (let i = 0; i < birdCount; i++) {
    const b = new THREE.Group();
    const ws = new THREE.Shape();
    ws.moveTo(0, 0.04);
    ws.quadraticCurveTo(0.42, 0.22, 0.86, -0.02);
    ws.quadraticCurveTo(0.45, -0.04, 0, -0.13);
    const wg = new THREE.ShapeGeometry(ws);
    const Lw = new THREE.Mesh(wg, birdMat);
    const Rw = new THREE.Mesh(wg, birdMat);
    Lw.rotation.x = Rw.rotation.x = Math.PI / 2;
    Rw.scale.x = -1;
    const Lp = new THREE.Group(); Lp.add(Lw);
    const Rp = new THREE.Group(); Rp.add(Rw);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 3), birdMat);
    body.rotation.x = Math.PI / 2;
    b.add(Lp, Rp, body);
    b.userData = { Lp, Rp, ph: i * 1.5, rx: 4.4 + i * 0.85, h: 5.4 + (i % 3) * 0.7, sp: 0.22 + i * 0.03 };
    birdGroup.add(b);
    birds.push(b);
  }
  walkScene.add(birdGroup);
  birdsUpdate = (time, s) => {
    const inSeg1 = s < 0.22;
    const inSeg4 = s > 0.46 && s < 0.61;
    birdGroup.visible = inSeg1 || inSeg4;
    if (!birdGroup.visible) return;
    const baseZ = inSeg4 ? -132 : -18;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const d = b.userData;
      const a = time * d.sp + d.ph;
      b.position.set(Math.cos(a) * d.rx, d.h + Math.sin(a * 2.1) * 0.45, baseZ - i * 4.2 + Math.sin(a) * 3.8);
      b.rotation.y = -a + Math.PI;
      b.rotation.z = Math.sin(a * 2.1) * 0.2;
      const flap = Math.sin(time * 6.4 + d.ph * 2.4) * 0.6;
      d.Lp.rotation.z = flap;
      d.Rp.rotation.z = -flap;
    }
  };

  // 2) River, Waterfall & Cold Rime Mist Bands
  const mistTex = makeSoftParticleTexture([
    [0.0, 'rgba(248, 248, 244, 0.42)'],
    [0.55, 'rgba(248, 248, 244, 0.15)'],
    [1.0, 'rgba(248, 248, 244, 0.0)'],
  ]);
  const mistBands = [
    [-2.5, 2.4, -14, 13],
    [2.2,  2.2, -28, 14],
    [-2.0, 2.4, -130, 14],
    [1.8,  2.2, -144, 14],
    [0.0,  2.3, -156, 16], // Dajing rime cold fog
  ].map(([x, y, z, w]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.26),
      new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.56 })
    );
    m.position.set(x, y, z);
    m.userData = { x, y };
    m.renderOrder = 5;
    walkScene.add(m);
    return m;
  });
  riverMistUpdate = (time) => {
    mistBands.forEach((m, i) => {
      m.position.x = m.userData.x + Math.sin(time * 0.12 + i * 1.8) * 2.2;
      m.position.y = m.userData.y + Math.sin(time * 0.32 + i) * 0.14;
      const dCam = m.position.distanceTo(walkCamera.position);
      m.visible = dCam > 4.5 && dCam < 56;
    });
  };

  // 3) Swaying Eave Lanterns (Daxu + Villages) & Overhead String Lights (Realm 6 Night)
  const makeHangingLantern = (x, y, z, colHex, glowHex, scale = 0.52) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.42 * scale, 4),
      new THREE.MeshBasicMaterial({ color: '#2E251E' })
    );
    cord.position.y = -0.21 * scale;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.20 * scale, 10, 8),
      new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: glowHex,
        emissiveIntensity: 1.45,
        roughness: 0.75,
      })
    );
    bulb.scale.set(0.92, 1.18, 0.92);
    bulb.position.y = -0.52 * scale;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSoftParticleTexture([
        [0.0, `${glowHex}A8`],
        [0.45, `${glowHex}34`],
        [1.0, `${glowHex}00`],
      ]),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    halo.position.y = -0.52 * scale;
    halo.scale.set(1.65 * scale, 1.65 * scale, 1);
    p.add(cord, bulb, halo);
    p.userData = { ph: rnd() * 6.28, amp: 0.07 + rnd() * 0.05 };
    walkScene.add(p);
    swayingLanterns.push(p);
  };

  // Daxu & Ancient Village eave lanterns on outer building shoulders (±2.75)
  for (let i = 0; i < 8; i++) {
    const lz = -46.0 - i * 8.5;
    const side = i % 2 === 0 ? -2.75 : 2.75;
    makeHangingLantern(pathX(lz) + side, 3.65, lz, '#C63022', '#FF8E3C', 0.54);
  }

  // Realm 6 Festive & Night-Market overhead warm string lights
  const catenaryPts = [];
  for (let i = 0; i <= 14; i++) {
    const sz = lerp(-204.0, -242.0, i / 14);
    const side = (i % 2 === 0 ? -1 : 1) * 2.50;
    const sx = pathX(sz) + side;
    const sy = 4.45;
    catenaryPts.push(new THREE.Vector3(sx, sy, sz));
    if (i > 0) {
      const prev = catenaryPts[i - 1];
      const u = 0.30 + (i % 3) * 0.20;
      makeHangingLantern(lerp(prev.x, sx, u), sy - 0.14, lerp(prev.z, sz, u), '#EB862E', '#FFB454', 0.44);
    }
  }
  const stringGeo = new THREE.BufferGeometry().setFromPoints(catenaryPts);
  walkScene.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#4B3C2E', transparent: true, opacity: 0.62 })));

  // Warm point lights for Realm 6
  for (const lm of LANDMARK_SPECS) {
    if (lm.segment !== 5) continue;
    const sz = zFromS(lm.s);
    const pl = new THREE.PointLight('#FF9B42', 0, 14, 1.5);
    pl.position.set(pathX(sz) + lm.dx * 0.5, 3.4, sz + 0.6);
    walkScene.add(pl);
    marketLights.push(pl);
  }
  const balijieZ = zFromS(0.980);
  const charcoalLight = new THREE.PointLight('#FF6218', 0, 11, 1.6);
  charcoalLight.position.set(pathX(balijieZ) - 1.2, 1.3, balijieZ + 0.4);
  walkScene.add(charcoalLight);
  marketLights.push(charcoalLight);

  // 4) Daytime Broth & Soup Steam (Dongli fuzhu/stove, Baiguo duck soup, Sanjie ciba, Wusefan)
  const steamTex = makeSoftParticleTexture([
    [0.0, 'rgba(255, 252, 246, 0.62)'],
    [0.45, 'rgba(246, 242, 234, 0.26)'],
    [1.0, 'rgba(246, 242, 234, 0.0)'],
  ]);
  const steamAnchors = [
    [0.254, -1.42, 1.55], // lc-04 Dongli fuzhu
    [0.264, -0.78, 1.35], // noodle stove
    [0.768, -1.12, 1.45], // lc-09 Baiguo duck soup
    [0.788, -1.35, 1.45], // oil-tea stove
    [0.868,  1.12, 1.25], // lc-30 Wusefan
    [0.964,  1.15, 1.40], // lc-20 Sanjie ciba
  ].map(([s, dx, y]) => {
    const z = zFromS(s);
    return [pathX(z) + dx, y, z + 0.1];
  });

  const steamSprites = [];
  const steamCount = IS_MOBILE ? 24 : 36;
  for (let i = 0; i < steamCount; i++) {
    const src = steamAnchors[i % steamAnchors.length];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: steamTex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }));
    sp.userData = { ox: src[0], oy: src[1], oz: src[2], age: rnd(), sp: 0.18 + rnd() * 0.1, ph: rnd() * 6.28 };
    walkScene.add(sp);
    steamSprites.push(sp);
  }
  daySteamUpdate = (time, dt) => {
    for (const sp of steamSprites) {
      const d = sp.userData;
      const dCam = Math.abs(d.oz - walkCamera.position.z);
      sp.visible = dCam < 44 && dCam > 2.4;
      if (!sp.visible) continue;
      d.age = (d.age + dt * d.sp) % 1;
      const a = d.age;
      sp.position.set(
        d.ox + Math.sin(time * 0.9 + d.ph + a * 3.4) * (0.14 + a * 0.5),
        d.oy + a * 2.9,
        d.oz + Math.cos(time * 0.6 + d.ph) * 0.16
      );
      const sc = 0.52 + a * 1.5;
      sp.scale.set(sc, sc, 1);
      const camFade = smoothstep(2.8, 5.8, sp.position.distanceTo(walkCamera.position));
      sp.material.opacity = Math.sin(a * Math.PI) * 0.42 * camFade;
    }
  };

  // 5) Realm 4 Particles: Gudong Red Maple Leaves + Dajing Crystalline Rime Snowflakes!
  const mapleCount = IS_MOBILE ? 40 : 65;
  const mapleInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.24, 0.22),
    new THREE.MeshBasicMaterial({ map: makeFanLeafTexture('#D9482B', '#7A2214'), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    mapleCount
  );
  walkScene.add(mapleInst);
  const mapleData = Array.from({ length: mapleCount }, () => {
    const lz = -128 - rnd() * 16;
    return { x: pathX(lz) + (rnd() - 0.5) * 10.5, y: 0.3 + rnd() * 7.8, z: lz, fall: 0.45 + rnd() * 0.45, ph: rnd() * 6.28, sc: 0.7 + rnd() * 0.55 };
  });

  const snowCount = IS_MOBILE ? 75 : 125;
  const snowTex = makeSoftParticleTexture([
    [0.0, 'rgba(255, 255, 255, 0.98)'],
    [0.4, 'rgba(226, 242, 255, 0.72)'],
    [1.0, 'rgba(210, 232, 255, 0.0)'],
  ]);
  const snowInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshBasicMaterial({ map: snowTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    snowCount
  );
  walkScene.add(snowInst);
  const snowData = Array.from({ length: snowCount }, () => {
    const lz = -148 - rnd() * 16;
    return { x: pathX(lz) + (rnd() - 0.5) * 12.0, y: 0.2 + rnd() * 8.5, z: lz, fall: 0.55 + rnd() * 0.65, ph: rnd() * 6.28, sc: 0.65 + rnd() * 0.75 };
  });

  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const v4 = new THREE.Vector3();
  const s4 = new THREE.Vector3();

  mapleAndSnowUpdate = (time, dt, s) => {
    mapleInst.visible = s > 0.44 && s < 0.66;
    if (mapleInst.visible) {
      for (let i = 0; i < mapleCount; i++) {
        const l = mapleData[i];
        l.y -= dt * l.fall;
        if (l.y < 0.06) { l.y = 7.6 + rnd() * 1.8; l.z = -128 - rnd() * 16; l.x = pathX(l.z) + (rnd() - 0.5) * 10.5; }
        v4.set(l.x + Math.sin(time * 1.1 + l.ph) * 0.4, l.y, l.z);
        e4.set(time * 1.3 + l.ph, time * 0.9 + l.ph, Math.sin(time + l.ph));
        q4.setFromEuler(e4);
        s4.set(l.sc, l.sc, l.sc);
        m4.compose(v4, q4, s4);
        mapleInst.setMatrixAt(i, m4);
      }
      mapleInst.instanceMatrix.needsUpdate = true;
    }

    snowInst.visible = s > 0.54 && s < 0.72;
    if (snowInst.visible) {
      for (let i = 0; i < snowCount; i++) {
        const l = snowData[i];
        l.y -= dt * l.fall;
        if (l.y < 0.05) { l.y = 8.0 + rnd() * 2.0; l.z = -148 - rnd() * 16; l.x = pathX(l.z) + (rnd() - 0.5) * 12.0; }
        v4.set(l.x + Math.sin(time * 0.8 + l.ph) * 0.35, l.y, l.z);
        e4.set(0, 0, 0);
        q4.setFromEuler(e4);
        s4.set(l.sc, l.sc, l.sc);
        m4.compose(v4, q4, s4);
        snowInst.setMatrixAt(i, m4);
      }
      snowInst.instanceMatrix.needsUpdate = true;
    }
  };

  // 6) Realm 5 Particles: Spring Peach Petals (lc-10) + Dense Golden Ginkgo Rain (lc-08..lc-17)!
  const petalCount = IS_MOBILE ? 45 : 75;
  const petalInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.20, 0.16),
    new THREE.MeshBasicMaterial({ map: makeFanLeafTexture('#F8BAC8'), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    petalCount
  );
  walkScene.add(petalInst);
  const petalData = Array.from({ length: petalCount }, () => {
    const lz = -162 - rnd() * 12;
    return { x: pathX(lz) + (rnd() - 0.5) * 11.0, y: 0.3 + rnd() * 7.5, z: lz, fall: 0.38 + rnd() * 0.42, ph: rnd() * 6.28, sc: 0.65 + rnd() * 0.6 };
  });

  const ginkgoCount = IS_MOBILE ? 95 : 165;
  const ginkgoInst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.28, 0.23),
    new THREE.MeshBasicMaterial({ map: makeFanLeafTexture('#F4C43B', '#C98A1A'), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    ginkgoCount
  );
  walkScene.add(ginkgoInst);
  const ginkgoData = Array.from({ length: ginkgoCount }, () => {
    const lz = -172 - rnd() * 28;
    return { x: pathX(lz) + (rnd() - 0.5) * 11.5, y: 0.3 + rnd() * 8.5, z: lz, fall: 0.45 + rnd() * 0.52, ph: rnd() * 6.28, sc: 0.72 + rnd() * 0.65 };
  });

  peachAndGinkgoUpdate = (time, dt, s) => {
    // Also keep visible when standing before Portal #4 (s > 0.60) so portal RT captures swirling petals & ginkgo leaves!
    petalInst.visible = s > 0.60 && s < 0.77;
    if (petalInst.visible) {
      for (let i = 0; i < petalCount; i++) {
        const l = petalData[i];
        l.y -= dt * l.fall;
        if (l.y < 0.06) { l.y = 7.4 + rnd() * 1.8; l.z = -162 - rnd() * 12; l.x = pathX(l.z) + (rnd() - 0.5) * 11.0; }
        v4.set(l.x + Math.sin(time * 1.2 + l.ph) * 0.45, l.y, l.z);
        e4.set(time * 1.5 + l.ph, time + l.ph, Math.sin(time * 1.3 + l.ph));
        q4.setFromEuler(e4);
        s4.set(l.sc, l.sc, l.sc);
        m4.compose(v4, q4, s4);
        petalInst.setMatrixAt(i, m4);
      }
      petalInst.instanceMatrix.needsUpdate = true;
    }

    ginkgoInst.visible = s > 0.60 && s < 0.88;
    if (ginkgoInst.visible) {
      for (let i = 0; i < ginkgoCount; i++) {
        const l = ginkgoData[i];
        l.y -= dt * l.fall;
        if (l.y < 0.06) { l.y = 7.8 + rnd() * 2.0; l.z = -172 - rnd() * 28; l.x = pathX(l.z) + (rnd() - 0.5) * 11.5; }
        v4.set(l.x + Math.sin(time * 1.1 + l.ph) * 0.42, l.y, l.z);
        e4.set(time * 1.4 + l.ph, time * 0.9 + l.ph, Math.sin(time * 1.2 + l.ph) * 1.15);
        q4.setFromEuler(e4);
        s4.set(l.sc, l.sc, l.sc);
        m4.compose(v4, q4, s4);
        ginkgoInst.setMatrixAt(i, m4);
      }
      ginkgoInst.instanceMatrix.needsUpdate = true;
    }
  };

  // 7) Realm 6 Night-Market BBQ Smoke, Festive Sparks & Twinkling Stars
  const nightSmokeTex = makeSoftParticleTexture([
    [0.0, 'rgba(255, 245, 226, 0.84)'],
    [0.36, 'rgba(255, 216, 166, 0.48)'],
    [0.72, 'rgba(238, 178, 118, 0.16)'],
    [1.0, 'rgba(238, 178, 118, 0.0)'],
  ]);
  const zFire = zFromS(0.974);
  const zBalijie = zFromS(0.986);
  const nightSmokeSrc = [
    [pathX(zFire) - 1.45, 1.35, zFire, 1.15],
    [pathX(zBalijie) - 1.12, 1.55, zBalijie, 1.05],
    [pathX(zFromS(0.991)) + 1.25, 1.35, zFromS(0.991), 0.78],
  ];
  const nightSmokeSprites = [];
  for (let i = 0; i < (IS_MOBILE ? 24 : 38); i++) {
    const src = nightSmokeSrc[i % nightSmokeSrc.length];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nightSmokeTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.renderOrder = 10;
    sp.userData = { ox: src[0] + (rnd() - 0.5) * 0.4, oy: src[1], oz: src[2] + (rnd() - 0.5) * 0.3, boost: src[3], age: rnd(), sp: 0.22 + rnd() * 0.12, ph: rnd() * 6.28, drift: (rnd() - 0.4) * 0.6 };
    walkScene.add(sp);
    nightSmokeSprites.push(sp);
  }
  nightSmokeUpdate = (time, dt, nightFactor) => {
    const vis = nightFactor > 0.04;
    for (const sp of nightSmokeSprites) {
      sp.visible = vis;
      if (!vis) continue;
      const d = sp.userData;
      d.age = (d.age + dt * d.sp) % 1;
      const a = d.age;
      sp.position.set(d.ox + d.drift * a + Math.sin(time * 1.3 + d.ph + a * 3.8) * (0.15 + a * 0.45), d.oy + a * 3.6 * d.boost, d.oz + Math.cos(time * 0.9 + d.ph) * 0.2);
      const sc = (0.62 + a * 1.75) * d.boost;
      sp.scale.set(sc, sc * 1.06, 1);
      const camFade = smoothstep(3.2, 6.8, sp.position.distanceTo(walkCamera.position));
      sp.material.opacity = Math.sin(a * Math.PI) * 0.46 * nightFactor * camFade;
    }
  };

  const emberTex = makeSoftParticleTexture([
    [0.0, 'rgba(255, 252, 226, 1.0)'],
    [0.28, 'rgba(255, 198, 86, 0.95)'],
    [0.62, 'rgba(255, 114, 28, 0.58)'],
    [1.0, 'rgba(255, 72, 12, 0.0)'],
  ]);
  const emberAnchors = [
    [zFromS(0.916), 1.18, 2.2],  // Straw dragon sparks
    [zFromS(0.940), -1.18, 2.0], // Paideng lantern fireflies
    [zFire, -1.45, 1.2],         // BBQ grill embers
    [zBalijie, -1.12, 1.4],      // Balijie night market sparks
  ];
  const emberSprites = [];
  for (let i = 0; i < (IS_MOBILE ? 42 : 68); i++) {
    const anc = emberAnchors[i % emberAnchors.length];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.renderOrder = 12;
    sp.userData = {
      ox: pathX(anc[0]) + anc[1] + (rnd() - 0.5) * anc[2],
      oy: 0.9 + rnd() * 0.6,
      oz: anc[0] + (rnd() - 0.5) * 1.4,
      age: rnd(),
      sp: 0.30 + rnd() * 0.30,
      ph: rnd() * 6.28,
      sz: 0.19 + rnd() * 0.22,
      drift: (rnd() - 0.45) * 0.95,
    };
    walkScene.add(sp);
    emberSprites.push(sp);
  }
  nightEmbersUpdate = (time, dt, nightFactor) => {
    const vis = nightFactor > 0.04;
    for (const sp of emberSprites) {
      sp.visible = vis;
      if (!vis) continue;
      const d = sp.userData;
      d.age = (d.age + dt * d.sp) % 1;
      const a = d.age;
      sp.position.set(d.ox + d.drift * a + Math.sin(time * 3.8 + d.ph + a * 5.2) * 0.22, d.oy + a * 3.9, d.oz + Math.cos(time * 2.8 + d.ph) * 0.18);
      const tw = 0.75 + 0.25 * Math.sin(time * 15 + d.ph * 4);
      const sc = d.sz * (1.15 - a * 0.48) * tw;
      sp.scale.set(sc, sc, 1);
      const camFade = smoothstep(3.2, 6.8, sp.position.distanceTo(walkCamera.position));
      sp.material.opacity = Math.sin(Math.min(1, a * 1.15) * Math.PI) * 0.88 * nightFactor * camFade;
    }
  };

  const starCount = 140;
  const starBuf = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starBuf[i * 3] = (rnd() - 0.5) * 48;
    starBuf[i * 3 + 1] = 8.0 + rnd() * 18;
    starBuf[i * 3 + 2] = -202 - rnd() * 68;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starBuf, 3));
  nightStars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: '#FFF4DC',
    size: 0.16,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }));
  walkScene.add(nightStars);
}

// ============================================================================
// Six-Realm Camera Choreography Along S-Curve + Portrait FOV Protection
// ============================================================================
const outCamPos = new THREE.Vector3();
const outCamLook = new THREE.Vector3();

function evaluateWalkCamera(s, panX, zoom) {
  const zFocus = zFromS(s);
  const xSpine = pathX(zFocus);
  const dxdz = pathDXDZ(zFocus);

  const w2 = smoothstep(0.14, 0.19, s) * (1 - smoothstep(0.31, 0.36, s));
  const w3 = smoothstep(0.31, 0.36, s) * (1 - smoothstep(0.47, 0.53, s));
  const w4 = smoothstep(0.47, 0.53, s) * (1 - smoothstep(0.64, 0.69, s));
  const w5 = smoothstep(0.64, 0.69, s) * (1 - smoothstep(0.80, 0.85, s));
  const w6 = smoothstep(0.80, 0.85, s);
  const w1 = Math.max(0, 1 - w2 - w3 - w4 - w5 - w6);

  // Distinct camera personality across the 6 realms:
  // 1) 漓江洲渚: 26° oblique boat-accompanying view
  // 2) 大圩古街: intimate low-eye-level arcade street stroll
  // 3) 古村清流: calm scholar-garden & riverside stroll
  // 4) 叠瀑琼枝: crisp canyon & alpine rime perspective
  // 5) 海洋金秋: elevated valley overlook across golden ginkgos
  // 6) 瑶风夜市: warm festive lantern & night-market stroll
  const baseOffX = w1 * 3.85 + w2 * (-dxdz * 2.2) + w3 * (-1.15) + w4 * 1.45 + w5 * (-1.65) + w6 * (-dxdz * 1.7 + 0.45);
  const baseOffY = w1 * 4.10 + w2 * 2.85 + w3 * 3.45 + w4 * 3.95 + w5 * 6.35 + w6 * 3.15;
  const baseOffZ = w1 * 11.2 + w2 * 10.6 + w3 * 11.0 + w4 * 11.4 + w5 * 12.0 + w6 * 10.6;
  const lookY    = w1 * 1.75 + w2 * 1.85 + w3 * 1.85 + w4 * 1.85 + w5 * 1.75 + w6 * 1.80;

  const distScale = computeDistScale(viewAspect) * zoom;
  const portraitLift = clamp((0.92 - viewAspect) * 0.45, 0, 0.22);

  const lateralPeek = (panX + state.gyroX * 0.55) * 2.25;
  const pitchPeek = state.gyroY * 0.62;

  outCamLook.set(
    xSpine + lateralPeek * 0.42,
    lookY + pitchPeek * 0.35,
    zFocus - 1.2
  );

  outCamPos.set(
    xSpine + baseOffX * lerp(1.0, 0.82, clamp(1 - viewAspect, 0, 1)) + lateralPeek,
    (baseOffY + portraitLift) * lerp(1.0, distScale, 0.68) + pitchPeek,
    zFocus + baseOffZ * distScale
  );

  return { pos: outCamPos, look: outCamLook };
}

// ============================================================================
// Six-Realm Sky, Lighting & Fog Palette (Including Alpine Frost & Starry Night!)
// ============================================================================
const ATMOSPHERE_STOPS = [
  { s: 0.000, bg: new THREE.Color('#EBF0EA'), key: new THREE.Color('#FFF5DF'), keyI: 2.20, sky: new THREE.Color('#DCF0EC'), gnd: new THREE.Color('#B5A482'), hemiI: 0.98, leak: new THREE.Color('#7D8F82'), fogD: 0.0108 },
  { s: 0.250, bg: new THREE.Color('#F3ECE2'), key: new THREE.Color('#FFEAC8'), keyI: 2.25, sky: new THREE.Color('#F8F0E2'), gnd: new THREE.Color('#A38D70'), hemiI: 0.98, leak: new THREE.Color('#9A7248'), fogD: 0.0110 },
  { s: 0.420, bg: new THREE.Color('#EDF1EA'), key: new THREE.Color('#FFF2DA'), keyI: 2.22, sky: new THREE.Color('#E4EFE8'), gnd: new THREE.Color('#9BA08A'), hemiI: 0.98, leak: new THREE.Color('#7C8A78'), fogD: 0.0108 },
  { s: 0.560, bg: new THREE.Color('#E3EEF0'), key: new THREE.Color('#F4FAFC'), keyI: 2.15, sky: new THREE.Color('#D8EEF2'), gnd: new THREE.Color('#8BA2A6'), hemiI: 1.00, leak: new THREE.Color('#6C8B94'), fogD: 0.0110 },
  { s: 0.646, bg: new THREE.Color('#DCE8F2'), key: new THREE.Color('#F2F8FF'), keyI: 2.25, sky: new THREE.Color('#E6F2FC'), gnd: new THREE.Color('#9FB4C6'), hemiI: 1.08, leak: new THREE.Color('#7D96B0'), fogD: 0.0118 },
  { s: 0.690, bg: new THREE.Color('#F5E8E6'), key: new THREE.Color('#FFEAD8'), keyI: 2.32, sky: new THREE.Color('#FCEEEB'), gnd: new THREE.Color('#C49E8E'), hemiI: 1.02, leak: new THREE.Color('#A87C74'), fogD: 0.0106 },
  { s: 0.750, bg: new THREE.Color('#F4E5C4'), key: new THREE.Color('#FFDC96'), keyI: 2.45, sky: new THREE.Color('#FFF1CE'), gnd: new THREE.Color('#BC8E40'), hemiI: 1.02, leak: new THREE.Color('#A67830'), fogD: 0.0104 },
  { s: 0.818, bg: new THREE.Color('#3B3D5B'), key: new THREE.Color('#E29F6E'), keyI: 1.20, sky: new THREE.Color('#525B84'), gnd: new THREE.Color('#2E2938'), hemiI: 0.74, leak: new THREE.Color('#2A3052'), fogD: 0.0112 },
  { s: 0.865, bg: new THREE.Color('#101A30'), key: new THREE.Color('#8BA9DC'), keyI: 0.80, sky: new THREE.Color('#283C66'), gnd: new THREE.Color('#221C26'), hemiI: 0.70, leak: new THREE.Color('#1A2644'), fogD: 0.0108 },
  { s: 1.000, bg: new THREE.Color('#0E172B'), key: new THREE.Color('#8BA9DC'), keyI: 0.80, sky: new THREE.Color('#263962'), gnd: new THREE.Color('#201A24'), hemiI: 0.70, leak: new THREE.Color('#182440'), fogD: 0.0108 },
];

function applyWalkAtmosphere(s, time) {
  let a = ATMOSPHERE_STOPS[0];
  let b = ATMOSPHERE_STOPS[ATMOSPHERE_STOPS.length - 1];
  for (let i = 0; i < ATMOSPHERE_STOPS.length - 1; i++) {
    if (s >= ATMOSPHERE_STOPS[i].s && s <= ATMOSPHERE_STOPS[i + 1].s) {
      a = ATMOSPHERE_STOPS[i];
      b = ATMOSPHERE_STOPS[i + 1];
      break;
    }
  }
  const f = a === b ? 0 : smoothstep(a.s, b.s, s);

  walkScene.background.copy(a.bg).lerp(b.bg, f);
  walkScene.fog.color.copy(walkScene.background);
  walkScene.fog.density = lerp(a.fogD, b.fogD, f);
  if (boundlessTableMat) boundlessTableMat.color.copy(walkScene.background);

  walkKey.color.copy(a.key).lerp(b.key, f);
  walkKey.intensity = lerp(a.keyI, b.keyI, f);
  walkHemi.color.copy(a.sky).lerp(b.sky, f);
  walkHemi.groundColor.copy(a.gnd).lerp(b.gnd, f);
  walkHemi.intensity = lerp(a.hemiI, b.hemiI, f);
  PAPER_UNIFORMS.leak.value.copy(a.leak).lerp(b.leak, f);

  const nightFactor = smoothstep(0.79, 0.855, s);
  PAPER_UNIFORMS.wrap.value = lerp(0.36, 0.48, nightFactor);
  PAPER_UNIFORMS.trans.value = lerp(0.28, 0.16, nightFactor);

  marketLights.forEach((pl, i) => {
    const isFire = i === marketLights.length - 1;
    const flick = isFire
      ? (1 + 0.16 * Math.sin(time * 9.2) + 0.09 * Math.cos(time * 14.7))
      : (1 + 0.04 * Math.sin(time * 3.1 + i * 1.7));
    pl.intensity = nightFactor * (isFire ? 5.6 : 4.4) * flick;
  });

  if (nightStars) nightStars.material.opacity = nightFactor * 0.82;
  return nightFactor;
}

// ============================================================================
// Portal Offscreen Render Pass & Door Swing Update
// ============================================================================
const portalLookTmp = new THREE.Vector3();
const savedStandeeStates = [];

function updateAndRenderPortals(time, mainLook) {
  let activeGate = null;
  let bestDz = -Infinity;
  const zTraveler = zFromS(state.t);

  for (const g of portalGates) {
    // Distance ahead of traveler (positive when gate is still ahead; <= 0 once stepped through!)
    const distFromTraveler = zTraveler - g.z;
    const dCamZ = walkCamera.position.z - g.z;
    const visibleRange = distFromTraveler > -0.35 && distFromTraveler < 23.0 && dCamZ > 5.5;
    g.gateRoot.visible = visibleRange;
    if (!visibleRange) continue;

    // Smoothly orient the portal gate toward walkCamera so the circular/scroll painting window
    // faces the viewer squarely & wide-open even on Chapter 1's oblique river-raft angle!
    const faceYaw = Math.atan2(walkCamera.position.x - g.x, Math.max(4.0, dCamZ));
    g.gateRoot.rotation.y = clamp(faceYaw * 0.92, -0.56, 0.56);

    // Keep doors closed while admiring the Picture-in-Painting (>= 4.4m ahead), then swing open as you step across!
    const openT = smoothstep(4.4, 0.25, distFromTraveler);
    const farFade = smoothstep(23.0, 17.5, distFromTraveler);
    const passFade = 1 - smoothstep(2.1, -0.32, distFromTraveler);
    const frameAlpha = farFade * passFade;

    g.leftPivot.rotation.y = -openT * 1.38;
    g.rightPivot.rotation.y = openT * 1.38;
    g.leftMat.opacity = frameAlpha;
    g.rightMat.opacity = frameAlpha;
    g.plaqueMesh.position.y = g.totalH - 0.14 + openT * 0.68;
    g.plaqueMat.opacity = farFade * (1 - smoothstep(3.8, 0.5, distFromTraveler));

    const lensAlpha = farFade * (1 - smoothstep(4.1, 0.65, distFromTraveler));
    g.lensMat.uniforms.uTime.value = time;
    g.lensMat.uniforms.uOpacity.value = lensAlpha;
    g.lensMesh.visible = lensAlpha > 0.02;

    // Choose closest upcoming gate with visible lens for the shared RenderTarget pass
    if (g.lensMesh.visible && distFromTraveler > 0.2 && distFromTraveler < 33.0) {
      const negDist = -Math.abs(distFromTraveler - 6.2);
      if (negDist > bestDz) {
        bestDz = negDist;
        activeGate = g;
      }
    }
  }

  // Update floating screen-space portal banner when approaching an active gate
  if (activeGate && state.mode === 'walk' && !state.selectedLandmark) {
    const distT = zFromS(state.t) - activeGate.z;
    const showBanner = distT > 2.2 && distT < 22.0;
    if (showBanner) {
      projScratch.set(activeGate.x, activeGate.totalH + 0.55, activeGate.z).project(walkCamera);
      const sx = (projScratch.x * 0.5 + 0.5) * viewW;
      const sy = clamp((-projScratch.y * 0.5 + 0.5) * viewH, 98, viewH - 120);
      if (projScratch.z > 0.05 && projScratch.z < 0.99 && sx > 40 && sx < viewW - 40) {
        dom.portalBannerTxt.textContent = activeGate.spec.title;
        const estW = activeGate.spec.title.length * 14 + 54;
        dom.portalBanner.style.transform = `translate3d(${Math.round(sx - estW * 0.5)}px, ${Math.round(sy - 14)}px, 0)`;
        dom.portalBanner.style.opacity = smoothstep(22, 16, distT).toFixed(3);
      } else {
        dom.portalBanner.style.opacity = '0';
      }
    } else {
      dom.portalBanner.style.opacity = '0';
    }
  } else {
    dom.portalBanner.style.opacity = '0';
  }

  if (!activeGate) return;

  // ---- Offscreen Real-Time Next-Realm Render Pass into portalRT ----
  const nextS = activeGate.spec.lookAheadS;
  const zBehindGate = activeGate.z - 2.6;
  const zLookDeep = activeGate.z - 20.5;

  // Subtle binocular parallax inside the painting window coupled to viewer offset!
  const viewerDx = clamp((walkCamera.position.x - activeGate.x) * 0.22, -1.2, 1.2);
  const viewerDy = clamp((walkCamera.position.y - 2.6) * 0.16, -0.5, 0.8);

  portalCam.position.set(pathX(zBehindGate) + viewerDx, 2.35 + viewerDy, zBehindGate);
  portalLookTmp.set(pathX(zLookDeep), 1.85, zLookDeep);
  portalCam.lookAt(portalLookTmp);

  // Temporarily pop open standees inside the next realm so the portal view is lush & alive!
  savedStandeeStates.length = 0;
  for (const item of walkStandees) {
    if (item.z < activeGate.z - 1.2 && item.z > activeGate.z - 34.0 && !item.hingeGroup.visible) {
      savedStandeeStates.push({ item, vis: item.hingeGroup.visible, rx: item.hingeGroup.rotation.x });
      item.hingeGroup.visible = true;
      item.hingeGroup.rotation.x = 0;
    }
  }

  // Temporarily hide portal gates to prevent self-occlusion, switch to next-realm sky & horizon
  const prevVis = portalGates.map((p) => p.gateRoot.visible);
  for (const p of portalGates) p.gateRoot.visible = false;

  applyWalkAtmosphere(nextS, time);
  updateCurvedHorizon(nextS, portalLookTmp);

  const prevShadowAuto = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(portalRT);
  renderer.clear();
  renderer.render(walkScene, portalCam);
  renderer.setRenderTarget(null);
  renderer.shadowMap.autoUpdate = prevShadowAuto;

  // Restore main scene state cleanly
  portalGates.forEach((p, idx) => { p.gateRoot.visible = prevVis[idx]; });
  for (const st of savedStandeeStates) {
    st.item.hingeGroup.visible = st.vis;
    st.item.hingeGroup.rotation.x = st.rx;
  }
  applyWalkAtmosphere(state.t, time);
  updateCurvedHorizon(state.t, mainLook);
}

// ============================================================================
// MODE 2: Four 2.5D Seasonal & Day/Night Painting Realms ("2.5D 画境")
// ============================================================================
const depthScene = new THREE.Scene();
depthScene.background = new THREE.Color('#EFE2C2');
depthScene.fog = new THREE.FogExp2('#EFE2C2', 0.015);

function computeDepthFov(aspect) {
  return lerp(43, 55, clamp((1.05 - aspect) / 0.58, 0, 1));
}
function computeDepthDistScale(aspect) {
  return Math.max(1.0, 0.94 / Math.max(0.46, aspect));
}

const depthCamera = new THREE.PerspectiveCamera(computeDepthFov(viewAspect), viewAspect, 0.15, 180);

const depthHemi = new THREE.HemisphereLight('#FFF4DC', '#AF8E56', 1.15);
depthScene.add(depthHemi);
const depthKey = new THREE.DirectionalLight('#FFE6B2', 1.9);
depthKey.position.set(12, 18, 16);
depthScene.add(depthKey);

const depthGroups = {
  haiyang: new THREE.Group(),
  lijiang: new THREE.Group(),
  dajing:  new THREE.Group(),
  paideng: new THREE.Group(),
};
Object.values(depthGroups).forEach((grp) => {
  grp.visible = false;
  depthScene.add(grp);
});
depthGroups.haiyang.visible = true;

const depthAnimHooks = { haiyang: [], lijiang: [], dajing: [], paideng: [] };

function createReliefLayer(imgName, {
  w, h, x = 0, y = 0, z = 0,
  bulge = 0.42, curve = 0.0, tint = null, flipX = false,
  feathered = false, alphaTest = 0.06, opacity = 1, bottomGrounded = true, nightGlow = false,
} = {}) {
  const img = IMAGES[imgName] || IMAGES['lc-08'] || IMAGES['cut-ginkgo'];
  const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const finalW = w || h * aspect;
  const finalH = h || w / aspect;

  const { tex } = feathered
    ? buildFeatheredBackdropTexture(imgName, { tint, flipX }, MAX_ANISO)
    : buildDieCutTexture(imgName, { tint, flipX, rim: false, kraftBack: false }, MAX_ANISO);

  const geo = new THREE.PlaneGeometry(finalW, finalH, 18, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const nx = vx / (finalW * 0.5 || 1);
    const ny = vy / (finalH * 0.5 || 1);
    const dome = Math.max(0, 1 - (nx * nx * 0.72 + ny * ny * 0.55));
    pos.setZ(i, dome * bulge + (nx * nx) * curve);
  }
  geo.computeVertexNormals();
  if (bottomGrounded) geo.translate(0, finalH * 0.5, 0);

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: feathered ? 0 : alphaTest,
    depthWrite: !feathered,
    opacity,
    side: THREE.DoubleSide,
  });
  if (nightGlow) {
    mat.emissive = new THREE.Color('#42220A');
    mat.emissiveIntensity = 0.46;
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function createSkyBackdrop(stops, cloudTint) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 512);

  const rnd = mulberry32(919);
  for (let i = 0; i < 18; i++) {
    const cx = rnd() * 1024;
    const cy = 60 + rnd() * 230;
    const rx = 80 + rnd() * 180;
    const ry = 20 + rnd() * 40;
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
    cg.addColorStop(0, cloudTint);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save();
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    g.translate(-cx, -cy);
    g.fillStyle = cg;
    g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTyndallBeams(group, { color = '#FFE4A2', count = 5, xRange = [-3.8, 3.8], zRange = [-3.8, 2.5], opacity = 0.2 }) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float horiz = pow(max(0.0, sin(vUv.x * 3.14159265)), 1.9);
        float vert = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.12, vUv.y);
        float streaks = 0.68 + 0.32 * sin(vUv.x * 15.0 + uTime * 0.4 + vUv.y * 2.0);
        gl_FragColor = vec4(uColor, horiz * vert * streaks * uOpacity);
      }
    `,
  });
  for (let i = 0; i < count; i++) {
    const k = count === 1 ? 0.5 : i / (count - 1);
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(2.8 + (i % 2) * 1.1, 14.5), mat);
    bm.position.set(lerp(xRange[0], xRange[1], k), 5.4, lerp(zRange[0], zRange[1], (i * 0.37) % 1));
    bm.rotation.z = -0.32 - (i % 3) * 0.04;
    bm.renderOrder = 20;
    group.add(bm);
  }
  return (time) => { mat.uniforms.uTime.value = time; };
}

function createFeatheredFloorPlane(imgName, tintHex, w = 44, d = 42) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  if (IMAGES[imgName]) g.drawImage(IMAGES[imgName], 0, 0, 1024, 1024);
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(512, 512, 160, 512, 512, 500);
  rg.addColorStop(0.0, 'rgba(0,0,0,1)');
  rg.addColorStop(0.72, 'rgba(0,0,0,0.92)');
  rg.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 1024, 1024);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(w, d, 20, 20);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const fx = pos.getX(i);
    const fz = pos.getZ(i);
    pos.setY(i, smoothstep(1.6, 8.0, Math.abs(fx)) * 0.32 + Math.sin(fx * 0.5) * Math.cos(fz * 0.4) * 0.05);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, color: tintHex, transparent: true, depthWrite: true }));
}

function addDepthParticles(G, hooks, tex, count, { xSpan = 10.5, yMax = 7.0, zMin = -8, zSpan = 12, speed = 0.4, spin = true, additive = false } = {}) {
  const rnd = mulberry32(Math.round(xSpan * 100 + count));
  const inst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.19),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
    count
  );
  G.add(inst);
  const data = Array.from({ length: count }, () => ({
    x: (rnd() - 0.5) * xSpan,
    y: 0.25 + rnd() * yMax,
    z: zMin + rnd() * zSpan,
    sp: speed * (0.7 + rnd() * 0.7),
    ph: rnd() * 6.28,
    sc: 0.65 + rnd() * 0.7,
  }));
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const v4 = new THREE.Vector3();
  const s4 = new THREE.Vector3();

  hooks.push((time, dt) => {
    for (let i = 0; i < count; i++) {
      const l = data[i];
      if (additive) {
        l.y += dt * l.sp;
        if (l.y > yMax) { l.y = 0.3; l.x = (rnd() - 0.5) * xSpan; }
      } else {
        l.y -= dt * l.sp;
        if (l.y < 0.05) { l.y = yMax + rnd() * 1.2; l.x = (rnd() - 0.5) * xSpan; }
      }
      v4.set(l.x + Math.sin(time * 0.9 + l.ph) * 0.38, l.y, l.z);
      if (spin) e4.set(time * 1.3 + l.ph, time * 0.8 + l.ph, Math.sin(time + l.ph));
      else e4.set(0, 0, 0);
      q4.setFromEuler(e4);
      s4.set(l.sc, l.sc, l.sc);
      m4.compose(v4, q4, s4);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
  });
}

function buildDepthSceneHaiyang() {
  const G = depthGroups.haiyang;
  const hooks = depthAnimHooks.haiyang;

  const infBase = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#EFE2C2', fog: true }));
  infBase.position.y = -0.08;
  G.add(infBase);

  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 44), new THREE.MeshBasicMaterial({ map: createSkyBackdrop([[0, '#E9D2A3'], [0.48, '#F5E6C4'], [1, '#F8F0DC']], 'rgba(255,248,228,0.42)'), fog: false }));
  skyMesh.position.set(0, 12.0, -30);
  G.add(skyMesh);

  G.add(createReliefLayer('bd-lingchuan', { w: 44, x: 0, y: -0.4, z: -20.0, bulge: -0.6, curve: 2.2, feathered: true }));
  G.add(createReliefLayer('cut-ginkgo-tall', { h: 8.4, x: -4.1, y: 0, z: -11.6, bulge: 0.55, tint: 'rgba(245,226,184,0.26)' }));
  G.add(createReliefLayer('cut-ginkgo-tall', { h: 8.0, x: 4.2, y: 0, z: -11.2, bulge: 0.55, flipX: true, tint: 'rgba(245,226,184,0.26)' }));

  const villageLane = createReliefLayer('lc-08', { h: 4.8, x: -1.15, y: 0, z: -6.4, bulge: 0.72 });
  const heroHouse = createReliefLayer('cut-oldhouse', { h: 3.7, x: 1.75, y: 0, z: -7.0, bulge: 0.50 });
  const duckSoup = createReliefLayer('lc-09', { h: 2.05, x: -2.15, y: 0, z: -3.5, bulge: 0.38 });
  G.add(villageLane, heroHouse, duckSoup);
  hooks.push((time) => { villageLane.rotation.z = Math.sin(time * 0.7) * 0.01; });

  const floorMesh = createFeatheredFloorPlane('gr-lingchuan', '#FAF2DE');
  floorMesh.position.set(0, -0.03, -6.0);
  G.add(floorMesh);

  G.add(createReliefLayer('cut-ginkgo-cat', { h: 1.45, x: -1.58, y: 0.04, z: -0.6, bulge: 0.32 }));
  G.add(createReliefLayer('cut-ginkgo-shaiqiu', { h: 2.10, x: 1.82, y: 0.03, z: -1.0, bulge: 0.40 }));

  hooks.push(createTyndallBeams(G, { color: '#FFE4A2', count: 5, opacity: 0.21 }));
  addDepthParticles(G, hooks, makeFanLeafTexture('#F3C646', '#C98A1A'), IS_MOBILE ? 55 : 85, { speed: 0.38, spin: true });
}

function buildDepthSceneLijiang() {
  const G = depthGroups.lijiang;
  const hooks = depthAnimHooks.lijiang;

  const infBase = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#DCE8E4', fog: true }));
  infBase.position.y = -0.08;
  G.add(infBase);

  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 44), new THREE.MeshBasicMaterial({ map: createSkyBackdrop([[0, '#C5D8D3'], [0.5, '#DEEAE6'], [1, '#EEF4F1']], 'rgba(255,255,255,0.45)'), fog: false }));
  skyMesh.position.set(0, 12.0, -30);
  G.add(skyMesh);

  G.add(createReliefLayer('bd-guilin', { w: 44, x: 0, y: -0.4, z: -20.0, bulge: -0.6, curve: 2.2, feathered: true }));
  G.add(createReliefLayer('lc-03', { h: 3.6, x: -2.2, y: 0, z: -11.2, bulge: 0.5 }));
  G.add(createReliefLayer('lc-13', { h: 3.85, x: 1.25, y: 0, z: -8.6, bulge: 0.6 }));
  G.add(createReliefLayer('lc-02', { h: 2.85, x: -1.35, y: 0, z: -5.2, bulge: 0.55 }));

  const raft = createReliefLayer('cut-raft', { h: 1.85, x: 1.25, y: 0.06, z: -1.4, bulge: 0.4 });
  G.add(raft);
  hooks.push((time) => {
    raft.position.x = 1.25 + Math.sin(time * 0.42) * 0.42;
    raft.position.y = 0.06 + Math.sin(time * 1.5) * 0.04;
    raft.rotation.z = Math.sin(time * 1.1) * 0.016;
  });

  const dWaterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main() {
        float w = 0.5 + 0.5 * sin(vUv.x * 22.0 - uTime * 0.7 + sin(vUv.y * 16.0) * 1.3);
        vec3 col = mix(vec3(0.18, 0.39, 0.37), vec3(0.47, 0.68, 0.64), w * 0.55 + (1.0 - vUv.y) * 0.28);
        col = mix(col, vec3(0.94, 0.98, 0.96), smoothstep(0.86, 0.99, w) * 0.42);
        float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y) * smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
        gl_FragColor = vec4(col, edge * 0.76);
      }
    `,
  });
  const dWater = new THREE.Mesh(new THREE.PlaneGeometry(36, 26).rotateX(-Math.PI / 2), dWaterMat);
  dWater.position.set(0, 0.01, -4.5);
  G.add(dWater);
  hooks.push((time) => { dWaterMat.uniforms.uTime.value = time; });
  hooks.push(createTyndallBeams(G, { color: '#E8F7F4', count: 4, opacity: 0.17 }));
}

function buildDepthSceneDajing() {
  const G = depthGroups.dajing;
  const hooks = depthAnimHooks.dajing;

  const infBase = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#DDE8F2', fog: true }));
  infBase.position.y = -0.08;
  G.add(infBase);

  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 44), new THREE.MeshBasicMaterial({ map: createSkyBackdrop([[0, '#B9CEE0'], [0.5, '#DAE7F2'], [1, '#F0F6FB']], 'rgba(255,255,255,0.58)'), fog: false }));
  skyMesh.position.set(0, 12.0, -30);
  G.add(skyMesh);

  G.add(createReliefLayer('bd-guilin', { w: 44, x: 0, y: -0.4, z: -20.0, bulge: -0.6, curve: 2.2, tint: 'rgba(220, 236, 252, 0.56)', feathered: true }));
  G.add(createReliefLayer('lc-12', { h: 4.8, x: -2.6, y: 0, z: -11.0, bulge: 0.5, tint: 'rgba(215, 232, 248, 0.32)' }));

  // Hero Dajing Rime Forest + Frosty Trees + Dajing Yao Costume & Five-Color Rice — 100% inside [-3.6, +3.6]!
  const rimeHero = createReliefLayer('lc-11', { h: 5.0, x: 0.55, y: 0, z: -6.2, bulge: 0.72 });
  const rimeSide = createReliefLayer('lc-11', { h: 4.4, x: -2.35, y: 0, z: -7.8, bulge: 0.55, flipX: true, tint: 'rgba(228, 242, 255, 0.25)' });
  G.add(rimeHero, rimeSide);

  const floorMesh = createFeatheredFloorPlane('gr-lingchuan', '#EBF3FA');
  floorMesh.position.set(0, -0.03, -6.0);
  G.add(floorMesh);

  G.add(createReliefLayer('lc-34', { h: 2.75, x: -1.45, y: 0.02, z: -1.2, bulge: 0.36 }));
  G.add(createReliefLayer('lc-30', { h: 1.85, x: 1.55, y: 0.03, z: -0.9, bulge: 0.36 }));

  hooks.push(createTyndallBeams(G, { color: '#E8F4FF', count: 5, opacity: 0.22 }));
  const snowTex = makeSoftParticleTexture([[0, 'rgba(255,255,255,0.98)'], [0.45, 'rgba(224,240,255,0.7)'], [1, 'rgba(224,240,255,0)']]);
  addDepthParticles(G, hooks, snowTex, IS_MOBILE ? 65 : 105, { speed: 0.52, spin: false });
}

function buildDepthScenePaideng() {
  const G = depthGroups.paideng;
  const hooks = depthAnimHooks.paideng;

  const infBase = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0F192E', fog: true }));
  infBase.position.y = -0.08;
  G.add(infBase);

  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 44), new THREE.MeshBasicMaterial({ map: createSkyBackdrop([[0, '#091022'], [0.55, '#132140'], [1, '#203258']], 'rgba(90,120,180,0.16)'), fog: false }));
  skyMesh.position.set(0, 12.0, -30);
  G.add(skyMesh);

  G.add(createReliefLayer('bd-guilin', { w: 44, x: 0, y: -0.4, z: -20.0, bulge: -0.6, curve: 2.2, tint: 'rgba(18, 28, 56, 0.62)', feathered: true }));

  const oldArcade = createReliefLayer('lc-01', { h: 4.5, x: -2.05, y: 0, z: -8.2, bulge: 0.55, nightGlow: true });
  const balijieBg = createReliefLayer('lc-19', { h: 4.1, x: 2.15, y: 0, z: -8.8, bulge: 0.55, nightGlow: true });
  G.add(oldArcade, balijieBg);

  const floorMesh = createFeatheredFloorPlane('gr-guilin', '#3A4668');
  floorMesh.position.set(0, -0.03, -6.0);
  G.add(floorMesh);

  // Hero Lingtian Paideng Parade + Lantian Straw Dragon in foreground-midground (100% framed on 390×700!)
  const paideng = createReliefLayer('lc-28', { h: 3.35, x: -1.15, y: 0.02, z: -3.6, bulge: 0.55, nightGlow: true });
  const dragon = createReliefLayer('lc-29', { h: 2.75, x: 1.45, y: 0.03, z: -1.3, bulge: 0.48, nightGlow: true });
  G.add(paideng, dragon);

  const nightPt = new THREE.PointLight('#FFA648', 4.8, 18, 1.4);
  nightPt.position.set(0, 3.8, -1.5);
  G.add(nightPt);

  hooks.push((time) => {
    paideng.position.y = 0.02 + Math.abs(Math.sin(time * 2.2)) * 0.04;
    dragon.rotation.z = Math.sin(time * 1.8) * 0.02;
    nightPt.intensity = 4.6 + Math.sin(time * 5.0) * 0.4;
  });

  const fireflyTex = makeSoftParticleTexture([[0, 'rgba(255,250,218,1)'], [0.35, 'rgba(255,190,78,0.9)'], [1, 'rgba(255,120,24,0)']]);
  addDepthParticles(G, hooks, fireflyTex, IS_MOBILE ? 55 : 85, { speed: 0.36, spin: false, additive: true });
}

const DEPTH_SCENE_TITLES = {
  haiyang: '2.5D 画境 · 海洋秋村',
  lijiang: '2.5D 画境 · 漓江桃洲',
  dajing:  '2.5D 画境 · 大境雾凇',
  paideng: '2.5D 画境 · 牌灯夜游',
};

function applyDepthSceneAtmosphere(sceneId) {
  document.body.dataset.depthScene = sceneId;
  Object.entries(depthGroups).forEach(([k, grp]) => { grp.visible = k === sceneId; });

  if (sceneId === 'haiyang') {
    depthScene.background.set('#EFE2C2');
    depthScene.fog.color.set('#EFE2C2');
    depthScene.fog.density = 0.015;
    depthHemi.color.set('#FFF3D8');
    depthHemi.groundColor.set('#B48D4A');
    depthKey.color.set('#FFE3A8');
    depthKey.intensity = 1.95;
  } else if (sceneId === 'lijiang') {
    depthScene.background.set('#DCE8E4');
    depthScene.fog.color.set('#DCE8E4');
    depthScene.fog.density = 0.017;
    depthHemi.color.set('#EDF8F5');
    depthHemi.groundColor.set('#6E8A84');
    depthKey.color.set('#F5FCFA');
    depthKey.intensity = 1.68;
  } else if (sceneId === 'dajing') {
    depthScene.background.set('#DDE8F2');
    depthScene.fog.color.set('#DDE8F2');
    depthScene.fog.density = 0.016;
    depthHemi.color.set('#F2F8FF');
    depthHemi.groundColor.set('#8DA4BA');
    depthKey.color.set('#FFFFFF');
    depthKey.intensity = 1.85;
  } else {
    depthScene.background.set('#0F192E');
    depthScene.fog.color.set('#0F192E');
    depthScene.fog.density = 0.015;
    depthHemi.color.set('#3A5288');
    depthHemi.groundColor.set('#241E2C');
    depthKey.color.set('#FFD094');
    depthKey.intensity = 1.15;
  }
}

// ============================================================================
// 3-Layer Peep-in-Fan Diorama Canvas Engine + 4-Section Gazetteer Card
// ============================================================================
const fanCtx = dom.fanFx.getContext('2d');
const fanParticles = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 220,
  y: (i * 53) % 220,
  r: 2.2 + (i % 4) * 1.1,
  vy: 0.45 + (i % 5) * 0.18,
  vx: ((i % 3) - 1) * 0.25,
  ph: i * 0.9,
}));
let currentFanFx = 'ginkgo';

function updateFanDiorama(time, dt) {
  if (!state.selectedLandmark) return;

  const k = 1 - Math.exp(-dt * 10);
  const tx = clamp(state.fanLookXTarget + state.gyroX * 0.7, -1, 1);
  const ty = clamp(state.fanLookYTarget + state.gyroY * 0.7, -1, 1);
  state.fanLookX = lerp(state.fanLookX, tx, k);
  state.fanLookY = lerp(state.fanLookY, ty, k);

  // Opposite/graded 3-layer depth parallax inside the circular fan!
  dom.fanBg.style.transform = `translate3d(${(-state.fanLookX * 8).toFixed(1)}px, ${(-state.fanLookY * 6).toFixed(1)}px, 0) scale(1.12)`;
  dom.fanMid.style.transform = `translate3d(${(state.fanLookX * 7).toFixed(1)}px, ${(state.fanLookY * 5).toFixed(1)}px, 0)`;
  dom.fanFx.style.transform = `translate3d(${(state.fanLookX * 15).toFixed(1)}px, ${(state.fanLookY * 11).toFixed(1)}px, 0)`;

  // Render subtle live foreground micro-particles in #fan-fx
  fanCtx.clearRect(0, 0, 220, 220);
  for (const p of fanParticles) {
    if (currentFanFx === 'ember') {
      p.y -= p.vy * 1.1;
      if (p.y < -8) p.y = 228;
    } else {
      p.y += p.vy;
      if (p.y > 228) p.y = -8;
    }
    p.x = (p.x + p.vx + Math.sin(time * 1.6 + p.ph) * 0.35 + 220) % 220;

    fanCtx.save();
    fanCtx.translate(p.x, p.y);
    if (currentFanFx === 'ginkgo') {
      fanCtx.rotate(Math.sin(time * 1.4 + p.ph) * 0.8);
      fanCtx.fillStyle = 'rgba(242, 194, 54, 0.82)';
      fanCtx.beginPath();
      fanCtx.moveTo(0, p.r);
      fanCtx.arc(0, p.r, p.r * 2.1, -2.35, -0.79);
      fanCtx.closePath();
      fanCtx.fill();
    } else if (currentFanFx === 'petal') {
      fanCtx.rotate(time + p.ph);
      fanCtx.fillStyle = 'rgba(244, 158, 174, 0.78)';
      fanCtx.beginPath();
      fanCtx.ellipse(0, 0, p.r * 1.3, p.r * 0.85, 0, 0, Math.PI * 2);
      fanCtx.fill();
    } else if (currentFanFx === 'snow') {
      fanCtx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      fanCtx.beginPath();
      fanCtx.arc(0, 0, p.r * 0.85, 0, Math.PI * 2);
      fanCtx.fill();
    } else if (currentFanFx === 'ember') {
      fanCtx.fillStyle = 'rgba(255, 192, 82, 0.86)';
      fanCtx.beginPath();
      fanCtx.arc(0, 0, p.r * 0.75, 0, Math.PI * 2);
      fanCtx.fill();
    } else {
      fanCtx.fillStyle = 'rgba(255, 255, 252, 0.36)';
      fanCtx.beginPath();
      fanCtx.arc(0, 0, p.r * 1.5, 0, Math.PI * 2);
      fanCtx.fill();
    }
    fanCtx.restore();
  }
}

function updateStampCounter(flash = false) {
  dom.stampCount.textContent = `${state.stampedIds.size}/${LANDMARK_SPECS.length}`;
  if (flash) {
    dom.stampPill.classList.remove('stamping');
    void dom.stampPill.offsetWidth;
    dom.stampPill.classList.add('stamping');
  }
}

let inlineNoteTimer = null;
function showInlineCardNote(msg) {
  dom.cardInlineNote.textContent = msg;
  dom.cardInlineNote.classList.add('show');
  if (inlineNoteTimer) clearTimeout(inlineNoteTimer);
  inlineNoteTimer = setTimeout(() => dom.cardInlineNote.classList.remove('show'), 2200);
}

function openDetailCard(entry) {
  state.selectedLandmark = entry;
  state.fanLookXTarget = 0;
  state.fanLookYTarget = 0;
  const s = entry.spec;

  currentFanFx = s.fanFx || 'mist';
  const bgUrlGuilin = getAssetUrl('bd-guilin', false);
  const bgUrlLingchuan = getAssetUrl('bd-lingchuan', false);
  if (s.fanBg === 'autumn') {
    dom.fanBg.style.backgroundImage = `linear-gradient(180deg, rgba(246,230,192,0.55), rgba(248,238,214,0.85)), url('${bgUrlLingchuan}')`;
  } else if (s.fanBg === 'winter') {
    dom.fanBg.style.backgroundImage = `linear-gradient(180deg, rgba(198,220,240,0.68), rgba(236,245,252,0.88)), url('${bgUrlGuilin}')`;
  } else if (s.fanBg === 'night') {
    dom.fanBg.style.backgroundImage = ` radial-gradient(circle at 50% 38%, #283E6E 0%, #101B34 78%)`;
  } else {
    dom.fanBg.style.backgroundImage = `linear-gradient(180deg, rgba(212,232,226,0.52), rgba(238,245,242,0.86)), url('${bgUrlGuilin}')`;
  }

  dom.cardImg.src = getAssetUrl(s.img, true);
  dom.cardImg.alt = s.title;
  dom.cardCat.textContent = s.category;
  dom.cardZone.textContent = s.zoneName;
  dom.cardCode.textContent = s.code || '';
  dom.cardTitle.textContent = s.title;
  dom.cardTagline.textContent = s.tagline;
  dom.factTown.textContent = s.town;
  dom.factSeason.textContent = s.season;
  dom.factStat.textContent = s.stat;
  dom.cardStory.textContent = s.story;
  dom.cardTips.textContent = s.tips;
  dom.cardInlineNote.classList.remove('show');
  dom.cardScroll.scrollTop = 0;

  const isStamped = state.stampedIds.has(s.id);
  dom.cardStampBtn.classList.toggle('stamped', isStamped);
  dom.cardStampLabel.textContent = isStamped ? '已印 · 留念' : '盖章留念';

  dom.card.style.transform = '';
  dom.card.classList.add('open');
  dom.cardBackdrop.classList.add('open');
  dom.card.setAttribute('aria-hidden', 'false');
}

function closeDetailCard() {
  if (!state.selectedLandmark) return;
  state.selectedLandmark = null;
  dom.card.classList.remove('open');
  dom.cardBackdrop.classList.remove('open');
  dom.card.setAttribute('aria-hidden', 'true');
  dom.card.style.transform = '';
}

function setMode(nextMode) {
  if (state.mode === nextMode) return;
  closeDetailCard();
  if (nextMode !== 'map') mapViewApi?.closeZoom?.();
  state.velT = 0;
  state.velDepth = 0;
  dom.modeVeil.classList.add('flash');
  setTimeout(() => {
    state.mode = nextMode;
    document.body.dataset.mode = nextMode;
    dom.modeBtns.forEach((b) => {
      const on = b.dataset.mode === nextMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    dom.walkDock.hidden = nextMode !== 'walk';
    dom.depthDock.hidden = nextMode !== 'depth';

    if (nextMode === 'depth') {
      dom.chapterSub.textContent = DEPTH_SCENE_TITLES[state.depthScene];
      applyDepthSceneAtmosphere(state.depthScene);
    } else if (nextMode === 'map') {
      dom.chapterSub.textContent = '七镇五乡 · 一脉青绿';
    } else {
      dom.chapterSub.textContent = SEGMENTS[state.segmentIdx].sub;
    }

    requestAnimationFrame(() => dom.modeVeil.classList.remove('flash'));
  }, 140);
}

function syncSegmentUI() {
  let idx = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (state.t >= SEGMENTS[i].start - 0.0001) idx = i;
  }
  if (idx !== state.segmentIdx) {
    state.segmentIdx = idx;
    const seg = SEGMENTS[idx];
    document.body.dataset.segment = seg.id;
    if (state.mode === 'walk') dom.chapterSub.textContent = seg.sub;
    dom.chapterPills.forEach((btn, i) => {
      const active = i === idx;
      btn.classList.toggle('active', active);
      if (active && IS_MOBILE) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  // Update "穿镜窥景" quick-hop button label with next upcoming portal seal!
  let nextGate = PORTAL_SPECS.find((p) => p.s > state.t + 0.012) || PORTAL_SPECS[0];
  const targetLabel = `穿镜 · ${nextGate.seal}`;
  if (dom.nextPortalLabel.textContent !== targetLabel) {
    dom.nextPortalLabel.textContent = targetLabel;
  }
}

// ============================================================================
// Screen-Space Collision-Free Paper Tags
// ============================================================================
const projScratch = new THREE.Vector3();
const tagCandidates = [];

function updateScreenPaperTags(dt) {
  tagCandidates.length = 0;

  if (state.mode === 'walk' && !state.selectedLandmark) {
    const safeTop = IS_MOBILE ? 92 : 106;
    const safeBot = viewH - (IS_MOBILE ? 96 : 106);

    for (const lm of landmarkEntries) {
      if (lm.flap.p < 0.72) continue;
      if (state.category !== 'all' && lm.spec.category !== state.category) continue;

      projScratch.set(lm.x, lm.height * lm.curScale + 0.24, lm.z).project(walkCamera);
      if (projScratch.z < 0.1 || projScratch.z > 0.992) continue;

      const worldDist = walkCamera.position.distanceTo(lm.root.position);
      if (worldDist > 26 || worldDist < 3.2) continue;

      const sx = (projScratch.x * 0.5 + 0.5) * viewW;
      const sy = (-projScratch.y * 0.5 + 0.5) * viewH;
      if (sx < 34 || sx > viewW - 34 || sy < safeTop || sy > safeBot) continue;

      const estW = lm.spec.title.length * 13 + 28;
      const score = Math.abs(projScratch.x) * 7 + Math.abs(lm.spec.s - (state.t + 0.012)) * 45;
      tagCandidates.push({ lm, sx, sy, w: estW, h: 26, score });
    }

    tagCandidates.sort((a, b) => a.score - b.score);
  }

  const chosen = [];
  for (const c of tagCandidates) {
    if (chosen.length >= 3) break;
    const cx = clamp(c.sx, c.w * 0.5 + 10, viewW - c.w * 0.5 - 10);
    let cy = c.sy - 14;
    let blocked = false;
    for (const prev of chosen) {
      const dx = Math.abs(cx - prev.cx);
      const dy = Math.abs(cy - prev.cy);
      if (dx < (c.w + prev.w) * 0.5 + 10 && dy < 34) {
        const nudged = cy < prev.cy ? prev.cy - 34 : prev.cy + 34;
        if (nudged > 92 && nudged < viewH - 100) cy = nudged;
        else blocked = true;
      }
    }
    if (!blocked) chosen.push({ lm: c.lm, cx, cy, w: c.w });
  }

  const fadeK = 1 - Math.exp(-dt * 12);
  for (let i = 0; i < dom.tagSlots.length; i++) {
    const slot = dom.tagSlots[i];
    const item = chosen[i];
    if (item) {
      if (slot.entry !== item.lm) {
        slot.entry = item.lm;
        slot.txt.textContent = item.lm.spec.title;
      }
      slot.curOp = lerp(slot.curOp, 1, fadeK);
      const tx = Math.round(item.cx - item.w * 0.5);
      const ty = Math.round(item.cy - 13);
      slot.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      slot.el.style.opacity = slot.curOp.toFixed(3);
      slot.el.classList.add('vis');
    } else {
      slot.curOp = lerp(slot.curOp, 0, fadeK);
      slot.el.style.opacity = slot.curOp > 0.02 ? slot.curOp.toFixed(3) : '0';
      if (slot.curOp <= 0.03) {
        slot.entry = null;
        slot.el.classList.remove('vis');
      }
    }
  }
}

// ============================================================================
// Unified Interactions: 1:1 Touch + Momentum + Portal Hop + Fan Parallax + Gyro
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(-9, -9);

function bindInteractions() {
  const canvas = renderer.domElement;

  dom.tagSlots.forEach((slot) => {
    slot.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (slot.entry) openDetailCard(slot.entry);
    });
  });

  dom.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Next Portal-in-Painting Quick-Hop: glides directly 6.2m ahead of the next portal gate!
  dom.nextPortalBtn.addEventListener('click', () => {
    closeDetailCard();
    const nextGate = PORTAL_SPECS.find((p) => p.s > state.t + 0.012) || PORTAL_SPECS[0];
    state.velT = 0;
    state.panXTarget = 0;
    // Land ~6.2m ahead of the portal gate so the closed circular/scroll Picture-in-Painting window is large, centered & vivid!
    state.flyToTarget = clamp(nextGate.s - 0.026, 0, 1);
  });

  // Gyroscope button
  const onDeviceOrientation = (e) => {
    if (!state.gyroEnabled) return;
    if (typeof e.gamma !== 'number' || typeof e.beta !== 'number') return;
    if (state.gyroBaseBeta === null) {
      state.gyroBaseBeta = e.beta;
      state.gyroBaseGamma = e.gamma;
    }
    const dg = clamp((e.gamma - state.gyroBaseGamma) / 24, -1, 1);
    const db = clamp((e.beta - state.gyroBaseBeta) / 24, -1, 1);
    state.gyroX = dg;
    state.gyroY = -db;
    if (state.mode === 'depth') {
      state.lookXTarget = dg;
      state.lookYTarget = -db;
    }
  };

  dom.gyroBtn.addEventListener('click', async () => {
    if (state.gyroEnabled) {
      state.gyroEnabled = false;
      state.gyroX = 0;
      state.gyroY = 0;
      dom.gyroBtn.classList.remove('active');
      dom.gyroBtn.setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') return;
      }
      state.gyroBaseBeta = null;
      state.gyroBaseGamma = null;
      state.gyroEnabled = true;
      dom.gyroBtn.classList.add('active');
      dom.gyroBtn.setAttribute('aria-pressed', 'true');
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    } catch (_err) { /* ignore if unsupported */ }
  });

  // 4-Scene 2.5D Painting Switcher
  dom.depthSceneBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.depthScene;
      state.depthScene = id;
      dom.depthSceneBtns.forEach((b) => b.classList.toggle('active', b === btn));
      applyDepthSceneAtmosphere(id);
      dom.chapterSub.textContent = DEPTH_SCENE_TITLES[id];
    });
  });

  // 5-Category Filter Bar
  dom.filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      dom.filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // 6-Realm Jump Capsules
  dom.chapterPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const segIdx = Number(btn.dataset.seg);
      state.velT = 0;
      state.flyToTarget = SEGMENTS[segIdx].jump;
      state.panXTarget = 0;
      closeDetailCard();
    });
  });

  // Detail Card Dismiss, Scroll Isolation & Interactive 3-Layer Fan Window!
  dom.cardClose.addEventListener('click', closeDetailCard);
  dom.cardCloseBottom?.addEventListener('click', closeDetailCard);
  dom.cardBackdrop.addEventListener('click', closeDetailCard);
  dom.card.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  // Interactive 3-Layer Circular Fan Parallax Drag/Hover
  let fanDragging = false;
  let fanRect = null;
  const updateFanFromEvent = (e) => {
    if (!fanRect) fanRect = dom.fanWindow.getBoundingClientRect();
    const nx = ((e.clientX - fanRect.left) / Math.max(1, fanRect.width)) * 2 - 1;
    const ny = ((e.clientY - fanRect.top) / Math.max(1, fanRect.height)) * 2 - 1;
    state.fanLookXTarget = clamp(nx * 1.15, -1, 1);
    state.fanLookYTarget = clamp(ny * 1.15, -1, 1);
  };
  dom.fanWindow.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    fanDragging = true;
    fanRect = dom.fanWindow.getBoundingClientRect();
    dom.fanWindow.setPointerCapture(e.pointerId);
    updateFanFromEvent(e);
  });
  dom.fanWindow.addEventListener('pointermove', (e) => {
    e.stopPropagation();
    if (fanDragging || e.pointerType === 'mouse') updateFanFromEvent(e);
  });
  const endFanDrag = () => {
    fanDragging = false;
    state.fanLookXTarget = 0;
    state.fanLookYTarget = 0;
  };
  dom.fanWindow.addEventListener('pointerup', endFanDrag);
  dom.fanWindow.addEventListener('pointercancel', endFanDrag);
  dom.fanWindow.addEventListener('pointerleave', endFanDrag);

  // Stamp & Share Buttons
  dom.cardStampBtn.addEventListener('click', () => {
    if (!state.selectedLandmark) return;
    const id = state.selectedLandmark.spec.id;
    if (!state.stampedIds.has(id)) {
      state.stampedIds.add(id);
      updateStampCounter(true);
      dom.cardStampBtn.classList.add('stamped');
      dom.cardStampLabel.textContent = '已印 · 留念';
      showInlineCardNote('已收入灵川三十二景印记');
    } else {
      updateStampCounter(true);
      showInlineCardNote('此景已盖章留存');
    }
  });
  dom.cardShareBtn.addEventListener('click', async () => {
    const entry = state.selectedLandmark;
    if (!entry) return;
    const s = entry.spec;
    showInlineCardNote('正在生成分享卡…');
    await sharePayload({
      template: s.shareTemplate || 'landmark',
      title: s.title,
      subtitle: `${s.zoneName || ''} · ${s.category || ''}`.trim(),
      tagline: s.tagline,
      body: s.story,
      imgUrl: getAssetUrl(s.img, true),
      category: s.category,
      footer: 'duomei.site · 灵川行卷',
    }, { onNote: showInlineCardNote });
  });

  // Swipe-down on top drag bar to dismiss card cleanly without interfering with inner scroll
  let barStartY = null;
  let barDy = 0;
  dom.cardDragBar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    barStartY = e.clientY;
    barDy = 0;
    dom.cardDragBar.setPointerCapture(e.pointerId);
  });
  dom.cardDragBar.addEventListener('pointermove', (e) => {
    if (barStartY === null) return;
    barDy = Math.max(0, e.clientY - barStartY);
    if (barDy > 4) {
      dom.card.style.transition = 'none';
      dom.card.style.transform = `translate3d(0, ${barDy}px, 0)`;
    }
  });
  const endBarDrag = () => {
    if (barStartY === null) return;
    dom.card.style.transition = '';
    // Thumb-friendly: slightly easier dismiss on phone
    if (barDy > (IS_MOBILE ? 36 : 50)) closeDetailCard();
    else dom.card.style.transform = '';
    barStartY = null;
    barDy = 0;
  };
  dom.cardDragBar.addEventListener('pointerup', endBarDrag);
  dom.cardDragBar.addEventListener('pointercancel', endBarDrag);

  // Scrubbers
  const bindScrubber = (trackEl, onRatio) => {
    let active = false;
    let leftPx = 0;
    let widthPx = 1;
    trackEl.addEventListener('pointerdown', (e) => {
      active = true;
      const r = trackEl.getBoundingClientRect();
      leftPx = r.left;
      widthPx = Math.max(1, r.width);
      trackEl.classList.add('scrubbing');
      trackEl.setPointerCapture(e.pointerId);
      onRatio(clamp((e.clientX - leftPx) / widthPx, 0, 1));
    });
    trackEl.addEventListener('pointermove', (e) => {
      if (!active) return;
      onRatio(clamp((e.clientX - leftPx) / widthPx, 0, 1));
    });
    const stop = () => {
      active = false;
      trackEl.classList.remove('scrubbing');
    };
    trackEl.addEventListener('pointerup', stop);
    trackEl.addEventListener('pointercancel', stop);
  };
  bindScrubber(dom.journeyTrack, (r) => {
    state.velT = 0;
    state.flyToTarget = null;
    state.tTarget = r;
  });
  bindScrubber(dom.depthTrack, (r) => {
    state.velDepth = 0;
    state.depthWalkTarget = r;
  });

  // Wheel / Trackpad with smooth momentum calibrated for 240m scroll
  window.addEventListener('wheel', (e) => {
    if (state.mode === 'map') return;
    if (e.target.closest('.detail-card') || e.target.closest('.chapter-pills') || e.target.closest('.filter-bar')) return;
    e.preventDefault();
    if (e.ctrlKey) {
      state.zoomTarget = clamp(state.zoomTarget + e.deltaY * 0.002, 0.78, 1.32);
      return;
    }
    const primary = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (state.mode === 'walk') {
      state.flyToTarget = null;
      const stepT = primary * 0.00013;
      state.tTarget = clamp(state.tTarget + stepT, 0, 1);
      state.velT = clamp(state.velT + primary * 0.00024, -0.38, 0.38);
    } else {
      state.depthWalkTarget = clamp(state.depthWalkTarget + primary * 0.00065, 0, 1);
      state.velDepth = clamp(state.velDepth + primary * 0.0011, -1.2, 1.2);
    }
  }, { passive: false });

  // Multi-pointer 1:1 Direct Touch + Momentum Engine on 3D Canvas
  const pointers = new Map();
  let dragMoved = false;
  let downX = 0;
  let downY = 0;
  let prevMoveTime = performance.now();
  let instVelT = 0;
  let instVelDepth = 0;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode === 'map') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');

    state.velT = 0;
    state.velDepth = 0;
    state.flyToTarget = null;
    instVelT = 0;
    instVelDepth = 0;
    prevMoveTime = performance.now();

    if (pointers.size === 1) {
      dragMoved = false;
      downX = e.clientX;
      downY = e.clientY;
      state.tTarget = state.t;
      state.depthWalkTarget = state.depthWalk;
    } else if (pointers.size === 2) {
      dragMoved = true;
      const pts = Array.from(pointers.values());
      pinchStartDist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      pinchStartZoom = state.zoomTarget;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (state.mode === 'map') return;
    const nx = (e.clientX / viewW) * 2 - 1;
    const ny = -(e.clientY / viewH) * 2 + 1;
    pointerNDC.set(nx, ny);

    if (!pointers.has(e.pointerId)) {
      if (state.mode === 'depth' && !state.gyroEnabled) {
        state.lookXTarget = clamp(nx * 0.85, -1, 1);
        state.lookYTarget = clamp(ny * 0.85, -1, 1);
      }
      return;
    }

    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      state.zoomTarget = clamp(pinchStartZoom * (pinchStartDist / dist), 0.78, 1.32);
      return;
    }

    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) {
      dragMoved = true;
    }

    const now = performance.now();
    const moveDt = clamp((now - prevMoveTime) / 1000, 0.004, 0.08);
    prevMoveTime = now;

    if (state.mode === 'walk') {
      // 1:1 Direct-coupled vertical travel calibrated for 240m 6-realm scroll (~24m per screen height = 0.10 of 240m)
      const spanPerScreen = 0.105;
      const deltaT = (-dy / Math.max(320, viewH)) * spanPerScreen;
      state.tTarget = clamp(state.tTarget + deltaT, 0, 1);

      const rawV = deltaT / moveDt;
      instVelT = lerp(instVelT, rawV, 0.48);

      const deltaPan = (-dx / Math.max(300, viewW)) * 1.45;
      state.panXTarget = clamp(state.panXTarget + deltaPan, -1.0, 1.0);
    } else {
      const deltaD = (-dy / Math.max(320, viewH)) * 0.85;
      state.depthWalkTarget = clamp(state.depthWalkTarget + deltaD, 0, 1);
      instVelDepth = lerp(instVelDepth, deltaD / moveDt, 0.48);

      state.lookXTarget = clamp(state.lookXTarget - (dx / Math.max(300, viewW)) * 1.6, -1, 1);
      state.lookYTarget = clamp(state.lookYTarget + (dy / Math.max(320, viewH)) * 0.6, -1, 1);
    }
  });

  const onPointerEnd = (e) => {
    if (state.mode === 'map') return;
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size === 0) {
      canvas.classList.remove('dragging');
      const sinceLastMove = (performance.now() - prevMoveTime) / 1000;

      if (!dragMoved && state.mode === 'walk') {
        pointerNDC.set((e.clientX / viewW) * 2 - 1, -(e.clientY / viewH) * 2 + 1);
        raycaster.setFromCamera(pointerNDC, walkCamera);
        const hits = raycaster.intersectObjects(interactiveMeshes, false);
        let picked = null;
        for (const h of hits) {
          const lm = h.object.userData.landmark;
          if (!lm || lm.flap.p < 0.35) continue;
          if (state.category !== 'all' && lm.spec.category !== state.category) continue;
          picked = lm;
          break;
        }
        if (picked) {
          openDetailCard(picked);
          state.flyToTarget = clamp(picked.spec.s - 0.008, 0, 1);
        } else if (state.selectedLandmark) {
          closeDetailCard();
        }
      } else if (sinceLastMove < 0.09) {
        if (state.mode === 'walk') {
          state.velT = clamp(instVelT, -0.42, 0.42);
        } else {
          state.velDepth = clamp(instVelDepth, -1.6, 1.6);
        }
      }
      state.panXTarget *= 0.35;
    }
  };

  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailCard();
      return;
    }
    if (state.mode === 'walk') {
      state.flyToTarget = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        state.velT = clamp(state.velT + 0.11, -0.35, 0.35);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        state.velT = clamp(state.velT - 0.11, -0.35, 0.35);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.panXTarget = clamp(state.panXTarget - 0.35, -1, 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.panXTarget = clamp(state.panXTarget + 0.35, -1, 1);
      }
    } else {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        state.velDepth = clamp(state.velDepth + 0.45, -1.2, 1.2);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        state.velDepth = clamp(state.velDepth - 0.45, -1.2, 1.2);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.lookXTarget = clamp(state.lookXTarget - 0.3, -1, 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.lookXTarget = clamp(state.lookXTarget + 0.3, -1, 1);
      }
    }
  });

  window.addEventListener('resize', () => {
    fanRect = null;
    viewW = window.innerWidth || 390;
    viewH = Math.max(1, window.innerHeight || 700);
    viewAspect = viewW / viewH;
    map3dApi?.resize(viewW, viewH);

    walkCamera.fov = computeWalkFov(viewAspect);
    walkCamera.aspect = viewAspect;
    walkCamera.updateProjectionMatrix();

    depthCamera.fov = computeDepthFov(viewAspect);
    depthCamera.aspect = viewAspect;
    depthCamera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(viewW, viewH);
  });

  return () => pointers.size > 0;
}

// ============================================================================
// Main Frame Loop (60fps Physics + Portal RenderTarget + Standees + Gazetteer)
// ============================================================================
const clock = new THREE.Clock();
const cShade = new THREE.Color();
let isDraggingCanvas = () => false;

function updateWalkMode(time, dt) {
  const dragging = isDraggingCanvas();

  if (state.flyToTarget !== null) {
    state.t = lerp(state.t, state.flyToTarget, 1 - Math.exp(-dt * 6.2));
    state.tTarget = state.t;
    if (Math.abs(state.t - state.flyToTarget) < 0.0006) {
      state.flyToTarget = null;
    }
  } else if (dragging) {
    state.t = lerp(state.t, state.tTarget, 1 - Math.exp(-dt * 42));
  } else {
    if (Math.abs(state.velT) > 0.0002) {
      state.tTarget += state.velT * dt;
      if (state.tTarget < 0) {
        state.tTarget = 0;
        state.velT = 0;
      } else if (state.tTarget > 1) {
        state.tTarget = 1;
        state.velT = 0;
      } else {
        state.velT *= Math.exp(-dt * 2.8);
      }
    } else {
      state.velT = 0;
    }
    state.t = lerp(state.t, state.tTarget, 1 - Math.exp(-dt * 22));
  }

  if (!dragging) {
    state.panXTarget = lerp(state.panXTarget, 0, 1 - Math.exp(-dt * 1.6));
  }
  state.panX = lerp(state.panX, state.panXTarget, 1 - Math.exp(-dt * (dragging ? 24 : 8)));
  state.zoom = lerp(state.zoom, state.zoomTarget, 1 - Math.exp(-dt * 10));

  syncSegmentUI();

  const pct = (state.t * 100).toFixed(2);
  dom.journeyFill.style.width = `${pct}%`;
  dom.journeyThumb.style.left = `${pct}%`;
  dom.journeyTrack.setAttribute('aria-valuenow', String(Math.round(state.t * 100)));

  const { pos, look } = evaluateWalkCamera(state.t, state.panX, state.zoom);
  walkCamera.position.copy(pos);
  walkCamera.lookAt(look);
  updateCurvedHorizon(state.t, look);

  walkKey.position.set(look.x + 12, 24, look.z + 16);
  walkKey.target.position.set(look.x, 0, look.z - 2);
  walkKey.target.updateMatrixWorld();

  const nightFactor = applyWalkAtmosphere(state.t, time);

  if (!IS_MOBILE && !dragging) {
    raycaster.setFromCamera(pointerNDC, walkCamera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    let hovered = null;
    for (const h of hits) {
      const lm = h.object.userData.landmark;
      if (lm && lm.flap.p > 0.4 && (state.category === 'all' || lm.spec.category === state.category)) {
        hovered = lm;
        break;
      }
    }
    state.hoveredLandmark = hovered;
    renderer.domElement.classList.toggle('pointer', !!hovered);
  }

  const activeFocus = state.selectedLandmark || state.hoveredLandmark;

  // Step all Papertrails pop-up standees
  const zTraveler = zFromS(state.t);
  for (const item of walkStandees) {
    const s = item.spec;
    const dz = item.z - zTraveler;
    const shouldStand = dz < 13.5 && dz > -34.0;
    item.flap.set(shouldStand ? 1 : 0);
    const p = item.flap.step(dt);

    const sway = (s.sway || 0) > 0 && p > 0.3 ? windSway(time, item.x, item.z, s.sway, item.phase) * clamp(p, 0, 1) : 0;
    item.hingeGroup.rotation.x = -(1 - p) * (Math.PI / 2) + sway;
    item.hingeGroup.visible = p > 0.005;
    item.tabMesh.visible = p > 0.05;

    if (s.bob && p > 0.5) {
      item.root.position.y = Math.sin(time * 1.7 + item.phase) * 0.055;
      item.hingeGroup.rotation.z = Math.sin(time * 1.2 + item.phase) * 0.016;
    }

    if (item.isInteractive) {
      const matchesCat = state.category === 'all' || s.category === state.category;
      const isFocused = item === activeFocus;
      const isNearCenter = !activeFocus && Math.abs(s.s - (state.t + 0.012)) < 0.022;

      let targetScale = 1.0;
      let targetLift = 0.0;
      let targetShade = 1.0;
      let targetOpacity = 1.0;

      if (!matchesCat) {
        targetOpacity = 0.22;
        targetShade = 0.56;
      } else {
        if (state.category !== 'all') targetLift = 0.16;
        if (isFocused) {
          targetScale = 1.07;
          targetLift += 0.10;
          targetShade = 1.10;
        } else if (activeFocus) {
          targetShade = 0.78;
          targetOpacity = 0.88;
        } else if (isNearCenter) {
          targetScale = 1.03;
          targetShade = 1.04;
        }
      }

      const k = 1 - Math.exp(-dt * 10);
      item.curScale = lerp(item.curScale, targetScale, k);
      item.curLift = lerp(item.curLift, targetLift, k);
      item.curShade = lerp(item.curShade, targetShade, k);
      item.curOpacity = lerp(item.curOpacity, targetOpacity, k);

      item.scaleGroup.scale.setScalar(item.curScale);
      item.liftGroup.position.y = item.curLift;

      cShade.setRGB(item.curShade, item.curShade, item.curShade);
      item.frontMat.color.copy(cShade);
      item.frontMat.opacity = item.curOpacity;
      item.frontMat.alphaTest = 0.36 * item.curOpacity;
      item.frontMat.depthWrite = item.curOpacity > 0.85;
      item.frontMesh.castShadow = item.curOpacity > 0.5;

      item.backMat.color.copy(cShade);
      item.backMat.opacity = item.curOpacity;
      item.backMat.alphaTest = 0.36 * item.curOpacity;
      item.backMat.depthWrite = item.curOpacity > 0.85;

      if (item.haloMesh) {
        const showHalo = p > 0.55 && matchesCat;
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.5 + item.phase);
        const haloAlpha = showHalo ? (isFocused ? 0.78 : isNearCenter ? 0.52 : 0.22 + pulse * 0.16) : 0;
        item.haloMat.opacity = lerp(item.haloMat.opacity, haloAlpha, k);
        const hs = 0.94 + pulse * 0.11 + (isFocused ? 0.08 : 0);
        item.haloMesh.scale.set(hs, hs, 1);
        item.haloMesh.visible = item.haloMat.opacity > 0.01;
      }
    } else {
      const targetOp = state.category === 'all' ? 1.0 : 0.40;
      const op = lerp(item.frontMat.opacity, targetOp, 1 - Math.exp(-dt * 7));
      item.frontMat.opacity = op;
      item.frontMat.alphaTest = 0.36 * op;
      item.backMat.opacity = op;
      item.backMat.alphaTest = 0.36 * op;
    }
  }

  // Update guide companion & environmental animations
  if (guideSpiritUpdate) guideSpiritUpdate(state.t, time);
  if (waterShaderMat) waterShaderMat.uniforms.uTime.value = time;
  if (streamShaderMat) streamShaderMat.uniforms.uTime.value = time;
  if (birdsUpdate) birdsUpdate(time, state.t);
  if (riverMistUpdate) riverMistUpdate(time);
  for (const lan of swayingLanterns) {
    const dCam = lan.position.distanceTo(walkCamera.position);
    lan.visible = dCam > 3.6 && dCam < 52;
    if (lan.visible) {
      lan.rotation.z = Math.sin(time * 1.5 + lan.userData.ph) * lan.userData.amp;
      lan.rotation.x = Math.cos(time * 1.15 + lan.userData.ph) * lan.userData.amp * 0.5;
    }
  }
  if (daySteamUpdate) daySteamUpdate(time, dt);
  if (mapleAndSnowUpdate) mapleAndSnowUpdate(time, dt, state.t);
  if (peachAndGinkgoUpdate) peachAndGinkgoUpdate(time, dt, state.t);
  if (nightSmokeUpdate) nightSmokeUpdate(time, dt, nightFactor);
  if (nightEmbersUpdate) nightEmbersUpdate(time, dt, nightFactor);

  // Render active Portal-in-Painting RenderTarget BEFORE main render!
  updateAndRenderPortals(time, look);

  updateScreenPaperTags(dt);
}

function updateDepthMode(time, dt) {
  const dragging = isDraggingCanvas();

  if (dragging) {
    state.depthWalk = lerp(state.depthWalk, state.depthWalkTarget, 1 - Math.exp(-dt * 38));
  } else {
    if (Math.abs(state.velDepth) > 0.0005) {
      state.depthWalkTarget += state.velDepth * dt;
      if (state.depthWalkTarget < 0) {
        state.depthWalkTarget = 0;
        state.velDepth = 0;
      } else if (state.depthWalkTarget > 1) {
        state.depthWalkTarget = 1;
        state.velDepth = 0;
      } else {
        state.velDepth *= Math.exp(-dt * 2.8);
      }
    } else {
      state.velDepth = 0;
    }
    state.depthWalk = lerp(state.depthWalk, state.depthWalkTarget, 1 - Math.exp(-dt * 18));
  }

  const kLook = 1 - Math.exp(-dt * 7.5);
  state.lookX = lerp(state.lookX, state.lookXTarget, kLook);
  state.lookY = lerp(state.lookY, state.lookYTarget, kLook);

  const pct = (state.depthWalk * 100).toFixed(2);
  dom.depthFill.style.width = `${pct}%`;
  dom.depthThumb.style.left = `${pct}%`;
  dom.depthTrack.setAttribute('aria-valuenow', String(Math.round(state.depthWalk * 100)));

  const dScale = computeDepthDistScale(viewAspect) * state.zoom;
  const zFar = 10.6 * dScale;
  const zNear = zFar - 10.6;
  const camZ = lerp(zFar, zNear, state.depthWalk);

  const parallaxScale = lerp(1.0, 0.72, state.depthWalk);
  const camX = state.lookX * 1.80 * parallaxScale + Math.sin(time * 0.32) * 0.10;
  const camY = lerp(2.35 * lerp(1, dScale, 0.38), 1.85, state.depthWalk) + state.lookY * 0.65 * parallaxScale;

  depthCamera.position.set(camX, camY, camZ);
  depthCamera.lookAt(
    state.lookX * 0.45,
    lerp(2.15, 1.85, state.depthWalk) + state.lookY * 0.28,
    camZ - 11.5
  );

  const hooks = depthAnimHooks[state.depthScene];
  for (const fn of hooks) fn(time, dt);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  updateFanDiorama(time, dt);

  if (state.mode === 'map') {
    map3dApi?.updateAndRender(dt, time);
    return;
  }
  if (state.mode === 'walk') {
    updateWalkMode(time, dt);
    renderer.render(walkScene, walkCamera);
  } else {
    updateDepthMode(time, dt);
    renderer.render(depthScene, depthCamera);
  }
}

// ============================================================================
// Bootstrap
// ============================================================================
async function init() {
  updateStampCounter(false);
  await preloadAssets();

  // Build Mode 1: 6-Realm S-Curve Pop-Up Scroll + 5 Portal-in-Painting Gates + 32 Landmarks
  buildScrollBookAndGround();
  buildCurvedHorizon();
  buildScenicContinuityBridges();
  buildPortalGates();

  for (const spec of LANDMARK_SPECS) createHingedStandee(spec, true);
  for (const spec of COMPANION_SPECS) {
    const comp = createHingedStandee(spec, false);
    if (comp.pendingLinkId && landmarkById.has(comp.pendingLinkId)) {
      comp.frontMesh.userData.landmark = landmarkById.get(comp.pendingLinkId);
    }
  }
  buildGuideSpirit();
  buildWalkAtmosphereAndParticles();

  const initZ = zFromS(state.t);
  for (const item of walkStandees) {
    const dz = item.z - initZ;
    if (dz < 13.5 && dz > -34.0) item.flap.set(1);
  }

  // Build Mode 2: Four 2.5D Painting Realms
  buildDepthSceneHaiyang();
  buildDepthSceneLijiang();
  buildDepthSceneDajing();
  buildDepthScenePaideng();
  applyDepthSceneAtmosphere('haiyang');

  isDraggingCanvas = bindInteractions();
  syncSegmentUI();

  mapViewApi = createMapView({
    root: dom.mapStage,
    landmarksById: landmarkById,
    onOpenLandmark: (entry) => openDetailCard(entry),
    onOpenExtra: (poi) => openDetailCard({ spec: extraPoiToCardSpec(poi) }),
    onShareNote: showInlineCardNote,
    onJumpToSegment: (segId) => {
      const targetSeg = SEGMENTS.find((s) => s.id === segId);
      if (targetSeg) {
        state.velT = 0;
        state.panXTarget = 0;
        state.flyToTarget = clamp(targetSeg.start + 0.02, 0, 1);
      }
      setMode('walk');
    },
  });

  map3dApi = createInteractive3DMap({
    THREE,
    renderer,
    canvas: renderer.domElement,
    getViewport: () => ({ w: viewW, h: viewH }),
    images: IMAGES,
    landmarksById: landmarkById,
    makePaperMaterial,
    buildDieCutTexture,
    maxAniso: MAX_ANISO,
    isMobile: IS_MOBILE,
    onSelectLandmark: (entry) => openDetailCard(entry),
    onSelectExtra: (poi) => openDetailCard({ spec: extraPoiToCardSpec(poi) }),
    onFocusTownChange: (townId) => mapViewApi?.setFocusTown(townId),
    onProjectUI: (proj) => mapViewApi?.syncProjection(proj),
    isModeActive: () => state.mode === 'map',
    isBlockingOverlayOpen: () => Boolean(state.selectedLandmark || mapViewApi?.isOverlayOpen?.()),
  });
  mapViewApi.attach3D(map3dApi);
  window.__LINGCHUAN_MAP3D = map3dApi;

  // Default to full-county sculpted paper atlas (allow ?mode=walk|depth deep links)
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  const initialMode = (urlMode === 'walk' || urlMode === 'depth') ? urlMode : 'map';
  document.body.dataset.mode = initialMode;
  state.mode = initialMode;
  dom.modeBtns.forEach((b) => {
    const on = b.dataset.mode === initialMode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  dom.walkDock.hidden = initialMode !== 'walk';
  dom.depthDock.hidden = initialMode !== 'depth';
  dom.chapterSub.textContent = initialMode === 'map'
    ? '七镇五乡 · 一脉青绿'
    : initialMode === 'depth'
      ? DEPTH_SCENE_TITLES[state.depthScene]
      : (SEGMENTS[state.segmentIdx]?.sub || '纸艺长卷');

  dom.loader.classList.add('done');
  animate();
}

init();
