// 第 32 轮：畫中有話 v4 样张接进游戏的桥（只在 dgy-assets/huace/index.html 末尾加载；样张代码由 scripts/dgy-r32-huace-prep.py 搬来）。
// 画册数据：albums.json（scripts/dgy-r32-album-v4.mjs 从 albumData.js + 扩写稿 + 新版画稿生成，原文逐字核过），十三册全收。
// 游戏一侧（dgy/huace.js）调：HUACE.open(册 id, 旧幅号 | null)；这里往游戏报 parent.__dgyHuace.on(事件, …)：close / visit({placeId}) / person(id)。
(() => {
  'use strict';
  const H = () => { try { return parent !== window ? parent.__dgyHuace || null : null; } catch (e) { return null; } };
  const emit = (ev, a) => { const h = H(); if (h && h.on) { try { h.on(ev, a); } catch (e) { console.warn('[huace] host', e); } } };
  const ROOTP = '../../'; // 本页在 dgy-assets/huace/，albums.json 里的路径相对游戏根
  let RAW = null, booted = null;
  const SEASON1 = (s) => (/春/.test(s) ? '春' : /夏|暑/.test(s) ? '夏' : /秋/.test(s) ? '秋' : /冬|雪/.test(s) ? '冬' : '');
  function load() {
    if (booted) return booted;
    booted = (async () => {
      const r = await fetch('albums.json'); RAW = await r.json();
      for (const a of RAW.册) {
        ALBUMS[a.id] = { title: a.title, season: a.pages[0]?.season || '', cover: 0, inscription: a.inscription || '', mood: a.mood, placeName: a.placeName, oldMap: a.oldMap,
          pages: a.pages.map((p, i) => ({ ...p, no: i + 1, img: p.img ? ROOTP + p.img : '', thumb: p.thumb ? ROOTP + p.thumb : '', loop: p.loop ? ROOTP + p.loop : null, place: p.place || a.placeName })) };
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
  $('#close-book').textContent = '合上'; $('#book-sign').setAttribute('aria-label', '合上畫中有話，回到冊');
  // 到园中此处 / 见人物 交给游戏
  CONFIG.onVisit = ({ album }) => { const p = pageData(); emit('visit', { placeId: p.placeId || (RAW.册.find((a) => a.id === album) || {}).place || null }); };
  CONFIG.onPerson = (id) => emit('person', id);

  // 每幅画面：有循环片的放静音循环片（首帧就是这幅画，开播才淡入）；动效关 / 减少动态 / 页面藏起来时不放
  let vid = null;
  function dropVid() { if (!vid) return; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* */ } vid.remove(); vid = null; }
  const render0 = renderPage;
  renderPage = async function (animate = true) {
    dropVid();
    const p = await render0(animate);
    $('#visit').hidden = !p.placeId;
    const motionOff = parent !== window && (() => { try { return parent.document.documentElement.dataset.motion === 'off'; } catch (e) { return false; } })();
    if (p.loop && !reduced() && !motionOff && !document.hidden) {
      const v = document.createElement('video'); v.className = 'hz-loop'; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = p.loop;
      v.addEventListener('playing', () => v.classList.add('on'), { once: true }); v.addEventListener('error', () => { if (vid === v) vid = null; v.remove(); }, { once: true });
      $('#painting').insertBefore(v, $('#particles')); vid = v; v.play().catch(() => {});
    }
    return p;
  };
  document.addEventListener('visibilitychange', () => { if (vid) { if (document.hidden) vid.pause(); else vid.play().catch(() => {}); } });
  const select0 = selectAlbum;
  selectAlbum = async function (key, index) { if (index == null) { try { const v = localStorage.getItem('huazhong-v4-album-' + key); if (v != null) index = JSON.parse(v); } catch (e) { /* */ } } await select0(key, index); syncTabs(); };

  window.HUACE = {
    async open(id, oldPage) {
      await load();
      if (!ALBUMS[id]) id = RAW.册[0].id;
      const idx = oldPage == null ? null : ALBUMS[id].oldMap?.[oldPage] ?? null;
      $('#book').hidden = false; $('#closed').hidden = true;
      if (id === current && !$('#book').hidden && idx != null && RAW._shown) { await turn(idx); return; }
      RAW._shown = true; busy = false;
      await selectAlbum(id, idx);
    },
    reset() { document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch (e) { /* */ } }); if (originalOpen) toggleOriginal(false); dropVid(); RAW && (RAW._shown = false); },
  };
  // 预载时就把字体（行书引文字库 906 KB，第一次用要在主线程解压）、画册数据、字注备好，打开时不卡那一帧
  setTimeout(() => { try { document.fonts.load('20px InkScript', '畫中有話寶玉黛玉').catch(() => {}); document.fonts.load('20px HzXing', '畫中有話').catch(() => {}); } catch (e) { /* */ } load().catch(() => {}); }, 300);
  emit('ready');
})();
