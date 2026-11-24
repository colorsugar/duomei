// Pure navigation + collection model (no three.js).
// Chapters page-turn. Inner spreads are dive-only and can nest arbitrarily.

// Guilin only (老大 01:43). 阳朔/龙脊/灵川 are drafts being raised to the 漓江 standard; 象鼻山·米粉店 to be added.
export const SPREADS = [
  { id: 'map',       title: '桂林全图', place: '全图', chapter: true,  light: true,  mod: './map.js' },
  { id: 'guilin',    title: '漓江夜游', place: '漓江', chapter: true,  light: false, mod: './guilin.js' },
  { id: 'xiangbi',   title: '象山水月', place: '象山', chapter: true,  light: true,  mod: './xiangbi.js' },
  { id: 'yangshuo',  title: '遇龙河',   place: '阳朔', chapter: true,  light: true,  mod: './yangshuo.js' },
  { id: 'longji',    title: '龙脊梯田', place: '龙脊', chapter: true,  light: true,  mod: './longji.js' },
  { id: 'lingchuan', title: '海洋银杏', place: '灵川', chapter: true,  light: true,  mod: './lingchuan.js' },
  { id: 'towers',    title: '日月双塔', place: '杉湖', chapter: false, light: false, mod: './near.js' },
  { id: 'rita',      title: '日塔近观', place: '杉湖', chapter: false, light: false, mod: './near.js' },
  { id: 'yueta',     title: '月塔近观', place: '杉湖', chapter: false, light: false, mod: './near.js' },
  { id: 'shuiyue',   title: '水月洞',   place: '象山', chapter: false, light: false, mod: './shuiyue.js' },
  { id: 'mifen',     title: '米粉店里', place: '象山', chapter: false, light: true,  mod: './mifen.js' },
  { id: 'bowl',      title: '一碗米粉', place: '象山', chapter: false, light: true,  mod: './bowl.js' },
  { id: 'moonhill',  title: '月亮山',   place: '阳朔', chapter: false, light: true,  mod: './near.js' },
  { id: 'cave',      title: '月洞里',   place: '阳朔', chapter: false, light: true,  mod: './near.js' },
  { id: 'cabin',     title: '吊脚楼里', place: '龙脊', chapter: false, light: true,  mod: './near.js' },
  { id: 'oldhouse',  title: '银杏老屋', place: '灵川', chapter: false, light: true,  mod: './near.js' },
];

// close.js looks up this table by spread id (printed from his paintings, not generated art)
export const CLOSE = {
  rita:     { art: 'pagoda-gold',   w: 4.2, h: 12.5, tint: '#c9a066', glow: 0.45, yaw: 0.12,
              title: '日塔', seal: '日塔', poem: '铜塔夜光　高四十一米',
              hot: { title: '日塔', line: '杉湖日塔是铜塔，高 41 米，入夜金光通透。窗里有时会透出灯火。', act: 'light' },
              food: { title: '桂花茶', line: '塔下茶摊常备桂花茶。桂林满城桂花，花开时满街都是香的。' } },
  yueta:    { art: 'pagoda-silver', w: 4.2, h: 12.5, tint: '#b8c0d0', glow: 0.35, yaw: -0.1,
              title: '月塔', seal: '月塔', poem: '琉璃月塔　与日塔隔水相望',
              hot: { title: '月塔', line: '月塔是琉璃塔，与日塔隔水相望，两塔之间有湖底隧道相连。', act: 'light' } },
  cave:     { art: 'karst',         w: 16, h: 11, tint: '#c4c0b4', glow: 0, yaw: 0,
              title: '月洞', seal: '穿岩', poem: '山腹一洞　状如明月',
              hot: { title: '月亮山穿洞', line: '阳朔月亮山上部有天然穿洞，远看像一轮明月嵌在山腹。', act: 'poke' },
              food: { title: '竹筒饭', line: '阳朔乡下用嫩竹筒装糯米和腊味烤熟，打开时带着竹香。' } },
  cabin:    { art: 'greentree',     w: 14, h: 8, tint: null, glow: 0, yaw: 0.08,
              title: '木楼', seal: '龙脊', poem: '木楼依山　梯田如级',
              hot: { title: '山寨木楼', line: '龙脊寨里的木楼依山而建，出檐深，瓦垄细。这张立卡印的是多美笔下的亭廊屋瓦。', act: 'poke' },
              food: { title: '油茶', line: '桂北油茶用茶叶、姜、油茶豆炒打，配花生、炒米，又香又爽口。' } },
  oldhouse: { art: 'greentree',     w: 13, h: 7.5, tint: '#e8d7a8', glow: 0, yaw: -0.06,
              title: '老屋', seal: '海洋', poem: '古树人家　金黄一村',
              hot: { title: '海洋乡老屋', line: '灵川海洋乡以古银杏闻名，村屋依树而建，秋来满地金黄。', act: 'poke' } },
};

export const chapterIndices = () => SPREADS.map((s, i) => s.chapter ? i : -1).filter((i) => i >= 0);
export const lastChapterIndex = () => Math.max(...chapterIndices());
export const indexOfId = (id) => SPREADS.findIndex((s) => s.id === id);

export function turnTarget(cur, dir) {
  if (cur < 0) return dir > 0 ? 0 : -1;
  if (!SPREADS[cur] || !SPREADS[cur].chapter) return cur;
  const ch = chapterIndices();
  const pos = ch.indexOf(cur);
  const nxt = ch[pos + dir];
  return nxt === undefined ? cur : nxt;
}

export function pushDive(stack, cur, destId) {
  const next = indexOfId(destId);
  if (next < 0 || next === cur) return null;
  if (stack.includes(next) || next === cur) return null; // no cycles
  return { stack: [...stack, cur], cur: next };
}

export function popDive(stack, cur) {
  if (!stack.length) return { stack, cur };
  return { stack: stack.slice(0, -1), cur: stack[stack.length - 1] };
}

export function crumbNames(stack, cur) {
  return [...stack, cur].map((i) => (SPREADS[i] ? SPREADS[i].title : '?'));
}

export function diveDepth(stack) { return stack.length + 1; }

export function findKey(spreadId, title) { return `${spreadId}·${title}`; }

export const STORE_KEY = 'duomei-guilin-finds';

export function loadFinds(raw) {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    return { seen: Array.isArray(o.seen) ? o.seen : [] };
  } catch { return { seen: [] }; }
}

export function markFind(state, key) {
  if (!key || state.seen.includes(key)) return { state, fresh: false };
  return { state: { seen: [...state.seen, key] }, fresh: true };
}

export function tally(state, catalog) {
  const seen = new Set(state.seen);
  const places = catalog.filter((c) => c.kind !== 'food');
  const foods = catalog.filter((c) => c.kind === 'food');
  const n = (list) => list.reduce((a, c) => a + (seen.has(c.key) ? 1 : 0), 0);
  return { places: n(places), placesTotal: places.length, foods: n(foods), foodsTotal: foods.length, all: state.seen.length, total: catalog.length };
}
