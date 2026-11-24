// 水月洞 — standing inside the arch of Elephant Trunk Hill: the moon in the water, the carved cliff, a raft sliding through.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { loadArt, IMGS } from './art.js';
import { karstPts, paintKarst, raftPts, paintRaft, cutCard, paintGround } from './gk.js';

const WATER = [-3.0, 11.5];
function archPts() { return shape.fromDrawing((g) => { g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, 9.5); g.bezierCurveTo(-8, 11.6, 6, 11.8, 14, 9.2); g.lineTo(14, 0); g.lineTo(7.6, 0); g.bezierCurveTo(7.4, 6.2, 3.8, 8.6, 0, 8.7); g.bezierCurveTo(-4.2, 8.6, -7.6, 6.0, -7.8, 0); g.closePath(); g.fill(); }, { w: 28.4, h: 12, res: 18, name: 'arch' }); }
function paintArch(P) {
  paintKarst(P, { src: 'hero-karst', tint: '#aab2c4', foot: '#6a7488', rim: '#dfe6ff', rimA: 0.4, veg: '#3a4a3e' });
  P.layer((g) => { g.beginPath(); g.moveTo(7.6, 0); g.bezierCurveTo(7.4, 6.2, 3.8, 8.6, 0, 8.7); g.bezierCurveTo(-4.2, 8.6, -7.6, 6.0, -7.8, 0); g.lineTo(-8.6, 0); g.bezierCurveTo(-8.4, 7.0, -4.4, 9.3, 0, 9.4); g.bezierCurveTo(4.4, 9.3, 8.4, 7.0, 8.4, 0); g.closePath(); g.fill(); }, '#3a4050', { depth: 0.6 });
  P.marks('hatch', { color: INK, alpha: 0.25, size: 0.05, angle: 1.2, width: 1.1 });
  // moss and hanging vines along the crown
  P.layer((g) => { for (let i = 0; i < 40; i++) { const x = -13 + i * 0.66; g.beginPath(); g.ellipse(x, 10 + Math.sin(i * 1.7) * 0.5, 0.5, 0.25, 0, 0, 6.28); g.fill(); } }, '#3f5a36', { depth: 0.35 });
  P.draw((g) => { g.strokeStyle = '#4f6a3e'; g.lineWidth = 0.05; for (let i = 0; i < 18; i++) { const x = -6 + i * 0.7; g.beginPath(); g.moveTo(x, 8.4 + Math.cos(i) * 0.3); g.lineTo(x + 0.1, 6.8 - (i % 4) * 0.5); g.stroke(); } });
  // carved inscriptions (摩崖石刻) — vermilion-filled characters on the left pier
  P.layer((g) => { g.fillRect(-12.8, 2.4, 3.0, 4.6); }, '#8a8070', { depth: 0.3 });
  P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = VERM; g.font = '400 0.62px ZMX, "Ma Shan Zheng", KaiTi, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cols = ['水月洞', '天心月', '印江波']; cols.forEach((t, i) => [...t].forEach((ch, k) => g.fillText(ch, -10.4 - i * 0.9, -(6.4 - k * 1.3)))); g.restore(); });
}
function moonPts() { return shape.radial ? shape.fromDrawing((g) => { g.beginPath(); g.arc(0, 1.4, 1.4, 0, 6.28); g.fill(); g.fillRect(-0.05, 0, 0.1, 0.2); }, { w: 3, h: 3, res: 60 }) : null; }
export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['karst', 'hero-karst', 'ridge', 'cut-shuiyue', 'gr-shuiyue', 'cut-raft']); const ARCH = IMGS['cut-shuiyue'];
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 97, contact: '#2a3430' });
  const steps = [];
  // distant karst seen through the arch
  (ARCH ? [[-14, -11.6, 6, 7, 0.7], [14, -11.4, 6, 6.5, 0.7]] : [[-6, -11.6, 6, 7, 0.7], [1.5, -12.0, 7, 9, 0.8], [8, -11.4, 6, 6.5, 0.7]]).forEach(([x, z, w, h, s], i) => steps.push(() => {
    add(card(karstPts(r, { w, h }), (P) => paintKarst(P, { far: 1, tint: '#9fb0a8', foot: '#dfe6e0' }), { ppu: 34 }), { x, z, size: s }).hot = { act: 'poke', title: '洞外远峰', line: '从洞里望出去，漓江对岸的峰丛被拱门框成了一幅画。' }; }));
  if (!ARCH) steps.push(() => { const p = add(card(moonPts(), (P) => { P.fill('#fbf0cf'); P.glow((g) => { g.globalAlpha = 0.9; g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(0, 1.4, 1.3, 0, 6.28); g.fill(); }); }, { ppu: 60 }), { x: 0.4, z: -9.4, size: 0.5, y: 4.6 }); p.hot = { act: 'light', title: '天上月', line: '月亮升到象鼻和象腿之间，洞里洞外各有一轮。' }; });
  steps.push(() => { add(ARCH ? cutCard(card, 'cut-shuiyue', 38, { back: 'mirror', ppu: 26 }) : (m => (m.scale.setScalar(0.82), m))(card(archPts(), paintArch, { ppu: 26, back: 'mirror' })), { x: 0, z: ARCH ? -6.2 : -7.0, size: 0.85 }).hot = { act: 'poke', title: '水月洞', line: '象鼻与象腿之间的圆洞，江水穿洞而过。月夜里洞影与水影合成一轮满月，叫“象山水月”。' }; });
  steps.push(() => { add(cutCard(card, 'cut-raft', 6.25, { back: 'mirror' }) || card(raftPts({ len: 5, cormorants: 2 }), (P) => paintRaft(P, { night: 1, len: 5, cormorants: 2 }), { ppu: 60, back: 'mirror' }), { x: -2.0, z: 2.0, size: 0.45 }).hot = { act: 'sail', title: '穿洞竹筏', line: '夜里渔人撑竹筏穿过水月洞，马灯照着鸬鹚。' }; });
  steps.push(() => { add(cutCard(card, 'cut-raft', 5.0, { back: 'mirror' }) || card(raftPts({ len: 4, cormorants: 1 }), (P) => paintRaft(P, { night: 1, len: 4, cormorants: 1 }), { ppu: 60, back: 'mirror' }), { x: 9.0, z: 6.8, size: 0.38 }).hot = { act: 'sail', title: '鸬鹚', line: '鸬鹚脖子上套着草环，捕到的鱼咽不下去，只能交给渔人。' }; });
  // rocks with carvings in the foreground
  [[-15.0, 5.6, '陆游诗札', '洞壁上留有唐宋以来的摩崖石刻，陆游、范成大都在桂林留过字。'], [15.2, 4.2, '江边礁石', '象鼻山脚的礁石被江水磨得圆滑，像是象的脚趾。']].forEach(([x, z, t, line]) => steps.push(() => {
    add(card(karstPts(r, { w: 4.2, h: 3.0 }), (P) => paintKarst(P, { tint: '#6f766a', rimA: 0.15 }), { ppu: 50, back: 'mirror' }), { x, z, size: 0.4 }).hot = { act: 'poke', title: t, line }; }));
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 1)); await yieldFn(); }
  const bats = flyers(group, { n: 3, color: '#1c1916', span: 0.7, rad: 6, h: 6, sp: 0.25, fork: true, cz: -6 });
  const fog = mist(group, r, [[-6, 1.6, -9, 16]], '210,220,230', 0.12);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#1d2730', key: '#d8e2ff', keyI: 2.2, keyDir: [0.35, 0.9, 0.6], fill: '#3a4a60', fillI: 0.7, sky: '#5a6c88', ground: '#10161c', skyI: 0.5, leak: '#ffcf80', wrap: 0.3, exposure: 1.0, trans: 0.35, transTint: '#ffd890' },
    setReveal(v) { reveal = v; },
    update(t, dt) { updatePieces(t, dt); bats && bats(t, reveal); fog(t, reveal); },
  };
}
export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 41);
  g.fillStyle = '#26323a'; g.fillRect(0, 0, c.width, c.height);
  const PG = paintGround(g, c, 'gr-shuiyue', { alpha: 1 });
  if (!PG) { const gr = g.createLinearGradient(0, Z(WATER[0]), 0, Z(WATER[1])); gr.addColorStop(0, '#3e5a64'); gr.addColorStop(1, '#1f3038'); g.fillStyle = gr; g.fillRect(0, Z(WATER[0]), c.width, (WATER[1] - WATER[0]) * S); }
  // the water moon: the arch's reflection completes the circle
  g.strokeStyle = 'rgba(240,230,200,0.55)'; g.lineWidth = 0.25 * S; g.beginPath(); g.ellipse(X(0), Z(-6.4), 6.3 * S, 3.0 * S, 0, 0, Math.PI); g.stroke();
  const mg = g.createRadialGradient(X(0.4), Z(1.2), 0, X(0.4), Z(1.2), 2.2 * S); mg.addColorStop(0, 'rgba(255,244,200,0.95)'); mg.addColorStop(0.5, 'rgba(255,240,190,0.4)'); mg.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = mg; g.beginPath(); g.ellipse(X(0.4), Z(1.2), 2.2 * S, 0.9 * S, 0, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(220,230,240,0.18)'; g.lineWidth = 2; for (let i = 0; i < 90; i++) { const x = -20 + Math.random() * 40, z = WATER[0] + Math.random() * (WATER[1] - WATER[0]); g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + 0.6 + Math.random()), Z(z)); g.stroke(); }
  titleSlip(g, X, Z, S, { title: '水月洞', seal: '象山', x: -18.8, z: 3.4, poem: '水底有明月　水上明月浮', by: '— 象山水月' });
  return c;
}
export function waterMask() { return sheenFrom((g, X, Z, S) => { g.fillRect(0, Z(WATER[0]), X(20), (WATER[1] - WATER[0]) * S); }); }
