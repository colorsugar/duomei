// shared pop-up plumbing for the spreads: hinged cards, flyers, mist, title slip
import * as THREE from 'three';
import { makeCard, crossCard, hinge, windSway, rng } from '../lib/paperkit-3d.js';
import { paperSheet } from '../lib/paperkit-2d.js';
export const INK = '#1C1916', PAPER = '#F3EEE6', VERM = '#B3261E', W = 40, D = 26;
export { THREE, makeCard, crossCard, rng };

export function rig({ group, paper, seed = 1, contact = '#5a4630' }) {
  const pieces = [], r = rng(seed);
  const add = (mesh, { x, z, yaw = 0, rest = 0, size = 0.5, sway = 0, y = 0 }) => {
    const h = hinge(mesh, { at: new THREE.Vector3(x, y, z), yaw, open: 0, size, rest }); h.update(0); group.add(h.group);
    const p = { h, x, z, sway, mesh }; pieces.push(p); return p;
  };
  const card = (pts, paint, o = {}) => makeCard(pts, { paper, paint, pxPerUnit: o.ppu || 60, thickness: 0.09, edgeWidth: 0.05, seed: o.seed || (r() * 1e4) | 0,
    back: o.back ?? 'kraft', contact: { amount: 0.16, height: 0.45, color: contact }, holes: o.holes || null, glow: 1.2, glowColor: '#ffbf66' });
  const cross = (pts, paint, o = {}) => crossCard(pts, { paper, paint, pxPerUnit: o.ppu || 56, thickness: 0.08, edgeWidth: 0.05, seed: (r() * 1e4) | 0, contact: { amount: 0.16, height: 0.4, color: contact } });
  const updatePieces = (t, dt) => { for (const p of pieces) { if (p.sway) p.h.sway = windSway(t, p.x, p.z, { amp: p.sway, heroHeight: 3 }); p.h.update(dt); p.h.group.visible = p.h.p > 0.004; } };
  return { pieces, add, card, cross, r, updatePieces };
}

// flapping paper flyers (swallows, egrets) on looping paths
export function flyers(group, { n = 4, color = '#2a2622', span = 1.1, rad = 10, h = 8, sp = 0.18, fork = false, cz = -3 } = {}) {
  if (SMALL) n = Math.max(1, Math.round(n * 0.4));
  const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const list = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const ws = new THREE.Shape(); ws.moveTo(0, 0.05); ws.quadraticCurveTo(span * 0.5, 0.28, span, fork ? -0.05 : 0.05); ws.quadraticCurveTo(span * 0.55, -0.02, 0, -0.16);
    const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.025, bevelEnabled: false });
    const L = new THREE.Mesh(wg, mat), R = new THREE.Mesh(wg, mat); R.scale.x = -1; L.rotation.x = R.rotation.x = Math.PI / 2;
    const Lp = new THREE.Group(), Rp = new THREE.Group(); Lp.add(L); Rp.add(R);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 3, 6), mat); body.rotation.x = Math.PI / 2;
    b.add(Lp, Rp, body);
    if (fork) { const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 3), mat); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.4; tail.scale.x = 1.6; tail.scale.y = 0.3; b.add(tail); }
    L.castShadow = R.castShadow = body.castShadow = !SMALL;
    b.userData = { Lp, Rp, ph: i * 1.7, rad: rad + i * 1.4, h: h + i * 0.6, sp: sp + i * 0.03 };
    b.visible = false; group.add(b); list.push(b);
  }
  return (t, reveal) => list.forEach((b) => { const d = b.userData, a = t * d.sp + d.ph; b.visible = reveal > 0.6;
    b.position.set(Math.cos(a) * d.rad, d.h + Math.sin(a * 2.3) * 0.7, Math.sin(a) * d.rad * 0.42 + cz);
    b.rotation.y = -a + Math.PI; b.rotation.z = Math.sin(a * 2.3) * 0.25; const f = Math.sin(t * 6 + d.ph * 3) * 0.6; d.Lp.rotation.z = f; d.Rp.rotation.z = -f; });
}

