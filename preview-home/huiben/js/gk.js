// Guilin cut-paper kit: irregular karst towers, bamboo rafts with lanterns and poles, Guilin houses, banyan, ginkgo,
// terraces, bowls of food. Everything is drawn in his palette and printed with his karst painting where it is rock.
import { shape } from '../lib/paperkit-2d.js';
import { IMGS, imgOutline, paintImg } from './art.js';
import { rng } from './kit.js';
export const INK = '#1C1916', PAPER = '#F3EEE6', VERM = '#B3261E';

// ---------- karst: cut-paper towers with shoulders, crags and a torn skyline (never a tombstone) ----------
export function karstPts(r, { w = 8, h = 8, peaks = null, n = 160, rough = 1 } = {}) {
  const P = peaks || [[(r() - 0.5) * w * 0.2, h, w * (0.22 + r() * 0.08)], [w * (0.18 + r() * 0.1), h * (0.55 + r() * 0.15), w * 0.16], [-w * (0.22 + r() * 0.1), h * (0.38 + r() * 0.16), w * 0.14]];
  const prof = P.map(([c, hh, rad]) => ({ c, hh, rl: rad * (0.8 + r() * 0.5), rr: rad * (0.8 + r() * 0.5), p: 1.5 + r() * 1.3, q: 0.45 + r() * 0.25 }));
  const ph = [r() * 9, r() * 9, r() * 9];
  const top = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -w / 2 + u * w; let y = 0.2;
    for (const k of prof) { const rad = x < k.c ? k.rl : k.rr; const d = Math.abs(x - k.c) / rad; if (d < 1) y = Math.max(y, k.hh * Math.pow(1 - Math.pow(d, k.p), k.q)); }
    // torn skyline: three octaves of wobble plus little crags, scaled by local height
    const s = y / h; const wob = (Math.sin(x * 2.1 + ph[0]) * 0.05 + Math.sin(x * 5.3 + ph[1]) * 0.025 + Math.sin(x * 11.7 + ph[2]) * 0.012) * h * rough;
    const crag = (r() < 0.06 ? (r() - 0.3) * 0.18 * h : 0) * rough;
    y = y + (wob + crag) * Math.min(1, s * 1.4);
    const edge = Math.min(1, Math.min(u, 1 - u) * 10);
    top.push([x, Math.max(0.18, y * (0.35 + 0.65 * edge))]);
  }
  return [[-w / 2, 0], ...top, [w / 2, 0]];
}
// his karst painting printed onto the rock, tinted per spread, with a misty foot and moonlit/sunlit rim
export function paintKarst(P, { src = 'karst', tint = null, foot = '#dfe3dc', rim = '#ffffff', rimA = 0.25, far = 0, veg = null } = {}) {
  const { box, r } = P; const img = IMGS[src];
  P.fill('#7a7f78');
  if (img) P.draw((g) => { const sw = img.width, sh = img.height, k = Math.max(box.w / sw, box.h / sh) * (1.05 + r() * 0.2), w = sw * k, h = sh * k;
    g.save(); g.translate((box.x0 + box.x1) / 2 + (r() - 0.5) * box.w * 0.15, box.y0 + h / 2 - box.h * 0.02); g.scale(r() < 0.5 ? -1 : 1, -1); g.drawImage(img, -w / 2, -h / 2, w, h); g.restore(); });
  if (tint) P.draw((g) => { g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, box.h + 2); });
  if (far) P.draw((g) => { g.fillStyle = `rgba(230,232,228,${0.35 * far})`; g.fillRect(box.x0 - 1, box.y0 - 1, box.w + 2, box.h + 2); });
  // ink crevices (vertical, like 皴法 strokes)
  P.draw((g) => { g.strokeStyle = 'rgba(20,24,22,0.28)'; g.lineCap = 'round'; for (let i = 0; i < 18; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.15 + r() * 0.6); g.lineWidth = 0.03 + r() * 0.05; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 0.5, y + 0.6, x + (r() - 0.5) * 0.3, y + 1.0 + r() * 1.2); g.stroke(); } });
  // shrubs clinging to ledges
  if (veg) P.layer((g) => { for (let i = 0; i < 26; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.2 + r() * 0.65), s = 0.12 + r() * 0.2; g.beginPath(); g.ellipse(x, y, s * 1.6, s, 0, 0, 6.28); g.fill(); } }, veg, { depth: 0.35, alpha: 0.85 });
  // misty foot as a pale torn layer
  P.layer((g) => { g.beginPath(); g.moveTo(box.x0, box.y0); for (let i = 0; i <= 40; i++) { const x = box.x0 + box.w * i / 40; g.lineTo(x, box.y0 + box.h * (0.1 + 0.05 * Math.sin(i * 0.9 + r() * 0.6))); } g.lineTo(box.x1, box.y0); g.closePath(); g.fill(); }, foot, { depth: 0.6, alpha: 0.88 });
  P.rim({ color: rim, alpha: rimA });
  P.innerShade('#1b2420', { alpha: 0.28, blurPx: 14, dx: 0.03, dy: -0.02 });
}

