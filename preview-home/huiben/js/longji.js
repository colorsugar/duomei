// 龙脊梯田 — terraces wrapping round the hill in rings of mirror water, a Zhuang stilt-house village, bamboo-tube rice over the fire.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { loadArt, IMGS } from './art.js';
import { karstPts, paintKarst, bambooPts, paintBamboo, cutCard, paintGround } from './gk.js';

const HILL = [1.0, -16.5];   // ground rings echo the hill        // the hill's crown, behind the page: terraces ring around it
const WOOD = '#6a4a30', WOOD2 = '#4a3222', ROOF = '#3c3a38';

// a terrace row: one long contour-cut strip whose top edge follows the hill, rising toward the crown
const tierTop = (k, seed) => (x) => { const H = 0.9 + k * 0.62, c = 1.5 + Math.sin(seed) * 2, s = 9 + k * 0.4;
  return H * (0.3 + 0.7 * Math.exp(-((x - c) ** 2) / (2 * s * s))) + Math.sin(x * 0.45 + seed) * 0.22 + Math.sin(x * 1.1 + seed * 2) * 0.08; };
function tierPts(w, top) { const pts = [[-w / 2, 0]]; for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.4) pts.push([x, Math.max(0.15, top(x))]); pts.push([w / 2, 0]); return pts; }
function paintTier(P, { top, w, water, rice, wall }) {
  const { box, r } = P;
  P.fill(wall);
  // the painted terraces as the strip's surface, a different band of the painting for each strip
  P.draw((g) => { const im = IMGS['gr-longji']; if (!im) return; g.save(); g.globalAlpha = 0.85; g.scale(1, -1); g.drawImage(im, 0, im.height * (0.1 + r() * 0.7), im.width, im.height * 0.14, -w / 2, -3.2, w, 3.2); g.restore(); });
  P.draw((g) => { g.fillStyle = 'rgba(40,50,20,0.16)'; for (let i = 0; i < 90; i++) { const x = box.x0 + r() * box.w; g.beginPath(); g.ellipse(x, r() * top(x) * 0.8, 0.3 + r() * 0.6, 0.07, 0, 0, 6.28); g.fill(); } });
  const band = (d0, d1) => (g) => { g.beginPath(); for (let x = -w / 2; x <= w / 2; x += 0.3) g.lineTo(x, top(x) - d0); for (let x = w / 2; x >= -w / 2; x -= 0.3) g.lineTo(x, top(x) - d1); g.closePath(); g.fill(); };
  P.layer(band(0.0, 0.5), water, { depth: 0.35 });
  P.layer(band(0.0, 0.1), rice, { depth: 0.2 });
  P.glow((g) => { g.globalAlpha = 0.16; g.fillStyle = '#ffffff'; band(0.2, 0.32)(g); });
  P.marks('tick', { color: '#4f6a2a', alpha: 0.45, size: 0.05, angle: 0.25 });
}
function stiltPts({ w = 4.4, h = 2.4 } = {}) { return shape.fromDrawing((g) => {
  for (let i = 0; i < 5; i++) g.fillRect(-w / 2 + 0.2 + i * (w - 0.5) / 4, 0, 0.18, 1.4);
  g.fillRect(-w / 2, 1.3, w, h); g.fillRect(-w / 2 - 0.4, 1.9, 0.5, 0.1);
  g.beginPath(); g.moveTo(-w / 2 - 0.9, 1.3 + h - 0.15); g.quadraticCurveTo(-w / 2 - 0.5, 1.3 + h + 0.1, -w * 0.3, 1.3 + h + 1.2); g.lineTo(w * 0.3, 1.3 + h + 1.2); g.quadraticCurveTo(w / 2 + 0.5, 1.3 + h + 0.1, w / 2 + 0.9, 1.3 + h - 0.15); g.closePath(); g.fill();
}, { w: w + 2, h: h + 3.0, res: 40 }); }
function paintStilt(P, { w = 4.4, h = 2.4, lit = 0.5 } = {}) {
  const { r } = P;
  P.fill(WOOD);
  P.draw((g) => { g.strokeStyle = 'rgba(30,18,8,0.45)'; g.lineWidth = 0.03; for (let x = -w / 2; x < w / 2; x += 0.22) { g.beginPath(); g.moveTo(x, 1.3); g.lineTo(x, 1.3 + h); g.stroke(); } });
  P.layer((g) => { g.fillRect(-w / 2, 1.3 + h * 0.48, w, 0.12); g.fillRect(-w / 2 - 0.4, 1.9, w * 0.55, 0.08); for (let i = 0; i < 9; i++) g.fillRect(-w / 2 - 0.35 + i * 0.27, 1.9, 0.05, 0.45); }, WOOD2, { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.moveTo(-w / 2 - 0.9, 1.3 + h - 0.15); g.quadraticCurveTo(-w / 2 - 0.5, 1.3 + h + 0.1, -w * 0.3, 1.3 + h + 1.2); g.lineTo(w * 0.3, 1.3 + h + 1.2); g.quadraticCurveTo(w / 2 + 0.5, 1.3 + h + 0.1, w / 2 + 0.9, 1.3 + h - 0.15); g.closePath(); g.fill(); }, ROOF, { depth: 0.5 });
  P.draw((g) => { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.03; for (let x = -w / 2 - 0.6; x < w / 2 + 0.6; x += 0.16) { g.beginPath(); g.moveTo(x, 1.3 + h); g.lineTo(x * 0.62, 1.3 + h + 1.15); g.stroke(); } });
  P.layer((g) => { g.fillRect(-w * 0.32, 1.3 + h * 0.62, 0.7, 0.55); g.fillRect(w * 0.1, 1.3 + h * 0.62, 0.7, 0.55); }, '#f2dca2', { depth: 0.4 });
  if (lit) P.glow((g) => { g.globalAlpha = lit; g.fillStyle = '#ffc070'; g.fillRect(-w * 0.32, 1.3 + h * 0.62, 0.7, 0.55); g.fillRect(w * 0.1, 1.3 + h * 0.62, 0.7, 0.55); });
  P.layer((g) => { for (let i = 0; i < 6; i++) g.fillRect(-w / 2 + 0.3 + i * 0.3, 1.3 + h * 0.15, 0.12, 0.5 + r() * 0.2); }, '#c8a040', { depth: 0.25 }); // corn hung to dry
}
function mtnPts(r, w, h) { return karstPts(r, { w, h, peaks: [[-w * 0.22, h * 0.8, w * 0.42], [w * 0.15, h, w * 0.5], [w * 0.4, h * 0.6, w * 0.3]], rough: 0.35 }); }
function firePts() { return shape.fromDrawing((g) => { g.beginPath(); g.moveTo(-1.2, 0); g.quadraticCurveTo(-0.6, 0.9, -0.2, 1.6); g.quadraticCurveTo(0, 0.9, 0.3, 1.9); g.quadraticCurveTo(0.5, 0.9, 1.2, 0); g.closePath(); g.fill(); for (const x of [-0.9, -0.3, 0.3, 0.9]) { g.save(); g.translate(x, 0.2); g.rotate((x > 0 ? -1 : 1) * 0.35); g.fillRect(-0.16, 0, 0.32, 2.6); g.restore(); } g.fillRect(-1.6, 0, 3.2, 0.3); }, { w: 3.6, h: 3.0, res: 60 }); }
function paintFire(P) {
  P.fill('#5a3a24');
  P.layer((g) => { for (const x of [-0.9, -0.3, 0.3, 0.9]) { g.save(); g.translate(x, 0.2); g.rotate((x > 0 ? -1 : 1) * 0.35); g.fillRect(-0.16, 0, 0.32, 2.6); g.restore(); } }, '#6f9a3e', { depth: 0.4 });
  P.layer((g) => { for (const x of [-0.9, -0.3, 0.3, 0.9]) { g.save(); g.translate(x, 0.2); g.rotate((x > 0 ? -1 : 1) * 0.35); for (let k = 0.5; k < 2.6; k += 0.65) g.fillRect(-0.17, k, 0.34, 0.05); g.restore(); } }, '#3f5a24', { depth: 0.2 });
  P.layer((g) => { g.beginPath(); g.moveTo(-1.0, 0.1); g.quadraticCurveTo(-0.5, 0.8, -0.2, 1.4); g.quadraticCurveTo(0, 0.8, 0.3, 1.6); g.quadraticCurveTo(0.5, 0.8, 1.0, 0.1); g.closePath(); g.fill(); }, '#e8702a', { depth: 0.3 });
  P.glow((g) => { g.globalAlpha = 0.9; g.fillStyle = '#ffb040'; g.beginPath(); g.ellipse(0, 0.5, 0.6, 0.5, 0, 0, 6.28); g.fill(); });
}
function personPts(kind) { return shape.fromDrawing((g) => {
  g.beginPath(); g.arc(0, 2.5, 0.3, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(-0.45, 2.1); g.lineTo(0.45, 2.1); g.lineTo(0.6, 0.5); g.lineTo(-0.6, 0.5); g.closePath(); g.fill(); g.fillRect(-0.35, 0, 0.25, 0.6); g.fillRect(0.1, 0, 0.25, 0.6);
  if (kind === 'yao') { g.beginPath(); g.moveTo(0.15, 2.5); g.quadraticCurveTo(0.9, 1.6, 0.55, 0.3); g.lineTo(0.42, 0.3); g.quadraticCurveTo(0.6, 1.6, 0.05, 2.3); g.closePath(); g.fill(); g.beginPath(); g.ellipse(0, 2.8, 0.45, 0.18, 0, 0, 6.28); g.fill(); }
  else { g.fillRect(-1.6, 2.0, 3.2, 0.08); for (const x of [-1.4, 1.4]) { g.fillRect(x - 0.02, 1.0, 0.04, 1.0); g.beginPath(); g.ellipse(x, 0.9, 0.45, 0.35, 0, 0, 6.28); g.fill(); } g.beginPath(); g.moveTo(-0.6, 2.75); g.lineTo(0, 3.05); g.lineTo(0.6, 2.75); g.closePath(); g.fill(); }
}, { w: 3.6, h: 3.2, res: 60 }); }
function paintPerson(kind) { return (P) => {
  P.fill(kind === 'yao' ? '#1f1a18' : '#2f4a5a');
  P.layer((g) => { g.beginPath(); g.moveTo(-0.45, 2.1); g.lineTo(0.45, 2.1); g.lineTo(0.6, 0.5); g.lineTo(-0.6, 0.5); g.closePath(); g.fill(); }, kind === 'yao' ? '#b3261e' : '#3e5a6a', { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.arc(0, 2.5, 0.28, 0, 6.28); g.fill(); }, '#c99670', { depth: 0.3 });
  if (kind === 'yao') P.layer((g) => { g.fillRect(-0.6, 1.0, 1.2, 0.18); g.fillRect(-0.6, 0.6, 1.2, 0.12); }, '#e0b040', { depth: 0.2 });
  else P.layer((g) => { for (const x of [-1.4, 1.4]) { g.beginPath(); g.ellipse(x, 0.9, 0.45, 0.35, 0, 0, 6.28); g.fill(); } }, '#a88a50', { depth: 0.3 });
}; }

export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['ridge', 'karst', 'bd-longji', 'gr-longji', 'cut-stilthouse', 'cut-zhutongfan', 'cut-yaowoman', 'cut-stilthouse2']);
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 13, contact: '#4a4a30' });
  const steps = [];
  // round green mountains behind, misty and layered
  const MT = { act: 'poke', title: '越城岭', line: '龙脊在越城岭山脉里，山高雾大，梯田从山脚一直修到山顶，最高处近千米。' };
  const BD = cutCard(card, 'bd-longji', 41, { ppu: 38 }); if (BD) steps.push(() => { add(BD, { x: 0, z: -12.6, size: 0.8 }).hot = MT; });
  (BD ? [] : [[-11, -12.8, 22, 7.6, '#a9b89a'], [11, -12.6, 22, 8.4, '#a3b394'], [0, -12.0, 26, 5.6, '#8fa482']]).forEach(([x, z, w, h, tint]) => steps.push(() => {
    add(card(mtnPts(r, w, h), (P) => paintKarst(P, { src: 'ridge', tint, far: 1, foot: '#eef0e2', rimA: 0.3 }), { ppu: 28 }), { x, z, size: 0.8 }).hot = { act: 'poke', title: '越城岭', line: '龙脊在越城岭山脉里，山高雾大，梯田从山脚一直修到山顶，最高处近千米。' }; }));
  // the terraces: rings around the hill, each ring a row of yawed strips, higher toward the crown
  const ROWS = 10, TIER = { act: 'leaves', color: '#a8c070', title: '龙脊梯田', line: '壮族、瑶族先民用几百年把整座山修成梯田。春天灌水如镜，夏天一片青绿，秋天金黄，冬天落雪像银链。' };
  for (let k = 0; k < ROWS; k++) steps.push(() => {
    const w = 38 - k * 1.2, top = tierTop(k, k * 1.7 + 0.4), water = ['#d4e4ea', '#dde9e4', '#cfe2dc'][k % 3], wall = ['#7f9a52', '#88a25a', '#76924c'][k % 3];
    add(card(tierPts(w, top), (P) => paintTier(P, { top, w, water, rice: '#9cc060', wall }), { ppu: 22 }), { x: 0, z: 7.6 - k * 1.75, size: 0.55 + k * 0.02 }).hot = TIER;
  });
  const yAt = (x, z) => { let best = null; for (let k = 0; k < ROWS; k++) { const zk = 7.6 - k * 1.75; if (zk > z && (best === null || zk < best[0])) best = [zk, k]; } return best ? Math.max(0, tierTop(best[1], best[1] * 1.7 + 0.4)(x) - 0.25) : 0; };
  // a Zhuang stilt-house village on the left slope, Yao women on the path
  const houses = [[-14.6, -4.0, 4.4, 2.4], [-9.6, -5.8, 4.0, 2.2], [-16.0, 1.2, 3.8, 2.2], [14.8, -2.4, 4.2, 2.4], [9.8, -7.6, 3.6, 2.0]];
  houses.forEach(([x, z, w, h], i) => steps.push(() => { const hero = i === 0 ? cutCard(card, 'cut-stilthouse', 7.2, { back: 'mirror' }) : cutCard(card, 'cut-stilthouse2', w * 1.25, { back: 'mirror' }); const p = add(hero || card(stiltPts({ w, h }), (P) => paintStilt(P, { w, h, lit: 0.5 }), { ppu: 46, back: 'mirror' }), { x, z: hero ? z + 0.6 : z, y: yAt(x, z), size: 0.55, rest: (r() - 0.5) * 0.04 });
    p.hot = i === 0 ? { dive: 'cabin', act: 'light', title: '壮家吊脚楼', line: '龙脊壮寨的木楼全是杉木榫卯，楼下养牲口、堆柴，楼上住人，屋檐下挂着晒干的玉米和辣椒。点进去，上楼坐坐。' } : { act: 'light', title: '木楼人家', line: '一座寨子几十户木楼挤在山腰上，晚饭时屋顶冒烟，窗里一盏盏亮起来。' }; }));
  for (const [x, z, h] of [[-18.6, -2.2, 6.2], [-12.0, 2.0, 5.0], [18.2, 0.2, 5.6], [17.0, 9.2, 4.4]]) steps.push(() => { add(card(bambooPts(r, { h }), (P) => paintBamboo(P), { ppu: 46, back: 'mirror' }), { x, z, y: yAt(x, z), size: 0.5, sway: 1.3 }).hot = { act: 'leaves', color: '#7fae64', title: '寨边竹林', line: '寨子边上种着竹子，竹子能盖房、做水管，也能装饭。' }; });
  steps.push(() => { add(cutCard(card, 'cut-yaowoman', 2.8, { back: 'mirror' }) || card(personPts('yao'), paintPerson('yao'), { ppu: 70, back: 'mirror' }), { x: -6.2, z: 3.4, y: yAt(-6.2, 3.4), size: 0.35 }).hot = { act: 'poke', title: '红瑶长发', line: '龙脊黄洛瑶寨的红瑶妇女一生只剪一次头发，长发盘在头上，放下来能拖到地，被叫作“长发村”。' }; });
  steps.push(() => { add(card(personPts('farmer'), paintPerson('farmer'), { ppu: 70, back: 'mirror' }), { x: 7.8, z: 1.6, y: yAt(7.8, 1.6), size: 0.35 }).hot = { act: 'poke', title: '挑担的农人', line: '梯田里机器开不上去，插秧、收稻、挑担都靠人力，一条田埂走一辈子。' }; });
  // food: bamboo-tube rice roasting at the fire
  steps.push(() => { add(cutCard(card, 'cut-zhutongfan', 4.8, { back: 'mirror' }) || card(firePts(), paintFire, { ppu: 60, back: 'mirror' }), { x: 13.2, z: 9.6, size: 0.4 }).hot = { act: 'light', food: true, title: '竹筒饭', line: '新砍的青竹筒装进糯米、腊肉，塞上芭蕉叶，放在火上烤到竹皮焦黑，劈开时满是竹香。' }; });
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 1)); if (i % 3 === 2) await yieldFn(); }
  const birds = flyers(group, { n: 4, color: '#2a2622', span: 0.9, rad: 10, h: 8.5, sp: 0.13, cz: -5 });
  const fog = mist(group, r, [[-8, 3.4, -9.5, 20], [8, 4.2, -10, 20], [0, 5.6, -11.5, 26]], '244,246,238', 0.5);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#e2e8da', key: '#fff2d6', keyI: 2.5, keyDir: [-0.5, 1.0, 0.45], fill: '#e4ecdc', fillI: 0.85, sky: '#f4f8ee', ground: '#8a9a5a', skyI: 0.55, leak: '#6a7a40', wrap: 0.34, exposure: 1.04, trans: 0.3, transTint: '#f0ffc8' },
    setReveal(v) { reveal = v; },
    update(t, dt) { updatePieces(t, dt); birds(t, reveal); fog(t, reveal); },
  };
}

