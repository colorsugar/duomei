// 阳朔 · 遇龙河 · 十里画廊 — jade river winding between karst towers, bamboo rafts, the Yulong bridge, paddies, and beer fish on the bank.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { loadArt } from './art.js';
import { karstPts, paintKarst, raftPts, paintRaft, housePts, paintHouse, bambooPts, paintBamboo, bowlPts, cutCard, paintGround } from './gk.js';

const JADE = '#7fb2a0';
// the river: a centre line in (x, z), drawn on the ground and used to place rafts
const RIV = [[-20, -4.5], [-13, -3.2], [-7, -0.4], [-2, 1.2], [3, 2.6], [8, 3.4], [13, 5.6], [20, 8.4]];
const rivZ = (x) => { for (let i = 1; i < RIV.length; i++) if (x <= RIV[i][0]) { const [x0, z0] = RIV[i - 1], [x1, z1] = RIV[i]; const u = (x - x0) / (x1 - x0); return z0 + (z1 - z0) * (u * u * (3 - 2 * u)); } return RIV[RIV.length - 1][1]; };
const ell = (cx, cy, rx, ry, n = 40) => Array.from({ length: n }, (_, i) => [cx + Math.cos(-i / n * 6.283) * rx, cy + Math.sin(-i / n * 6.283) * ry]);

