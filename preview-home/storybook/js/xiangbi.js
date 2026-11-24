// 象鼻山 · 米粉店 — the city's emblem drinking from the Li at dusk, and the rice-noodle street on the near bank.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { loadArt } from './art.js';
import { karstPts, paintKarst, raftPts, paintRaft, housePts, paintHouse, banyanPts, paintBanyan, bowlPts, paintBowl, cutCard, paintGround } from './gk.js';

const RIVER = [3.8, 10.8];    // the Li in z, flowing across the spread; the Peach Blossom river joins from the back right
function elephantPts() {
  return shape.fromDrawing((g) => {
    g.beginPath(); g.ellipse(1.4, 2.5, 4.9, 3.05, 0, 0, 6.28); g.fill();            // back and haunch
    g.beginPath(); g.ellipse(-2.7, 3.55, 1.95, 1.6, 0.2, 0, 6.28); g.fill();          // head
    g.lineCap = 'round'; g.lineWidth = 1.05; g.beginPath(); g.moveTo(-3.7, 3.4); g.quadraticCurveTo(-4.9, 2.2, -4.5, 0.1); g.stroke();   // trunk into the water
    g.fillRect(-5.0, 0, 1.0, 0.4);
    // 普贤塔 on the back: base, bottle body, spire
    g.fillRect(1.05, 5.25, 0.9, 0.45); g.beginPath(); g.ellipse(1.5, 6.05, 0.42, 0.5, 0, 0, 6.28); g.fill(); g.fillRect(1.4, 6.4, 0.2, 0.9);
  }, { w: 13.2, h: 7.6, res: 48, name: 'elephant' });
}
function paintElephant(P) {
  const { box, r } = P;
  paintKarst(P, { src: 'hero-karst', tint: '#b9c4a8', foot: '#e7dcc6', rim: '#ffe2b0', rimA: 0.45, veg: '#4f6b3e' });
  // the moon-water cave: darker inner rock rim around the arch (between trunk and leg)
  P.layer((g) => { g.lineWidth = 0.35; g.strokeStyle = '#000'; g.beginPath(); g.ellipse(-2.6, 0, 1.55, 1.9, 0, Math.PI, 0, true); g.stroke(); }, '#3f4a3a', { depth: 0.5 });
  // the stupa: pale brick, dark spire
  P.layer((g) => { g.fillRect(1.05, 5.25, 0.9, 0.45); g.beginPath(); g.ellipse(1.5, 6.05, 0.42, 0.5, 0, 0, 6.28); g.fill(); }, '#e6dccb', { depth: 0.5 });
  P.layer((g) => { g.fillRect(1.4, 6.4, 0.2, 0.9); }, '#4a4038', { depth: 0.4 });
  // an eye, a crease on the trunk: just enough to read as an elephant without becoming a cartoon
  P.draw((g) => { g.strokeStyle = 'rgba(30,34,28,0.55)'; g.lineWidth = 0.06; g.lineCap = 'round'; g.beginPath(); g.arc(-2.9, 3.9, 0.22, 0.2, 2.6); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-4.4 + i * 0.05, 2.8 - i * 0.55); g.lineTo(-3.85 + i * 0.05, 2.75 - i * 0.55); g.stroke(); } });
}
function steamPts() { return shape.fromDrawing((g) => { g.lineCap = 'round'; g.lineWidth = 0.16; for (const x of [-0.35, 0.05, 0.4]) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 0.3, 0.4, x - 0.3, 0.8, x + 0.1, 1.3); g.stroke(); } }, { w: 1.6, h: 1.5, res: 60 }); }
function tablePts() { return shape.fromDrawing((g) => { g.fillRect(-1.6, 1.0, 3.2, 0.16); g.fillRect(-1.4, 0, 0.14, 1.0); g.fillRect(1.26, 0, 0.14, 1.0); g.fillRect(-2.4, 0, 0.12, 0.62); g.fillRect(-2.6, 0.56, 0.5, 0.1); g.fillRect(2.3, 0, 0.12, 0.62); g.fillRect(2.1, 0.56, 0.5, 0.1); }, { w: 5.6, h: 1.4, res: 60 }); }
function jarsPts() { return shape.fromDrawing((g) => { g.beginPath(); g.ellipse(-0.75, 0.55, 0.42, 0.55, 0, 0, 6.28); g.fill(); g.fillRect(-0.95, 0.9, 0.4, 0.35); g.beginPath(); g.ellipse(0.1, 0.42, 0.38, 0.42, 0, 0, 6.28); g.fill(); g.fillRect(-0.12, 0.75, 0.44, 0.22); g.fillRect(0.62, 0, 0.42, 1.25); g.fillRect(0.72, 1.25, 0.22, 0.4); }, { w: 2.4, h: 1.9, res: 70 }); }

