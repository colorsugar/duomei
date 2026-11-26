// ============================================================================
// 灵川游踪 · 排程
// 不调用任何模型：按日期、圩期、季节、偏好给资料打分，同一天只走一条线，
// 按时段挑去处与吃食，估算路上时间，写成一卷。同样的条件永远排出同一卷；
// 「换一卷」换的是 seed，「换一站」把那一站记进 skip。
// ============================================================================

import { ITEMS, FESTS, MARKETS, ORIGINS, LINES } from './youzong-data.js';

export const TOWN_NAMES = {
  daxu: '大圩', chaotian: '潮田', haiyang: '海洋', dajing: '大境', lingtian: '灵田',
  'lingchuan-zhen': '灵川镇', dingjiang: '定江', tanxia: '潭下', sanjie: '三街',
  jiuwu: '九屋', gongping: '公平', lantian: '兰田',
  xiufeng: '秀峰区', diecai: '叠彩区', xiangshan: '象山区',
  qixing: '七星区', yanshan: '雁山区', lingui: '临桂区',
};
export const TOWN_LINE = {};
for (const [k, v] of Object.entries(LINES)) for (const t of v.towns) TOWN_LINE[t] = k;

export const SLOTS = [
  { id: 'am', name: '晨起', at: 9 * 60 },
  { id: 'noon', name: '午间', at: 12 * 60 },
  { id: 'pm', name: '午后', at: 14 * 60 },
  { id: 'dusk', name: '向晚', at: 17 * 60 + 20 },
  { id: 'night', name: '入夜', at: 19 * 60 + 20 },
];

export const LENGTHS = {
  half: { name: '半日', days: 1, slots: ['am', 'noon'] },
  day: { name: '日归', days: 1, slots: ['am', 'noon', 'pm', 'dusk'] },
  two: { name: '两日', days: 2, slots: ['am', 'noon', 'pm', 'dusk', 'night'] },
  three: { name: '三日', days: 3, slots: ['am', 'noon', 'pm', 'dusk', 'night'] },
};

export const PREFS = {
  eat: '以吃为主',
  hill: '山水',
  village: '古村',
  folk: '圩市民俗',
  kids: '携幼',
  elder: '宜长辈',
  walk: '能走远路',
};

// ---------------------------------------------------------------------------
// 日期与圩期
// ---------------------------------------------------------------------------
const lunarFmt = (() => {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' });
  } catch {
    return null;
  }
})();

export function lunarOf(date) {
  if (!lunarFmt) return null;
  const parts = lunarFmt.formatToParts(date);
  const m = parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
  const d = parseInt(parts.find((p) => p.type === 'day')?.value || '', 10);
  return Number.isFinite(m) && Number.isFinite(d) ? { m, d } : null;
}

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function marketDaysText(m) {
  if (m.days.length === 1 && m.days[0] === 10) return '逢十';
  return '逢' + m.days.map((d) => CN_NUM[d]).join('');
}

/** 某天是否逢圩：cal=solar 只看公历；either 公历或农历尾数任一相合即算「或逢圩」 */
export function marketOn(market, date) {
  const digit = (n) => (n % 10 === 0 ? 10 : n % 10);
  const solar = market.days.includes(digit(date.getDate()));
  if (market.cal === 'solar') return solar ? 'yes' : '';
  const lu = lunarOf(date);
  const lunar = lu ? market.days.includes(digit(lu.d)) : false;
  if (solar && lunar) return 'yes';
  return solar || lunar ? 'maybe' : '';
}

export function marketsOn(date) {
  const out = [];
  for (const m of MARKETS) {
    const r = marketOn(m, date);
    if (r) out.push({ ...m, sure: r === 'yes' });
  }
  return out;
}

