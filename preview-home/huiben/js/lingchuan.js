// 灵川 · 海洋乡 — late autumn: old ginkgo trees gone gold among grey-tiled village houses, leaves carpeting the lanes, camellia-oil tea on the stove.
import { THREE, INK, PAPER, VERM, rig, flyers, mist, groundBase, titleSlip, sheenFrom } from './kit.js';
import { shape } from '../lib/paperkit-2d.js';
import { loadArt } from './art.js';
import { karstPts, paintKarst, housePts, paintHouse, ginkgoPts, paintGinkgo, bowlPts, paintBowl, cutCard, paintGround } from './gk.js';

function wallPts(w, h) { return shape.fromDrawing((g) => { g.fillRect(-w / 2, 0, w, h); g.fillRect(-w / 2 - 0.1, h, w + 0.2, 0.22); for (let x = -w / 2; x < w / 2; x += 0.5) g.fillRect(x, h + 0.2, 0.32, 0.18); }, { w: w + 0.4, h: h + 0.6, res: 40 }); }
function paintWall(P) { P.fill('#9a948a'); P.marks('brick', { color: '#6f6a62', alpha: 0.45, size: 0.18 }); P.layer((g) => { g.fillRect(-20, 0, 40, 0.3); }, '#7a756c', { depth: 0.2 }); }
function teaPts() { return shape.fromDrawing((g) => { g.fillRect(-2.2, 0, 4.4, 1.3); g.beginPath(); g.ellipse(-0.6, 1.45, 1.2, 0.32, 0, 0, 6.28); g.fill(); g.save(); g.translate(-0.2, 1.4); g.rotate(-0.6); g.fillRect(-0.08, 0, 0.16, 1.9); g.beginPath(); g.ellipse(0, 1.9, 0.26, 0.38, 0, 0, 6.28); g.fill(); g.restore(); g.fillRect(1.0, 1.3, 0.9, 0.18); g.beginPath(); g.ellipse(1.45, 1.6, 0.5, 0.22, 0, 0, 6.28); g.fill(); g.fillRect(1.2, 1.3, 0.5, 0.3); }, { w: 4.8, h: 3.6, res: 50 }); }
function paintTea(P) {
  P.fill('#8a7a68'); P.marks('brick', { color: '#5a4e40', alpha: 0.4, size: 0.16 });
  P.glow((g) => { g.globalAlpha = 0.9; g.fillStyle = '#ff8a30'; g.fillRect(-1.6, 0.2, 1.4, 0.5); });
  P.layer((g) => { g.beginPath(); g.ellipse(-0.6, 1.45, 1.2, 0.32, 0, 0, 6.28); g.fill(); }, '#2b2724', { depth: 0.5 });
  P.layer((g) => { g.beginPath(); g.ellipse(-0.6, 1.5, 0.95, 0.18, 0, 0, 6.28); g.fill(); }, '#7a6a2a', { depth: 0.3 });
  P.layer((g) => { g.save(); g.translate(-0.2, 1.4); g.rotate(-0.6); g.fillRect(-0.08, 0, 0.16, 1.9); g.beginPath(); g.ellipse(0, 1.9, 0.26, 0.38, 0, 0, 6.28); g.fill(); g.restore(); }, '#7a5032', { depth: 0.4 });
  P.layer((g) => { g.fillRect(1.0, 1.3, 0.9, 0.18); g.beginPath(); g.ellipse(1.45, 1.6, 0.5, 0.22, 0, 0, 6.28); g.fill(); g.fillRect(1.2, 1.3, 0.5, 0.3); }, '#f1ebdf', { depth: 0.3 });
  P.layer((g) => { g.beginPath(); g.ellipse(1.45, 1.66, 0.38, 0.1, 0, 0, 6.28); g.fill(); }, '#8a7a3a', { depth: 0.2 });
  P.layer((g) => { for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(1.2 + i * 0.07, 1.72 + (i % 2) * 0.03, 0.04, 0, 6.28); g.fill(); } }, '#f4e0a0', { depth: 0.2 });
}
function kidsPts() { return shape.fromDrawing((g) => { for (const [x, s, arm] of [[-0.8, 1, 1], [0.8, 0.85, -1]]) { g.beginPath(); g.arc(x, 1.75 * s, 0.26 * s, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(x - 0.35 * s, 1.45 * s); g.lineTo(x + 0.35 * s, 1.45 * s); g.lineTo(x + 0.45 * s, 0.5 * s); g.lineTo(x - 0.45 * s, 0.5 * s); g.closePath(); g.fill(); g.fillRect(x - 0.28 * s, 0, 0.2 * s, 0.55 * s); g.fillRect(x + 0.08 * s, 0, 0.2 * s, 0.55 * s); g.save(); g.translate(x, 1.35 * s); g.rotate(arm * 2.4); g.fillRect(0, -0.06, 0.8 * s, 0.13); g.restore(); } for (let i = 0; i < 9; i++) { const a = i * 0.7; g.beginPath(); g.moveTo(Math.cos(a) * 0.5, 2.6 + Math.sin(a) * 0.4); g.arc(Math.cos(a) * 0.5, 2.6 + Math.sin(a) * 0.4, 0.15, a, a + 1.6); g.closePath(); g.fill(); } }, { w: 3.0, h: 3.2, res: 60 }); }
function paintKids(P) { P.fill('#c99a2a'); P.layer((g) => { for (const [x, s] of [[-0.8, 1], [0.8, 0.85]]) { g.beginPath(); g.moveTo(x - 0.35 * s, 1.45 * s); g.lineTo(x + 0.35 * s, 1.45 * s); g.lineTo(x + 0.45 * s, 0.5 * s); g.lineTo(x - 0.45 * s, 0.5 * s); g.closePath(); g.fill(); } }, VERM, { depth: 0.3 }); P.layer((g) => { g.fillRect(-1.1, 0, 0.6, 0.55); g.fillRect(0.5, 0, 0.55, 0.47); }, '#2f3a4a', { depth: 0.3 }); P.layer((g) => { g.beginPath(); g.arc(-0.8, 1.75, 0.24, 0, 6.28); g.fill(); g.beginPath(); g.arc(0.8, 1.49, 0.21, 0, 6.28); g.fill(); }, '#d6a27a', { depth: 0.3 }); }
function persimPts() { return shape.fromDrawing((g) => { g.lineWidth = 0.14; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.3, 2, -0.2, 3.4); g.stroke(); g.lineWidth = 0.06; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0.05, 1.2 + i * 0.4); g.lineTo((i % 2 ? 1 : -1) * (0.9 + (i % 3) * 0.3), 1.6 + i * 0.4); g.stroke(); } for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i % 2 ? 1 : -1) * (0.3 + (i * 0.37) % 1.1), 1.5 + (i * 0.27) % 2.2, 0.18, 0, 6.28); g.fill(); } }, { w: 3.0, h: 3.8, res: 60 }); }

