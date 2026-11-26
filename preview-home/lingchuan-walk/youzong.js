// 灵川游踪 · 页面
import { ITEMS, FESTS, MARKETS, ORIGINS, ROUTES } from './youzong-data.js';
import { OUTLINE } from './youzong-outline.js';
import {
  TOWN_NAMES, LENGTHS, PREFS, SLOTS, makePlan, encodePlanParams, parsePlanParams, parseYmd,
  marketsOn, festsNear, lunarOf, marketDaysText, fmtClock, roundMin, scoreItem,
} from './youzong-plan.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CN_MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const MONTH_NAME = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const MONTH_ALIAS = ['', '端月', '杏月', '桃月', '槐月', '榴月', '荷月', '兰月', '桂月', '菊月', '阳月', '葭月', '冰月'];
const CN_D = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const WEEK = '日一二三四五六';
const KIND = { food: '吃', place: '游', fest: '节令' };
const TAGS = { free: '免费', kids: '携幼', elder: '宜长辈', photo: '宜拍照', hike: '要脚力', ride: '可骑行', rain: '雨天可去' };
const SLOT_NAME = Object.fromEntries(SLOTS.map((s) => [s.id, s.name]));
SLOT_NAME.night = '入夜';
const CN_NUMS = ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
const DAY_NUM = ['', '一', '二', '三', '四', '五'];
const heardText = (n) => (n ? `${n <= 10 ? CN_NUMS[n] : n} 位网友提到` : '本站旧录，待网友印证');

const today = new Date();
today.setHours(9, 0, 0, 0);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lunarText = (d) => {
  const lu = lunarOf(d);
  return lu ? `农历${CN_MONTH[lu.m] || lu.m + '月'}${CN_D[lu.d] || lu.d}` : '';
};

// ---------------------------------------------------------------------------
// 囊中
// ---------------------------------------------------------------------------
const BAG_KEY = 'lc-youzong-bag';
const bag = new Set(JSON.parse(localStorage.getItem(BAG_KEY) || '[]'));
const saveBag = () => {
  localStorage.setItem(BAG_KEY, JSON.stringify([...bag]));
  $('#yz-bag-n').textContent = bag.size;
};
saveBag();