function bridgePts() { return [[-4.2, 0], [-4.2, 0.3], [-2.4, 1.1], [-1.2, 1.9], [0, 2.15], [1.2, 1.9], [2.4, 1.1], [4.2, 0.3], [4.2, 0], [2.3, 0], [2.3, 0.05]].concat(Array.from({ length: 17 }, (_, i) => { const a = i / 16 * Math.PI; return [Math.cos(a) * 2.2, 0.05 + Math.sin(a) * 1.55]; })).concat([[-2.3, 0.05], [-2.3, 0]]); }
function paintBridge(P) {
  P.fill('#a7a291');
  P.draw((g) => { g.strokeStyle = 'rgba(40,40,34,0.35)'; g.lineWidth = 0.025; for (let y = 0.25; y < 2.2; y += 0.25) { g.beginPath(); g.moveTo(-4.2, y); g.lineTo(4.2, y); g.stroke(); } for (let i = 0; i < 18; i++) { const a = i / 17 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 2.2, 0.05 + Math.sin(a) * 1.55); g.lineTo(Math.cos(a) * 2.55, 0.05 + Math.sin(a) * 1.85); g.stroke(); } });
  P.layer((g) => { for (let i = 0; i < 26; i++) { const x = -4 + i * 0.32; g.beginPath(); g.ellipse(x, 0.25 + Math.max(0, 1.9 - Math.abs(x) * 0.45) * (Math.abs(x) < 4 ? 1 : 0) * 0.9, 0.18, 0.1, 0, 0, 6.28); g.fill(); } }, '#5f7a46', { depth: 0.3 });
  P.marks('hatch', { color: INK, alpha: 0.15, size: 0.04, angle: 1.1, width: 1.0 });
}
function buffaloPts() { return shape.fromDrawing((g) => { g.beginPath(); g.ellipse(0, 0.95, 1.1, 0.5, 0, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(1.25, 1.05, 0.38, 0.28, -0.3, 0, 6.28); g.fill(); g.lineWidth = 0.12; g.beginPath(); g.moveTo(1.1, 1.3); g.quadraticCurveTo(0.9, 1.7, 1.3, 1.65); g.stroke(); g.beginPath(); g.moveTo(1.4, 1.3); g.quadraticCurveTo(1.7, 1.7, 1.85, 1.45); g.stroke(); for (const x of [-0.75, -0.4, 0.4, 0.75]) g.fillRect(x - 0.08, 0, 0.16, 0.7); g.lineWidth = 0.06; g.beginPath(); g.moveTo(-1.1, 1.0); g.lineTo(-1.35, 0.5); g.stroke(); }, { w: 3.6, h: 2.2, res: 60 }); }
function cyclistPts() { return shape.fromDrawing((g) => { g.lineWidth = 0.09; for (const x of [-0.7, 0.7]) { g.beginPath(); g.arc(x, 0.5, 0.45, 0, 6.28); g.stroke(); } g.beginPath(); g.moveTo(-0.7, 0.5); g.lineTo(-0.1, 1.15); g.lineTo(0.55, 1.15); g.lineTo(0.7, 0.5); g.moveTo(-0.1, 1.15); g.lineTo(0, 0.5); g.lineTo(0.55, 1.15); g.stroke(); g.fillRect(-0.35, 1.2, 0.5, 0.75); g.beginPath(); g.arc(0.0, 2.15, 0.22, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(0, 2.32, 0.5, 0.08, 0, 0, 6.28); g.fill(); }, { w: 2.2, h: 2.6, res: 70 }); }
function stallPts() { return shape.fromDrawing((g) => { g.beginPath(); g.moveTo(-2.6, 2.6); g.lineTo(0, 3.4); g.lineTo(2.6, 2.6); g.closePath(); g.fill(); g.fillRect(-2.3, 0, 0.12, 2.7); g.fillRect(2.18, 0, 0.12, 2.7); g.fillRect(-1.9, 0.95, 3.8, 0.14); g.fillRect(-1.7, 0, 0.12, 0.95); g.fillRect(1.58, 0, 0.12, 0.95); g.beginPath(); g.ellipse(-0.5, 1.22, 0.9, 0.22, 0, 0, 6.28); g.fill(); g.fillRect(0.9, 1.05, 0.26, 0.85); g.fillRect(0.97, 1.9, 0.12, 0.3); }, { w: 5.6, h: 3.6, res: 50 }); }
function paintStall(P) {
  P.fill('#e9e2cf');
  P.layer((g) => { g.beginPath(); g.moveTo(-2.6, 2.6); g.lineTo(0, 3.4); g.lineTo(2.6, 2.6); g.closePath(); g.fill(); }, '#c9b27a', { depth: 0.4 });
  P.draw((g) => { g.strokeStyle = 'rgba(80,60,30,0.5)'; g.lineWidth = 0.03; for (let x = -2.4; x < 2.6; x += 0.25) { g.beginPath(); g.moveTo(x, 2.62); g.lineTo(x * 0.1, 3.35); g.stroke(); } });
  P.layer((g) => { g.fillRect(-2.3, 0, 0.12, 2.7); g.fillRect(2.18, 0, 0.12, 2.7); g.fillRect(-1.9, 0.95, 3.8, 0.14); g.fillRect(-1.7, 0, 0.12, 0.95); g.fillRect(1.58, 0, 0.12, 0.95); }, '#6b4a30', { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.ellipse(-0.5, 1.22, 0.9, 0.22, 0, 0, 6.28); g.fill(); }, '#f1ebdf', { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.ellipse(-0.5, 1.26, 0.7, 0.13, 0, 0, 6.28); g.fill(); }, '#b8521e', { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.ellipse(-0.5, 1.3, 0.5, 0.08, 0, 0, 6.28); g.fill(); }, '#e0a050', { depth: 0.2 });
  P.layer((g) => { g.fillRect(-0.9, 1.3, 0.1, 0.06); g.fillRect(-0.3, 1.32, 0.12, 0.05); g.fillRect(0.0, 1.28, 0.08, 0.05); }, '#4f9a3e', { depth: 0.2 });
  P.layer((g) => { g.fillRect(0.9, 1.05, 0.26, 0.85); g.fillRect(0.97, 1.9, 0.12, 0.3); }, '#2f6a3a', { depth: 0.3 });
  P.layer((g) => { g.fillRect(0.9, 1.3, 0.26, 0.3); }, '#e9d9a0', { depth: 0.2 });
  P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = VERM; g.font = '400 0.42px ZMX, KaiTi, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('啤 酒 鱼', 0, -2.85); g.restore(); });
}
function paddyPts(w, d) { return [[-w / 2, 0], [-w / 2, 0.35], [-w * 0.2, 0.45], [w * 0.15, 0.38], [w / 2, 0.42], [w / 2, 0]]; }

export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['karst', 'hero-karst', 'ridge', 'bd-yangshuo', 'gr-yangshuo', 'cut-yulongbridge', 'cut-beerfish', 'cut-raft', 'cut-cyclists']);
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 19, contact: '#3a4a3c' });
  const steps = [];
  const FAR = { act: 'poke', title: '十里画廊', line: '阳朔县城到月亮山的公路两旁峰林连绵，像一幅展开的长卷，叫“十里画廊”。' };
  const PEAK = { act: 'poke', title: '遇龙河峰丛', line: '遇龙河两岸的山拔地而起，一座一座像竹笋。河水浅而清，倒影比山还好看。' };
  // three misty ridges at the back, cooler and paler the farther they are
  const BD = cutCard(card, 'bd-yangshuo', 41, { ppu: 38 }); if (BD) steps.push(() => { add(BD, { x: 0, z: -12.4, size: 0.8 }).hot = FAR; });
  (BD ? [] : [[-10, -12.6, 22, 5.4, '#c9d6cf', 0.9], [10, -12.4, 22, 6.2, '#c3d1ca', 0.9], [-1, -11.2, 24, 4.2, '#b2c4b8', 0.6]]).forEach(([x, z, w, h, tint, far], i) => steps.push(() => {
    add(card(karstPts(r, { w, h, peaks: Array.from({ length: 6 }, (_, k) => [-w / 2 + w * (0.08 + k * 0.17) + (r() - 0.5), h * (0.55 + r() * 0.45), 1.4 + r() * 0.8]), rough: 0.6 }), (P) => paintKarst(P, { src: 'ridge', tint, far, foot: '#e6efe9', rim: '#ffffff', rimA: 0.35 }), { ppu: 30 }), { x, z, size: 0.75 }).hot = FAR; }));
  // the karst towers, a forest of bamboo shoots
  const towers = [[-17.8, -7.6, 5.0, 9.4], [-7.6, -9.0, 3.6, 7.0], [9.6, -9.4, 3.8, 6.6], [18.0, -6.8, 4.6, 9.0], [-17.4, 1.6, 3.6, 6.2], [17.6, 0.2, 3.8, 6.6]];
  for (const [x, z, w, h] of towers) steps.push(() => { add(card(karstPts(r, { w, h }), (P) => paintKarst(P, { src: 'karst', tint: '#bfd0bd', foot: '#e4efe6', rim: '#ffffff', rimA: 0.3, veg: '#4f7a4a' }), { ppu: 44, back: 'mirror' }), { x, z, size: 0.62, rest: (r() - 0.5) * 0.05 }).hot = PEAK; });
  // 月亮山: a tower with the round hole you can see the sky through — the door into the next picture
  steps.push(() => { const pts = karstPts(r, { w: 6.6, h: 8.4, peaks: [[0.4, 8.4, 2.6], [2.4, 6.2, 1.6], [-2.2, 5.4, 1.6]], rough: 0.8 });
    const p = add(card(pts, (P) => paintKarst(P, { src: 'hero-karst', tint: '#c7d4c2', foot: '#e4efe6', rimA: 0.35, veg: '#4f7a4a' }), { ppu: 46, back: 'mirror', holes: [ell(0.6, 5.6, 1.35, 1.15)] }), { x: 0.8, z: -9.8, size: 0.62 });
    p.hot = { dive: 'moonhill', act: 'poke', title: '月亮山', line: '山顶有一个天然穿洞，从不同角度看像满月、半月、弯月。点进去，走到山前。' }; });
  // the Yulong bridge across the river
  steps.push(() => { add(cutCard(card, 'cut-yulongbridge', 8.2, { back: 'mirror' }) || card(bridgePts(), paintBridge, { ppu: 60, back: 'mirror' }), { x: -9.8, z: rivZ(-9.8), yaw: -0.25, size: 0.5 }).hot = { act: 'poke', title: '遇龙桥', line: '遇龙桥是明代的单孔石拱桥，桥面长满青苔和小草，竹筏从桥洞下穿过。' }; });
  // farmhouses with white walls, bamboo groves, paddy banks
  for (const [x, z, w, h] of [[-4.2, -5.2, 3.6, 2.4], [8.8, -4.6, 4.0, 2.6], [12.6, -3.0, 3.2, 2.2]]) steps.push(() => { add(card(housePts({ w, h, roof: 1.1 }), (P) => paintHouse(P, { w, h, roof: 1.1, brick: '#a8a39a', plaster: '#f3efe4', lantern: r() < 0.5 }), { ppu: 56 }), { x, z, size: 0.55 }).hot = { act: 'light', title: '河边农家', line: '遇龙河边的村子大多是泥砖白墙的老房，门前是稻田，屋后是竹林。' }; });
  for (const [x, z, h] of [[-1.0, -6.0, 5.6], [6.6, -5.8, 5.0], [15.0, -3.6, 5.8], [-17.6, -2.6, 6.0], [-6.4, 4.8, 4.6]]) steps.push(() => { add(card(bambooPts(r, { h }), (P) => paintBamboo(P), { ppu: 46, back: 'mirror' }), { x, z, size: 0.5, sway: 1.4 }).hot = { act: 'leaves', color: '#7fae64', title: '凤尾竹', line: '河岸上一丛丛凤尾竹，竹梢弯下来，风一吹就扫着水面。' }; });
  for (const [x, z, w] of [[-14, -6.0, 6], [-8, -4.6, 5], [3.4, -2.2, 6], [11, 0.4, 6]]) steps.push(() => { add(card(paddyPts(w), (P) => { P.fill('#b8c86a'); P.marks('tick', { color: '#6f8a3a', alpha: 0.8, size: 0.06, angle: 0.1 }); }, { ppu: 60 }), { x, z, size: 0.4 }).hot = { act: 'leaves', color: '#c9c860', title: '稻田', line: '河谷里是一块块稻田，春天插秧时像镜子，秋天一片金黄。' }; });
  steps.push(() => { add(card(buffaloPts(), (P) => { P.fill('#4a4440'); P.layer((g) => { g.beginPath(); g.ellipse(0.1, 1.1, 0.8, 0.25, 0, 0, 6.28); g.fill(); }, '#5d5651', { depth: 0.3 }); }, { ppu: 70, back: 'mirror' }), { x: 6.6, z: -0.4, size: 0.35 }).hot = { act: 'poke', title: '水牛', line: '水牛在河边吃草，有时候干脆泡进河里，只露出一对弯角。' }; });
  steps.push(() => { add(cutCard(card, 'cut-cyclists', 3.6, { back: 'mirror' }) || card(cyclistPts(), (P) => { P.fill('#2a2622'); }, { ppu: 70, back: 'mirror' }), { x: 13.6, z: -1.8, size: 0.3 }).hot = { act: 'poke', title: '骑行十里画廊', line: '租一辆自行车沿河骑，从工农桥到遇龙桥，一路都是画。' }; });
  // food: a riverside stall cooking beer fish
  steps.push(() => { add(cutCard(card, 'cut-beerfish', 4.6, { back: 'mirror' }) || card(stallPts(), paintStall, { ppu: 60, back: 'mirror' }), { x: -12.6, z: 7.2, size: 0.4 }).hot = { act: 'light', food: true, title: '啤酒鱼', line: '阳朔名菜：漓江鲤鱼带鳞切块，用啤酒加番茄、青椒、辣椒焖烧，鱼鳞炸得酥脆，汤汁鲜甜。' }; });
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 2)); await yieldFn(); }
  // rafts drifting down the winding river
  const rafts = [];
  for (const [x0, c, s] of [[-4, 0, 1.0], [8, 1, 0.95], [-16, 0, 0.9], [16, 2, 0.95]]) { const p = add(cutCard(card, 'cut-raft', 5.2, { back: 'mirror' }) || card(raftPts({ cormorants: c, len: 4.2 }), (P) => paintRaft(P, { night: 0, cormorants: c, len: 4.2 }), { ppu: 64, back: 'mirror' }), { x: x0, z: rivZ(x0), size: 0.34 });
    rafts.push({ p, x0, s, ph: r() * 6 }); p.hot = { act: 'sail', title: '竹筏漂流', line: '遇龙河上的竹筏没有马达，筏工撑一根竹篙，顺水漂过一道道小水坝。' }; }
  const birds = flyers(group, { n: 5, color: '#f4f1ea', span: 1.2, rad: 12, h: 7.5, sp: 0.14, cz: -3 });
  const fog = mist(group, r, [[-8, 1.8, -10.5, 22], [9, 1.5, -10.8, 22], [0, 0.8, -7.2, 18]], '236,244,240', 0.45);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#dfeae2', key: '#fff3dc', keyI: 2.5, keyDir: [-0.6, 0.9, 0.5], fill: '#dff0ea', fillI: 0.9, sky: '#f2fbf6', ground: '#7f9a80', skyI: 0.6, leak: '#5a7a60', wrap: 0.34, exposure: 1.04, trans: 0.32, transTint: '#e8ffd0' },
    setReveal(v) { reveal = v; },
    update(t, dt) {
      updatePieces(t, dt); birds(t, reveal); fog(t, reveal);
      for (const b of rafts) { const g = b.p.h.group; b.extra = (b.extra || 0) + ((b.p.boostUntil || 0) > t ? dt * 1.6 : 0); const x = b.x0 + Math.sin(t * 0.04 + b.ph + b.extra * 0.3) * 3.0; g.position.set(x, 0.02 + Math.sin(t * 1.3 + b.ph) * 0.04, rivZ(x)); g.rotation.y = -Math.atan2(rivZ(x + 0.5) - rivZ(x - 0.5), 1) * 0.8; g.scale.setScalar(b.s); }
    },
  };
}