export function mist(group, r, list, rgb = '236,232,224', a = 0.3) {
  if (SMALL) list = list.slice(0, Math.min(2, list.length));
  const c = document.createElement('canvas'); c.width = SMALL ? 256 : 512; c.height = SMALL ? 128 : 256; const g = c.getContext('2d');
  const nBlob = SMALL ? 8 : 14, xSpan = SMALL ? 196 : 392, y0 = SMALL ? 45 : 90, rx0 = SMALL ? 35 : 70, rw = SMALL ? 60 : 120;
  for (let i = 0; i < nBlob; i++) { const x = 30 + r() * xSpan, y = y0 + r() * (SMALL ? 40 : 80), rx = rx0 + r() * rw, ry = (SMALL ? 13 : 26) + r() * (SMALL ? 15 : 30);
    const rg = g.createRadialGradient(x, y, 0, x, y, rx); rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = rg; g.fillRect(x - rx, y - rx, rx * 2, rx * 2); g.restore(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const ms = list.map(([x, y, z, w]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    m.position.set(x, y, z); m.renderOrder = 5; m.userData = { x, y }; group.add(m); return m; });
  return (t, reveal) => ms.forEach((m, i) => { m.position.x = m.userData.x + Math.sin(t * 0.05 + i) * 4; m.position.y = m.userData.y + Math.sin(t * 0.3 + i) * 0.15; m.material.opacity = reveal * (0.55 + 0.15 * Math.sin(t * 0.21 + i * 1.7)); m.visible = reveal > 0.01; });
}

// phones get a lighter ground canvas: two GPU copies of a 3200px canvas per spread is too much memory there
export const SMALL = typeof innerWidth !== 'undefined' && Math.min(innerWidth, innerHeight) < 760;
export function groundBase(S = 80, seed = 11) {
  S = Math.min(S, SMALL ? 46 : 64);
  const c = document.createElement('canvas'); c.width = W * S; c.height = D * S; const g = c.getContext('2d');
  g.fillStyle = g.createPattern(paperSheet({ size: 512, color: PAPER, seed }), 'repeat'); g.fillRect(0, 0, c.width, c.height);
  return { c, g, X: (x) => (x + W / 2) * S, Z: (z) => (z + D / 2) * S, S };
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function titleSlip(g, X, Z, S, { title, seal, x = -18.8, z = -0.6, poem, by }) {
  const lx = X(x), ly = Z(z), lw = 2.4 * S, lh = 8.6 * S;
  g.save(); g.shadowColor = 'rgba(60,40,20,0.3)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = '#fbf8f2'; rr(g, lx, ly, lw, lh, 14); g.fill(); g.restore();
  g.strokeStyle = 'rgba(28,25,22,0.5)'; g.lineWidth = 3; rr(g, lx + 12, ly + 12, lw - 24, lh - 24, 8); g.stroke();
  g.fillStyle = INK; g.font = `${1.55 * S}px ZMX, "Ma Shan Zheng", KaiTi, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...title].forEach((ch, i) => g.fillText(ch, lx + lw / 2, ly + 1.25 * S + i * 1.72 * S));
  g.fillStyle = VERM; rr(g, lx + lw / 2 - 0.55 * S, ly + lh - 1.55 * S, 1.1 * S, 1.1 * S, 10); g.fill();
  g.fillStyle = PAPER; g.font = `${0.42 * S}px MSZ, KaiTi, serif`; g.fillText(seal[0], lx + lw / 2, ly + lh - 1.25 * S); g.fillText(seal[1], lx + lw / 2, ly + lh - 0.78 * S);
  if (poem) { g.textAlign = 'right'; g.fillStyle = 'rgba(28,25,22,0.72)'; g.font = `${0.62 * S}px MSZ, KaiTi, serif`; g.fillText(poem, X(18.8), Z(12.1));
    g.font = `${0.36 * S}px MSZ, KaiTi, serif`; g.fillStyle = 'rgba(28,25,22,0.45)'; g.fillText(by, X(18.8), Z(12.75)); }
}
export function sheenFrom(drawMask) {
  const S = 24, c = document.createElement('canvas'); c.width = W * S; c.height = D * S; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.filter = 'blur(5px)';
  drawMask(g, (x) => (x + W / 2) * S, (z) => (z + D / 2) * S, S); return c;
}
