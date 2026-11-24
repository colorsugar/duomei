// 一碗米粉 — the closest picture: one bowl of 卤菜粉, its toppings standing up around it like a pop-up recipe.
import { THREE, INK, PAPER, VERM, rig, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { bowlPts, paintBowl, cutCard, paintGround } from './gk.js';
import { loadArt } from './art.js';

const ING = [
  ['圆米粉', '#f3eedf', '桂林米粉是圆粉，用陈米泡水磨浆、压榨成型，口感爽滑有韧劲。', 'noodle'],
  ['卤水', '#7a3a16', '卤水由骨头和十几味香料熬成，量不多，刚好让每根粉都裹上味道。', 'pot'],
  ['锅烧', '#c9853e', '带皮五花肉先煮后炸，切薄片，皮脆肉香。', 'slab'],
  ['卤牛肉', '#6a2e1e', '牛肉在卤水里卤透，切成薄片铺在粉面上。', 'slab'],
  ['酸豆角', '#7a9a3a', '豇豆用盐水泡酸再切丁，酸脆开胃，是调料台上最受欢迎的一样。', 'dots'],
  ['炒黄豆', '#d0a050', '油炸或干炒的黄豆，咬起来嘎嘣响。', 'dots'],
  ['葱花', '#4f9a3e', '最后撒一撮葱花，香气才算完整。', 'dots'],
  ['辣椒', '#c8321c', '桂林辣椒酱用鲜椒、蒜、豆豉做成，是“桂林三宝”之一。', 'dots'],
];
function ingPts(kind) {
  return shape.fromDrawing((g) => {
    if (kind === 'noodle') { g.lineCap = 'round'; g.lineWidth = 0.2; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-0.9 + i * 0.3, 0); g.bezierCurveTo(-0.6 + i * 0.3, 0.8, -1.2 + i * 0.3, 1.4, -0.8 + i * 0.3, 2.2); g.stroke(); } g.fillRect(-1.1, 0, 2.2, 0.3); }
    else if (kind === 'pot') { g.beginPath(); g.ellipse(0, 0.7, 1.0, 0.7, 0, 0, 6.28); g.fill(); g.fillRect(-1.2, 1.1, 2.4, 0.2); g.fillRect(-0.06, 1.3, 0.12, 1.0); g.beginPath(); g.ellipse(0, 2.3, 0.35, 0.18, 0, 0, 6.28); g.fill(); }
    else if (kind === 'slab') { for (let i = 0; i < 3; i++) { g.save(); g.translate((i - 1) * 0.55, 0.9 + i * 0.25); g.rotate(-0.25 + i * 0.25); g.fillRect(-0.55, -0.45, 1.1, 0.9); g.restore(); } g.fillRect(-1.0, 0, 2.0, 0.3); }
    else { g.beginPath(); g.ellipse(0, 0.35, 0.95, 0.35, 0, 0, 6.28); g.fill(); for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-0.6 + (i % 5) * 0.3, 0.75 + Math.floor(i / 5) * 0.3, 0.15, 0, 6.28); g.fill(); } }
  }, { w: 2.8, h: 2.8, res: 70, name: kind });
}
function paintIng(color, kind) {
  return (P) => { const { box, r } = P; P.fill(kind === 'dots' ? '#f1ebdf' : color);
    if (kind === 'dots') P.layer((g) => { for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-0.6 + (i % 5) * 0.3, 0.75 + Math.floor(i / 5) * 0.3, 0.15, 0, 6.28); g.fill(); } }, color, { depth: 0.35 });
    if (kind === 'slab') P.layer((g) => { for (let i = 0; i < 3; i++) { g.save(); g.translate((i - 1) * 0.55, 0.9 + i * 0.25); g.rotate(-0.25 + i * 0.25); g.fillRect(-0.55, 0.2, 1.1, 0.22); g.restore(); } }, color === '#c9853e' ? '#f3e0b8' : '#4a1e12', { depth: 0.3 });
    if (kind === 'pot') P.glow((g) => { g.globalAlpha = 0.3; g.fillStyle = '#ffb060'; g.beginPath(); g.ellipse(0, 1.0, 0.7, 0.2, 0, 0, 6.28); g.fill(); });
    P.marks('dab', { color: INK, alpha: 0.12, size: 0.02, density: 0.3 }); };
}
export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  const group = new THREE.Group();
  const K = (m, k) => { m.scale.setScalar(k); return m; };
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 83, contact: '#5a4030' });
  await loadArt(['cut-mifen-bowl', 'gr-bowl']); const BB = cutCard(card, 'cut-mifen-bowl', 13, { back: 'mirror', ppu: 68 }); const big = add(BB || K(card(bowlPts({ w: 3.6 }), (P) => paintBowl(P, { w: 3.6, top: [['#f4eedf', 60], ['#c9853e', 18], ['#6a2e1e', 14], ['#7a9a3a', 26], ['#d0a050', 16], ['#4f9a3e', 18], ['#c8321c', 10]] }), { ppu: 36, back: 'mirror' }), 2.8), { x: 0, z: -4.0, size: 0.8 });
  big.hot = { act: 'poke', food: true, title: '一碗卤菜粉', line: '一碗二两：粉在下，卤水只放一点，锅烧和牛肉铺面，再按自己口味加料，拌匀了吃。' };
  await yieldFn();
  ING.forEach(([t, c, line, kind], i) => { const a = Math.PI * (0.08 + 0.84 * i / (ING.length - 1)); const x = -Math.cos(a) * 15, z = 0.5 + Math.sin(a) * 8;
    add(K(card(ingPts(kind), paintIng(c, kind), { ppu: 34, back: 'mirror' }), 2.5), { x, z, size: 0.35, rest: (r() - 0.5) * 0.06 }).hot = { act: 'poke', food: true, title: t, line }; progress((i + 1) / ING.length); });
  for (let i = 0; i < pieces.length; i++) if (i % 3 === 2) await yieldFn();
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#f0dfc2', key: '#ffe3b4', keyI: 2.5, keyDir: [-0.6, 1.0, 0.55], fill: '#f6e8d2', fillI: 0.9, sky: '#fff3de', ground: '#a8865a', skyI: 0.6, leak: '#7a5a3a', wrap: 0.34, exposure: 1.05, trans: 0.3, transTint: '#ffcf8a' },
    setReveal(v) { reveal = v; },
    update(t, dt) { updatePieces(t, dt); },
  };
}
export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(70, 37);
  // a wooden table top
  g.fillStyle = '#b48a5e'; g.fillRect(0, 0, c.width, c.height);
  if (paintGround(g, c, 'gr-bowl', { alpha: 1 })) g.globalAlpha = 0.25;
  g.strokeStyle = 'rgba(70,40,20,0.25)'; g.lineWidth = 2; for (let z = -13; z < 13; z += 0.35) { g.beginPath(); g.moveTo(0, Z(z)); for (let x = -20; x <= 20; x += 1) g.lineTo(X(x), Z(z + Math.sin(x * 0.3 + z) * 0.08)); g.stroke(); }
  g.fillStyle = 'rgba(40,20,10,0.25)'; g.beginPath(); g.ellipse(X(0.6), Z(-3.4), 6.5 * S, 1.6 * S, 0, 0, 6.28); g.fill();
  g.globalAlpha = 1;
  titleSlip(g, X, Z, S, { title: '一碗米粉', seal: '二两', x: -18.8, z: 3.6, poem: '粉在下　卤一勺　料铺面', by: '— 桂林卤菜粉' });
  return c;
}
export function waterMask() { return sheenFrom(() => {}); }