function toast(msg) {
  const t = $('#yz-toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 1800);
}

// ---------------------------------------------------------------------------
// 此时宜
// ---------------------------------------------------------------------------
function renderNow() {
  $('#yz-now-date').textContent = `${today.getMonth() + 1} 月 ${today.getDate()} 日 · 周${WEEK[today.getDay()]}`;
  $('#yz-now-lunar').textContent = lunarText(today);
  const ctx = { date: today, prefs: new Set(), mode: 'car', marketIds: new Set(marketsOn(today).map((m) => m.id)), seedR: () => 0 };
  const ranked = ITEMS.map((it) => ({ it, s: scoreItem(it, ctx) })).filter((x) => x.s > 0 && x.it.months?.length).sort((a, b) => b.s - a.s);
  const look = ranked.filter((x) => x.it.kind === 'place').slice(0, 3);
  const eat = ranked.filter((x) => x.it.kind === 'food').slice(0, 3);
  const fill = (arr, kind) => {
    if (arr.length >= 2) return arr;
    const more = ITEMS.filter((it) => it.kind === kind && !it.months?.length && it.heard >= 3)
      .sort((a, b) => b.heard - a.heard).slice(0, 3 - arr.length).map((it) => ({ it }));
    return arr.concat(more);
  };
  const li = (it) => `<li><button type="button" class="yz-link" data-go="${it.id}"><b>${esc(it.name)}</b></button><span>${esc(TOWN_NAMES[it.town])} · ${esc(it.line.split('，')[0])}</span></li>`;

  // 近日圩期：今明后三天
  const xu = [];
  for (let k = 0; k < 3; k++) {
    const d = new Date(today.getTime() + k * 86400000);
    for (const m of marketsOn(d)) {
      if (xu.some((x) => x.m.id === m.id)) continue;
      const foods = ITEMS.filter((it) => it.xu === m.id && it.kind === 'food').slice(0, 2).map((it) => it.name);
      xu.push({ m, k, foods });
    }
  }
  xu.sort((a, b) => a.k - b.k || (b.m.sure - a.m.sure));
  const dayWord = ['今日', '明日', '后日'];
  const xuLis = xu.slice(0, 4).map(({ m, k, foods }) => `<li><b>${dayWord[k]} · ${esc(m.name)}</b><span>${marketDaysText(m)}${m.sure ? '' : '（或按农历）'}${foods.length ? ' · 可吃' + esc(foods.join('、')) : ''}</span></li>`).join('');
  const fests = festsNear(today, 30).slice(0, 2).map((f) => `<li><b>${esc(f.name)}</b><span>${f.inDays ? `${f.inDays} 日后 · ` : ''}${esc(f.when)}</span></li>`).join('');

  $('#yz-now-grid').innerHTML = `
    <div class="yz-now-card"><h3>此时宜看</h3><ul>${fill(look, 'place').map((x) => li(x.it)).join('')}</ul></div>
    <div class="yz-now-card is-eat"><h3>此时宜吃</h3><ul>${fill(eat, 'food').map((x) => li(x.it)).join('')}</ul></div>
    <div class="yz-now-card is-xu"><h3>近日圩期</h3><ul>${xuLis || '<li>近三日无圩</li>'}${fests}</ul></div>`;
}

// ---------------------------------------------------------------------------
// 问路表单
// ---------------------------------------------------------------------------
const form = {
  origin: 'gl-city', length: 'day', mode: 'car', prefs: new Set(['eat']), date: ymd(today), seed: 1, skip: [],
};

function chips(el, opts, isOn, onClick) {
  el.innerHTML = opts.map(([v, label, sub]) => `<button type="button" class="yz-chip" data-v="${esc(v)}" aria-pressed="${isOn(v)}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('.yz-chip');
    if (!b) return;
    onClick(b.dataset.v);
    el.querySelectorAll('.yz-chip').forEach((x) => x.setAttribute('aria-pressed', String(isOn(x.dataset.v))));
  };
}

function renderForm() {
  chips($('#yz-f-origin'), ORIGINS.map((o) => [o.id, o.name, o.note]), (v) => form.origin === v, (v) => { form.origin = v; });
  chips($('#yz-f-length'), Object.entries(LENGTHS).map(([k, v]) => [k, v.name]), (v) => form.length === v, (v) => { form.length = v; });
  chips($('#yz-f-mode'), [['car', '自驾'], ['bus', '公交']], (v) => form.mode === v, (v) => { form.mode = v; });
  chips($('#yz-f-prefs'), Object.entries(PREFS), (v) => form.prefs.has(v), (v) => { form.prefs.has(v) ? form.prefs.delete(v) : form.prefs.add(v); });
  const di = $('#yz-f-date');
  di.value = form.date;
  di.min = ymd(today);
  const hint = () => {
    const d = parseYmd(di.value);
    if (!d) return;
    const ms = marketsOn(d).filter((m) => m.sure).map((m) => m.name);
    $('#yz-date-hint').textContent = `${lunarText(d)}${ms.length ? ' · 逢' + ms.join('、') : ''}`;
  };
  di.onchange = () => { form.date = di.value; hint(); };
  hint();
  $('#yz-form').onsubmit = (e) => {
    e.preventDefault();
    form.seed = 1;
    form.skip = [];
    runPlan(true);
  };
}

function currentParams() {
  return { origin: form.origin, length: form.length, mode: form.mode, prefs: [...form.prefs], date: form.date, seed: form.seed, skip: form.skip };
}

// ---------------------------------------------------------------------------
// 一卷
// ---------------------------------------------------------------------------
let lastPlan = null;

function runPlan(scrollTo) {
  const plan = makePlan(currentParams());
  lastPlan = plan;
  const enc = encodePlanParams(plan.params);
  history.replaceState(null, '', `#plan=${encodeURIComponent(enc)}`);
  renderScroll(plan);
  if (scrollTo) $('#yz-scroll').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stepHtml(s, mode) {
  const it = s.item;
  const bits = [];
  if (it.where) bits.push(it.where);
  if (it.price) bits.push(it.price);
  if (it.route && mode === 'bus' && /路/.test(it.route)) bits.push(it.route);
  if (it.note) bits.push(it.note);
  return `
    <li class="yz-step is-move">${s.travel >= 10 ? `${mode === 'bus' ? '乘车' : '驱车'}${roundMin(s.travel)}` : '步行即到'}</li>
    <li class="yz-step ${it.kind === 'food' ? 'is-food' : ''}" data-id="${it.id}">
      <div class="yz-step-time"><b>${s.slot.name}</b>${fmtClock(s.arrive)} 前后</div>
      <div class="yz-step-name">${esc(it.name)}<small>${esc(TOWN_NAMES[it.town])}</small></div>
      <p>${esc(it.line)}</p>
      ${s.side.length ? `<div class="yz-side"><em>顺道尝</em>${s.side.map((x) => esc(x.name)).join('、')}</div>` : ''}
      ${bits.length ? `<div class="yz-small">${bits.map(esc).join(' · ')}</div>` : ''}
      <div class="yz-step-acts"><button type="button" data-swap="${it.id}">换一处</button><button type="button" data-go="${it.id}">细看</button></div>
    </li>`;
}

function renderScroll(plan) {
  const el = $('#yz-scroll');
  el.hidden = false;
  const p = plan.params;
  const sub = `${plan.origin.name}起程 · ${plan.length.name} · ${p.mode === 'bus' ? '公交' : '自驾'}${p.prefs.length ? ' · ' + p.prefs.map((k) => PREFS[k]).join('、') : ''}`;
  const daysHtml = plan.days.map((d, i) => {
    const notes = [];
    if (d.markets.length) notes.push(`是日${d.markets.map((m) => m.name + (m.sure ? '' : '（或）')).join('、')}`);
    for (const f of d.fests) notes.push(`${f.name}：${f.when}`);
    const head = plan.days.length > 1 ? `第${DAY_NUM[i + 1]}日` : '是日';
    const start = i === 0 ? `<p class="yz-back-home">${fmtClock(d.departAt)} 自${esc(plan.origin.name)}出发</p>` : '';
    const end = d.sleep ? `<p class="yz-back-home">夜宿${esc(TOWN_NAMES[d.sleep.town] || '')}一带</p>`
      : `<p class="yz-back-home">${p.mode === 'bus' ? '乘车' : '驱车'}${roundMin(d.back)}回${esc(plan.origin.name)}，约 ${fmtClock(d.backAt)} 到</p>`;
    return `<div class="yz-day">
      <h3 class="yz-day-h"><b>${head} · ${esc(d.lineName)}</b><span>${d.date.getMonth() + 1} 月 ${d.date.getDate()} 日 周${WEEK[d.date.getDay()]} · ${lunarText(d.date)}</span></h3>
      ${notes.length ? `<p class="yz-day-note">${notes.map(esc).join('；')}</p>` : ''}
      ${start}
      <ol class="yz-steps">${d.stops.map((s) => stepHtml(s, p.mode)).join('')}</ol>
      ${end}
    </div>`;
  }).join('');
  el.innerHTML = `
    <div class="yz-scroll-head">
      <div><h2 class="yz-scroll-title">${esc(plan.title)}</h2><p class="yz-scroll-sub">${esc(sub)}</p></div>
      <span class="yz-scroll-seal" aria-hidden="true">灵川<br>游踪</span>
    </div>
    ${daysHtml || '<p>这一天合适的去处太少，换个日子或放宽所好再试。</p>'}
    <div class="yz-scroll-map">${mapSvg({ route: plan })}</div>
    <div class="yz-scroll-acts">
      <button type="button" class="yz-btn verm" id="yz-act-poster">存为长卷</button>
      <button type="button" class="yz-btn" id="yz-act-link">分享这一卷</button>
      <button type="button" class="yz-btn ghost" id="yz-act-reroll">换一卷</button>
    </div>`;
  el.onclick = (e) => {
    const sw = e.target.closest('[data-swap]');
    if (sw) {
      form.skip = [...new Set([...form.skip, sw.dataset.swap])];
      runPlan(false);
      toast('已换一处');
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) return focusItem(go.dataset.go);
    if (e.target.closest('#yz-act-reroll')) {
      form.seed += 1;
      form.skip = [];
      runPlan(false);
      toast('换了一卷');
    } else if (e.target.closest('#yz-act-link')) shareLink();
    else if (e.target.closest('#yz-act-poster')) openPoster();
  };
}

async function shareLink() {
  const url = location.href;
  const title = `灵川游踪 · ${lastPlan?.title || ''}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('链接已拷贝，发给同行的人吧');
  } catch {
    prompt('复制这个链接', url);
  }
}

// ---------------------------------------------------------------------------
// 县域示意图（SVG）
// ---------------------------------------------------------------------------
const BOUNDS = (() => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of OUTLINE) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, x1, y0, y1 };
})();
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function proj(ll, W, H, pad = 14) {
  const { x0, x1, y0, y1 } = BOUNDS;
  const my0 = merc(y0), my1 = merc(y1);
  const sx = (W - pad * 2) / (x1 - x0);
  const sy = (H - pad * 2) / ((my1 - my0) * 180 / Math.PI);
  const s = Math.min(sx, sy);
  const ox = (W - (x1 - x0) * s) / 2;
  const oy = (H - (my1 - my0) * 180 / Math.PI * s) / 2;
  return [ox + (ll[0] - x0) * s, oy + (my1 - merc(ll[1])) * 180 / Math.PI * s];
}

function mapSvg({ items = [], route = null, hi = '' } = {}) {
  const W = 360, H = 420;
  const path = OUTLINE.map((ll, i) => `${i ? 'L' : 'M'}${proj(ll, W, H).map((v) => v.toFixed(1)).join(',')}`).join('') + 'Z';
  let marks = '';
  if (route) {
    const colors = ['#B3261E', '#1F5E5B', '#C98A16'];
    route.days.forEach((d, di) => {
      const pts = [d === route.days[0] ? route.origin.ll : null, ...d.stops.map((s) => s.item.ll)].filter(Boolean).map((ll) => proj(ll, W, H));
      if (pts.length > 1) marks += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')}" fill="none" stroke="${colors[di % 3]}" stroke-width="1.6" stroke-dasharray="4 3" stroke-linecap="round"/>`;
      d.stops.forEach((s, si) => {
        const [x, y] = proj(s.item.ll, W, H);
        marks += `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${colors[di % 3]}"/><text x="${x.toFixed(1)}" y="${(y + 3.4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#FBF4E8">${si + 1}</text></g>`;
      });
    });
    const [ox, oy] = proj(route.origin.ll, W, H);
    marks += `<rect x="${(ox - 4).toFixed(1)}" y="${(oy - 4).toFixed(1)}" width="8" height="8" fill="#1C1916" transform="rotate(45 ${ox.toFixed(1)} ${oy.toFixed(1)})"/><text x="${(ox + 8).toFixed(1)}" y="${(oy + 4).toFixed(1)}" font-size="10" fill="#1C1916">${esc(route.origin.name)}</text>`;
  } else {
    for (const it of items) {
      const [x, y] = proj(it.ll, W, H);
      const c = it.kind === 'food' ? '#C98A16' : it.kind === 'fest' ? '#B3261E' : '#1F5E5B';
      marks += `<circle class="dot" data-go="${it.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${it.id === hi ? 7 : 4.2}" fill="${c}" fill-opacity="${it.id === hi ? 1 : 0.78}" stroke="#FBF8F0" stroke-width="1.2"/>`;
    }
  }
  const towns = Object.entries(TOWN_SEATS).map(([id, ll]) => {
    const [x, y] = proj(ll, W, H);
    return `<text x="${x.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#5A5147" opacity="0.8">${esc(TOWN_NAMES[id])}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="灵川县域示意">
    <defs><filter id="yzpaper"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.05 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    <path d="${path}" fill="#E6EBD3" stroke="#8C5D49" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="${path}" filter="url(#yzpaper)"/>
    ${towns}${marks}
  </svg>`;
}

const TOWN_SEATS = {
  lantian: [110.1966, 25.6097], gongping: [110.1571, 25.4931], jiuwu: [110.251, 25.5302], sanjie: [110.3849, 25.4685],
  tanxia: [110.2822, 25.4545], 'lingchuan-zhen': [110.3217, 25.4129], dingjiang: [110.2996, 25.3381], lingtian: [110.4723, 25.3441],
  haiyang: [110.5628, 25.3094], daxu: [110.4224, 25.1891], chaotian: [110.5086, 25.2], dajing: [110.5774, 25.2038],
};

// ---------------------------------------------------------------------------
// 十二月令
// ---------------------------------------------------------------------------
let monthFilter = 0;
function renderMonths() {
  const now = today.getMonth() + 1;
  const strip = $('#yz-month-strip');
  strip.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const picks = [
      ...FESTS.filter((f) => f.months.includes(m)).map((f) => f.name),
      ...ITEMS.filter((it) => it.months?.includes(m) && it.heard).sort((a, b) => b.heard - a.heard).map((it) => it.name),
    ];
    const uniq = [...new Set(picks)].slice(0, 4);
    return `<button type="button" class="yz-month ${m === now ? 'is-now' : ''}" role="tab" data-m="${m}" aria-selected="${monthFilter === m}">
      <b>${MONTH_NAME[m]}</b><i>${MONTH_ALIAS[m]}</i><ul>${uniq.map((n) => `<li>${esc(n)}</li>`).join('') || '<li>四时皆宜处</li>'}</ul></button>`;
  }).join('');
  strip.onclick = (e) => {
    const b = e.target.closest('.yz-month');
    if (!b) return;
    const m = Number(b.dataset.m);
    monthFilter = monthFilter === m ? 0 : m;
    strip.querySelectorAll('.yz-month').forEach((x) => x.setAttribute('aria-selected', String(Number(x.dataset.m) === monthFilter)));
    renderList();
    $('#yz-list-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  requestAnimationFrame(() => {
    const cur = strip.querySelector('.is-now');
    if (cur) strip.scrollLeft = cur.offsetLeft - 16;
  });
}