export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 31);
  const PG = paintGround(g, c, 'gr-yangshuo', { alpha: 1 }); g.fillStyle = PG ? 'rgba(236,240,222,0.22)' : 'rgba(190,214,170,0.45)'; g.fillRect(0, 0, c.width, c.height);
  // paddy terraces in the valley: soft strips of green and gold
  for (let i = 0; i < (PG ? 0 : 70); i++) { const x = -20 + Math.random() * 40, z = -9 + Math.random() * 20; if (Math.abs(z - rivZ(x)) < 2.2) continue; g.fillStyle = ['rgba(170,200,110,0.4)', 'rgba(205,205,120,0.35)', 'rgba(130,175,110,0.35)'][i % 3]; g.save(); g.translate(X(x), Z(z)); g.rotate((Math.random() - 0.5) * 0.4); g.fillRect(-2 * S, -0.6 * S, (2 + Math.random() * 3) * S, (0.8 + Math.random()) * S); g.restore(); }
  g.strokeStyle = 'rgba(110,130,80,0.3)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = -20 + Math.random() * 40, z = -9 + Math.random() * 20; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + 3), Z(z + (Math.random() - 0.5))); g.stroke(); }
  // the river: wide jade ribbon with pale shallows and little weirs
  const band = (w, col) => { g.strokeStyle = col; g.lineWidth = w * S; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let x = -21; x <= 21; x += 0.5) { const z = rivZ(x); x === -21 ? g.moveTo(X(x), Z(z)) : g.lineTo(X(x), Z(z)); } g.stroke(); };
  g.globalAlpha = PG ? 0.6 : 1; band(5.0, '#cfe1c8'); band(4.2, JADE); band(2.6, '#8fc0ae'); g.globalAlpha = 1; band(0.9, 'rgba(230,248,240,0.5)');
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.18 * S; for (const x of [-11, 1, 10]) { const z = rivZ(x); g.beginPath(); g.moveTo(X(x - 0.3), Z(z - 1.9)); g.lineTo(X(x + 0.3), Z(z + 1.9)); g.stroke(); }
  // reflections of the peaks
  g.fillStyle = 'rgba(60,100,80,0.22)'; for (const x of [-7.6, 4.6, 0.8]) { const z = rivZ(x); g.beginPath(); g.ellipse(X(x), Z(z), 1.4 * S, 0.7 * S, 0, 0, 6.28); g.fill(); }
  // the 十里画廊 road along the right page
  g.strokeStyle = 'rgba(200,190,160,0.9)'; g.lineWidth = 0.7 * S; g.beginPath(); g.moveTo(X(4), Z(-5)); g.bezierCurveTo(X(10), Z(-3.2), X(12), Z(-1.6), X(20.5), Z(-1.2)); g.stroke();
  titleSlip(g, X, Z, S, { title: '遇龙河', seal: '阳朔', x: -18.8, z: -1.6, poem: '山如碧玉簪　竹筏过龙桥', by: '— 阳朔 · 十里画廊' });
  return c;
}
export function waterMask() { return sheenFrom((g, X, Z, S) => { g.lineWidth = 3.8 * S; g.lineCap = 'round'; g.beginPath(); for (let x = -21; x <= 21; x += 0.5) { const z = rivZ(x); x === -21 ? g.moveTo(X(x), Z(z)) : g.lineTo(X(x), Z(z)); } g.stroke(); }); }
