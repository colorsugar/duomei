// 米粉店里 — inside a Guilin rice-noodle shop at dawn: the brine pot, the counter, the help-yourself seasoning bar.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { bowlPts, paintBowl, cutCard, paintGround } from './gk.js';
import { loadArt, IMGS } from './art.js';

const WOOD = '#7a5032', WOOD2 = '#5a3a24', WALL = '#e9dfcc', TILEW = '#f2efe6';
const R = (w, h) => [[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
function wallPts() { return shape.fromDrawing((g) => { g.fillRect(-9.5, 0, 19, 6.2); g.fillRect(-2.2, 6.2, 4.4, 0.9); }, { w: 19.4, h: 7.3, res: 30 }); }
function paintWall(P) {
  const { box, r } = P; P.fill(WALL);
  P.draw((g) => { g.fillStyle = 'rgba(120,90,50,0.08)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(box.x0 + r() * box.w, r() * 6, 0.6 + r(), 0.3 + r() * 0.5, 0, 0, 6.28); g.fill(); } });
  P.layer((g) => { g.fillRect(-9.5, 0, 19, 1.6); }, TILEW, { depth: 0.3 });
  P.draw((g) => { g.strokeStyle = 'rgba(80,90,90,0.35)'; g.lineWidth = 0.02; for (let x = -9.5; x < 9.5; x += 0.4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1.6); g.stroke(); } for (let y = 0.4; y < 1.6; y += 0.4) { g.beginPath(); g.moveTo(-9.5, y); g.lineTo(9.5, y); g.stroke(); } });
  // the menu boards: red lacquer with gold brush characters
  const items = ['素粉', '卤菜粉', '牛腩粉', '马肉粉', '原汤粉'];
  P.layer((g) => { items.forEach((_, i) => g.fillRect(-7.6 + i * 2.2, 3.0, 1.7, 2.6)); }, VERM, { depth: 0.6 });
  P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = '#f2d48a'; g.font = '400 0.5px ZMX, "Ma Shan Zheng", KaiTi, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    items.forEach((t, i) => [...t].forEach((ch, k) => g.fillText(ch, -7.6 + i * 2.2 + 0.85, -(5.25 - k * 0.62)))); g.restore(); });
  P.layer((g) => { g.fillRect(-2.0, 6.25, 4.0, 0.75); }, '#2e2420', { depth: 0.5 });
  P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = '#e9c87a'; g.font = '400 0.6px ZMX, "Ma Shan Zheng", KaiTi, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('老 字 号 米 粉', 0, -6.63); g.restore(); });
  // window with morning light
  P.layer((g) => { g.fillRect(4.6, 2.8, 3.6, 2.6); }, '#f7e6c2', { depth: 0.6 });
  P.glow((g) => { g.globalAlpha = 0.5; g.fillStyle = '#ffe2a6'; g.fillRect(4.7, 2.9, 3.4, 2.4); });
  P.draw((g) => { g.strokeStyle = WOOD2; g.lineWidth = 0.08; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(4.6 + k * 0.9, 2.8); g.lineTo(4.6 + k * 0.9, 5.4); g.stroke(); } g.beginPath(); g.moveTo(4.6, 4.1); g.lineTo(8.2, 4.1); g.stroke(); });
}
function stovePts() { return shape.fromDrawing((g) => { g.fillRect(-3.2, 0, 6.4, 1.9); g.beginPath(); g.ellipse(-1.5, 2.3, 1.15, 0.55, 0, 0, 6.28); g.fill(); g.fillRect(-2.6, 1.8, 2.2, 0.6); g.beginPath(); g.ellipse(1.6, 2.15, 0.95, 0.42, 0, 0, 6.28); g.fill(); g.fillRect(0.7, 1.8, 1.8, 0.4); g.fillRect(-1.6, 2.6, 0.12, 1.2); }, { w: 6.8, h: 4.0, res: 50 }); }
function paintStove(P) {
  P.fill('#bfb3a0'); P.draw((g) => { g.strokeStyle = 'rgba(60,50,40,0.3)'; g.lineWidth = 0.02; for (let y = 0.3; y < 1.9; y += 0.3) { g.beginPath(); g.moveTo(-3.2, y); g.lineTo(3.2, y); g.stroke(); } });
  P.layer((g) => { g.beginPath(); g.ellipse(-1.5, 2.3, 1.15, 0.55, 0, 0, 6.28); g.fill(); g.fillRect(-2.6, 1.8, 2.2, 0.6); }, '#2b2724', { depth: 0.6 });
  P.layer((g) => { g.beginPath(); g.ellipse(-1.5, 2.4, 0.95, 0.32, 0, 0, 6.28); g.fill(); }, '#6a3416', { depth: 0.4 });
  P.layer((g) => { g.beginPath(); g.ellipse(1.6, 2.15, 0.95, 0.42, 0, 0, 6.28); g.fill(); g.fillRect(0.7, 1.8, 1.8, 0.4); }, '#4a4a48', { depth: 0.6 });
  P.layer((g) => { g.fillRect(-1.6, 2.6, 0.12, 1.2); }, WOOD, { depth: 0.3 });
  P.glow((g) => { g.globalAlpha = 0.8; g.fillStyle = '#ff9a3c'; g.fillRect(-2.6, 0.3, 1.0, 0.5); g.fillRect(0.9, 0.3, 1.0, 0.5); });
}
function counterPts() { return shape.fromDrawing((g) => { g.fillRect(-5, 0, 10, 2.1); g.fillRect(-5.2, 2.1, 10.4, 0.18); for (let i = 0; i < 4; i++) { g.fillRect(-4.4 + i * 0.9, 2.28, 0.75, 0.16 + i * 0.12); } }, { w: 10.6, h: 3.0, res: 40 }); }
function paintCounter(P) { P.fill(WOOD); P.draw((g) => { g.strokeStyle = 'rgba(30,16,6,0.35)'; g.lineWidth = 0.03; for (let x = -5; x < 5; x += 0.5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 2.1); g.stroke(); } }); P.layer((g) => { g.fillRect(-5.2, 2.1, 10.4, 0.18); }, WOOD2, { depth: 0.4 }); P.layer((g) => { for (let i = 0; i < 4; i++) g.fillRect(-4.4 + i * 0.9, 2.28, 0.75, 0.16 + i * 0.12); }, '#f1ebdf', { depth: 0.3 }); }
function condPts() { return shape.fromDrawing((g) => { g.fillRect(-3, 0, 6, 1.0); for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-2.4 + i * 1.2, 1.15, 0.48, 0.3, 0, 0, 6.28); g.fill(); } }, { w: 6.4, h: 1.6, res: 60 }); }
const COND = [['#6f8f3a', '酸豆角'], ['#c8321c', '辣椒'], ['#3f8a3a', '葱花'], ['#c99a4a', '炒黄豆'], ['#d8b86a', '酸笋']];
function paintCond(P) { P.fill('#d9cfbd'); COND.forEach(([c], i) => { P.layer((g) => { g.beginPath(); g.ellipse(-2.4 + i * 1.2, 1.15, 0.48, 0.3, 0, 0, 6.28); g.fill(); }, '#f1ebdf', { depth: 0.3 }); P.layer((g) => { g.beginPath(); g.ellipse(-2.4 + i * 1.2, 1.22, 0.36, 0.16, 0, 0, 6.28); g.fill(); }, c, { depth: 0.2 }); }); }
function cookPts() { return shape.fromDrawing((g) => { g.beginPath(); g.arc(0, 4.3, 0.42, 0, 6.28); g.fill(); g.fillRect(-0.7, 2.2, 1.4, 1.8); g.fillRect(-0.55, 0, 0.45, 2.3); g.fillRect(0.1, 0, 0.45, 2.3); g.save(); g.translate(0.6, 3.6); g.rotate(-1.0); g.fillRect(0, -0.13, 1.3, 0.26); g.restore(); g.fillRect(-0.5, 4.6, 1.0, 0.35); }, { w: 3.2, h: 5.1, res: 50 }); }
function paintCook(P) { P.fill('#f1ece2'); P.layer((g) => { g.beginPath(); g.arc(0, 4.3, 0.42, 0, 6.28); g.fill(); }, '#d6a27a', { depth: 0.4 }); P.layer((g) => { g.fillRect(-0.55, 0, 0.45, 2.3); g.fillRect(0.1, 0, 0.45, 2.3); }, '#2f3a4a', { depth: 0.4 }); P.layer((g) => { g.fillRect(-0.6, 2.2, 1.2, 0.9); }, '#2f5e7a', { depth: 0.3 }); }
function stoolPts() { return shape.fromDrawing((g) => { g.fillRect(-0.6, 0.8, 1.2, 0.14); g.fillRect(-0.5, 0, 0.12, 0.8); g.fillRect(0.38, 0, 0.12, 0.8); }, { w: 1.4, h: 1.0, res: 70 }); }
function tablePts() { return shape.fromDrawing((g) => { g.fillRect(-2, 1.2, 4, 0.16); g.fillRect(-1.8, 0, 0.16, 1.2); g.fillRect(1.64, 0, 0.16, 1.2); }, { w: 4.2, h: 1.5, res: 60 }); }

