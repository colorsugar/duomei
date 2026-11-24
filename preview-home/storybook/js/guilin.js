// 桂林 · 漓江夜游 — pop-up spread. Page coords: x -20..20 (gutter x=0), z -13..13 (+z toward reader), page top y=0.
import * as THREE from 'three';
import { makeCard, crossCard, hinge, windSway, rng, PAPER_LIGHT } from '../lib/paperkit-3d.js';
import { paperSheet, shape } from '../lib/paperkit-2d.js';
import { karstPts as gkKarst, raftPts, paintRaft, maplePts, paintMaple, pagodaPts as gkPagodaPts, paintPagoda as gkPaintPagoda, cutCard, paintGround } from './gk.js';
import { loadArt as artLoad } from './art.js';

const INK = '#1C1916', PAPER = '#F3EEE6', VERM = '#B3261E';
const W = 40, D = 26;

// ---------- outlines ----------
function karst(r, { w = 14, peaks = [[0, 6, 2]], base = 0.7, n = 220 } = {}) {
  const top = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -w / 2 + u * w;
    let y = base;
    for (const [c, h, rad] of peaks) {
      const d = Math.abs(x - c) / rad;
      if (d < 1) y = Math.max(y, h * Math.pow(1 - Math.pow(d, 3.2), 0.42));
      // soft skirt so towers sit in a range, never on a point
      if (d < 1.6) y = Math.max(y, h * 0.22 * (1 - (d - 1) / 0.6 * (d > 1 ? 1 : 0)));
    }
    const edge = Math.min(1, Math.min(u, 1 - u) * 14);
    top.push([x, Math.max(0.25, y * (0.4 + 0.6 * edge))]);
  }
  return [[-w / 2, 0], ...top, [w / 2, 0]];
}
function pagodaPts({ tiers = 7, w0 = 1.5, bh = 0.78, eh = 0.26, flare = 0.55, taper = 0.88, spire = 1.1 } = {}) {
  const R = [], L = [];
  let y = 0, w = w0 / 2;
  R.push([w + 0.15, 0]); R.push([w + 0.15, 0.32]); R.push([w, 0.32]); y = 0.32;
  for (let i = 0; i < tiers; i++) {
    R.push([w, y + bh]);
    const ew = w + flare * (1 - i / tiers * 0.35);
    R.push([ew + 0.12, y + bh - 0.06]);               // upturned eave tip
    R.push([ew, y + bh + eh * 0.45]);
    const nw = w * taper;
    R.push([nw, y + bh + eh]);
    y += bh + eh; w = nw;
  }
  R.push([0.12, y]); R.push([0.12, y + spire]); R.push([0.0, y + spire + 0.25]);
  for (const [x, yy] of R.slice().reverse()) if (x !== 0) L.push([-x, yy]);
  return [...R, ...L];
}
function boatPts() {
  const out = [];
  // hull: crescent, deck line, arched canopy in the middle
  out.push([-2.0, 0.55], [-1.6, 0.0], [1.6, 0.0], [2.05, 0.6], [1.7, 0.55]);
  out.push([1.05, 0.62], [1.05, 1.25]);
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; out.push([Math.cos(a) * 1.05, 1.25 + Math.sin(a) * 0.55]); }
  out.push([-1.05, 0.62], [-1.7, 0.55]);
  return out;
}

// ---------- prints ----------
const MIST = '#c9c7c4', WASH1 = '#8f9298', WASH2 = '#5c6068', WASH3 = '#343840';

function paintKarst(P, { far = 0 } = {}) {
  const top = far ? '#6e727a' : '#2c3038', mid = far ? '#a3a5a9' : '#5d616a';
  P.gradient(far ? '#d8d5cf' : '#b9b8b5', top, 0);
  const { box, r } = P;
  // moonlit facets and ink ridges as cut layers
  P.layer((g) => {
    for (let i = 0; i < 9; i++) {
      const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.25 + r() * 0.5), s = box.h * (0.18 + r() * 0.2);
      g.beginPath(); g.moveTo(x - s * 0.35, y - s * 0.6); g.quadraticCurveTo(x - s * 0.1, y + s * 0.6, x + s * 0.05, y + s * 0.75);
      g.quadraticCurveTo(x + s * 0.05, y, x + s * 0.3, y - s * 0.6); g.closePath(); g.fill();
    }
  }, mid, { depth: 0.8, alpha: 0.75 });
  P.marks('hatch', { color: INK, alpha: far ? 0.12 : 0.22, size: 0.05, angle: 1.2, width: 1.1 });
  P.marks('dab', { color: far ? '#596058' : '#1f2a24', alpha: 0.55, size: 0.035, density: 0.5, region: { ...box, y0: box.y0 + box.h * 0.55 } });
  // mist band at the foot
  P.layer((g) => { g.beginPath(); g.moveTo(box.x0, box.y0);
    for (let i = 0; i <= 40; i++) { const x = box.x0 + box.w * i / 40; g.lineTo(x, box.y0 + box.h * (0.16 + 0.05 * Math.sin(i * 0.9 + r() * 0.4))); }
    g.lineTo(box.x1, box.y0); g.closePath(); g.fill(); }, far ? '#e4e0d8' : '#cfcbc4', { depth: 0.6, alpha: 0.9 });
}

