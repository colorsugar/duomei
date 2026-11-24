// 桂林全图 — map entry. Ground is his map painting; pins dive into real places.
import * as THREE from 'three';
import { rig, flyers, mist, groundBase, titleSlip, makeTag, PAPER, INK, VERM, W, D } from './kit.js';
import { loadArt, IMGS, imgOutline, paintImg, emptyMask } from './art.js';

export async function build({ paper, yieldFn = async () => {}, progress = () => {} }) {
  await loadArt(['map-guilin', 'pagoda-gold', 'pagoda-silver', 'hero-karst', 'karst']);
  progress(0.3); await yieldFn();
  const group = new THREE.Group();
  const { pieces, add, card, r, updatePieces } = rig({ group, paper, seed: 9, contact: '#6a5840' });

  const hang = (parent, text, baseY) => {
    const spr = makeTag(text);
    spr.userData.baseY = baseY;
    spr.position.set(0, baseY, 0.15);
    parent.h.group.add(spr);
    return spr;
  };

  const pin = (label, x, z, hot) => {
    const p = add(card([[-1.15, 0], [1.15, 0], [1.15, 3.4], [0, 4.1], [-1.15, 3.4]], (P) => {
      P.fill('#f7f1e6');
      P.layer((g) => { g.fillRect(-1.0, 0.15, 2.0, 3.1); }, '#efe6d4', { depth: 0.3 });
      P.draw((g) => {
        g.fillStyle = VERM; g.beginPath(); g.moveTo(-0.35, 3.55); g.lineTo(0, 4.0); g.lineTo(0.35, 3.55); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(28,25,22,0.25)'; g.lineWidth = 0.06;
        g.strokeRect(-0.95, 0.25, 1.9, 2.95);
      });
    }, { ppu: 70 }), { x, z, size: 0.42 });
    p.hot = hot; hang(p, label, 2.15); return p;
  };

  pin('漓江', -6.5, 3.2, { dive: 'guilin', title: '漓江', line: '从桂林到阳朔的漓江，是喀斯特峰丛里的一条青罗带。点进去，夜游两江四湖。' });
  pin('象鼻山', -1.8, 6.0, { dive: 'xiangbi', title: '象鼻山', line: '桂林城的标志，一头饮水的石象。山下正阳街的米粉店清早就开门。点进去，看象山水月。' });
  pin('阳朔', 7.2, 4.0, { dive: 'yangshuo', title: '阳朔', line: '阳朔在漓江下游，遇龙河、月亮山都在这一带。点进去，看竹筏和峰丛。' });
  pin('龙脊', -10.5, -4.8, { dive: 'longji', title: '龙脊', line: '龙胜龙脊梯田依山盘绕，寨子里是木楼。点进去，走上田埂。' });
  pin('灵川', 10.2, -5.2, { dive: 'lingchuan', title: '灵川海洋乡', line: '灵川海洋乡以古银杏林闻名，深秋满山金黄。点进去，走进村子。' });
  await yieldFn();

  const cut = (name, w, h, x, z, hot, tint) => {
    const img = IMGS[name]; if (!img) return null;
    const p = add(card(imgOutline(img, w, h), paintImg(img, w, h, { t: tint }), { ppu: 56 }), { x, z, size: 0.5 });
    p.hot = hot; if (hot && hot.title) hang(p, hot.title, Math.max(2.0, h * 0.48)); return p;
  };
  cut('pagoda-gold', 2.4, 6.6, -1.2, -1.6, { dive: 'towers', title: '日月双塔', line: '杉湖中的日塔与月塔隔水相望。点进去，走进塔的近景。', act: 'light' }, null);
  cut('pagoda-silver', 2.3, 6.4, 1.4, -1.8, { dive: 'towers', title: '月塔在湖心', line: '月塔是琉璃塔。点进去，和日塔一起看。', act: 'light' }, null);
  cut('hero-karst', 7.5, 5.2, 0.4, 8.2, { dive: 'guilin', title: '山水入口', line: '这张工笔山石是多美的原作，印在立卡上。点进去，便是漓江夜游。', act: 'poke' }, null);

  const bowl = add(card([[-1.3, 0], [1.3, 0], [1.15, 1.05], [0, 1.35], [-1.15, 1.05]], (P) => {
    P.fill('#efe6d4');
    P.layer((g) => { g.beginPath(); g.ellipse(0, 0.55, 1.15, 0.55, 0, 0, 6.28); g.fill(); }, '#d8cbb3', { depth: 0.4 });
    P.layer((g) => { g.beginPath(); g.ellipse(0, 0.62, 0.85, 0.35, 0, 0, 6.28); g.fill(); }, '#c4a06a', { depth: 0.3 });
    P.marks('hatch', { color: INK, alpha: 0.15, size: 0.04 });
  }, { ppu: 80 }), { x: 5.6, z: 9.2, size: 0.28 });
  bowl.hot = { food: true, title: '桂林米粉', line: '圆粉配卤水、锅烧、酸豆角和花生，是桂林人的日常早餐，“三天不吃心发慌”。', act: 'poke' };
  hang(bowl, '桂林米粉', 1.15);

  const birds = flyers(group, { n: 3, color: '#2a2622', span: 0.9, rad: 11, h: 7, sp: 0.16, cz: -2 });
  const fog = mist(group, r, [[-8, 2.2, -8, 14], [6, 2.0, -6, 12]], '236,232,224', 0.28);
  await yieldFn(); progress(1);

  let reveal = 0;
  return {
    group, pieces,
    mood: { bg: '#e4dccf', key: '#fff0dc', keyI: 2.5, keyDir: [-0.7, 0.95, 0.5], fill: '#efe6d4', fillI: 0.85, sky: '#f6f1e8', ground: '#b8a78a', skyI: 0.55, leak: '#7b7060', wrap: 0.32, exposure: 1.02, trans: 0.25, transTint: '#ffd9a8' },
    setReveal(v) { reveal = v; },
    update(t, dt) { updatePieces(t, dt); birds(t, reveal); fog(t, reveal); },
  };
}

export function groundCanvas() {
  const { c, g, X, Z, S } = groundBase(80, 21);
  const map = IMGS['map-guilin'];
  if (map) {
    g.save();
    g.drawImage(map, 0, 0, map.width, map.height, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(243,238,230,0.28)'; g.fillRect(0, 0, c.width, c.height);
    g.restore();
  }
  titleSlip(g, X, Z, S, { title: '桂林全图', seal: '桂林', x: -18.8, z: -1.2, poem: '点标志　入画中　一图藏四境', by: '— 云游绘本' });
  return c;
}
export function waterMask() { return emptyMask(); }