function dinerPts() { return shape.fromDrawing((g) => { g.beginPath(); g.arc(0.3, 3.0, 0.4, 0, 6.28); g.fill(); g.save(); g.translate(0, 1.6); g.rotate(0.25); g.fillRect(-0.55, 0, 1.1, 1.3); g.restore(); g.fillRect(-0.6, 1.3, 1.5, 0.4); g.fillRect(0.6, 0, 0.35, 1.5); g.fillRect(-0.9, 0.9, 0.6, 0.12); g.fillRect(-0.85, 0, 0.1, 0.9); g.fillRect(-0.45, 0, 0.1, 0.9); }, { w: 2.2, h: 3.6, res: 60 }); }
function paintDiner(P) { P.fill('#3d5a72'); P.layer((g) => { g.beginPath(); g.arc(0.3, 3.0, 0.4, 0, 6.28); g.fill(); }, '#c99670', { depth: 0.4 }); P.layer((g) => { g.fillRect(-0.6, 1.3, 1.5, 0.4); g.fillRect(0.6, 0, 0.35, 1.5); }, '#2a2a30', { depth: 0.3 }); P.layer((g) => { g.fillRect(-0.9, 0.9, 0.6, 0.12); g.fillRect(-0.85, 0, 0.1, 0.9); g.fillRect(-0.45, 0, 0.1, 0.9); }, VERM, { depth: 0.3 }); }
function lampPts() { return shape.fromDrawing((g) => { g.beginPath(); g.ellipse(0, 0.9, 0.55, 0.7, 0, 0, 6.28); g.fill(); g.fillRect(-0.3, 1.5, 0.6, 0.18); g.fillRect(-0.3, 0.1, 0.6, 0.15); g.fillRect(-0.04, 1.6, 0.08, 0.6); g.fillRect(-0.05, -0.5, 0.1, 0.6); }, { w: 1.4, h: 2.8, res: 70 }); }
function paintLamp(P) { P.fill(VERM); P.layer((g) => { g.fillRect(-0.3, 1.5, 0.6, 0.18); g.fillRect(-0.3, 0.1, 0.6, 0.15); }, '#2a1d12', { depth: 0.3 }); P.glow((g) => { g.globalAlpha = 0.7; g.fillStyle = '#ffb060'; g.beginPath(); g.ellipse(0, 0.9, 0.4, 0.5, 0, 0, 6.28); g.fill(); }); P.draw((g) => { g.save(); g.scale(1, -1); g.fillStyle = '#f2d48a'; g.font = '400 0.5px ZMX, KaiTi, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('粉', 0, -0.9); g.restore(); }); }
export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['cut-shop-wall', 'cut-mifen-bowl', 'cut-mifen-stove', 'cut-mifen-condiments', 'gr-mifen', 'cut-cook', 'cut-diners', 'cut-stools', 'cut-sidebowls']); const DINERS = !!IMGS['cut-diners'];
  const group = new THREE.Group();
  const K = (m, k) => { m.scale.setScalar(k); return m; };
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 71, contact: '#5a4030' });
  const steps = [
    () => { const W = cutCard(card, 'cut-shop-wall', 36, { ppu: 26 }); add(W || K(card(wallPts(), paintWall, { ppu: 30 }), 1.8), { x: 0, z: -11.4, size: 0.75 }).hot = { act: 'poke', title: '价目牌', line: '红底金字的价目牌：素粉、卤菜粉、牛腩粉、马肉米粉……桂林人按“两”点，二两、三两。' }; },
    () => { add(cutCard(card, 'cut-mifen-stove', 9.2, { back: 'mirror' }) || K(card(stovePts(), paintStove, { ppu: 34 }), 2.1), { x: -14.8, z: -4.6, size: 0.6 }).hot = { act: 'light', food: true, title: '卤水', line: '米粉的魂是卤水：猪骨、牛骨加罗汉果、草果、八角等香料慢熬，每家的方子都不外传。' }; },
    () => { add(cutCard(card, 'cut-cook', 6.2, { back: 'mirror' }) || K(card(cookPts(), paintCook, { ppu: 36 }), 2.0), { x: -5.4, z: -5.2, size: 0.5 }).hot = { act: 'poke', title: '烫粉师傅', line: '米粉在竹篓里烫几秒就捞起，倒进碗里，浇卤、加料，一碗不到半分钟。' }; },
    () => { add(K(card(counterPts(), paintCounter, { ppu: 32 }), 1.9), { x: -7.6, z: -1.6, size: 0.55 }).hot = { act: 'poke', title: '出粉台', line: '先在台前点粉付钱，师傅叫号，自己端走——这是桂林米粉店的老规矩。' }; },
    () => { add(cutCard(card, 'cut-mifen-condiments', 10.6, { back: 'mirror' }) || K(card(condPts(), paintCond, { ppu: 40 }), 2.2), { x: 10.0, z: -5.0, size: 0.4 }).hot = { act: 'poke', food: true, title: '调料台', line: '酸豆角、辣椒、葱花、炒黄豆、酸笋随便加，这是桂林米粉店最让外地人惊喜的地方。' }; },
    () => { add(K(card(tablePts(), (P) => { P.fill(WOOD); }, { ppu: 34 }), 2.4), { x: 7.0, z: 3.2, size: 0.4 }).hot = { act: 'poke', title: '方桌', line: '老店的木方桌擦得发亮，大家拼桌吃，谁也不等谁。' }; },
  ];
  for (const [x, z] of [[2.6, 5.6], [11.4, 5.6], [7.0, 7.4], [-14.0, 5.6], [-9.0, 6.6], [-11.5, 7.8]].slice(0, IMGS['cut-stools'] ? 0 : DINERS ? 3 : 6)) steps.push(() => { add(K(card(stoolPts(), (P) => { P.fill(VERM); }, { ppu: 40 }), 2.4), { x, z, size: 0.25 }).hot = { act: 'poke', title: '红塑料凳', line: '矮矮的红凳子，几乎是每家米粉店的标配。' }; });
  if (!DINERS) steps.push(() => { add(K(card(tablePts(), (P) => { P.fill(WOOD); }, { ppu: 34 }), 2.4), { x: -11.5, z: 6.0, size: 0.4 }).hot = { act: 'poke', title: '拼桌', line: '人多就拼桌，旁边的阿叔埋头吃粉，一句话也不说。' }; });
  steps.push(() => { add(DINERS ? cutCard(card, 'cut-diners', 10, { back: 'mirror' }) : K(card(dinerPts(), paintDiner, { ppu: 40 }), 2.0), { x: DINERS ? -11.8 : -13.2, z: 6.6, size: 0.4 }).hot = { act: 'poke', title: '吃早粉的阿叔', line: '桂林人的一天从一碗米粉开始，吃完抹嘴就去上班。' }; });
  for (const [x, z] of [[-3, -8.6], [5, -8.6]]) steps.push(() => { add(K(card(lampPts(), paintLamp, { ppu: 50 }), 1.6), { x, z, size: 0.3, y: 7.2, sway: 0.03 }).hot = { act: 'light', title: '红灯笼', line: '门口两盏红灯笼，天没亮就点上，告诉街坊：开门了。' }; });
  // the bowls: the one on the table is the door into the closest picture
  steps.push(() => { add(cutCard(card, 'cut-mifen-bowl', 4.6, { back: 'mirror' }) || K(card(bowlPts({ w: 2.4 }), (P) => paintBowl(P, { w: 2.4 }), { ppu: 70, back: 'mirror' }), 1.8), { x: 5.2, z: 3.5, size: 0.3, y: 3.25 }).hot = { dive: 'bowl', act: 'poke', food: true, title: '一碗卤菜粉', line: '二两卤菜粉，锅烧铺面，卤水刚好没过粉。点进去，看看这一碗里有什么。' }; });
  for (const [x, z, w] of [[1.8, 7.2, 6.4], [11.8, 6.6, 5.6]]) steps.push(() => { const m = cutCard(card, 'cut-stools', w, { back: 'mirror' }); if (m) add(m, { x, z, size: 0.3 }).hot = { act: 'poke', title: '红塑料凳', line: '矮矮的红凳子配一张小方桌，几乎是每家米粉店的标配。' }; });
  steps.push(() => { add(cutCard(card, 'cut-sidebowls', 3.8, { back: 'mirror' }) || K(card(bowlPts({ w: 2.0 }), (P) => paintBowl(P, { w: 2.0, soup: '#a05a28', top: [['#f4eedf', 12], ['#6a2a16', 8], ['#d8452e', 4]] }), { ppu: 70, back: 'mirror' }), 1.8), { x: IMGS['cut-sidebowls'] ? 9.8 : 8.6, z: 3.5, size: 0.26, y: 3.25 }).hot = { act: 'poke', food: true, title: '马肉米粉', line: '马肉米粉用小碗装，一碗只有一两口，讲究的人一口气连吃十几碗。' }; });
  steps.push(() => { add(cutCard(card, 'cut-mifen-bowl', 2.4, { back: 'mirror' }) || K(card(bowlPts({ w: 1.8 }), (P) => paintBowl(P, { w: 1.8, soup: '#d9b27a', top: [['#f4eedf', 10], ['#c88a4a', 6], ['#5f8a3a', 4]] }), { ppu: 70, back: 'mirror' }), 1.7), { x: -3.0, z: -1.2, size: 0.24, y: 4.35 }).hot = { act: 'poke', food: true, title: '锅烧', line: '锅烧是带皮五花肉先煮后炸，切薄片，皮酥脆、肉有嚼劲，是卤菜粉里最抢手的料。' }; });
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 1)); await yieldFn(); }
  const fog = mist(group, r, [[-10, 3.4, -6.5, 8], [-9, 4.2, -7, 7]], '255,250,240', 0.4);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#ead9bd', key: '#ffe1b0', keyI: 2.4, keyDir: [0.7, 0.9, 0.5], fill: '#f3e4cc', fillI: 0.9, sky: '#fff0d6', ground: '#9a7a52', skyI: 0.6, leak: '#7a5a3a', wrap: 0.34, exposure: 1.04, trans: 0.3, transTint: '#ffcf8a' },
    setReveal(v) { reveal = v; },
    update(t, dt) { updatePieces(t, dt); fog(t, reveal); },
  };
}
export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 29);
  // terrazzo floor of an old shop
  g.fillStyle = '#d9cdb8'; g.fillRect(0, 0, c.width, c.height);
  if (paintGround(g, c, 'gr-mifen', { alpha: 1 })) g.globalAlpha = 0.2;
  for (let i = 0; i < 2600; i++) { g.fillStyle = ['rgba(90,80,70,0.25)', 'rgba(160,60,40,0.18)', 'rgba(250,250,240,0.5)'][i % 3]; g.beginPath(); g.arc(Math.random() * c.width, Math.random() * c.height, 2 + Math.random() * 5, 0, 6.28); g.fill(); }
  g.strokeStyle = 'rgba(80,70,60,0.2)'; g.lineWidth = 3; for (let x = -20; x <= 20; x += 4) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), c.height); g.stroke(); } for (let z = -13; z <= 13; z += 4) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(c.width, Z(z)); g.stroke(); }
  // a pool of morning light from the window
  const gr = g.createRadialGradient(X(8), Z(0), 10, X(8), Z(0), 9 * S); gr.addColorStop(0, 'rgba(255,230,170,0.5)'); gr.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
  titleSlip(g, X, Z, S, { title: '米粉店里', seal: '早粉', x: -18.8, z: 3.6, poem: '二两卤菜粉　加锅烧', by: '— 正阳街 · 清早' });
  return c;
}
export function waterMask() { return sheenFrom(() => {}); }