// ---------- bamboo raft: deck of poles, a standing boatman with a pole, a lantern on a stick, cormorants ----------
export function raftPts({ len = 4.6, cormorants = 2 } = {}) {
  return shape.fromDrawing((g) => {
    g.beginPath(); g.moveTo(-len / 2, 0.38); g.quadraticCurveTo(-len / 2 - 0.25, 0.55, -len / 2 - 0.1, 0.7); g.lineTo(-len / 2 + 0.2, 0.3); g.lineTo(len / 2 - 0.2, 0.3); g.lineTo(len / 2 + 0.1, 0.7); g.quadraticCurveTo(len / 2 + 0.25, 0.55, len / 2, 0.38); g.lineTo(len / 2 - 0.2, 0); g.lineTo(-len / 2 + 0.2, 0); g.closePath(); g.fill();
    // boatman: hat, body, legs
    g.beginPath(); g.moveTo(0.45, 2.55); g.lineTo(0.95, 2.35); g.lineTo(-0.05, 2.35); g.closePath(); g.fill();
    g.fillRect(0.28, 1.25, 0.36, 1.12); g.fillRect(0.26, 0.4, 0.14, 0.9); g.fillRect(0.5, 0.4, 0.14, 0.9);
    // pole held diagonally
    g.save(); g.translate(0.45, 1.8); g.rotate(-0.42); g.fillRect(-0.05, -1.95, 0.1, 3.8); g.restore();
    // lantern on a stick at the bow
    g.fillRect(-len / 2 + 0.35, 0.4, 0.08, 1.9); g.beginPath(); g.ellipse(-len / 2 + 0.6, 2.05, 0.24, 0.3, 0, 0, 6.28); g.fill(); g.fillRect(-len / 2 + 0.35, 2.28, 0.32, 0.06);
    for (let i = 0; i < cormorants; i++) { const x = -0.7 - i * 0.75; g.beginPath(); g.ellipse(x, 0.72, 0.26, 0.17, -0.3, 0, 6.28); g.fill(); g.fillRect(x + 0.12, 0.72, 0.07, 0.42); g.beginPath(); g.ellipse(x + 0.2, 1.17, 0.11, 0.08, 0, 0, 6.28); g.fill(); g.fillRect(x + 0.26, 1.13, 0.2, 0.04); }
  }, { w: len + 1.0, h: 2.9, res: 70, name: 'raft' });
}
export function paintRaft(P, { night = 1, len = 4.6, cormorants = 2 } = {}) {
  const { box } = P;
  P.fill(night ? '#2a2620' : '#3a3128');
  // bamboo poles: pale stripes with nodes
  P.layer((g) => { g.fillRect(box.x0, 0, box.w, 0.42); }, night ? '#8a7a52' : '#c2ab70', { depth: 0.4 });
  P.draw((g) => { g.strokeStyle = 'rgba(40,30,16,0.55)'; g.lineWidth = 0.025; for (let y = 0.06; y < 0.4; y += 0.075) { g.beginPath(); g.moveTo(box.x0, y); g.lineTo(box.x1, y); g.stroke(); }
    for (let x = box.x0 + 0.3; x < box.x1; x += 0.55) { g.beginPath(); g.moveTo(x, 0.02); g.lineTo(x, 0.4); g.stroke(); } });
  // boatman: straw hat lit by the lantern, indigo jacket
  P.layer((g) => { g.beginPath(); g.moveTo(0.45, 2.55); g.lineTo(0.95, 2.35); g.lineTo(-0.05, 2.35); g.closePath(); g.fill(); }, night ? '#b79a5c' : '#d9bd7a', { depth: 0.5 });
  P.layer((g) => { g.fillRect(0.28, 1.25, 0.36, 1.12); }, night ? '#232a3a' : '#2f3f5a', { depth: 0.4 });
  // lantern: vermilion with a warm glow
  P.layer((g) => { g.beginPath(); g.ellipse(-len / 2 + 0.6, 2.05, 0.24, 0.3, 0, 0, 6.28); g.fill(); }, VERM, { depth: 0.5 });
  P.glow((g) => { g.fillStyle = '#ffcf7a'; g.beginPath(); g.ellipse(-len / 2 + 0.6, 2.05, 0.2, 0.26, 0, 0, 6.28); g.fill(); g.globalAlpha = 0.35; g.beginPath(); g.ellipse(0.45, 2.4, 0.5, 0.1, 0, 0, 6.28); g.fill(); });
  // cormorants: ink black with a pale throat
  P.draw((g) => { g.fillStyle = 'rgba(230,220,190,0.6)'; for (let i = 0; i < cormorants; i++) { const x = -0.7 - i * 0.75; g.beginPath(); g.ellipse(x + 0.17, 1.02, 0.04, 0.09, 0, 0, 6.28); g.fill(); } });
}