function paintPagoda(body, roof, P) {
  const { box } = P;
  P.fill(body);
  P.innerShade('#3a2a10', { alpha: 0.35, dx: 0.05, dy: 0, blurPx: 14 });
  // eaves as dark cut layers: horizontal bands at the outline's wider rows
  P.layer((g) => {
    for (let y = box.y0 + 0.32; y < box.y1 - 1.4; y += 1.04) {
      g.beginPath(); g.moveTo(box.x0, y + 0.72); g.lineTo(box.x1, y + 0.72); g.lineTo(box.x1, y + 1.04); g.lineTo(box.x0, y + 1.04); g.closePath(); g.fill();
    }
    g.fillRect(-0.14, box.y1 - 1.4, 0.28, 1.4);
  }, roof, { depth: 0.7 });
  // windows (lit)
  P.glow((g) => { g.fillStyle = '#fff';
    for (let y = box.y0 + 0.5; y < box.y1 - 1.6; y += 1.04) { const ww = 0.22; g.fillRect(-ww / 2, y, ww, 0.36); g.fillRect(-ww * 2.2, y + 0.05, ww * 0.8, 0.28); g.fillRect(ww * 1.4, y + 0.05, ww * 0.8, 0.28); } });
  P.draw((g) => { g.fillStyle = '#ffd27a';
    for (let y = box.y0 + 0.5; y < box.y1 - 1.6; y += 1.04) { const ww = 0.22; g.fillRect(-ww / 2, y, ww, 0.36); g.fillRect(-ww * 2.2, y + 0.05, ww * 0.8, 0.28); g.fillRect(ww * 1.4, y + 0.05, ww * 0.8, 0.28); } });
}

function paintBoat(P) {
  const { box } = P;
  P.fill('#3b2f27');
  P.layer((g) => { g.fillRect(box.x0, 0.42, box.w, 0.16); }, '#6b5240', { depth: 0.5 });
  P.layer((g) => { g.beginPath(); g.moveTo(-1.05, 0.62);
    for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI; g.lineTo(Math.cos(a) * 1.05, 1.25 + Math.sin(a) * 0.55); }
    g.lineTo(1.05, 0.62); g.closePath(); g.fill(); }, '#23262c', { depth: 0.8 });
  P.marks('hatch', { color: '#8a8f99', alpha: 0.35, size: 0.06, angle: 0, region: { x0: -1, x1: 1, y0: 0.7, y1: 1.7, w: 2, h: 1 } });
  P.layer((g) => { g.fillRect(-1.05, 1.18, 2.1, 0.12); }, VERM, { depth: 0.5 });
  // lanterns
  const lan = [[-0.55, 0.95], [0.55, 0.95]];
  P.layer((g) => { for (const [x, y] of lan) { g.beginPath(); g.ellipse(x, y, 0.2, 0.24, 0, 0, Math.PI * 2); g.fill(); } }, '#d8442f', { depth: 0.5 });
  P.glow((g) => { g.fillStyle = '#fff'; for (const [x, y] of lan) { g.beginPath(); g.ellipse(x, y, 0.16, 0.2, 0, 0, Math.PI * 2); g.fill(); } });
}

function paintTree(P, { crown = '#2f3b35', dots = '#d9b04c' } = {}) {
  const { box, r } = P;
  P.fill('#4a3a2c');
  P.layer((g) => { g.beginPath(); g.ellipse(0, box.y0 + box.h * 0.62, box.w * 0.5, box.h * 0.38, 0, 0, Math.PI * 2); g.fill(); }, crown, { depth: 1 });
  P.layer((g) => { for (let i = 0; i < 18; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.8;
      g.beginPath(); g.ellipse(Math.cos(a) * box.w * 0.4 * rr, box.y0 + box.h * 0.62 + Math.sin(a) * box.h * 0.3 * rr, box.w * 0.11, box.w * 0.07, a, 0, 6.28); g.fill(); } }, '#435349', { depth: 0.6 });
  P.marks('dot', { color: dots, alpha: 0.9, size: 0.025, density: 0.8, region: { ...box, y0: box.y0 + box.h * 0.3 } });
}