export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['karst', 'hero-karst', 'ridge', 'bd-xiangbi', 'gr-xiangbi', 'cut-elephant', 'cut-mifenshop', 'cut-mifen-bowl', 'cut-raft', 'cut-banyan', 'cut-streethouses']);
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 57, contact: '#4a4232' });
  const steps = [];
  const FAR = { act: 'poke', title: '桂林城郊群峰', line: '桂林城就建在峰林之间，伏波山、叠彩山、穿山都在城里或城边，“山在城中，城在山中”。' };
  const TOWER = { act: 'poke', title: '城中孤峰', line: '桂林的山大多是拔地而起的孤峰，没有连绵的山脚，这是喀斯特峰林地貌的样子。' };
  steps.push(() => { const m = cutCard(card, 'bd-xiangbi', 41, { ppu: 38 }); if (m) add(m, { x: 0, z: -12.4, size: 0.8 }).hot = FAR; else add(card(karstPts(r, { w: 20, h: 5.2 }), (P) => paintKarst(P, { src: 'ridge', far: 1 }), { ppu: 34 }), { x: -9.5, z: -12.2, size: 0.7 }).hot = FAR; });

  for (const [x, z, h, w] of [[-17.6, -7.4, 7.8, 5.0], [17.6, -6.4, 6.4, 4.2]]) steps.push(() => { add(card(karstPts(r, { w, h }), (P) => paintKarst(P, { src: 'karst', tint: '#c9cfbd', foot: '#e8dcc4', rim: '#ffe0aa', rimA: 0.4, veg: '#5a7448' }), { ppu: 46 }), { x, z, size: 0.62, rest: (r() - 0.5) * 0.05 }).hot = TOWER; });
  // the elephant on the right page, trunk in the river
  steps.push(() => { const p = add(cutCard(card, 'cut-elephant', 15, { back: 'mirror' }) || card(elephantPts(), paintElephant, { ppu: 52, back: 'mirror' }), { x: 9.6, z: 4.9, size: 0.62 }); p.hot = { dive: 'shuiyue', act: 'poke', title: '象鼻山', line: '桃花江与漓江交汇处，一座山像低头饮水的大象，鼻子伸进江里，是桂林的城徽。象鼻与象腿之间的圆洞叫水月洞——点进去，划进洞里。' }; });
  // the rice-noodle street on the left page
  const street = [[-16.2, -3.2, 4.2, 2.7, false], [-11.4, -3.8, 4.6, 3.0, true], [-6.2, -3.0, 4.0, 2.6, false]];
  const ST = cutCard(card, 'cut-streethouses', 13.5, { back: 'mirror' }); if (ST) steps.push(() => { add(ST, { x: -12.6, z: -3.6, size: 0.55 }).hot = { act: 'light', title: '老街民居', line: '正阳街、东西巷一带还留着青砖木楼的老街，楼下开店，楼上住人，门口挂着红灯笼。' }; });
  if (!ST) for (const [x, z, w, h, up] of street) steps.push(() => { add(card(housePts({ w, h, upper: up }), (P) => paintHouse(P, { w, h, lantern: r() < 0.8, lit: 0.6, upper: up }), { ppu: 56 }), { x, z, size: 0.55, rest: (r() - 0.5) * 0.04 }).hot = { act: 'light', title: '老街民居', line: '正阳街、东西巷一带还留着青砖小瓦的老房子，楼下开铺，楼上住人。' }; });
  steps.push(() => { const p = add(cutCard(card, 'cut-mifenshop', 8.4, { back: 'mirror' }) || card(housePts({ w: 5.4, h: 3.1 }), (P) => paintHouse(P, { w: 5.4, h: 3.1, shop: '米粉', lit: 1, lantern: true }), { ppu: 60 }), { x: -9.6, z: 0.6, size: 0.58 }); p.hot = { dive: 'mifen', act: 'light', title: '米粉店', line: '桂林人的早餐多在街边米粉店：报上“二两，加锅烧”，自己去调料台加酸豆角和辣椒。点进去，坐下来吃一碗。' }; });
  // banyans along the bank
  for (const [x, z, w, h] of [[-17.6, 1.6, 5.4, 5.0], [-3.6, -1.0, 5.0, 4.6], [3.4, -4.4, 4.8, 4.4]]) steps.push(() => { add(cutCard(card, 'cut-banyan', w * 1.35, { back: 'mirror' }) || card(banyanPts(r, { w, h }), (P) => paintBanyan(P), { ppu: 44, back: 'mirror' }), { x, z, size: 0.5, sway: 1.2 }).hot = { act: 'leaves', color: '#5f7d4c', title: '江边古榕', line: '桂林城里多古榕，榕湖就因湖边一棵古榕得名，气根垂下来又扎进土里。' }; });
  // food: a table of rice noodles outside the shop, the three treasures in jars
  steps.push(() => { add(card(tablePts(), (P) => { P.fill('#6b4a30'); P.draw((g) => { g.strokeStyle = 'rgba(20,10,4,0.4)'; g.lineWidth = 0.02; for (let x = -1.6; x < 1.6; x += 0.2) { g.beginPath(); g.moveTo(x, 1.0); g.lineTo(x, 1.16); g.stroke(); } }); }, { ppu: 70 }), { x: -12.6, z: 2.5, size: 0.25 }).hot = { act: 'poke', title: '街边矮桌', line: '米粉店门口常摆几张矮桌矮凳，端着碗坐下就吃，一碗粉几分钟。' }; });
  steps.push(() => { add(cutCard(card, 'cut-mifen-bowl', 3.0, { back: 'mirror' }) || card(bowlPts({ w: 2.2 }), (P) => paintBowl(P, { w: 2.2 }), { ppu: 90, back: 'mirror' }), { x: -12.6, z: 3.9, size: 0.22, y: 0 }).hot = { act: 'poke', food: true, title: '桂林米粉', line: '圆米粉打底，浇一勺卤水，铺上锅烧、卤牛肉片，加酸豆角、炒黄豆和辣椒，先拌匀再吃。' }; });
  steps.push(() => { add(card(jarsPts(), (P) => { P.fill('#5a4636'); P.layer((g) => { g.beginPath(); g.ellipse(-0.75, 0.55, 0.36, 0.48, 0, 0, 6.28); g.fill(); }, '#7a2a1c', { depth: 0.3 }); P.layer((g) => { g.beginPath(); g.ellipse(0.1, 0.42, 0.32, 0.36, 0, 0, 6.28); g.fill(); }, '#c9a46a', { depth: 0.3 }); P.layer((g) => { g.fillRect(0.66, 0.1, 0.34, 1.1); }, '#d8d2c0', { depth: 0.3 }); P.layer((g) => { g.fillRect(0.68, 0.45, 0.3, 0.4); }, VERM, { depth: 0.2 }); }, { ppu: 90, back: 'mirror' }), { x: -7.6, z: 2.6, size: 0.2 }).hot = { act: 'poke', food: true, title: '桂林三宝', line: '三花酒、豆腐乳、辣椒酱，合称“桂林三宝”，是带回家的老三样。' }; });
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 3)); await yieldFn(); }
  // bamboo rafts with lanterns on the Li
  const rafts = [];
  for (const [x0, z, s, c] of [[-2.0, 6.2, 1.0, 2], [14.0, 8.6, 0.9, 1], [-14.0, 8.8, 0.85, 0]]) { const p = add(cutCard(card, 'cut-raft', 5.2, { back: 'mirror' }) || card(raftPts({ cormorants: c }), (P) => paintRaft(P, { night: 0, cormorants: c }), { ppu: 70, back: 'mirror' }), { x: x0, z, size: 0.34 }); rafts.push({ p, x0, z, s, ph: r() * 6 });
    p.hot = { act: 'sail', title: '鸬鹚竹筏', line: '漓江渔翁撑一张竹筏，带着鸬鹚下水捕鱼，筏头挂一盏灯。如今多是给游人看的老手艺。' }; }
  const birds = flyers(group, { n: 4, color: '#2a2622', span: 1.0, rad: 11, h: 8.5, sp: 0.16, cz: -2 });
  const fog = mist(group, r, [[-8, 1.6, -8.5, 20], [10, 1.4, -9.5, 20]], '244,230,206', 0.3);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#e8d6ba', key: '#ffd9a0', keyI: 2.6, keyDir: [0.75, 0.75, 0.45], fill: '#f0dfc6', fillI: 0.8, sky: '#fbe7c8', ground: '#a8956e', skyI: 0.55, leak: '#8a6a40', wrap: 0.32, exposure: 1.04, trans: 0.3, transTint: '#ffc880' },
    setReveal(v) { reveal = v; },
    update(t, dt) {
      updatePieces(t, dt); birds(t, reveal); fog(t, reveal);
      for (const b of rafts) { const g = b.p.h.group; b.extra = (b.extra || 0) + ((b.p.boostUntil || 0) > t ? dt * 1.6 : 0); g.position.set(b.x0 + Math.sin(t * 0.05 + b.ph + b.extra * 0.3) * 3.4 + Math.sin(b.extra * 0.4) * 1.4, 0.02 + Math.sin(t * 1.4 + b.ph) * 0.05, b.z); g.scale.setScalar(b.s); b.p.h.pivot.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.03; }
    },
  };
}