function catPts() { return shape.fromDrawing((g) => { g.beginPath(); g.ellipse(0, 0.5, 0.9, 0.48, 0, 0, 6.28); g.fill(); g.beginPath(); g.arc(0.75, 0.95, 0.34, 0, 6.28); g.fill(); g.beginPath(); g.moveTo(0.48, 1.15); g.lineTo(0.55, 1.48); g.lineTo(0.72, 1.2); g.lineTo(0.92, 1.48); g.lineTo(1.0, 1.15); g.closePath(); g.fill(); g.lineWidth = 0.12; g.beginPath(); g.moveTo(-0.75, 0.5); g.quadraticCurveTo(-1.3, 0.65, -1.1, 1.2); g.stroke(); }, { w: 3.0, h: 1.9, res: 60 }); }
function shaiqiuPts() { return shape.fromDrawing((g) => { g.beginPath(); g.ellipse(0, 0.95, 1.9, 0.5, 0, 0, 6.28); g.fill(); g.fillRect(-1.5, 0, 0.14, 0.95); g.fillRect(1.36, 0, 0.14, 0.95); g.fillRect(-0.07, 0, 0.14, 0.95); }, { w: 4.2, h: 1.8, res: 60 }); }

export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['karst', 'ridge', 'bd-lingchuan', 'gr-lingchuan', 'cut-ginkgo', 'cut-ginkgo-tall', 'cut-ginkgo-leaning', 'cut-ginkgo-cat', 'cut-ginkgo-shaiqiu', 'cut-youcha', 'cut-oldhouse']);
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 29, contact: '#5a4630' });
  const steps = [];
  // soft karst hills behind the village, warm autumn haze
  const BD = cutCard(card, 'bd-lingchuan', 41, { ppu: 38 }); if (BD) steps.push(() => { add(BD, { x: 0, z: -12.6, size: 0.8 }).hot = { act: 'poke', title: '海洋山', line: '海洋乡在灵川东北的山谷里，四面是石山，深秋时山脚一片金黄。' }; });
  (BD ? [] : [[-10, -12.6, 22, 6.0, '#d4c6a4'], [10, -12.8, 22, 6.8, '#cfc09e'], [0, -11.6, 24, 4.4, '#bfb08c']]).forEach(([x, z, w, h, tint]) => steps.push(() => {
    add(card(karstPts(r, { w, h, peaks: Array.from({ length: 5 }, (_, k) => [-w / 2 + w * (0.1 + k * 0.2) + (r() - 0.5), h * (0.55 + r() * 0.45), 1.8 + r()]), rough: 0.5 }), (P) => paintKarst(P, { src: 'ridge', tint, far: 1, foot: '#f3e8cc', rim: '#fff0c8', rimA: 0.35 }), { ppu: 28 }), { x, z, size: 0.8 }).hot = { act: 'poke', title: '海洋山', line: '海洋乡在灵川东北的山谷里，四面是石山，深秋时山脚一片金黄。' }; }));
  // the gold: ginkgo trees of many ages, varied across 3 gongbi silhouettes + flipX + subtle autumn tint
  const trees = [
    [-14.6, -7.6, 6.4, 10.4, 1, 'cut-ginkgo',         false, null],
    [ -7.4, -8.6, 5.0,  8.6, 0, 'cut-ginkgo-tall',    false, '#fff3d6'],
    [ -1.2, -9.4, 4.4,  7.4, 0, 'cut-ginkgo-leaning', false, '#ffebd0'],
    [  5.4, -8.8, 5.6,  9.2, 0, 'cut-ginkgo',         true,  '#f6f8dc'],
    [ 12.0, -8.0, 4.8,  8.0, 0, 'cut-ginkgo-tall',    true,  '#ffefd6'],
    [ 17.6, -6.4, 4.0,  7.0, 0, 'cut-ginkgo-leaning', true,  '#fff4d8'],
    [-18.0, -2.0, 3.8,  6.4, 0, 'cut-ginkgo-leaning', false, '#f7f7da'],
    [  9.0, -2.6, 4.2,  6.8, 0, 'cut-ginkgo-tall',    false, '#ffe8cc'],
    [ 16.4,  0.8, 3.6,  5.8, 0, 'cut-ginkgo',         true,  '#fff2d4'],
    [ -4.0, -3.4, 3.4,  5.6, 0, 'cut-ginkgo-leaning', true,  '#ffeed2'],
  ];
  trees.forEach(([x, z, w, h, king, artName, flipX, tint], ti) => steps.push(() => {
    const tone = r();
    const widthFor = (n) => (n === 'cut-ginkgo-tall' ? h * 0.56 : n === 'cut-ginkgo-leaning' ? w * 1.52 : (king ? 11 : w * 1.45));
    const alt = ti % 2 ? 'cut-ginkgo-tall' : 'cut-ginkgo';
    const opt = { back: 'mirror', flipX, tint };
    const big = cutCard(card, artName, widthFor(artName), opt) || cutCard(card, alt, widthFor(alt), opt) || cutCard(card, 'cut-ginkgo', widthFor('cut-ginkgo'), opt);
    const p = add(big || card(ginkgoPts(r, { w, h }), (P) => paintGinkgo(P, tone < 0.3 ? { gold: '#d99a22', gold2: '#f0c040', gold3: '#a86a18' } : tone < 0.6 ? {} : { gold: '#e8b43a', gold2: '#f8d86a', gold3: '#c08a28' }), { ppu: 36, back: 'mirror' }), { x, z, size: 0.55, sway: 1.1, rest: (r() - 0.5) * 0.04 });
    p.hot = king ? { dive: 'oldhouse', act: 'leaves', color: '#e8b030', title: '千年银杏', line: '海洋乡的古银杏动辄几百上千岁，最老的一棵要几个人才能合抱。树下就是老屋——点进去，走进院子。' } : { act: 'leaves', color: '#e8b030', title: '银杏', line: '海洋乡有上万棵银杏，大多是农家种在房前屋后的。十一月中下旬最黄，风一吹满地金叶。' };
  }));
  // grey-brick village houses and a stretch of old wall (reuse cut-oldhouse with flipX/tint, zero 404s)
  const HOUSE = [
    ['cut-oldhouse', 7.4, false, null,      '黄泥老屋', '银杏树下的黄泥老屋，屋檐下挂满玉米，墙根堆着石磨和坛子。'],
    ['cut-oldhouse', 6.8, true,  '#fbf0da', '银杏古道', '村道两边都是银杏，十一月走过去，脚下是厚厚一层金叶。'],
    ['cut-oldhouse', 6.4, false, '#f6eedc', '青砖老屋', '村里的老屋青砖黛瓦，墙头长着瓦松，门口堆着刚收的柴和红薯。'],
    ['cut-oldhouse', 6.2, true,  '#ffefd8', '村口老宅', '村口老宅的木门半掩，檐下挂着玉米与红辣椒，满院都是秋阳。'],
  ];
  for (const [x, z, w, h, up, k] of [[-10.8, -4.6, 4.6, 2.8, true, 0], [-3.0, -6.4, 4.0, 2.6, false, 1], [3.6, -4.2, 4.4, 2.8, true, 2], [12.6, -3.0, 4.0, 2.6, false, 3]]) steps.push(() => {
    const [cn, cw, fx, ctint, ct, cl] = HOUSE[k];
    const cm = cutCard(card, cn, cw, { back: 'mirror', flipX: fx, tint: ctint });
    if (cm) { add(cm, { x, z, size: 0.55 }).hot = { act: 'light', title: ct, line: cl }; return; }
    add(card(housePts({ w, h, upper: up }), (P) => paintHouse(P, { w, h, upper: up, brick: '#8f8a82', plaster: '#efe6d2', lantern: r() < 0.6, lit: 0.3 }), { ppu: 52 }), { x, z, size: 0.55 }).hot = { act: 'light', title: ct, line: cl };
  });
  steps.push(() => { add(card(wallPts(8, 1.4), paintWall, { ppu: 50 }), { x: -6.6, z: -0.8, size: 0.45 }).hot = { act: 'poke', title: '石墙小巷', line: '巷子窄窄的，两边是石墙，银杏叶落进墙缝里，踩上去沙沙响。' }; });
  steps.push(() => { add(card(persimPts(), (P) => { P.fill('#4a3626'); P.layer((g) => { for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i % 2 ? 1 : -1) * (0.3 + (i * 0.37) % 1.1), 1.5 + (i * 0.27) % 2.2, 0.16, 0, 6.28); g.fill(); } }, '#e8702a', { depth: 0.4 }); }, { ppu: 60, back: 'mirror' }), { x: 6.8, z: 2.2, size: 0.45, sway: 0.6 }).hot = { act: 'leaves', color: '#e8702a', title: '柿子树', line: '银杏黄的时候，柿子也红了，叶子掉光，只剩一树小灯笼。' }; });
  steps.push(() => { add(card(kidsPts(), paintKids, { ppu: 70, back: 'mirror' }), { x: -1.8, z: 4.8, size: 0.35 }).hot = { act: 'leaves', color: '#f0c040', title: '扬银杏叶', line: '孩子们捧起一把落叶往天上扔，金叶子像雨一样落下来。' }; });
  // foreground village vignettes: orange cat in ginkgo leaves & autumn harvest baskets (晒秋)
  steps.push(() => { add(cutCard(card, 'cut-ginkgo-cat', 3.8, { back: 'mirror' }) || card(catPts(), (P) => { P.fill('#e09e48'); P.marks('stripe', { color: '#a86524', alpha: 0.5, size: 0.08, angle: 1.4 }); }, { ppu: 60, back: 'mirror' }), { x: 2.2, z: 5.4, size: 0.32 }).hot = { act: 'poke', title: '银杏落叶猫', line: '村巷的落叶堆与竹篮旁趴着一只晒太阳的大橘猫，懒洋洋眯着眼。' }; });
  steps.push(() => { add(cutCard(card, 'cut-ginkgo-shaiqiu', 5.2, { back: 'mirror' }) || card(shaiqiuPts(), (P) => { P.fill('#b08a50'); P.layer((g) => { for (let i = 0; i < 24; i++) { g.beginPath(); g.arc(-1.2 + (i % 8) * 0.34, 0.9 + Math.floor(i / 8) * 0.1, 0.1, 0, 6.28); g.fill(); } }, '#e8702a', { depth: 0.3 }); }, { ppu: 54, back: 'mirror' }), { x: 11.4, z: 3.4, size: 0.4 }).hot = { act: 'poke', food: true, title: '晒秋人家', line: '秋收后家家在门前摆开竹簸箕和竹篓，晒玉米、辣椒、白果和红薯干，叫“晒秋”。' }; });
  // food: beating camellia-oil tea & ginkgo duck soup
  steps.push(() => { add(cutCard(card, 'cut-youcha', 4.4, { back: 'mirror' }) || card(teaPts(), paintTea, { ppu: 60, back: 'mirror' }), { x: -13.2, z: 5.4, size: 0.4 }).hot = { act: 'light', food: true, title: '油茶', line: '桂北人家的早饭是“打油茶”：茶叶、老姜、蒜在锅里用油炒香，用木槌捶打再加水煮开，配炒米、花生，一喝三四碗。' }; });
  steps.push(() => { add(card(bowlPts({ w: 1.8 }), (P) => paintBowl(P, { w: 1.8, soup: '#8a7a3a', top: [['#f4e0a0', 18], ['#c88a4a', 8], ['#4f9a3e', 5]] }), { ppu: 80, back: 'mirror' }), { x: -8.4, z: 6.4, size: 0.3 }).hot = { act: 'poke', food: true, title: '白果老鸭', line: '银杏的果子叫白果。海洋乡人秋天把白果和老鸭一起炖，汤清味甜，白果软糯带一点点苦。' }; });
  for (let i = 0; i < steps.length; i++) { steps[i](); progress((i + 1) / (steps.length + 1)); await yieldFn(); }
  // falling ginkgo leaves: a cloud of small gold sprites drifting down
  const N = 70, geo = new THREE.PlaneGeometry(0.28, 0.22), cv = document.createElement('canvas'); cv.width = cv.height = 64; const cg = cv.getContext('2d'); cg.fillStyle = '#f0c040'; cg.beginPath(); cg.moveTo(32, 58); cg.arc(32, 58, 50, -2.4, -0.74); cg.closePath(); cg.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const leaves = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }), N); group.add(leaves);
  const L = Array.from({ length: N }, () => ({ x: (r() - 0.5) * 36, z: -9 + r() * 16, y: r() * 9, s: 0.3 + r() * 0.5, ph: r() * 6 })); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  const birds = flyers(group, { n: 3, color: '#2a2622', span: 0.9, rad: 10, h: 8.5, sp: 0.14, cz: -4 });
  const fog = mist(group, r, [[-8, 2.6, -10.5, 22], [9, 2.2, -10.8, 22]], '255,240,210', 0.4);
  progress(1);
  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#efe2c0', key: '#ffe2a8', keyI: 2.6, keyDir: [0.6, 0.85, 0.5], fill: '#f4e6c8', fillI: 0.85, sky: '#fff2d2', ground: '#b09050', skyI: 0.55, leak: '#9a7030', wrap: 0.34, exposure: 1.05, trans: 0.36, transTint: '#ffd060' },
    setReveal(v) { reveal = v; },
    update(t, dt) {
      updatePieces(t, dt); birds(t, reveal); fog(t, reveal);
      leaves.visible = reveal > 0.5;
      for (let i = 0; i < N; i++) { const l = L[i]; l.y -= dt * l.s; if (l.y < 0.05) { l.y = 8 + r() * 2; l.x = (r() - 0.5) * 36; } V.set(l.x + Math.sin(t * 0.9 + l.ph) * 0.6, l.y, l.z); E.set(t * 1.3 + l.ph, t * 0.7 + l.ph, Math.sin(t + l.ph)); Q.setFromEuler(E); M.compose(V, Q, SC); leaves.setMatrixAt(i, M); }
      leaves.instanceMatrix.needsUpdate = true;
    },
  };
}

