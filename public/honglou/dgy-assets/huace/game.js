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
  context.innerHTML = '<summary>卷首提要</summary><p class="album-context-text"></p><p class="album-context-preface"></p>';
  $('.notes-column').insertBefore(context, $('.narration-layer'));
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
    $('#painting').insertBefore(v, $('#particles')); vid = v; v.play().catch(() => {});
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
    $('#visit').hidden = !p.placeId;
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