// ---------------------------------------------------------------------------
// 风物录
// ---------------------------------------------------------------------------
const filt = { kind: 'all', town: 'all', tags: new Set() };
const ALL = [
  ...ITEMS,
  ...FESTS.map((f) => ({ ...f, kind: 'fest', heard: (f.src || []).length, tags: [], say: [] })),
];
let hiId = '';
let pageSize = 18;

function listItems() {
  return ALL.filter((it) => (filt.kind === 'all' || it.kind === filt.kind)
    && (filt.town === 'all' || it.town === filt.town)
    && [...filt.tags].every((t) => (it.tags || []).includes(t))
    && (!monthFilter || !it.months?.length || it.months.includes(monthFilter)))
    .sort((a, b) => (b.heard || 0) - (a.heard || 0));
}

function cardHtml(it) {
  const months = it.months?.length ? it.months.map((m) => MONTH_NAME[m]).join('、') : '四时皆宜';
  const slots = (it.slots || []).map((s) => SLOT_NAME[s]).join('、');
  const xu = it.xu ? MARKETS.find((m) => m.id === it.xu) : null;
  const meta = [
    it.kind === 'fest' ? ['时候', it.when] : ['宜', months + (slots ? ' · ' + slots : '')],
    xu ? ['圩期', `${xu.name}${marketDaysText(xu)}`] : null,
    it.where ? ['在', it.where] : null,
    it.price ? ['价', it.price] : null,
    it.route ? ['怎么去', it.route] : null,
  ].filter(Boolean);
  const src = (it.src || []).filter((s) => s[1]).map((s) => `<a href="${esc(s[1])}" target="_blank" rel="noopener nofollow">据${esc(s[0])}</a>`).join('');
  const tags = (it.tags || []).map((t) => TAGS[t]).filter(Boolean).join(' · ');
  const inBag = bag.has(it.id);
  return `<li class="yz-card ${it.id === hiId ? 'is-hi' : ''}" id="yz-${it.id}" data-id="${it.id}">
    <div class="yz-card-top"><span class="yz-kind ${it.kind}">${KIND[it.kind]}</span><h3>${esc(it.name)}${it.alias ? `<small>又名${esc(it.alias)}</small>` : ''}</h3><span class="yz-town">${esc(TOWN_NAMES[it.town])}${it.kind !== 'fest' ? ' · ' + heardText(it.heard) : ''}</span></div>
    <p>${esc(it.line)}</p>
    ${it.say?.length ? `<blockquote class="yz-say">${it.say.slice(0, 2).map((q) => `<span>「${esc(q)}」</span>`).join('')}<cite>—— 网友</cite></blockquote>` : ''}
    <div class="yz-meta">${meta.map(([k, v]) => `<span><b>${esc(k)}</b>${esc(v)}</span>`).join('')}${tags ? `<span><b>另</b>${esc(tags)}</span>` : ''}</div>
    ${it.note && it.kind !== 'fest' ? `<div class="yz-note">${esc(it.note)}</div>` : ''}
    ${src ? `<div class="yz-src">${src}</div>` : ''}
    <div class="yz-card-acts">
      <button type="button" data-bag="${it.id}" class="${inBag ? 'is-in' : ''}">${inBag ? '已在囊中' : '收入囊中'}</button>
      <a href="./index.html?town=${encodeURIComponent(it.town)}&z=3.4">在全境图上看</a>
    </div>
  </li>`;
}