export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 37);
  const PG = paintGround(g, c, 'gr-lingchuan', { alpha: 1 }); g.fillStyle = PG ? 'rgba(250,236,200,0.2)' : 'rgba(236,214,160,0.5)'; g.fillRect(0, 0, c.width, c.height);
  // a carpet of fallen leaves, thickest under the trees
  for (let i = 0; i < (PG ? 700 : 2600); i++) { const x = -20 + Math.random() * 40, z = -12 + Math.random() * 25, a = Math.random() * 6.28, s = (0.12 + Math.random() * 0.16) * S; const dense = z < 0 ? 1 : 0.5; if (Math.random() > dense) continue; g.fillStyle = ['#e8b030', '#f0c84c', '#d49a20', '#c8a050'][i % 4]; g.globalAlpha = 0.55 + Math.random() * 0.4; g.beginPath(); g.moveTo(X(x), Z(z)); g.arc(X(x), Z(z), s, a, a + 1.6); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  // the village lane in pale stone
  g.strokeStyle = 'rgba(200,190,170,0.85)'; g.lineWidth = 1.2 * S; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(-20), Z(2.4)); g.bezierCurveTo(X(-8), Z(1.2), X(2), Z(3.6), X(20), Z(1.4)); g.stroke();
  g.strokeStyle = 'rgba(232,176,48,0.6)'; g.lineWidth = 0.4 * S; g.beginPath(); g.moveTo(X(-20), Z(2.4)); g.bezierCurveTo(X(-8), Z(1.2), X(2), Z(3.6), X(20), Z(1.4)); g.stroke();
  titleSlip(g, X, Z, S, { title: '海洋银杏', seal: '灵川', x: -18.8, z: 1.4, poem: '满村银杏黄　一碗油茶香', by: '— 灵川 · 海洋乡' });
  return c;
}
export function waterMask() { return sheenFrom(() => {}); }