// ---------- Guilin house: grey brick, white plaster band, upturned dark-tile eaves, red lantern, wood door ----------
export function housePts({ w = 4.4, h = 2.8, roof = 1.3, eave = 0.5, flare = 0.35, upper = false } = {}) {
  return shape.fromDrawing((g) => {
    g.fillRect(-w / 2, 0, w, h);
    g.beginPath(); g.moveTo(-w / 2 - eave - 0.1, h + flare); g.quadraticCurveTo(-w / 2 - eave * 0.3, h - 0.05, -w / 2 + 0.2, h + 0.15);
    g.lineTo(-w * 0.12, h + roof); g.lineTo(w * 0.12, h + roof); g.lineTo(w / 2 - 0.2, h + 0.15); g.quadraticCurveTo(w / 2 + eave * 0.3, h - 0.05, w / 2 + eave + 0.1, h + flare); g.lineTo(w / 2 + eave * 0.4, h + 0.35); g.lineTo(-w / 2 - eave * 0.4, h + 0.35); g.closePath(); g.fill();
    if (upper) { g.fillRect(-w * 0.3, h + roof - 0.2, w * 0.6, 1.1); g.beginPath(); g.moveTo(-w * 0.42, h + roof + 0.7); g.lineTo(w * 0.42, h + roof + 0.7); g.lineTo(w * 0.1, h + roof + 1.4); g.lineTo(-w * 0.1, h + roof + 1.4); g.closePath(); g.fill(); }
  }, { w: w + 2 * eave + 0.6, h: h + roof + (upper ? 1.6 : 0.2), res: 56, name: 'house' });
}
export function paintHouse(P, { w = 4.4, h = 2.8, roof = 1.3, brick = '#8d8a86', plaster = '#efe9dc', tile = '#34312f', door = '#6a3e25', lantern = true, shop = null, lit = 0, upper = false } = {}) {
  const { box, r } = P;
  P.fill(brick);
  P.draw((g) => { g.strokeStyle = 'rgba(40,36,32,0.25)'; g.lineWidth = 0.02; for (let y = 0.12; y < h; y += 0.16) { g.beginPath(); g.moveTo(-w / 2, y); g.lineTo(w / 2, y); g.stroke(); const off = (Math.round(y / 0.16) % 2) * 0.17; for (let x = -w / 2 + off; x < w / 2; x += 0.34) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 0.16); g.stroke(); } } });
  P.layer((g) => { g.fillRect(-w / 2, h - 0.55, w, 0.42); }, plaster, { depth: 0.4 });
  P.draw((g) => { g.fillStyle = 'rgba(60,70,90,0.55)'; for (let i = 0; i < 6; i++) { const x = -w / 2 + 0.25 + i * (w - 0.5) / 5; g.beginPath(); g.ellipse(x, h - 0.34, 0.12, 0.07, 0, 0, 6.28); g.fill(); } });
  // roof tiles with ribs, eave flare
  P.layer((g) => { g.beginPath(); g.moveTo(box.x0, h + 0.35); g.lineTo(box.x1, h + 0.35); g.lineTo(box.x1, box.y1 + 1); g.lineTo(box.x0, box.y1 + 1); g.closePath(); g.fill(); }, tile, { depth: 0.75 });
  P.draw((g) => { g.strokeStyle = 'rgba(150,150,150,0.35)'; g.lineWidth = 0.035; for (let x = box.x0 + 0.1; x < box.x1; x += 0.17) { g.beginPath(); g.moveTo(x, h + 0.3); g.lineTo(x + (x > 0 ? -0.12 : 0.12), h + roof); g.stroke(); } });
  P.layer((g) => { g.fillRect(-w * 0.13, h + roof - 0.14, w * 0.26, 0.16); }, '#1f1d1b', { depth: 0.5 });
  if (shop) {
    // open shopfront: dark interior, counter, signboard
    P.layer((g) => { g.fillRect(-w * 0.38, 0, w * 0.76, h * 0.62); }, lit ? '#3a2416' : '#2a221c', { depth: 0.7 });
    if (lit) P.glow((g) => { g.globalAlpha = 0.55 * lit; g.fillStyle = '#ffb45c'; g.fillRect(-w * 0.36, 0.1, w * 0.72, h * 0.55); });
    P.layer((g) => { g.fillRect(-w * 0.4, 0, w * 0.8, 0.55); }, '#7a4a2a', { depth: 0.5 });
    P.layer((g) => { g.fillRect(-w * 0.3, h * 0.66, w * 0.6, 0.55); }, VERM, { depth: 0.55 });
    P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = '#f6e2b0'; g.font = `400 0.42px ZMX, "Ma Shan Zheng", KaiTi, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(shop, 0, -(h * 0.66 + 0.28)); g.restore(); });
  } else {
    P.layer((g) => { g.fillRect(-0.42, 0, 0.84, 1.55); }, door, { depth: 0.6 });
    P.layer((g) => { for (const x of [-w * 0.3, w * 0.3]) g.fillRect(x - 0.36, 1.0, 0.72, 0.7); }, lit ? '#e8a54a' : '#3d3530', { depth: 0.5 });
    if (lit) P.glow((g) => { g.globalAlpha = 0.6 * lit; g.fillStyle = '#ffc070'; for (const x of [-w * 0.3, w * 0.3]) g.fillRect(x - 0.32, 1.04, 0.64, 0.62); });
    P.draw((g) => { g.strokeStyle = 'rgba(30,20,10,0.6)'; g.lineWidth = 0.03; for (const x of [-w * 0.3, w * 0.3]) for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x - 0.36 + k * 0.18, 1.0); g.lineTo(x - 0.36 + k * 0.18, 1.7); g.stroke(); } });
  }
  if (lantern) { P.layer((g) => { for (const x of [-w * 0.44, w * 0.44]) { g.beginPath(); g.ellipse(x, h - 0.9, 0.16, 0.21, 0, 0, 6.28); g.fill(); } }, VERM, { depth: 0.5 });
    P.glow((g) => { g.globalAlpha = 0.7; g.fillStyle = '#ffb060'; for (const x of [-w * 0.44, w * 0.44]) { g.beginPath(); g.ellipse(x, h - 0.9, 0.12, 0.17, 0, 0, 6.28); g.fill(); } }); }
  P.marks('dab', { color: '#6f7a5e', alpha: 0.25, size: 0.03, density: 0.25 });
}

// ---------- trees ----------
export function banyanPts(r, { w = 6, h = 5.4 } = {}) {
  return shape.fromDrawing((g) => { g.lineCap = 'round';
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-0.3, h * 0.35, 0.1, h * 0.55); g.stroke();
    for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.9 + i / 8 * Math.PI * 0.8 + Math.PI * 0.05; g.beginPath(); g.ellipse(Math.cos(a) * w * 0.32, h * 0.66 + Math.sin(-a) * h * 0.16, w * 0.2, h * 0.14, 0, 0, 6.28); g.fill(); }
    g.beginPath(); g.ellipse(0, h * 0.72, w * 0.46, h * 0.22, 0, 0, 6.28); g.fill();
    g.lineWidth = 0.05; for (let i = 0; i < 8; i++) { const x = -w * 0.35 + i * w * 0.1; g.beginPath(); g.moveTo(x, h * 0.55); g.lineTo(x + 0.05, h * 0.15 + (i % 3) * 0.3); g.stroke(); }
  }, { w: w + 0.4, h: h + 0.3, res: 44, name: 'banyan' });
}
export function paintBanyan(P, { leaf = '#3e5a3a', leaf2 = '#5f7d4c', leaf3 = '#8aa06a', trunk = '#4a3a2c' } = {}) {
  const { box, r } = P;
  P.fill(leaf);
  for (const [c, n, s, d] of [[leaf2, 70, 0.32, 0.45], [leaf3, 45, 0.24, 0.3]]) P.layer((g) => { for (let i = 0; i < n; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.5 + r() * 0.48); g.beginPath(); g.ellipse(x, y, s * (0.6 + r()), s * 0.6 * (0.6 + r()), r() * 3, 0, 6.28); g.fill(); } }, c, { depth: d, alpha: 0.9 });
  P.layer((g) => { g.lineCap = 'round'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(0, box.y0); g.quadraticCurveTo(-0.3, box.h * 0.35, 0.1, box.h * 0.55); g.stroke(); g.lineWidth = 0.04; for (let i = 0; i < 8; i++) { const x = -box.w * 0.33 + i * box.w * 0.09; g.beginPath(); g.moveTo(x, box.h * 0.55); g.lineTo(x + 0.05, box.h * 0.15 + (i % 3) * 0.3); g.stroke(); } }, trunk, { depth: 0.6 });
}
// ginkgo: a tall cone of fan-shaped leaf clusters in gold
export function ginkgoPts(r, { w = 5, h = 8 } = {}) {
  return shape.fromDrawing((g) => { g.lineCap = 'round'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(0, 0); g.lineTo(0.05, h * 0.5); g.stroke();
    for (let i = 0; i < 14; i++) { const t = i / 13, y = h * (0.25 + t * 0.7), rw = w * 0.5 * (1 - t * 0.75) * (0.85 + 0.3 * Math.abs(Math.sin(i * 2.3))); g.beginPath(); g.ellipse((i % 2 ? 1 : -1) * rw * 0.25, y, rw, h * 0.075, 0, 0, 6.28); g.fill(); }
  }, { w: w + 0.4, h: h + 0.3, res: 40, name: 'ginkgo' });
}
export function paintGinkgo(P, { gold = '#e0a628', gold2 = '#f2c94c', gold3 = '#b9781c', trunk = '#4a3626' } = {}) {
  const { box, r } = P;
  P.fill(gold);
  P.layer((g) => { for (let i = 0; i < 90; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.25 + r() * 0.72), s = 0.16 + r() * 0.12, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); g.arc(x, y, s, a, a + 1.6); g.closePath(); g.fill(); } }, gold2, { depth: 0.4, alpha: 0.95 });
  P.layer((g) => { for (let i = 0; i < 40; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.25 + r() * 0.6), s = 0.14 + r() * 0.1, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); g.arc(x, y, s, a, a + 1.5); g.closePath(); g.fill(); } }, gold3, { depth: 0.35, alpha: 0.8 });
  P.layer((g) => { g.lineCap = 'round'; g.lineWidth = 0.38; g.beginPath(); g.moveTo(0, box.y0); g.lineTo(0.05, box.h * 0.5); g.stroke(); g.lineWidth = 0.08; for (let i = 0; i < 6; i++) { const y = box.h * (0.3 + i * 0.1); g.beginPath(); g.moveTo(0.03, y); g.lineTo((i % 2 ? 1 : -1) * box.w * 0.3, y + 0.5); g.stroke(); } }, trunk, { depth: 0.55 });
}
export function bambooPts(r, { h = 6, n = 7 } = {}) {
  return shape.fromDrawing((g) => { g.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = (i - n / 2) * 0.32, hh = h * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.9))); g.lineWidth = 0.14; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.3, hh * 0.6, x + (i - n / 2) * 0.25, hh); g.stroke();
    for (let k = 0; k < 4; k++) { const y = hh * (0.45 + k * 0.14); g.save(); g.translate(x + (i - n / 2) * 0.12 * (y / hh), y); g.rotate((k % 2 ? 1 : -1) * 0.9); g.beginPath(); g.ellipse(0.4, 0, 0.45, 0.09, 0, 0, 6.28); g.fill(); g.restore(); } } }, { w: n * 0.32 + 3, h: h + 0.4, res: 40, name: 'bamboo' });
}
export function paintBamboo(P, { a = '#5d7a45', b = '#8fae64' } = {}) { const { box, r } = P; P.fill(a); P.layer((g) => { for (let i = 0; i < 60; i++) { const x = box.x0 + r() * box.w, y = box.y0 + box.h * (0.4 + r() * 0.6); g.save(); g.translate(x, y); g.rotate(r() * 3); g.beginPath(); g.ellipse(0, 0, 0.35, 0.07, 0, 0, 6.28); g.fill(); g.restore(); } }, b, { depth: 0.35 }); }

// ---------- food on a little paper board ----------
export function bowlPts({ w = 2.4 } = {}) { return shape.fromDrawing((g) => { g.beginPath(); g.moveTo(-w / 2, 0.9); g.quadraticCurveTo(-w * 0.45, 0, 0, 0); g.quadraticCurveTo(w * 0.45, 0, w / 2, 0.9); g.closePath(); g.fill(); g.beginPath(); g.ellipse(0, 0.95, w / 2, 0.32, 0, 0, 6.28); g.fill(); g.fillRect(-0.04, 0.9, 0.08, 1.7); g.save(); g.translate(0.3, 0.9); g.rotate(-0.35); g.fillRect(-0.04, 0, 0.08, 1.8); g.restore(); }, { w: w + 0.4, h: 2.8, res: 70, name: 'bowl' }); }
export function paintBowl(P, { w = 2.4, bowl = '#f1ebdf', band = '#2f4f7a', soup = '#c9883a', top = [['#f4eedf', 14], ['#7a3a1e', 6], ['#5f8a3a', 5], ['#d8452e', 3]] } = {}) {
  const { r } = P;
  P.fill(bowl);
  P.layer((g) => { g.fillRect(-w / 2, 0.55, w, 0.14); }, band, { depth: 0.3 });
  P.draw((g) => { g.strokeStyle = band; g.lineWidth = 0.035; for (let i = 0; i < 7; i++) { const x = -w * 0.35 + i * w * 0.12; g.beginPath(); g.arc(x, 0.3, 0.09, 0, 6.28); g.stroke(); } });
  P.layer((g) => { g.beginPath(); g.ellipse(0, 0.95, w / 2 - 0.08, 0.26, 0, 0, 6.28); g.fill(); }, soup, { depth: 0.4 });
  for (const [c, n] of top) P.layer((g) => { for (let i = 0; i < n; i++) { const x = (r() - 0.5) * w * 0.75, y = 0.9 + (r() - 0.5) * 0.25; g.beginPath(); g.ellipse(x, y, 0.08 + r() * 0.12, 0.04 + r() * 0.05, r() * 3, 0, 6.28); g.fill(); } }, c, { depth: 0.25 });
  P.layer((g) => { g.fillRect(-0.04, 0.9, 0.08, 1.7); g.save(); g.translate(0.3, 0.9); g.rotate(-0.35); g.fillRect(-0.04, 0, 0.08, 1.8); g.restore(); }, '#8a5a32', { depth: 0.3 });
}
// steam wisps drawn as a separate floating sprite-like card can be added by the spread (kept simple here)

// ---------- maple: a jagged crown built from star-shaped leaves (cut-paper, never a blob) ----------
const star = (g, x, y, s, a) => { g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.42 : s, t = a + i / 10 * 6.283; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } g.closePath(); g.fill(); };
export function maplePts(r, { w = 4.4, h = 4.6, seed = 1 } = {}) {
  const rr = rng(seed);
  return shape.fromDrawing((g) => { g.lineCap = 'round'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-0.15, h * 0.3, 0.1, h * 0.5); g.stroke(); g.lineWidth = 0.12; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0.05, h * 0.38); g.quadraticCurveTo(s * w * 0.2, h * 0.5, s * w * 0.32, h * 0.62); g.stroke(); }
    for (let i = 0; i < 46; i++) { const a = rr() * 6.283, d = Math.sqrt(rr()); const x = Math.cos(a) * d * w * 0.44, y = h * 0.66 + Math.sin(a) * d * h * 0.3; star(g, x, y, 0.32 + rr() * 0.22, rr() * 6); } }, { w: w + 0.8, h: h + 0.6, res: 44, name: 'maple' });
}
export function paintMaple(P, { a = '#9a2a1e', b = '#c8452a', c = '#e07a3a', trunk = '#3a2a22', seed = 2 } = {}) {
  const { box } = P; const rr = rng(seed);
  P.fill(a);
  for (const [col, n, s, d] of [[b, 50, 0.28, 0.4], [c, 26, 0.22, 0.3]]) P.layer((g) => { for (let i = 0; i < n; i++) { const x = box.x0 + 0.4 + rr() * (box.w - 0.8), y = box.y0 + box.h * (0.5 + rr() * 0.45); star(g, x, y, s * (0.7 + rr() * 0.6), rr() * 6); } }, col, { depth: d });
  P.layer((g) => { g.lineCap = 'round'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(0, box.y0); g.quadraticCurveTo(-0.15, box.h * 0.3, 0.1, box.h * 0.5); g.stroke(); }, trunk, { depth: 0.4 });
}
// ---------- pagoda: crisp tiers with upturned eave tips, a finial, and lit windows ----------
export function pagodaPts({ tiers = 7, w0 = 1.6, bh = 0.78, eh = 0.26, flare = 0.6, taper = 0.88, spire = 1.3 } = {}) {
  const R = []; let y = 0.32, w = w0 / 2;
  R.push([w + 0.35, 0], [w + 0.35, 0.32], [w, 0.32]);
  for (let i = 0; i < tiers; i++) { R.push([w, y + bh]); const ew = w + flare * (1 - i / tiers * 0.35); R.push([ew + 0.22, y + bh - 0.14], [ew + 0.1, y + bh + 0.02], [ew - 0.1, y + bh + eh * 0.5]); const nw = w * taper; R.push([nw, y + bh + eh]); y += bh + eh; w = nw; }
  R.push([0.1, y], [0.1, y + spire * 0.4], [0.22, y + spire * 0.45], [0.1, y + spire * 0.55], [0.18, y + spire * 0.62], [0.06, y + spire * 0.7], [0.02, y + spire]);
  const L = R.slice().reverse().map(([x, yy]) => [-x, yy]);
  return [...R, ...L];
}
export function paintPagoda(P, { tiers = 7, bh = 0.78, eh = 0.26, body = '#c8902e', roof = '#4a3214', win = '#ffd27a', lit = 1 } = {}) {
  const { box } = P;
  P.gradient(body, roof, 0);
  P.layer((g) => { let y = 0.32; for (let i = 0; i < tiers; i++) { g.fillRect(box.x0, y + bh - 0.16, box.w, eh + 0.2); y += bh + eh; } g.fillRect(-0.1, y, 0.2, 1.3); g.fillRect(box.x0, 0, box.w, 0.32); }, roof, { depth: 0.7 });
  P.draw((g) => { g.strokeStyle = 'rgba(255,230,170,0.6)'; g.lineWidth = 0.03; let y = 0.32; for (let i = 0; i < tiers; i++) { g.beginPath(); g.moveTo(box.x0, y + bh - 0.17); g.lineTo(box.x1, y + bh - 0.17); g.stroke(); y += bh + eh; } });
  const wins = (g) => { let y = 0.32; for (let i = 0; i < tiers; i++) { const ww = 0.2; g.fillRect(-ww / 2, y + 0.16, ww, 0.4); g.fillRect(-ww * 2.4, y + 0.2, ww * 0.8, 0.3); g.fillRect(ww * 1.6, y + 0.2, ww * 0.8, 0.3); y += bh + eh; } };
  P.layer(wins, win, { depth: 0.3 });
  if (lit) P.glow((g) => { g.globalAlpha = lit; g.fillStyle = '#fff'; wins(g); });
  P.rim({ color: '#ffe0a0', alpha: 0.35 });
}

// ---------- painted layers (generated in his storybook style, cut out of a white ground) ----------
// cutCard(card, 'cut-elephant', 12) -> mesh or null when the art is missing (pages still build with their procedural pieces)
export function cutCard(card, name, w, o = {}) {
  const im = IMGS[name]; if (!im) return null; const h = w * im.height / im.width;
  return card(imgOutline(im, w, h), (P) => { P.fill('#efe8dc'); P.draw((g) => { g.save(); g.scale(1, -1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); }); if (o.tint) P.draw((g) => { g.globalCompositeOperation = 'multiply'; g.fillStyle = o.tint; g.fillRect(-w, -1, w * 2, h + 2); }); if (o.glow) P.glow((g) => { g.globalAlpha = o.glow; g.save(); g.scale(1, -1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); }); }, { ppu: o.ppu || Math.max(18, Math.min(60, 900 / w)), back: o.back || 'kraft' });
}
// the painted ground: draw the top-down painting over the page canvas (cover), blended so the page's own marks still read
export function paintGround(g, c, name, { alpha = 0.9, mode = 'source-over' } = {}) {
  const im = IMGS[name]; if (!im) return false;
  const k = Math.max(c.width / im.width, c.height / im.height), w = im.width * k, h = im.height * k;
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = mode; g.drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h); g.restore(); return true;
}