export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 23);
  // warm dusk paper, a cobbled street on the left page
  if (!paintGround(g, c, 'gr-xiangbi')) { g.fillStyle = 'rgba(232,206,160,0.35)'; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = 'rgba(243,232,210,0.28)'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(150,140,120,0.22)'; for (let z = -2.2; z < 2.4; z += 0.35) for (let x = -20; x < -1; x += 0.5) { g.beginPath(); g.ellipse(X(x + (Math.round(z / 0.35) % 2) * 0.25), Z(z), 0.2 * S, 0.12 * S, 0, 0, 6.28); g.fill(); }
  // the Li: jade water across the front, the Peach Blossom river joining from the back right
  const [z0, z1] = RIVER;
  g.fillStyle = 'rgba(110,160,145,0.62)'; g.beginPath(); g.moveTo(0, Z(z0 + 0.6)); for (let x = -20; x <= 20; x += 0.5) g.lineTo(X(x), Z(z0 + Math.sin(x * 0.16) * 0.5 - (x > 2 ? (x - 2) * 0.05 : 0))); g.lineTo(c.width, Z(z1)); for (let x = 20; x >= -20; x -= 0.5) g.lineTo(X(x), Z(z1 + Math.sin(x * 0.13 + 1) * 0.35)); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(X(12), Z(z0 + 0.5)); g.quadraticCurveTo(X(14), Z(-2), X(19.5), Z(-6.5)); g.lineTo(X(20), Z(-4.5)); g.quadraticCurveTo(X(16), Z(-0.5), X(15.5), Z(z0 + 0.5)); g.closePath(); g.fill();
  const gr = g.createLinearGradient(0, Z(z0), 0, Z(z1)); gr.addColorStop(0, 'rgba(255,214,150,0.35)'); gr.addColorStop(0.5, 'rgba(255,214,150,0.05)'); gr.addColorStop(1, 'rgba(40,70,60,0.25)'); g.fillStyle = gr; g.fillRect(0, Z(z0 - 1), c.width, (z1 - z0 + 2) * S);
  // reflection of the elephant and the full "water moon" (arch + its reflection)
  g.save(); g.globalAlpha = 0.22; g.fillStyle = '#2f4a38'; g.beginPath(); g.ellipse(X(9.6), Z(z0 + 2.4), 6.2 * S, 1.2 * S, 0, 0, 6.28); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 3; for (let i = 0; i < 110; i++) { const x = Math.random() * 40 - 20, z = z0 + 0.5 + Math.random() * (z1 - z0 - 1); g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + 0.4 + Math.random() * 0.8), Z(z)); g.stroke(); }
  // stone landing steps down to the water by the shop
  g.fillStyle = '#b4aa96'; for (let k = 0; k < 4; k++) g.fillRect(X(-5.2 + k * 0.1), Z(z0 - 0.9 + k * 0.32), 3.0 * S, 0.24 * S);
  titleSlip(g, X, Z, S, { title: '象山水月', seal: '桂林', x: -18.8, z: 3.9, poem: '象鼻饮漓江　米粉香满街', by: '— 象鼻山 · 正阳街' });
  return c;
}
export function waterMask() { return sheenFrom((g, X, Z, S) => { g.fillRect(0, Z(RIVER[0] + 0.5), X(20), (RIVER[1] - RIVER[0] - 0.8) * S); }); }