export function festsNear(date, spanDays = 30) {
  const out = [];
  const month = date.getMonth() + 1;
  for (const f of FESTS) {
    if (f.lunar) {
      for (let k = 0; k <= spanDays; k++) {
        const d = new Date(date.getTime() + k * 86400000);
        const lu = lunarOf(d);
        if (lu && lu.m === f.lunar[0] && lu.d === f.lunar[1]) {
          out.push({ ...f, inDays: k, on: d });
          break;
        }
      }
    } else if (f.months.includes(month)) {
      out.push({ ...f, inDays: 0 });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 路程
// ---------------------------------------------------------------------------
export function km(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la = (a[1] * Math.PI) / 180;
  const lb = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 路上分钟数：直线距离 × 1.4 的山路系数；公交含候车 */
export function travelMin(a, b, mode) {
  const d = km(a, b) * 1.4;
  if (d < 0.6) return 8;
  if (mode === 'bus') return Math.round(d / 26 * 60 + 18);
  return Math.round(d / 42 * 60 + 6);
}

export function roundMin(m) {
  if (m < 15) return '十来分钟';
  if (m < 25) return '约二十分钟';
  if (m < 40) return '约半小时';
  if (m < 55) return '约三刻钟';
  if (m < 75) return '约一小时';
  if (m < 100) return '一个多小时';
  if (m < 135) return '约两小时';
  return '两个多小时';
}

// ---------------------------------------------------------------------------
// 打分
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const VILLAGE_RE = /村|古|圩|民居|老街/;
const HILL_RE = /瀑|峡|湖|江|山|岛|林|花|观景/;

export function scoreItem(it, { date, prefs, mode, marketIds, seedR }) {
  const month = date.getMonth() + 1;
  let s = 1 + Math.log2(1 + (it.heard || 0)) * 0.9;
  if (!it.heard) s -= 0.6;
  if (it.months?.length) {
    if (it.months.includes(month)) s += 1.6;
    else return -99;
  }
  if (it.xu) {
    if (marketIds.has(it.xu)) s += 2.2;
    else if (it.kind === 'food') s -= 2.6;
  }
  if (it.stay === 0 && it.kind === 'food') s -= 1.2; // 明确记为 0 的节日家宴降权；来源未载时长不据此扣分
  const t = it.tags || [];
  if (prefs.has('eat') && it.kind === 'food') s += 1.4;
  if (prefs.has('hill') && it.kind === 'place' && HILL_RE.test(it.name)) s += 1.1;
  if (prefs.has('village') && VILLAGE_RE.test(it.name)) s += 1.1;
  if (prefs.has('folk') && it.xu) s += 1.0;
  if (prefs.has('kids')) s += t.includes('kids') ? 0.9 : t.includes('hike') ? -1.6 : 0;
  if (prefs.has('elder')) s += t.includes('elder') ? 0.9 : t.includes('hike') ? -2.4 : 0;
  if (!prefs.has('walk') && it.stay >= 300) s -= 3;
  if (prefs.has('walk') && t.includes('hike')) s += 1.0;
  if (mode === 'bus' && it.approx && t.includes('hike')) s -= 0.8;
  return s + seedR() * 0.9;
}

// ---------------------------------------------------------------------------
// 排一卷
// ---------------------------------------------------------------------------
const TITLES = {
  spring: ['春山可望', '踏春寻味', '花信一程'],
  summer: ['溪林消夏', '山水清凉', '夏日行脚'],
  autumn: ['秋圩寻味', '银杏满山', '秋光一卷'],
  winter: ['冬日寻暖', '围炉山行', '岁暮小游'],
};
function seasonOf(m) {
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

export function parsePlanParams(str) {
  const o = {};
  for (const kv of (str || '').split(';')) {
    const [k, v] = kv.split(':');
    if (k) o[k] = decodeURIComponent(v || '');
  }
  return {
    origin: o.o || 'gl-city',
    length: o.l || 'day',
    mode: o.m || 'car',
    prefs: (o.p || '').split(',').filter(Boolean),
    date: o.d || '',
    seed: Number(o.s) || 1,
    skip: (o.x || '').split(',').filter(Boolean),
  };
}

export function encodePlanParams(p) {
  return [
    `o:${p.origin}`, `l:${p.length}`, `m:${p.mode}`, `p:${p.prefs.join(',')}`,
    `d:${p.date}`, `s:${p.seed}`, p.skip.length ? `x:${p.skip.join(',')}` : '',
  ].filter(Boolean).join(';');
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0);
}

export function makePlan(params) {
  const P = { ...params, prefs: [...(params.prefs || [])], skip: [...(params.skip || [])] };
  const origin = ORIGINS.find((o) => o.id === P.origin) || ORIGINS[0];
  const L = LENGTHS[P.length] || LENGTHS.day;
  const start = parseYmd(P.date) || new Date();
  if (!P.date) P.date = ymd(start);
  const prefs = new Set(P.prefs);
  const skip = new Set(P.skip);
  const seedR = rng(P.seed * 2654435761);
  const used = new Set();
  const usedLines = new Set();
  const days = [];

  for (let di = 0; di < L.days; di++) {
    const date = new Date(start.getTime() + di * 86400000);
    const markets = marketsOn(date);
    const marketIds = new Set(markets.map((m) => m.id));
    const ctx = { date, prefs, mode: P.mode, marketIds, seedR };
    const scored = ITEMS
      .filter((it) => !skip.has(it.id) && !used.has(it.id))
      .map((it) => ({ it, s: scoreItem(it, ctx) }))
      .filter((x) => x.s > -50);

    // 选线：该线上最好的几处之和，减去从出发地（或昨夜住处）过去的路程
    const from = di === 0 ? origin.ll : days[di - 1].sleep?.ll || origin.ll;
    let best = null;
    for (const [lid, line] of Object.entries(LINES)) {
      if (usedLines.has(lid) && usedLines.size < Object.keys(LINES).length) continue;
      const pool = scored.filter((x) => line.towns.includes(x.it.town)).sort((a, b) => b.s - a.s);
      if (!pool.length) continue;
      const top = pool.slice(0, 5).reduce((a, x) => a + Math.max(0, x.s), 0);
      const reach = travelMin(from, pool[0].it.ll, P.mode);
      // 公交日归要把往返耗时算入可游览时间，避免远处圩日加分压过就近城区。
      const span = SLOTS.find((s) => s.id === L.slots.at(-1)).at - SLOTS.find((s) => s.id === L.slots[0]).at;
      const usable = P.mode === 'bus' && P.length === 'day' ? Math.max(0, 1 - 2 * reach / span) : 1;
      const v = top * usable - reach / 35 + seedR() * 0.6;
      if (!best || v > best.v) best = { lid, v, pool };
    }
    if (!best) break;
    usedLines.add(best.lid);

    const stops = [];
    let here = from;
    let clock = SLOTS.find((s) => s.id === L.slots[0]).at - travelMin(from, best.pool[0].it.ll, P.mode);
    const departAt = clock;
    let townFocus = null;
    const lastDay = di === L.days - 1;
    const slots = L.slots.filter((s) => !(lastDay && s === 'night' && L.days > 1));

    for (const sid of slots) {
      const slot = SLOTS.find((s) => s.id === sid);
      const wantFood = sid === 'noon' || (sid === 'night' && true);
      const cands = best.pool
        .filter((x) => !used.has(x.it.id))
        .filter((x) => (x.it.slots?.length ? x.it.slots.includes(sid) : sid !== 'night'))
        .filter((x) => (wantFood ? x.it.kind === 'food' || x.it.slots?.includes('night') : x.it.kind === 'place' || (prefs.has('eat') && x.it.stay >= 15)))
        .map((x) => {
          const tm = travelMin(here, x.it.ll, P.mode);
          const sameTown = townFocus && x.it.town === townFocus ? 0.8 : 0;
          // 逢圩的早上先去圩场，圩上的吃食作「顺道尝」
          const xuAm = sid === 'am' && x.it.kind === 'place' && x.it.xu && marketIds.has(x.it.xu) ? 2.4 : 0;
          const xuFoodAm = sid === 'am' && x.it.kind === 'food' && x.it.xu && marketIds.has(x.it.xu) ? -1.2 : 0;
          const meal = sid === 'noon' && x.it.kind === 'food' ? (x.it.stay >= 25 ? 1.2 : -0.8) : 0;
          return { ...x, tm, v: x.s - tm / 28 + sameTown + xuAm + xuFoodAm + meal };
        })
        .sort((a, b) => b.v - a.v);
      const pick = cands[0];
      if (!pick || pick.v < -1.5) continue;
      const arrive = Math.max(slot.at, clock + pick.tm);
      if (arrive > slot.at + 80) continue; // 赶不上这个时段就让给下一段
      used.add(pick.it.id);
      townFocus = townFocus || pick.it.town;
      // 顺道尝：同镇、片刻可得的小吃
      const side = ITEMS.filter((it) => it.kind === 'food' && !used.has(it.id) && !skip.has(it.id) && it.town === pick.it.town
        && it.stay > 0 && it.stay <= 20 && (km(it.ll, pick.it.ll) < 1.5 || (it.xu && it.xu === pick.it.xu)) && scoreItem(it, ctx) > 0
        && (!it.slots?.length || it.slots.includes(sid) || sid === 'am' || sid === 'pm')).sort((a, b) => (b.heard || 0) - (a.heard || 0)).slice(0, pick.it.xu ? 3 : 2);
      side.forEach((it) => used.add(it.id));
      stops.push({ slot, item: pick.it, travel: stops.length || di === 0 || here !== from ? pick.tm : pick.tm, from: here, arrive, side });
      clock = arrive + (pick.it.stay || 30) + side.length * 10;
      here = pick.it.ll;
    }

    // 当天回程太晚就去掉最后一站（公交 19:30、自驾 20:00 前到）
    const latest = P.mode === 'bus' ? 19 * 60 + 30 : 20 * 60;
    while (lastDay && stops.length > 2) {
      const tail = stops.at(-1);
      const end = tail.arrive + (tail.item.stay || 30) + travelMin(tail.item.ll, origin.ll, P.mode);
      if (end <= latest) break;
      stops.pop();
      used.delete(tail.item.id);
      tail.side.forEach((it) => used.delete(it.id));
      const prev = stops.at(-1);
      clock = prev.arrive + (prev.item.stay || 30) + prev.side.length * 10;
      here = prev.item.ll;
    }
    const sleepHere = !lastDay;
    const sleep = sleepHere ? { ll: here, town: stops.at(-1)?.item.town } : null;
    const back = sleepHere ? 0 : travelMin(here, origin.ll, P.mode);
    const fests = festsNear(date, 0).filter((f) => LINES[best.lid].towns.includes(f.town));
    days.push({
      date, line: best.lid, lineName: LINES[best.lid].name, stops, markets: markets.filter((m) => LINES[best.lid].towns.includes(m.town)),
      fests, departAt, back, backAt: clock + back, sleep,
    });
  }

  const month = start.getMonth() + 1;
  const titles = TITLES[seasonOf(month)];
  const title = days.some((d) => d.line === 'south') && seasonOf(month) === 'autumn' && month >= 11
    ? '银杏满山' : titles[(P.seed - 1) % titles.length];
  return { params: P, origin, length: L, days, title };
}

export function fmtClock(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60 / 10) * 10;
  return `${h}:${String(m === 60 ? 50 : m).padStart(2, '0')}`;
}

export function travelText(mode, min, toItem) {
  const how = mode === 'bus' ? '乘车' : '驱车';
  return `${how}${roundMin(min)}`;
}