function paintCloud(P) {
  const { box } = P;
  P.fill('#ebe6dc');
  P.innerShade('#5d6170', { alpha: 0.35, blurPx: 12 });
  P.draw((g) => { g.strokeStyle = 'rgba(28,25,22,0.45)'; g.lineWidth = 0.06; g.lineCap = 'round';
    const cx = (box.x0 + box.x1) / 2, cy = box.y0 + box.h * 0.45;
    for (const [ox, s] of [[-box.w * 0.22, 1], [box.w * 0.18, -1]]) { g.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2.4, rr = 0.08 + t * 0.12; g.lineTo(cx + ox + s * Math.cos(t) * rr, cy + Math.sin(t) * rr); } g.stroke(); } });
}

function paintMoon(P) {
  const { box, r } = P;
  P.fill('#7d776c');
  P.layer((g) => { g.beginPath(); g.arc(0, box.y1 - 1.9, 1.78, 0, 6.28); g.fill(); }, '#f2e9cf', { depth: 0.6 });
  P.layer((g) => { for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-0.8 + r() * 1.6, box.y1 - 1.9 - 0.8 + r() * 1.6, 0.12 + r() * 0.25, 0, 6.28); g.fill(); } }, '#e1d6b6', { depth: 0.3 });
  P.glow((g) => { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(0, box.y1 - 1.9, 1.7, 0, 6.28); g.fill(); });
}

function paintReeds(P) {
  P.fill('#2b2f2a');
  P.marks('tick', { color: '#5b6556', alpha: 0.7, size: 0.08, angle: 0.15 });
}


// ---------- his painted art, printed on clean-cut cards ----------
const IMGS = {};
export async function loadArt() {
  const names = ['map-guilin', 'hero-karst', 'karst', 'ridge'];
  await Promise.all(names.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMGS[n] = im; res(); }; im.onerror = res; im.src = `img/${n}.webp`; })));
}
const NIGHT = '#c2c7d8';
function drawCover(g, img, box, { sx = 0, sy = 0, sw = img.width, sh = img.height } = {}) {
  // cover-fit the crop into the card box (shape units, y up)
  const k = Math.max(box.w / sw, box.h / sh), w = sw * k, h = sh * k;
  g.save(); g.translate((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2); g.scale(1, -1);
  g.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}
function tint(P, color = NIGHT, a = 1) { P.draw((g) => { g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = color; g.fillRect(P.box.x0 - 1, P.box.y0 - 1, P.box.w + 2, P.box.h + 2); }); }
function paintArtKarst(P, { far = 0, src = 'hero-karst' } = {}) {
  const img = IMGS[src];
  P.fill('#7d8290');
  if (img) drawCover(P.g, img, P.box, src === 'ridge' ? { sx: 0, sy: img.height * 0.56, sw: img.width, sh: img.height * 0.44 } : {});
  tint(P, far ? '#b4bacd' : NIGHT);
  // mist at the foot, as a pale cut layer
  const { box, r } = P;
  P.layer((g) => { g.beginPath(); g.moveTo(box.x0, box.y0);
    for (let i = 0; i <= 40; i++) { const x = box.x0 + box.w * i / 40; g.lineTo(x, box.y0 + box.h * (0.13 + 0.05 * Math.sin(i * 0.8 + r() * 0.5))); }
    g.lineTo(box.x1, box.y0); g.closePath(); g.fill(); }, far ? '#dcdbe0' : '#c9cbd3', { depth: 0.6, alpha: 0.85 });
  P.innerShade('#1d2333', { alpha: 0.35, blurPx: 16, dx: 0.03, dy: -0.02 });
}
function imgOutline(img, w, h) {
  return shape.fromDrawing((g) => { g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); }, { w, h, res: 36, simplify: 0.6 });
}
function paintImg(img, w, h, { glow = 0, t = NIGHT } = {}) {
  return (P) => {
    P.fill('#efe8dc');
    P.draw((g) => { g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); });
    if (t) tint(P, t);
    if (glow) P.glow((g) => { g.globalAlpha = glow; g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); });
  };
}

