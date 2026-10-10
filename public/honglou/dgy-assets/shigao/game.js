// 第 32 轮：詩稿 v3 样张接进游戏的桥（只在 dgy-assets/shigao/index.html 末尾加载；样张本身的代码由 scripts/dgy-r32-shigao-prep.py 原样搬来）。
// 样张的脚本是普通 <script>，顶层的 const / let / function 在这里都能直接用（$、db、notes、mode、selected、render、openPoem、openBox …）。
//
// 游戏一侧（dgy/shigao.js）通过 window.SHIGAO 调：
//   SHIGAO.open({ view, sel, cover })   册里「詩稿」：view = society | person | chapter；cover 为真先见锦函（启函四步），否则直接展到那一叠
//   SHIGAO.openPoem(id)                 单首展读（人物卡 / 园中载体 / 原著里点一首）：页面透明，只浮起一张笺
//   SHIGAO.openClub(id)                 诗会长卷（园中案上诗笺）：不出书案底画，背后是虚化的园景
//   SHIGAO.reset()                      游戏收起浮层后复位（关掉对话框、收起函）
// 这里往游戏报：parent.__dgyShigao.on(事件, …)：close（要收起）、read(id)（一笺写完 / 跳过）、person(id)、sfx(name)
// 另补样张缺的：意象、古人评点（poems-duizhao.json「意象」「评点」，评点注明出处）、按人页的人名索引签与 87 版小像；去掉开发备注与常驻操作说明。
(() => {
  'use strict';
  const H = () => { try { return parent !== window ? parent.__dgyShigao || null : null; } catch (e) { return null; } };
  const emit = (ev, a) => { const h = H(); if (h && h.on) { try { h.on(ev, a); } catch (e) { console.warn('[shigao] host', e); } } };
  const root = document.documentElement;
  const isMobile = () => innerWidth <= 767 || (matchMedia('(pointer:coarse)').matches && Math.min(innerWidth, innerHeight) <= 600);
  const touch = matchMedia('(pointer:coarse)').matches;
  const relayout = () => { const v = isMobile() ? 'mobile' : 'desktop'; if (v !== document.body.dataset.layout) layout(v, false); };

  // ——— 87 版立绘小像（第 31 轮 scripts/dgy-r31-prep.py 从立绘取头；凤姐文件名是 fengjie）———
  const HEAD = { daiyu: 'daiyu', baochai: 'baochai', baoyu: 'baoyu', tanchun: 'tanchun', xiangyun: 'xiangyun', liwan: 'liwan', xifeng: 'fengjie', miaoyu: 'miaoyu', yingchun: 'yingchun', xichun: 'xichun' };
  // 第 32 轮：头像统一走游戏的 faces.js（87 版 → map/faces → 关系图旧像 → 圆印 + 姓氏字）；单独打开本页时退回第 31 轮的头
  const PF = (() => { try { return parent !== window ? parent.__dgyFaces : null; } catch (e) { return null; } })();
  const headURL = (id) => { if (PF) { const u = PF.faceOf(id, 160); return u ? new URL('../../' + u, location.href).href : null; } return HEAD[id] ? new URL('ui/xz/r31/head/' + HEAD[id] + '.webp', ASSET).href : null; };
  const SEAL1 = { xiuyan: '邢', liwen: '李', liqi: '李', baoqin: '薛', xiangling: '香' }; // 没有头像的人：宣纸圆印 + 姓氏字（行书字一律繁体）
  const faceHTML = (id, cls) => { const u = headURL(id), p = people[id]; return u ? '<img class="' + cls + '" src="' + u + '" alt="" loading="lazy" decoding="async">' : '<span class="' + cls + ' sg-face-ph" aria-hidden="true">' + esc(PF ? PF.sealChar(id) : SEAL1[id] || (p ? p.name : id).slice(-1)) + '</span>'; };
  const PORDER = ['daiyu', 'baochai', 'baoyu', 'tanchun', 'xiangyun', 'liwan', 'yingchun', 'xichun', 'miaoyu', 'xifeng', 'baoqin', 'xiangling', 'xiuyan', 'liwen', 'liqi'];
  const personIds = () => { const ks = Object.keys(db.人物); return PORDER.filter((k) => ks.includes(k)).concat(ks.filter((k) => !PORDER.includes(k))); };

  // 左栏人名索引：小像换成 87 版立绘头像（没有立绘的人仍是一字圆印）
  personIndex = function () {
    return personIds().map((id) => { const p = people[id], n = db.人物[id].length;
      return '<button class="index-item ' + (selected === id ? 'on' : '') + '" data-select="' + id + '" aria-pressed="' + (selected === id) + '">' + faceHTML(id, 'sg-ix-face') +
        '<span><strong>' + esc(p.alias || p.name) + '</strong><small>' + esc(p.name) + ' · ' + cn(n) + '首</small></span></button>'; }).join('');
  };

  // 每次排版之后：按人页段首大小像 + 手机上的人名索引签（左栏在手机上是收起的）
  const render0 = render;
  render = function () {
    render0();
    if (!loaded) return;
    const head = $('.section-head');
    head.querySelector('.sg-head-face')?.remove();
    if (mode === 'person' && people[selected]) head.insertAdjacentHTML('afterbegin', faceHTML(selected, 'sg-head-face'));
    head.classList.toggle('sg-has-face', mode === 'person');
    if (mode === 'person' && people[selected]) $('#section-sub').textContent = people[selected].name + ' · ' + people[selected].paper; // 去掉「起社前落本名」这类解释小字（§27）
    if (mode === 'person' && document.body.dataset.layout === 'mobile') {
      const nav = document.createElement('nav'); nav.className = 'sg-pidx'; nav.setAttribute('aria-label', '各人诗笺');
      nav.innerHTML = personIds().map((id) => '<button type="button" data-pick="' + id + '" aria-pressed="' + (selected === id) + '">' + faceHTML(id, 'sg-pi-face') + '<b>' + esc(people[id].name.length > 2 ? people[id].name.slice(-2) : people[id].name) + '</b><small>' + cn(db.人物[id].length) + '</small></button>').join('');
      $('#portfolio').prepend(nav);
      nav.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => { selected = b.dataset.pick; const x = nav.scrollLeft; render(); const n2 = $('.sg-pidx'); if (n2) n2.scrollLeft = x; animate($('#portfolio .card-track'), [{ opacity: 0.3, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], 240); }; });
      const on = nav.querySelector('[aria-pressed="true"]'); if (on) requestAnimationFrame(() => { if (on.offsetLeft > nav.clientWidth - 60) nav.scrollLeft = on.offsetLeft - 16; });
    }
  };

  // ——— 单首展读：补意象、古人评点；作者名可点见人物 ———
  const IMG_TRAD = (s) => s;
  const prep0 = preparePoemV3;
  preparePoemV3 = function (id) {
    prep0(id);
    const e = comparisonFor(id), box = $('#poem-postscript');
    if (!box) return;
    box.querySelectorAll('.sg-extra').forEach((x) => x.remove());
    const yx = e && Array.isArray(e.意象) ? e.意象 : [], pd = e && Array.isArray(e.评点) ? e.评点 : [];
    if (yx.length) {
      const hard = box.querySelector('#hard-characters'), hh = hard && hard.previousElementSibling;
      const sec = document.createElement('div'); sec.className = 'sg-extra sg-yx';
      sec.innerHTML = '<h3>意象</h3><dl>' + yx.map((t) => '<div><dt>' + esc(IMG_TRAD(t.象)) + '</dt><dd>' + esc(t.解) + '</dd></div>').join('') + '</dl>';
      box.insertBefore(sec, hh && hh.tagName === 'H3' ? hh : hard);
    }
    if (pd.length) {
      const sec = document.createElement('div'); sec.className = 'sg-extra sg-pd';
      sec.innerHTML = '<h3>古人評點</h3>' + pd.map((t) => '<figure><blockquote>' + esc(t.文) + '</blockquote><figcaption>' + esc(t.出处) + '</figcaption></figure>').join('');
      box.appendChild(sec);
    }
  };
  const openPoem0 = openPoem;
  openPoem = function (index) {
    openPoem0(index);
    const id = activeIds[currentPoem], p = db.作品[id]; if (!p) return;
    const by = $('#detail-byline');
    by.innerHTML = authorIds(p).map((a) => people[a] ? '<button type="button" class="sg-who" data-person="' + a + '">' + esc(people[a].name) + '</button>' : esc(a)).join('、') + ' · 第' + cn(p.回) + '回';
    by.querySelectorAll('[data-person]').forEach((b) => { b.onclick = () => emit('person', b.dataset.person); });
    readArm(id);
    requestAnimationFrame(() => { const an = $('.annotation'); if (an) an.scrollTop = 0; const db2 = $('#detail-body'); if (db2) db2.scrollTop = 0; });
    emit('sfx', 'paper-set');
  };
  // 一笺写完（或被跳过）记一次「读过」
  let readId = null; const readDone = new Set();
  function readArm(id) { readId = id; }
  new MutationObserver(() => { const a = $('#poem-area'); if (readId && a && a.classList.contains('finished') && $('#poem-dialog').open && !readDone.has(readId)) { readDone.add(readId); emit('read', readId); } })
    .observe($('#poem-area'), { attributes: true, attributeFilter: ['class'] });

  const NAME_T = { '贾宝玉': '賈寶玉', '薛宝钗': '薛寶釵', '贾探春': '賈探春', '史湘云': '史湘雲', '李纨': '李紈', '贾迎春': '賈迎春', '贾惜春': '賈惜春', '王熙凤': '王熙鳳', '邢岫烟': '邢岫煙', '李纹': '李紋', '李绮': '李綺', '薛宝琴': '薛寶琴' };
  const draw0 = drawRanking;
  drawRanking = function () { draw0(); $$('#ranking .rank-paper strong').forEach((el) => { el.textContent = el.textContent.split('、').map((n) => NAME_T[n] || n).join('、'); }); };
  // 落印声走游戏的音效（游戏不在时用样张自己的合成声）
  const stamp0 = stampSound;
  stampSound = function () { if (H()) emit('sfx', 'seal'); else stamp0(); };

  // ——— 锦函：游戏里多一枚「閉」（函面状态也要有出口）；「閉」= 收起整套回到册，「收箋入匣」仍是倒放合函 ———
  const entry = $('#entry');
  entry.insertAdjacentHTML('beforeend', '<button type="button" class="stamp-btn sg-entry-x" id="sg-entry-x" aria-label="合上詩稿，回到冊">閉</button>');
  $('#sg-entry-x').onclick = () => emit('close');
  $('#close-box').onclick = () => emit('close');
  $('#close-box').setAttribute('aria-label', '合上詩稿，回到冊');
  $('#open-box').setAttribute('aria-label', '启函：点一下或按回车展开诗稿锦函，展开中再点跳过这一步');

  // Esc：对话框开着交给对话框自己（合上回到原处）；否则收起整套
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault(); emit('close');
  });
  // 单首模式：笺一合上就收起浮层
  $('#poem-dialog').addEventListener('close', () => { if (root.classList.contains('sg-single')) setTimeout(() => { if (!$('#poem-dialog').open && !$('#reader').open) emit('close'); }, 0); });
  $('#reader').addEventListener('close', () => { if (root.classList.contains('sg-single') && !$('#poem-dialog').open) emit('close'); });

  // ——— 对游戏的接口 ———
  const ready = () => (loaded ? Promise.resolve() : load());
  function setMode(m) { root.classList.toggle('sg-single', m === 'single'); root.classList.toggle('sg-club', m === 'club'); }
  function syncTabs() { $$('.mode-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === mode))); }
  function showInside() { entry.hidden = true; $('#inside').inert = false; opening = false; setBoxPhase('ready'); entry.classList.remove('opening'); }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch (e) { /* */ } }); }
  const DEF = { person: 'daiyu', society: 'haitang', chapter: '37' };
  window.SHIGAO = {
    async open({ view = 'society', sel = null, cover = true } = {}) {
      setMode(null); relayout(); closeDialogs(); await ready();
      if (cover) { opening = false; entry.hidden = false; entry.classList.remove('opening', 'entry-fade'); $('#inside').inert = true; setBoxPhase('closed'); if (view === 'society' && sel && $$('[data-volume-select="' + sel + '"]').length) $('[data-volume-select="' + sel + '"]').click(); if (!touch) setTimeout(() => $('#open-box').focus({ preventScroll: true }), 30); return; }
      mode = view; selected = sel != null && (view !== 'person' || db.人物[sel]) ? String(sel) : DEF[view]; syncTabs(); render(); showInside();
      if (!touch) setTimeout(() => $('#tab-' + mode)?.focus({ preventScroll: true }), 30);
    },
    async openClub(id) {
      setMode('club'); relayout(); closeDialogs(); await ready();
      const map = { ju: 'juhua' }; mode = 'society'; selected = map[id] || id; if (!societies.some((s) => s.id === selected)) selected = 'haitang'; syncTabs(); render(); showInside();
    },
    async openPoem(id) {
      setMode('single'); relayout(); closeDialogs(); await ready();
      const p = db.作品[id]; if (!p) { emit('close'); return; }
      const a = authorIds(p)[0];
      if (db.人物[a] && db.人物[a].includes(id)) { mode = 'person'; selected = a; } else { const s = societies.find((q) => q.ids.includes(id)); mode = 'society'; selected = s ? s.id : 'shiyi'; }
      syncTabs(); render(); if (activeIds.indexOf(id) < 0) activeIds = [id];
      openPoem(activeIds.indexOf(id));
    },
    reset() { closeDialogs(); finishWriting(); },
    get state() { return { loaded, mode, selected, single: root.classList.contains('sg-single'), dialog: $('#poem-dialog').open, phase: boxPhase }; },
  };
  // 预载时先把三套行书字库解开、诗稿数据读好，第一次开函不卡
  setTimeout(() => { try { ['28px V3Brush', '20px UIScript', '20px XingQuote'].forEach((f) => document.fonts.load(f, '詩稿彩箋').catch(() => {})); } catch (e) { /* */ } ready().catch(() => {}); }, 300);
  emit('ready');
})();