function renderList() {
  const list = listItems();
  $('#yz-list-count').textContent = `${list.length} 条`;
  const shown = list.slice(0, pageSize);
  $('#yz-list').innerHTML = shown.map(cardHtml).join('')
    + (list.length > pageSize ? `<li class="yz-more"><button type="button" class="yz-btn ghost" id="yz-more">再看 ${Math.min(18, list.length - pageSize)} 条</button></li>` : '');
  $('#yz-map').innerHTML = mapSvg({ items: list, hi: hiId });
}

function renderFilters() {
  chips($('#yz-f-kind'), [['all', '全部'], ['food', '吃'], ['place', '游'], ['fest', '节令']], (v) => filt.kind === v, (v) => { filt.kind = v; pageSize = 18; renderList(); });
  chips($('#yz-f-town'), [['all', '十二乡镇'], ...Object.entries(TOWN_NAMES)], (v) => filt.town === v, (v) => { filt.town = v; pageSize = 18; renderList(); });
  chips($('#yz-f-tag'), Object.entries(TAGS), (v) => filt.tags.has(v), (v) => { filt.tags.has(v) ? filt.tags.delete(v) : filt.tags.add(v); pageSize = 18; renderList(); });
}

function focusItem(id) {
  const it = ALL.find((x) => x.id === id);
  if (!it) return;
  filt.kind = 'all';
  filt.town = 'all';
  filt.tags.clear();
  monthFilter = 0;
  renderFilters();
  renderMonths();
  hiId = id;
  const idx = listItems().findIndex((x) => x.id === id);
  pageSize = Math.max(18, idx + 1);
  renderList();
  const el = document.getElementById(`yz-${id}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-bag]');
  if (b) {
    const id = b.dataset.bag;
    if (bag.has(id)) {
      bag.delete(id);
      toast('已从囊中取出');
    } else {
      bag.add(id);
      toast('收入囊中');
    }
    saveBag();
    document.querySelectorAll(`[data-bag="${CSS.escape(id)}"]`).forEach((x) => {
      x.classList.toggle('is-in', bag.has(id));
      x.textContent = bag.has(id) ? '已在囊中' : '收入囊中';
    });
    if (!$('#yz-bag').hidden) renderBag();
    return;
  }
  if (e.target.closest('#yz-more')) {
    pageSize += 18;
    renderList();
    return;
  }
  const go = e.target.closest('[data-go]');
  if (go && !go.closest('#yz-scroll')) {
    if (!$('#yz-bag').hidden) $('#yz-bag').hidden = true;
    focusItem(go.dataset.go);
    return;
  }
  if (e.target.matches('.yz-sheet') || e.target.closest('[data-close]')) {
    e.target.closest('.yz-sheet').hidden = true;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.yz-sheet').forEach((s) => { s.hidden = true; });
});

function renderBag() {
  const items = ALL.filter((it) => bag.has(it.id));
  $('#yz-bag-list').innerHTML = items.map(cardHtml).join('');
  $('#yz-bag-empty').hidden = items.length > 0;
}
$('#yz-bag-btn').onclick = () => {
  renderBag();
  $('#yz-bag').hidden = false;
};

// ---------------------------------------------------------------------------
// 网友行脚
// ---------------------------------------------------------------------------
function renderRoutes() {
  $('#yz-route-list').innerHTML = ROUTES.map((r) => `<article class="yz-route">
    <h3>${esc(r.name)}<small>${esc(r.by)}</small></h3>
    <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${r.tip ? `<p class="yz-tipline">${esc(r.tip)}</p>` : ''}
    <div class="yz-src">${r.src.map((s) => `<a href="${esc(s[1])}" target="_blank" rel="noopener nofollow">据${esc(s[0])}</a>`).join('')}</div>
  </article>`).join('');
}

// ---------------------------------------------------------------------------
// 长卷图（Canvas）
// ---------------------------------------------------------------------------
const FONT_KAI = '"MSZ", "Kaiti SC", "STKaiti", "KaiTi", serif';
const FONT_SERIF = '"Songti SC", "STSong", "Noto Serif CJK SC", serif';

function wrapText(g, text, maxW) {
  const out = [];
  let line = '';
  const noStart = '，。、；：！？）」』》,.;:!?)';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW && line && !noStart.includes(ch)) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

function drawPoster(plan) {
  const W = 1080;
  const pad = 84;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  // 先量高度
  const blocks = [];
  g.font = `34px ${FONT_SERIF}`;
  for (const [di, d] of plan.days.entries()) {
    blocks.push({ type: 'day', d, di });
    for (const s of d.stops) {
      g.font = `30px ${FONT_SERIF}`;
      const lines = wrapText(g, s.item.line, W - pad * 2 - 70);
      blocks.push({ type: 'stop', s, lines });
    }
  }
  let H = 420;
  for (const b of blocks) H += b.type === 'day' ? 120 : 110 + b.lines.length * 44 + (b.s.side.length ? 44 : 0);
  H += 760; // 地图与落款
  c.width = W;
  c.height = H;

  // 纸
  g.fillStyle = '#F5F0E3';
  g.fillRect(0, 0, W, H);
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(110,80,40,0.05)';
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 5, 1);
  }
  const edge = g.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(120,90,50,0.10)');
  edge.addColorStop(0.04, 'rgba(120,90,50,0)');
  edge.addColorStop(0.96, 'rgba(120,90,50,0)');
  edge.addColorStop(1, 'rgba(120,90,50,0.10)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);

  // 题
  let y = 150;
  g.fillStyle = '#1C1916';
  g.font = `92px ${FONT_KAI}`;
  g.textBaseline = 'alphabetic';
  g.fillText(plan.title, pad, y);
  // 印
  const sx = W - pad - 112;
  g.save();
  g.translate(sx + 56, 92);
  g.rotate(-0.06);
  g.fillStyle = '#B3261E';
  g.fillRect(-56, -56, 112, 112);
  g.strokeStyle = 'rgba(250,243,230,0.55)';
  g.lineWidth = 4;
  g.strokeRect(-48, -48, 96, 96);
  g.fillStyle = '#FAF3E6';
  g.font = `38px ${FONT_KAI}`;
  g.textAlign = 'center';
  g.fillText('灵川', 0, -6);
  g.fillText('游踪', 0, 38);
  g.restore();
  y += 58;
  g.fillStyle = '#5A5147';
  g.font = `28px ${FONT_SERIF}`;
  const p = plan.params;
  g.fillText(`${plan.origin.name}起程 · ${plan.length.name} · ${p.mode === 'bus' ? '公交' : '自驾'}`, pad, y);
  y += 44;
  g.fillText(`${plan.days[0]?.date.getMonth() + 1} 月 ${plan.days[0]?.date.getDate()} 日 · ${lunarText(plan.days[0]?.date || today)}`, pad, y);
  y += 40;
  g.strokeStyle = 'rgba(28,25,22,0.18)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(pad, y);
  g.lineTo(W - pad, y);
  g.stroke();
  y += 30;

  const colors = ['#B3261E', '#1F5E5B', '#C98A16'];
  let lineTop = 0;
  for (const b of blocks) {
    if (b.type === 'day') {
      y += 56;
      g.fillStyle = '#1C1916';
      g.font = `46px ${FONT_KAI}`;
      const head = plan.days.length > 1 ? `第${DAY_NUM[b.di + 1]}日` : '是日';
      g.fillText(`${head} · ${b.d.lineName}`, pad, y);
      g.fillStyle = '#B3261E';
      g.font = `24px ${FONT_SERIF}`;
      const notes = [...b.d.markets.map((m) => m.name), ...b.d.fests.map((f) => f.name)];
      if (notes.length) g.fillText(notes.join(' · '), pad, y + 40);
      y += 64;
      lineTop = y;
      continue;
    }
    const s = b.s;
    const x0 = pad + 70;
    const col = colors[plan.days.indexOf(plan.days.find((d) => d.stops.includes(s))) % 3];
    // 节点
    g.fillStyle = '#FBF8F0';
    g.strokeStyle = s.item.kind === 'food' ? '#C98A16' : col;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(pad + 22, y + 22, 14, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#8C8176';
    g.font = `24px ${FONT_KAI}`;
    g.fillText(`${s.slot.name} ${fmtClock(s.arrive)}`, x0, y + 14);
    g.fillStyle = '#1C1916';
    g.font = `bold 40px ${FONT_SERIF}`;
    g.fillText(s.item.name, x0, y + 64);
    const nw = g.measureText(s.item.name).width;
    g.fillStyle = '#8C8176';
    g.font = `24px ${FONT_SERIF}`;
    g.fillText(TOWN_NAMES[s.item.town], x0 + nw + 16, y + 64);
    let yy = y + 110;
    g.fillStyle = '#5A5147';
    g.font = `30px ${FONT_SERIF}`;
    for (const ln of b.lines) {
      g.fillText(ln, x0, yy);
      yy += 44;
    }
    if (s.side.length) {
      g.fillStyle = '#8F5F0B';
      g.font = `28px ${FONT_SERIF}`;
      g.fillText(`顺道尝 ${s.side.map((x) => x.name).join('、')}`, x0, yy);
      yy += 44;
    }
    // 连线
    g.strokeStyle = 'rgba(28,25,22,0.22)';
    g.setLineDash([8, 8]);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(pad + 22, y + 40);
    g.lineTo(pad + 22, yy - 4);
    g.stroke();
    g.setLineDash([]);
    y = yy + 6;
  }

  // 小地图
  y += 40;
  const mapW = W - pad * 2;
  const mapH = 560;
  const img = new Image();
  const svg = mapSvg({ route: plan }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return new Promise((resolve) => {
    const finish = () => {
      // 落款
      g.fillStyle = '#8C8176';
      g.font = `24px ${FONT_SERIF}`;
      g.textAlign = 'left';
      g.fillText('所录出自网友游记与本地报道 · 圩期以当地为准', pad, H - 96);
      g.fillText('duomei.site/lingchuan-walk/youzong.html', pad, H - 58);
      g.textAlign = 'right';
      g.fillStyle = '#B3261E';
      g.font = `30px ${FONT_KAI}`;
      g.fillText('多美 · 灵川', W - pad, H - 58);
      resolve(c);
    };
    img.onload = () => {
      const ratio = Math.min(mapW / 360, mapH / 420);
      const dw = 360 * ratio;
      const dh = 420 * ratio;
      g.drawImage(img, (W - dw) / 2, y, dw, dh);
      finish();
    };
    img.onerror = finish;
  });
}

let posterBlob = null;
async function openPoster() {
  if (!lastPlan) return;
  toast('正在铺纸研墨…');
  try { await document.fonts.load('40px MSZ'); } catch { /* 字体未到就用系统字 */ }
  const canvas = await drawPoster(lastPlan);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  posterBlob = blob;
  const url = URL.createObjectURL(blob);
  $('#yz-poster-img').src = url;
  const dl = $('#yz-poster-dl');
  dl.href = url;
  dl.download = `灵川游踪-${lastPlan.title}.png`;
  $('#yz-poster').hidden = false;
}
$('#yz-poster-share').onclick = async () => {
  if (!posterBlob) return;
  const file = new File([posterBlob], `灵川游踪-${lastPlan.title}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `灵川游踪 · ${lastPlan.title}`, text: location.href });
      return;
    }
  } catch {
    return;
  }
  shareLink();
};

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
renderNow();
renderForm();
renderMonths();
renderFilters();
renderList();
renderRoutes();

const hashPlan = /plan=([^&]+)/.exec(location.hash);
if (hashPlan) {
  const p = parsePlanParams(decodeURIComponent(hashPlan[1]));
  form.origin = p.origin;
  form.length = p.length;
  form.mode = p.mode;
  form.prefs = new Set(p.prefs);
  form.date = p.date && parseYmd(p.date) ? p.date : ymd(today);
  form.seed = p.seed;
  form.skip = p.skip;
  renderForm();
  runPlan(true);
}
window.__YZ = { makePlan, currentParams };