// ---------- ground print ----------
export function groundCanvas(seed = 3) {
  const S = Math.min(innerWidth, innerHeight) < 760 ? 46 : 64, c = document.createElement('canvas'); c.width = W * S; c.height = D * S;
  const g = c.getContext('2d'), r = rng(seed);
  const X = (x) => (x + W / 2) * S, Z = (z) => (z + D / 2) * S;
  const map = IMGS['map-guilin'];
  g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  if (map) g.drawImage(map, 0, 0, 1200, 1200 / (W / D), 0, 0, c.width, c.height);
  paintGround(g, c, 'gr-guilin', { alpha: 0.5 }); paintGround(g, c, 'gr-guilin', { alpha: 0.5, mode: 'soft-light' });
  // blue hour: multiply an ink-blue wash, deeper at the back, then a moonlit lift on the water
  g.globalCompositeOperation = 'multiply';
  let gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#6c7594'); gr.addColorStop(0.6, '#8890ad'); gr.addColorStop(1, '#9aa1bb');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  const sheet = paperSheet({ size: 512, color: '#ffffff', seed: 11 });
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = g.createPattern(sheet, 'repeat'); g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  // warm lights in the town blocks (where the map is pale and grey)
  const id = g.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < 260; i++) { const x = (r() * c.width) | 0, y = (r() * c.height * 0.75) | 0, k = (y * c.width + x) * 4;
    if (id[k] > 120 && Math.abs(id[k] - id[k + 2]) < 30) { g.fillStyle = r() < 0.75 ? 'rgba(255,205,120,0.85)' : 'rgba(230,90,60,0.8)'; g.beginPath(); g.arc(x, y, 2 + r() * 2.5, 0, 6.28); g.fill();
      const rg = g.createRadialGradient(x, y, 0, x, y, 22); rg.addColorStop(0, 'rgba(255,180,90,0.18)'); rg.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = rg; g.fillRect(x - 22, y - 22, 44, 44); } }
  // title label on the left page, front corner: pale paper slip, brush title, vermilion seal
  const lx = X(-18.8), ly = Z(-0.6), lw = 2.4 * S, lh = 8.6 * S;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = '#F3EEE6'; roundRect(g, lx, ly, lw, lh, 14); g.fill(); g.restore();
  g.strokeStyle = 'rgba(28,25,22,0.5)'; g.lineWidth = 3; roundRect(g, lx + 12, ly + 12, lw - 24, lh - 24, 8); g.stroke();
  g.fillStyle = INK; g.font = `${1.55 * S}px ZMX, "Ma Shan Zheng", KaiTi, STKaiti, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...'漓江夜游'].forEach((ch, i) => g.fillText(ch, lx + lw / 2, ly + 1.25 * S + i * 1.72 * S));
  g.fillStyle = VERM; roundRect(g, lx + lw / 2 - 0.55 * S, ly + lh - 1.55 * S, 1.1 * S, 1.1 * S, 10); g.fill();
  g.fillStyle = PAPER; g.font = `${0.42 * S}px MSZ, KaiTi, serif`; g.fillText('桂', lx + lw / 2, ly + lh - 1.25 * S); g.fillText('林', lx + lw / 2, ly + lh - 0.78 * S);
  // poem, small, along the right page's front edge
  g.fillStyle = 'rgba(243,238,230,0.78)'; g.font = `${0.62 * S}px MSZ, KaiTi, serif`; g.textAlign = 'right';
  g.fillText('江作青罗带　山如碧玉簪', X(18.8), Z(12.1));
  g.font = `${0.36 * S}px MSZ, KaiTi, serif`; g.fillStyle = 'rgba(243,238,230,0.5)'; g.fillText('— 韩愈《送桂州严大夫》', X(18.8), Z(12.75));
  return c;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// water shimmer mask follows the river/lake shape: a soft animated sheen
export function riverMask() {
  const S = 24, c = document.createElement('canvas'); c.width = W * S; c.height = D * S; const g = c.getContext('2d', { willReadFrequently: true });
  const map = IMGS['map-guilin']; if (map) g.drawImage(map, 0, 0, 1200, 1200 / (W / D), 0, 0, c.width, c.height);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2]; const w = (B > R + 12 && G > R + 12 && G + B > 260) ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = w; d[i + 3] = 255; }
  g.putImageData(im, 0, 0); g.filter = 'blur(3px)'; g.drawImage(c, 0, 0); return c;
}
// point on the river centreline, u 0..1 (for boats)
export function riverAt(u) {
  const b = (p0, p1, p2, p3, t) => { const m = 1 - t; return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3; };
  if (u < 0.5) { const t = u * 2; return [b(-21, -10, -6, 2, t), b(-6.5, -8.5, 1.5, 1.0, t)]; }
  const t = (u - 0.5) * 2; return [b(2, 9, 10, 21, t), b(1.0, 0.6, 9, 8.5, t)];
}

// ---------- build ----------
export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(); await artLoad(['bd-guilin', 'gr-guilin', 'cut-raft', 'cut-mifen-bowl']);
  const group = new THREE.Group();
  const pieces = [];   // { h, x, z, side, sway }
  const animated = [];
  const r = rng(21);
  const add = (mesh, { x, z, yaw = 0, rest = 0, size = 0.5, sway = 0, y = 0 }) => {
    const h = hinge(mesh, { at: new THREE.Vector3(x, y, z), yaw, open: 0, size, rest });
    h.update(0); group.add(h.group);
    const p = { h, x, z, sway, mesh }; pieces.push(p); return p;
  };
  const card = (pts, paint, o = {}) => makeCard(pts, { paper, paint, pxPerUnit: o.ppu || 56, thickness: 0.09, edgeWidth: 0.05, seed: o.seed || (r() * 1e4) | 0, back: o.back ?? 'kraft', contact: { amount: 0.16, height: 0.5, color: '#1d2330' }, glow: 1.6, glowColor: '#ffbf66', ...o.extra });
  const hotAll = (p, h) => { p.hot = h; return p; };
  const FAR = { act: 'poke', title: '远山 · 峰丛', line: '桂林是喀斯特地貌，石灰岩被雨水溶蚀成一座座孤峰与峰丛，远看层层叠叠。' };
  const KARST = { act: 'poke', title: '喀斯特孤峰', line: '平地拔起的石灰岩山峰，“桂林山水甲天下”说的就是它们。' };
  const steps = [];
  const cardOpts = { thickness: 0.09, edgeWidth: 0.05, contact: { amount: 0.18, height: 0.5, color: '#1d2333' } };
  // far ink-wash ranges: the painted night skyline when it is there, else his misty ridge painting
  const BD = cutCard(card, 'bd-guilin', 41, { ppu: 38 }); if (BD) steps.push(() => hotAll(add(BD, { x: 0, z: -12.4, size: 0.8 }), FAR));
  if (!BD) steps.push(() => hotAll(add(card(gkKarst(r, { w: 19, h: 9.4, peaks: [[-6.5, 7.2, 2.2], [-2.8, 9.4, 2.4], [1.2, 7.6, 2.0], [4.8, 8.8, 2.2], [7.8, 6.2, 1.6]], rough: 0.6 }), (P) => paintArtKarst(P, { far: 1, src: 'ridge' }), { ppu: 40 }), { x: -10, z: -11.4, size: 0.7 }), FAR));
  if (!BD) steps.push(() => hotAll(add(card(gkKarst(r, { w: 19, h: 10.2, peaks: [[-7.2, 6.4, 1.8], [-3.6, 8.6, 2.4], [0.6, 10.2, 2.2], [4.4, 7.4, 1.9], [7.6, 8.4, 1.6]], rough: 0.6 }), (P) => paintArtKarst(P, { far: 1, src: 'ridge' }), { ppu: 40 }), { x: 10, z: -11.8, size: 0.7 }), FAR));
  // karst towers printed with his gongbi rock painting
  const towers = [[-16.2, -7.4, 7.8], [-11.4, -5.0, 6.0], [-4.2, -8.0, 8.6], [3.6, -9.0, 6.8], [17.0, -7.6, 8.0], [17.6, 4.4, 5.4], [-6.6, 2.6, 4.6]];
  for (const [x, z, h] of towers) steps.push(() => hotAll(add(card(gkKarst(r, { w: h * 0.78, h }), (P) => paintArtKarst(P, { src: r() < 0.5 ? 'hero-karst' : 'karst' }), { ppu: 52 }), { x, z, size: 0.55, rest: (r() - 0.5) * 0.06 }), KARST));
  // his twin pagodas on the lake (日月双塔), lit
  for (const [name, x, z, tiers, body, roof, win, k] of [['gold', 7.6, -2.2, 9, '#d09a34', '#4a2e10', '#ffd27a', 0.74], ['silver', 10.9, -3.0, 7, '#dfe2ea', '#2e3648', '#ffe9b8', 0.78]]) steps.push(() => {
    const m = card(gkPagodaPts({ tiers }), (P) => gkPaintPagoda(P, { tiers, body, roof, win, lit: name === 'gold' ? 1 : 0.8 }), { ppu: 64, back: 'mirror', extra: { glow: 1.5, glowColor: '#ffcf8a' } }); m.scale.setScalar(k);
    const p = add(m, { x, z, size: 0.55 }); p.hot = { dive: name === 'gold' ? 'rita' : 'yueta', act: 'light', title: name === 'gold' ? '日塔' : '月塔', line: name === 'gold' ? '杉湖中的日塔是铜塔，九层，高 41 米，入夜金光通透。点进去，走到塔下。' : '月塔是琉璃塔，七层，与日塔隔水相望，中间有湖底隧道相连。点进去，走到塔下。' }; return p;
  });
  // his maple trees on the banks (crossed, so they read round)
  const trees = [[-8.6, -1.6, 4.0], [-13.8, -1.4, 4.2], [-2.6, 4.8, 3.2], [14.6, 1.8, 3.4], [4.6, 3.8, 3.4], [18.2, -2.6, 3.6]];
  for (const [x, z, h] of trees) steps.push(() => {
    const seed = (r() * 1e4) | 0, w = h * 0.95;
    const p = add(card(maplePts(r, { w, h, seed }), (P) => paintMaple(P, { a: '#6e2a24', b: '#9a3a2a', c: '#c46a3a', trunk: '#241c1c', seed: seed + 1 }), { ppu: 50, back: 'mirror' }), { x, z, size: 0.4, sway: 1.4, rest: (r() - 0.5) * 0.05 }); p.hot = { act: 'leaves', title: '岸边红枫', line: '湖岸种着枫树与桂花树；桂林的名字，正来自满城桂花。', color: '#b8432c' }; return p;
  });
  // reeds in the foreground
  for (const [x, z] of [[-12.5, 12.0], [1.6, 12.2], [13.6, 12.3], [-18.2, 12.4]]) steps.push(() => {
    const pts = shape.fromDrawing((g) => { g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const bx = -1.2 + i * 0.3, hh = 1.0 + Math.sin(i * 2.1) * 0.35 + 0.5;
      g.lineWidth = 0.14; g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(bx + 0.1, hh * 0.6, bx + 0.25 * Math.sin(i), hh); g.stroke(); } g.fillRect(-1.3, 0, 2.6, 0.25); }, { w: 4, h: 3, res: 60 });
    return hotAll(add(card(pts, paintReeds, { ppu: 48 }), { x, z, size: 0.3, sway: 2.2 }), { act: 'poke', title: '江边芦苇', line: '漓江两岸的浅滩上长满芦苇，秋天开白花。' });
  });
  steps.push(() => hotAll(add(cutCard(card, 'cut-mifen-bowl', 3.4, { back: 'mirror' }) || card(shape.fromDrawing((g) => { g.beginPath(); g.moveTo(-1.1, 0.9); g.quadraticCurveTo(-1.0, 0, 0, 0); g.quadraticCurveTo(1.0, 0, 1.1, 0.9); g.closePath(); g.fill(); g.beginPath(); g.ellipse(0, 1.0, 1.0, 0.45, 0, 0, 6.28); g.fill(); g.lineWidth = 0.08; g.beginPath(); g.moveTo(0.3, 1.2); g.lineTo(1.3, 2.3); g.stroke(); g.beginPath(); g.moveTo(0.5, 1.2); g.lineTo(1.45, 2.2); g.stroke(); }, { w: 3.2, h: 2.6, res: 60 }),
    (P) => { P.fill('#6b4a2e'); P.layer((g) => { g.beginPath(); g.moveTo(-1.1, 0.9); g.quadraticCurveTo(-1.0, 0, 0, 0); g.quadraticCurveTo(1.0, 0, 1.1, 0.9); g.closePath(); g.fill(); }, '#f1ede4', { depth: 0.5 });
      P.draw((g) => { g.strokeStyle = '#3d5878'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.95, 0.6); g.quadraticCurveTo(0, 0.75, 0.95, 0.6); g.stroke(); g.beginPath(); g.moveTo(-0.7, 0.25); g.quadraticCurveTo(0, 0.35, 0.7, 0.25); g.stroke(); });
      P.layer((g) => { g.beginPath(); g.ellipse(0, 1.0, 0.95, 0.4, 0, 0, 6.28); g.fill(); }, '#c98a4a', { depth: 0.4 });
      P.layer((g) => { g.lineWidth = 0.06; g.strokeStyle = '#f5efe0'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-0.7 + i * 0.2, 0.85); g.quadraticCurveTo(-0.6 + i * 0.2, 1.25, -0.5 + i * 0.2, 0.9); g.stroke(); } }, '#f5efe0', { depth: 0.3 });
      P.layer((g) => { for (const [x, y] of [[-0.4, 1.15], [0.35, 1.1], [0.05, 1.25]]) { g.beginPath(); g.ellipse(x, y, 0.16, 0.09, 0, 0, 6.28); g.fill(); } }, '#6e8f3c', { depth: 0.3 });
      P.layer((g) => { g.beginPath(); g.ellipse(0.25, 0.95, 0.22, 0.1, 0.2, 0, 6.28); g.fill(); }, '#a2412c', { depth: 0.3 }); }, { ppu: 80, back: 'mirror' }), { x: -3.2, z: 11.4, size: 0.3 }),
    { act: 'poke', food: true, title: '桂林米粉', line: '圆粉配卤水、锅烧（炸猪肉）、酸豆角和花生，是桂林人的日常早餐，“三天不吃心发慌”。' }));
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 4)); await yieldFn(); }

  // lantern boats: float on the river, bob; they pop up too
  const boats = [];
  for (const [u, s] of [[-11, 1.15], [1.5, 1.0], [11.5, 1.2]]) {
    const m = cutCard(card, 'cut-raft', 5.2, { back: 'mirror', flipX: u > 0 }) || card(raftPts({ len: 4.4, cormorants: 1 }), (P) => paintRaft(P, { night: 1, len: 4.4, cormorants: 1 }), { ppu: 64, back: 'mirror' });
    const p = add(m, { x: 0, z: 0, size: 0.35 }); p.hot = { act: 'sail', title: '竹筏渔火', line: '漓江上的渔人夜里撑竹筏，筏头挂一盏马灯，鸬鹚蹲在竹篙边，灯影一路晃过江面。' };
    const lamp = new THREE.PointLight('#ff9a4a', 0, 7, 1.6); lamp.position.set(0, 1, 0.4); m.add(lamp);
    boats.push({ p, u, s, lamp, phase: r() * 6.28 });
    p.boat = true; p.x = u; p.z = 9;
  }
  progress(0.9); await yieldFn();

  // clouds (float, not hinged: they drift in on the night wind)
  const clouds = [];
  { const mpts = shape.radial(r, { cx: 0, cy: 1.9, rx: 1.9, ry: 1.9, lobes: 1, depth: 0, wobble: 0.004 });
    const mm = card(mpts, (P) => { P.fill('#f2e9cf'); P.layer((g) => { for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-0.9 + r() * 1.8, 1.0 + r() * 1.8, 0.15 + r() * 0.3, 0, 6.28); g.fill(); } }, '#e3d8b8', { depth: 0.3 }); P.glow((g) => { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-3, -1, 6, 6); }); }, { ppu: 48, back: 'mirror' });
    mm.userData.hot = { dive: 'towers', title: '月中双塔', line: '月亮里藏着杉湖的日月双塔。点进去，走进画里。' }; mm.position.set(-6, 11.5, -12.5); mm.userData.base = { x: -6, y: 11.5, z: -12.5 }; mm.visible = false; group.add(mm); clouds.push(mm); }
  for (const [x, y, z, w] of [[-14, 9.0, -9, 4.2], [4, 11.0, -10, 3.4], [15, 8.0, -7, 3.0]]) {
    const pts = shape.radial(r, { cx: 0, cy: 0.7, rx: w / 2, ry: 0.7, lobes: 6, depth: 0.2 });
    const m = card(pts, paintCloud, { ppu: 44, back: 'mirror' }); m.position.set(x, y, z);
    m.userData.base = { x, y, z }; m.visible = false; group.add(m); clouds.push(m);
  }
  // egrets: body + two flapping wings
  const birds = [];
  const birdMat = new THREE.MeshLambertMaterial({ color: '#efe9de', side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.5, 0.25, 1.1, 0.05); wingShape.quadraticCurveTo(0.6, -0.05, 0, -0.18);
    const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.03, bevelEnabled: false });
    const L = new THREE.Mesh(wg, birdMat), R = new THREE.Mesh(wg, birdMat);
    const Lp = new THREE.Group(), Rp = new THREE.Group(); Lp.add(L); Rp.add(R); R.scale.x = -1;
    L.rotation.x = Math.PI / 2; R.rotation.x = Math.PI / 2;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.5, 3, 6), birdMat); body.rotation.x = Math.PI / 2;
    b.add(Lp, Rp, body); b.castShadow = true; L.castShadow = R.castShadow = true;
    b.userData = { Lp, Rp, ph: i * 1.9, rad: 9 + i * 1.6, h: 8.2 + i * 0.7, sp: 0.16 + i * 0.025 };
    b.scale.setScalar(0.9); b.visible = false; group.add(b); birds.push(b);
  }
  // fireflies / lantern sparks
  const NF = 60, fpos = new Float32Array(NF * 3), fseed = [];
  for (let i = 0; i < NF; i++) { fseed.push([r() * 40 - 20, r() * 3 + 0.4, r() * 22 - 11, r() * 6.28]); }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const spr = document.createElement('canvas'); spr.width = spr.height = 64; { const sg = spr.getContext('2d'); const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,220,150,1)'); rg.addColorStop(0.3, 'rgba(255,170,80,0.5)'); rg.addColorStop(1, 'rgba(255,150,60,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64); }
  const fmat = new THREE.PointsMaterial({ size: 0.42, map: new THREE.CanvasTexture(spr), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const flies = new THREE.Points(fgeo, fmat); group.add(flies);

  const mistTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 14; i++) { const x = 60 + r() * 392, y = 90 + r() * 80, rx = 70 + r() * 120, ry = 26 + r() * 30;
      const rg = g.createRadialGradient(x, y, 0, x, y, rx); rg.addColorStop(0, 'rgba(230,232,240,0.30)'); rg.addColorStop(1, 'rgba(230,232,240,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = rg; g.fillRect(x - rx, y - rx, rx * 2, rx * 2); g.restore(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mists = [];
  for (const [x, y, z, w, sp] of [[-8, 0.9, -6.5, 22, 0.25], [9, 1.3, -8.0, 20, -0.18], [0, 0.6, 6.5, 26, 0.14], [-4, 2.4, -10, 24, -0.1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.32), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    m.position.set(x, y + w * 0.1, z); m.renderOrder = 5; m.userData = { x, sp, y: y + w * 0.1 }; group.add(m); mists.push(m);
  }
  let reveal = 0; // 0..1, set by the book (how open this spread is)
  const api = {
    group, pieces, extraHots: clouds.filter((m) => m.userData.hot),
    mood: { bg: '#15161b', key: '#dfe3f2', keyI: 2.1, keyDir: [-0.7, 0.9, 0.45], fill: '#c9b8a8', fillI: 0.55, sky: '#7d8496', ground: '#3a3020', skyI: 0.55, leak: '#2a3550', wrap: 0.42, exposure: 1.22, trans: 0.12, transTint: '#9fb0d8' },
    setReveal(v) { reveal = v; },
    update(t, dt) {
      for (const p of pieces) {
        if (p.sway) p.h.sway = windSway(t, p.x, p.z, { amp: p.sway, heroHeight: 3 }) ;
        p.h.update(dt);
        p.h.group.visible = p.h.p > 0.004;
      }
      for (const b of boats) {
        b.extra = (b.extra || 0) + ((b.p.boostUntil || 0) > t ? dt * 1.6 : 0); const x = b.u + Math.sin(t * 0.07 + b.phase + b.extra * 0.25) * 2.6 + Math.sin(b.extra * 0.4) * 1.5, z = 8.6 + Math.sin(b.phase * 3) * 0.9 + Math.sin(t * 0.11 + b.phase) * 0.25;
        const g = b.p.h.group; g.position.set(x, 0.02 + Math.sin(t * 1.6 + b.phase) * 0.06, z);
        g.rotation.y = Math.cos(t * 0.07 + b.phase) * 0.18;
        b.p.h.pivot.rotation.z = Math.sin(t * 1.3 + b.phase) * 0.04;
        b.p.h.group.scale.setScalar(b.s);
        b.lamp.intensity = b.p.h.p * (2.4 + Math.sin(t * 2.1 + b.phase) * 0.25) * reveal;
      }
      clouds.forEach((m, i) => { const bb = m.userData.base; m.visible = reveal > 0.3; const k = Math.min(1, Math.max(0, (reveal - 0.3) / 0.7));
        m.position.set(bb.x + Math.sin(t * 0.05 + i * 2) * 2.4, bb.y - (1 - k) * 4 + Math.sin(t * 0.4 + i) * 0.12, bb.z); m.scale.setScalar(0.3 + 0.7 * k); });
      birds.forEach((b, i) => { const d = b.userData, a = t * d.sp + d.ph; b.visible = reveal > 0.6;
        b.position.set(Math.cos(a) * d.rad, d.h + Math.sin(a * 2) * 0.6, Math.sin(a) * d.rad * 0.45 - 3);
        b.rotation.y = -a + Math.PI; const f = Math.sin(t * 5.2 + d.ph * 3) * 0.55; d.Lp.rotation.z = f; d.Rp.rotation.z = -f; });
      for (let i = 0; i < NF; i++) { const [x, y, z, ph] = fseed[i]; fpos[i * 3] = x + Math.sin(t * 0.21 + ph) * 1.2; fpos[i * 3 + 1] = y + Math.sin(t * 0.33 + ph * 2) * 0.5; fpos[i * 3 + 2] = z + Math.cos(t * 0.17 + ph) * 1.0; }
      fgeo.attributes.position.needsUpdate = true;
      mists.forEach((m, i) => { const d = m.userData; m.position.x = d.x + Math.sin(t * 0.05 * Math.sign(d.sp) + i) * 4 + t * d.sp * 0.0; m.position.y = d.y + Math.sin(t * 0.3 + i) * 0.15; m.material.opacity = reveal * (0.55 + 0.15 * Math.sin(t * 0.21 + i * 1.7)); m.visible = reveal > 0.01; });
      fmat.opacity = reveal * (0.75 + 0.15 * Math.sin(t * 0.9));
      fmat.size = 0.42;
    },
  };
  return api;
}