export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 13);
  const PG = paintGround(g, c, 'gr-longji', { alpha: 1 }); g.fillStyle = PG ? 'rgba(240,238,220,0.18)' : 'rgba(200,210,160,0.45)'; g.fillRect(0, 0, c.width, c.height);
  // contour paddies continue on the paper as rings of pale water and green bunds
  for (let k = -6; k < 12; k++) { const rad = 23.5 + 1.0 + k * 1.0; g.strokeStyle = k % 2 ? 'rgba(206,224,228,0.7)' : 'rgba(150,170,90,0.45)'; g.lineWidth = (k % 2 ? 0.7 : 0.25) * S; g.beginPath(); g.arc(X(HILL[0]), Z(HILL[1]), rad * S, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
  // a stone path up to the village
  g.strokeStyle = 'rgba(190,180,150,0.9)'; g.lineWidth = 0.5 * S; g.setLineDash([0.3 * S, 0.15 * S]); g.beginPath(); g.moveTo(X(-6), Z(12)); g.bezierCurveTo(X(-9), Z(6), X(-12), Z(3), X(-15), Z(-3)); g.stroke(); g.setLineDash([]);
  titleSlip(g, X, Z, S, { title: '龙脊梯田', seal: '龙胜', x: -18.8, z: 2.6, poem: '田盘山脊　层层上云', by: '— 龙胜 · 龙脊' });
  return c;
}
export function waterMask() { return sheenFrom((g, X, Z, S) => { for (let k = -6; k < 12; k += 2) { g.lineWidth = 0.5 * S; g.beginPath(); g.arc(X(HILL[0]), Z(HILL[1]), (24.5 + k) * S, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); } }); }
