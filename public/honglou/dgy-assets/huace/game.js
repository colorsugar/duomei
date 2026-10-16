// 第 32 轮：畫中有話 v4 样张接进游戏的桥（只在 dgy-assets/huace/index.html 末尾加载；样张代码由 scripts/dgy-r32-huace-prep.py 搬来）。
// 画册数据：albums.json（scripts/dgy-r32-album-v4.mjs 从 albumData.js + 扩写稿 + 新版画稿生成，原文逐字核过），十三册全收。
// 游戏一侧（dgy/huace.js）调：HUACE.open(册 id, 旧幅号 | null)；这里往游戏报 parent.__dgyHuace.on(事件, …)：close / visit({placeId}) / person(id)。
(() => {
  'use strict';
  const H = () => { try { return parent !== window ? parent.__dgyHuace || null : null; } catch (e) { return null; } };
  const emit = (ev, a) => { const h = H(); if (h && h.on) { try { h.on(ev, a); } catch (e) { console.warn('[huace] host', e); } } };
  const ROOTP = '../../'; // 本页在 dgy-assets/huace/，albums.json 里的路径相对游戏根
  const context = document.createElement('details');
  context.className = 'album-context'; context.id = 'album-context';
  context.innerHTML = '<summary>卷首提要</summary><div class="ctx-body"><div class="ctx-in"><p class="album-context-text"></p><p class="album-context-preface"></p></div></div>';
  $('.notes-column').insertBefore(context, $('.narration-layer'));
  // 卷首提要：点开平滑展开并滚进视野，收起平滑合上并滚回「卷首提要」条（用 grid 0fr→1fr 做高度动画，不受字号档 zoom 影响）
  const ctxSum = context.querySelector('summary'), ctxBody = context.querySelector('.ctx-body');
  let ctxBusy = false;
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  async function toggleContext() {
    if (ctxBusy) return; ctxBusy = true;
    try {
      if (!context.open) {
        context.open = true;
        if (!reduced()) { try { await ctxBody.animate([{ gridTemplateRows: '0fr', opacity: 0 }, { gridTemplateRows: '1fr', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished; } catch (e) { /* */ } }
        context.scrollIntoView({ behavior: smooth(), block: 'nearest' });
      } else {
        if (!reduced()) { try { await ctxBody.animate([{ gridTemplateRows: '1fr', opacity: 1 }, { gridTemplateRows: '0fr', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.4,0,1,1)' }).finished; } catch (e) { /* */ } }
        context.open = false;
        ctxSum.scrollIntoView({ behavior: smooth(), block: 'nearest' });
      }
    } finally { ctxBusy = false; }
  }
  ctxSum.addEventListener('click', (e) => { e.preventDefault(); toggleContext(); });
  let RAW = null, booted = null;
  const SEASON1 = (s) => (/春/.test(s) ? '春' : /夏|暑/.test(s) ? '夏' : /秋/.test(s) ? '秋' : /冬|雪/.test(s) ? '冬' : '');
  function load() {
    if (booted) return booted;
    booted = (async () => {
      const r = await fetch('albums.json'); RAW = await r.json();
      // 10-16 轻动效批量：dgy-assets/motion/manifest.json（静图路径 → mp4 / webm）补进没有循环片的幅；没有清单就全是静图
      let MAN = {}; try { const mr = await fetch('../motion/manifest.json'); if (mr.ok) MAN = (await mr.json()).条目 || {}; } catch (e) { /* 没有清单 */ }
      // 正式版卷首补笔独立存放，画稿生成脚本重跑时仍可保留。
      try {
        const prose = await (await fetch('album-prose-normal.json')).json();
        for (const a of RAW.册) if (prose.续论?.[a.id]) a.bgPz = `${a.bgPz || ''}\n\n${prose.续论[a.id]}`;
      } catch (e) { console.warn('[huace] 卷首补笔未加载', e); }
      for (const a of RAW.册) {
        ALBUMS[a.id] = { title: a.title, season: a.pages[0]?.season || '', cover: 0, inscription: a.inscription || '', mood: a.mood, placeName: a.placeName, oldMap: a.oldMap, background: a.bg || '', preface: a.bgPz || '',
          pages: a.pages.map((p, i) => ({ ...p, no: i + 1, img: p.img ? ROOTP + p.img : '', thumb: p.thumb ? ROOTP + p.thumb : '', loop: p.loop ? ROOTP + p.loop : MAN[p.img]?.mp4 ? ROOTP + MAN[p.img].mp4 : null, loopWebm: !p.loop && MAN[p.img]?.webm ? ROOTP + MAN[p.img].webm : null, place: p.place || a.placeName })) };
      }
      paintTabs();
      await window.HUAZHONG_BOOT();
    })();
    return booted;
  }
  // 册签：十三册一排（桌面居中可横滑，手机横滑），当前册滚进视口
  function paintTabs() {
    const nav = $('.album-tabs');
    nav.innerHTML = RAW.册.map((a) => '<button data-album="' + a.id + '" aria-pressed="false">' + esc(a.title) + '<span class="tab-mark">' + SEASON1(a.pages[0]?.season || '') + '</span></button>').join('');
    nav.querySelectorAll('[data-album]').forEach((b) => { b.onclick = () => selectAlbum(b.dataset.album); });
  }
  function syncTabs() {
    const nav = $('.album-tabs'); nav.hidden = false;
    nav.querySelectorAll('[data-album]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.album === current)));
    const on = nav.querySelector('[aria-pressed="true"]'); if (on) { const l = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2; nav.scrollTo({ left: Math.max(0, l), behavior: 'auto' }); }
  }
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $('#art').decoding = 'async'; // 画稿在后台线程解码，不卡开册 / 翻幅那一帧
  // 合上 = 回到游戏（不在页里显示「藏卷」）
  closeBook = async function () { turnRequest++; sourceRequest++; finishNarration(); $('#note-dialog').close(); emit('close'); };
  $('#close-book').onclick = closeBook; $('#book-sign').onclick = closeBook;
  $('#close-book').textContent = '閉'; $('#close-book').setAttribute('aria-label', '合上畫中有話，回到冊'); $('#book-sign').setAttribute('aria-label', '合上畫中有話，回到冊');
  // 到园中此处 / 见人物 交给游戏
  CONFIG.onVisit = ({ album }) => { const p = pageData(); emit('visit', { placeId: p.placeId || (RAW.册.find((a) => a.id === album) || {}).place || null }); };
  CONFIG.onPerson = (id) => emit('person', id);

  // 每幅画面：有循环片的放静音循环片（首帧就是这幅画，开播才淡入）；动效关 / 减少动态 / 页面藏起来时不放
  let vid = null;
  let vio = null; // 进入视野才播、离开视野暂停（页面窄屏滚到文字区、画被卷出去时停掉）
  function dropVid() { if (vio) { try { vio.disconnect(); } catch (e) { /* */ } vio = null; } if (!vid) return; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* */ } vid.remove(); vid = null; }
  // 允许播吗：减少动态 / 动效关 / 省电档 / 极简档只显静图（游戏一侧 dgy/motionLite.js 给 parent.__dgyMotion.allowed()；单独打开本页时只看系统「减少动态」）
  const motionOK = () => { try { const m = parent !== window ? parent.__dgyMotion : null; if (m) return !!m.allowed(); } catch (e) { /* */ } return !reduced(); };
  const overlayOn = () => { try { return parent === window || !!parent.document.querySelector('.dgy-huace.on'); } catch (e) { return true; } }; // 册还藏着（预载）时不拉视频
  let inView = true;
  // 统一的「该播还是该停」：开关（减少动态 / 动效关 / 省电 / 极简）不让播就摘掉只显静图；册没开、标签页藏起来、画面不在视野里就暂停；其余才继续播
  function syncVid() {
    const v = vid; if (!v) return;
    if (!motionOK()) { dropVid(); return; }
    if (overlayOn() && !document.hidden && inView) v.play().catch(() => {}); else v.pause();
  }
  function startVid(p) {
    dropVid(); if (!p || !p.loop || !motionOK() || document.hidden || !overlayOn()) return;
    const v = document.createElement('video'); v.className = 'hz-loop'; v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.setAttribute('aria-hidden', 'true'); v.disablePictureInPicture = true; v.preload = 'auto';
    v.src = p.loopWebm && !v.canPlayType('video/mp4') ? p.loopWebm : p.loop;
    v.addEventListener('playing', () => v.classList.add('on'), { once: true }); v.addEventListener('error', () => { if (vid === v) dropVid(); else v.remove(); }, { once: true });
    try { v.poster = p.img; } catch (e) { /* */ }
    $('#art').after(v); vid = v; v.play().catch(() => {});
    inView = true;
    if (typeof IntersectionObserver === 'function') { vio = new IntersectionObserver((es) => { for (const e of es) { if (vid !== v) return; inView = e.isIntersecting; syncVid(); } }, { threshold: 0.15 }); vio.observe(v); }
  }
  const render0 = renderPage;
  renderPage = async function (animate = true) {
    dropVid();
    const readingAlbum = current, readingIndex = pageIndex;
    const p = await render0(animate);
    const album = ALBUMS[current];
    context.querySelector('.album-context-text').textContent = album.background;
    context.querySelector('.album-context-preface').textContent = album.preface;
    context.open = pageIndex === 0;
    $('#visit').hidden = !p.placeId || DESK; // 书案模式（?desk）不进园：「到园中此处」不显示
    paintCount(p, album); buildNav(); markNav(); applyMove(); shownAt = performance.now();
    // 只报告真实展到的分镜；后台预载和合上后的迟到渲染不记游记。
    if (parent !== window && current === readingAlbum && pageIndex === readingIndex && !$('#book').hidden && parent.document.querySelector('.dgy-huace.on')) {
      parent.document.dispatchEvent(new parent.CustomEvent('dgy-journal-read', {
        detail: { kind: 'album', id: `${current}:${pageIndex + 1}`, edition: 'v4' },
      }));
    }
    startVid(p);
    return p;
  };
  document.addEventListener('visibilitychange', syncVid);
  // 设置里改「动效」、系统「减少动态」变了：马上同步（游戏页的 <html data-motion>）
  try { if (parent !== window) new MutationObserver(syncVid).observe(parent.document.documentElement, { attributes: true, attributeFilter: ['data-motion'] }); matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', syncVid); } catch (e) { /* */ }
  const select0 = selectAlbum;
  selectAlbum = async function (key, index) { if (index == null) { try { const v = localStorage.getItem('huazhong-v4-album-' + key); if (v != null) index = JSON.parse(v); } catch (e) { /* */ } } await select0(key, index); syncTabs(); };

  // 外层 .dgy-huace 的 on 类（淡入那一帧才挂上）一变就同步：开册时补起视频，合册时暂停
  let ovWatch = false;
  function watchOverlay() {
    if (ovWatch || parent === window) return; ovWatch = true;
    try { const el = parent.document.querySelector('.dgy-huace'); if (el) new MutationObserver(() => { if (!vid && overlayOn() && !$('#book').hidden) startVid(pageData()); else syncVid(); }).observe(el, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* */ }
  }

  // ===== 书案模式（?desk）：不进 3D，「到园中此处」隐藏 =====
  const DESK = (() => { try { return /[?&]desk\b/.test(location.search) || (parent !== window && /[?&]desk\b/.test(parent.location.search)); } catch (e) { return false; } })();

  // ===== 多幅提示：页码 / 圆点 / 缩略图带 / 左右箭头 / 自动轮换 =====
  function paintCount(p, album) { $('#count').innerHTML = '<b>' + cn(p.no) + '</b><i>/</i><span>' + cn(album.pages.length) + '</span>'; $('#count').setAttribute('aria-label', '第' + cn(p.no) + '幅，共' + cn(album.pages.length) + '幅'); }
  function buildNav() {
    const album = ALBUMS[current], dots = $('#hz-dots'), strip = $('#hz-strip');
    if (dots.dataset.album === current && dots.children.length === album.pages.length) return;
    dots.dataset.album = current; dots.replaceChildren(); strip.replaceChildren();
    $('#hz-nav').classList.toggle('many', album.pages.length > 9);
    album.pages.forEach((p, i) => {
      const label = '第' + cn(p.no) + '幅 · ' + p.title;
      const d = document.createElement('button'); d.type = 'button'; d.className = 'hz-dot'; d.setAttribute('aria-label', label); d.title = label; d.onclick = () => userGo(i); dots.append(d);
      const t = document.createElement('button'); t.type = 'button'; t.className = 'hz-th'; t.setAttribute('aria-label', label); t.title = label; t.onclick = () => userGo(i);
      const im = new Image(); im.src = p.thumb || p.img; im.alt = ''; im.decoding = 'async'; im.draggable = false; t.append(im);
      const n = document.createElement('span'); n.textContent = cn(p.no); t.append(n); strip.append(t);
    });
  }
  function markNav() {
    const dots = $('#hz-dots'), strip = $('#hz-strip');
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === pageIndex)));
    [...strip.children].forEach((t, i) => t.setAttribute('aria-current', String(i === pageIndex)));
    const cur = strip.children[pageIndex];
    if (cur) { const l = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2; try { strip.scrollTo({ left: Math.max(0, l), behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { strip.scrollLeft = Math.max(0, l); } }
  }
  const userGo = (i) => { lastAct = performance.now(); return turn(i); };
  $('#arrow-prev').onclick = () => userGo(pageIndex - 1); $('#arrow-next').onclick = () => userGo(pageIndex + 1);
  $('#prev').onclick = () => userGo(pageIndex - 1); $('#next').onclick = () => userGo(pageIndex + 1);

  // 每幅不同的推镜（起点、方向、放大 / 缩小各异）：Web Animations 驱动，来回往复；减少动态 / 动效关就不动
  const MOVES = [
    [{ s: 1.02, x: 0, y: 0 }, { s: 1.09, x: 0, y: 0 }],
    [{ s: 1.07, x: 2.6, y: 0 }, { s: 1.07, x: -2.6, y: 0 }],
    [{ s: 1.10, x: 0, y: 0 }, { s: 1.02, x: 0, y: 0 }],
    [{ s: 1.07, x: -2.6, y: 1.6 }, { s: 1.07, x: 2.6, y: -1.6 }],
    [{ s: 1.02, x: 0, y: 0 }, { s: 1.09, x: 2.8, y: 2 }],
    [{ s: 1.07, x: 0, y: -2.6 }, { s: 1.07, x: 0, y: 2.6 }],
  ];
  const tf = (m) => 'translate(' + m.x + '%,' + m.y + '%) scale(' + m.s + ')';
  let artAnim = null, artFrames = null, artTiming = null;
  function applyMove() {
    const art = $('#art'); try { artAnim && artAnim.cancel(); } catch (e) { /* */ } artAnim = null;
    if (reduced() || !motionOK()) return;
    const mv = MOVES[pageIndex % MOVES.length];
    artFrames = [{ transform: tf(mv[0]) }, { transform: tf(mv[1]) }];
    artTiming = { duration: 14000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' };
    try { artAnim = art.animate(artFrames, artTiming); } catch (e) { /* */ }
  }

  // 交叉淡化翻幅：旧画（连同在播的循环片）留在上层 0.8 秒淡出（手动 0.5 秒），新画在下层已解码好；不再有卷页
  const ready = (src, ms = 1800) => new Promise((res) => {
    if (!src) return res();
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    let im = imageCache.get(src); if (!im) { im = new Image(); im.src = src; imageCache.set(src, im); }
    (im.decode ? im.decode() : Promise.reject()).then(fin, fin); setTimeout(fin, ms);
  });
  function detachVid() { const v = vid; if (vio) { try { vio.disconnect(); } catch (e) { /* */ } vio = null; } vid = null; return v; }
  turn = async function (n, opts) {
    const album = ALBUMS[current], len = album.pages.length;
    if (busy || $('#book').hidden || len < 2) return;
    n = ((n % len) + len) % len; if (n === pageIndex) return;
    const auto = !!(opts && opts.auto), token = ++turnRequest;
    $('#note-dialog').close(); finishNarration(); if (!auto) paperSound();
    await ready(album.pages[n].img);
    if (token !== turnRequest || busy) return;
    const painting = $('#painting'), art = $('#art'); let box = null;
    if (!reduced() && motionOK()) {
      box = document.createElement('div'); box.className = 'hz-ghost'; box.setAttribute('aria-hidden', 'true');
      const g = art.cloneNode(false); g.removeAttribute('id'); g.alt = ''; box.append(g);
      const ov = detachVid(); if (ov) { ov.classList.add('on'); box.append(ov); }
      painting.insertBefore(box, $('#art-loading'));
      if (artAnim && artFrames) { try { const ga = g.animate(artFrames, artTiming); ga.currentTime = artAnim.currentTime; } catch (e) { /* */ } }
    }
    pageIndex = n; await renderPage(!auto);
    if (box) {
      try { await box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: auto ? 800 : 520, easing: 'ease-in-out', fill: 'forwards' }).finished; } catch (e) { /* */ }
      const ov = box.querySelector('video'); if (ov) { try { ov.pause(); ov.removeAttribute('src'); ov.load(); } catch (e) { /* */ } }
      box.remove();
    }
  };

  // 自动轮换：每幅停 6 秒；鼠标悬停在书上 / 有操作 / 开着弹层或原文 / 页面不可见 / 点了「暂停」都不转
  const AUTO_MS = 6000;
  let autoOn = true, hovering = false, lastAct = 0, shownAt = 0;
  function setAuto(on) { autoOn = on; const b = $('#hz-auto'); b.setAttribute('aria-pressed', String(on)); b.querySelector('.hz-auto-label').textContent = on ? '轮换中' : '已暂停'; shownAt = performance.now(); }
  $('#hz-auto').onclick = () => { lastAct = performance.now(); setAuto(!autoOn); };
  const bookEl = $('#book');
  bookEl.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  bookEl.addEventListener('pointerleave', () => { hovering = false; lastAct = performance.now(); });
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { lastAct = performance.now(); }, { passive: true, capture: true }));
  addEventListener('scroll', () => { lastAct = performance.now(); }, { passive: true });
  setInterval(() => {
    if (!autoOn || reduced() || !motionOK() || document.hidden || !overlayOn() || bookEl.hidden || busy || hovering || originalOpen) return;
    if (document.querySelector('dialog[open]') || !ALBUMS[current] || ALBUMS[current].pages.length < 2) return;
    const now = performance.now(); if (now - Math.max(shownAt, lastAct) < AUTO_MS) return;
    shownAt = now; turn(pageIndex + 1, { auto: true });
  }, 400);
  window.HUACE = {
    async open(id, oldPage) {
      await load();
      if (!ALBUMS[id]) id = RAW.册[0].id;
      const idx = oldPage == null ? null : ALBUMS[id].oldMap?.[oldPage] ?? null;
      $('#book').hidden = false; $('#closed').hidden = true;
      if (id === current && !$('#book').hidden && idx != null && RAW._shown) { await turn(idx); return; }
      RAW._shown = true; busy = false;
      await selectAlbum(id, idx);
      setTimeout(() => { if (!vid && !$('#book').hidden) startVid(pageData()); }, 150);
      watchOverlay();
    },
    reset() { document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch (e) { /* */ } }); if (originalOpen) toggleOriginal(false); dropVid(); RAW && (RAW._shown = false); },
  };
  // 本册的“读全回”在 iframe 内就地展开，也属于实际阅读入口。
  new MutationObserver(() => {
    if (parent === window || !$('#reader').open || !$('#reader-content [data-paragraph]') || !parent.document.querySelector('.dgy-huace.on')) return;
    parent.document.dispatchEvent(new parent.CustomEvent('dgy-journal-read', { detail: { kind: 'hui', id: readerTarget } }));
  }).observe($('#reader'), { attributes: true, attributeFilter: ['open'], childList: true, subtree: true });
  // 预载时就把字体（行书引文字库 906 KB，第一次用要在主线程解压）、画册数据、字注备好，打开时不卡那一帧
  setTimeout(() => { try { document.fonts.load('20px InkScript', '畫中有話寶玉黛玉').catch(() => {}); document.fonts.load('20px HzXing', '畫中有話').catch(() => {}); } catch (e) { /* */ } load().catch(() => {}); }, 300);
  emit('ready');
})();
