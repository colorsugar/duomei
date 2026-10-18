// 红楼梦影·纸上游 全站共用小工具（2026-10-16）：字号四档 + 统一弹层。普通脚本（不是 module），主页面和 iframe 子页都能 <script src> 引。
//   window.GF.fontScale({ root, button })：读 / 写 localStorage「dgy-fs」(1–4，默认 3「大」)，写到 html[data-fs]；
//     同源 iframe 之间靠 storage 事件 + postMessage 同步；⌘/Ctrl + = / - 换档；button:true 时放一枚「字」钮（10-18 起是左下角的淡色小签，位置样式见 gf.css / lite.css）。
//   window.GF.wireDialogs(root)：所有 <dialog> 点遮罩 / Esc 关闭，关闭后焦点回到打开它的按钮、滚动位置不跳。
//   window.GF.layer(el, close)：非 <dialog> 的浮层也接上「点外面 / Esc 关」（close 由调用方给）。
(function () {
  if (window.GF) return;
  const KEY = 'dgy-fs', NAMES = ['小', '中', '大', '特大'];
  const read = () => { try { const v = +localStorage.getItem(KEY); return v >= 1 && v <= 4 ? v : 0; } catch { return 0; } };
  const deflt = () => (matchMedia('(max-width: 767px)').matches ? 2 : 3);
  let cur = 0;
  const listeners = new Set();
  function apply(v, from) {
    v = Math.min(4, Math.max(1, v | 0));
    cur = v;
    document.documentElement.dataset.fs = String(v);
    syncVk();
    listeners.forEach((f) => { try { f(v); } catch { /* */ } });
    if (from !== 'peer') {
      for (const f of document.querySelectorAll('iframe')) { try { f.contentWindow?.postMessage({ gfFs: v }, '*'); } catch { /* */ } }
      // 10-17 Fable：初始化（from='init'）的值只是本窗口按自己宽度猜的默认档，不能往上广播——书案里一个 ≤767 宽的小 iframe（畫中有話预览）
      //   一载入就把整页从「大」拉成「中」，詩稿页开着开着版面会跳一下。子窗口初始化改为向父级问当前档位，父级有值就回它。
      if (window.parent !== window) {
        try { window.parent.postMessage(from === 'init' ? { gfFsQuery: 1 } : { gfFs: v }, '*'); } catch { /* */ }
      }
    }
  }
  function set(v) { apply(v); try { localStorage.setItem(KEY, String(cur)); } catch { /* */ } }
  addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) apply(+e.newValue, 'peer'); });
  addEventListener('message', (e) => { if (e.data && e.data.gfFsQuery && e.source && cur) { try { e.source.postMessage({ gfFs: cur }, '*'); } catch { /* */ } return; } const v = e.data && e.data.gfFs; if (v && v !== cur) { apply(v, 'peer'); for (const f of document.querySelectorAll('iframe')) { if (f.contentWindow !== e.source) try { f.contentWindow?.postMessage({ gfFs: v }, '*'); } catch { /* */ } } } });

  function fsButton() {
    if (document.querySelector('.gf-fs')) return;
    const box = document.createElement('div');
    box.className = 'gf-fs';
    box.innerHTML = '<button class="gf-btn is-seal" type="button" aria-haspopup="true" aria-expanded="false" aria-label="字號" title="字號（⌘/Ctrl ＋ / －）">字</button><div class="gf-fs-menu" role="menu">' +
      NAMES.map((n, i) => `<button type="button" role="menuitemradio" data-v="${i + 1}">${n}</button>`).join('') + '</div>';
    const btn = box.firstElementChild, menu = box.lastElementChild;
    const mark = () => menu.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === cur)));
    const toggle = (on) => { box.classList.toggle('open', on); btn.setAttribute('aria-expanded', String(on)); if (on) mark(); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(!box.classList.contains('open')); });
    menu.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; e.stopPropagation(); set(+b.dataset.v); mark(); setTimeout(() => toggle(false), 260); });
    document.addEventListener('click', (e) => { if (!box.contains(e.target)) toggle(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('open')) { toggle(false); e.stopPropagation(); } }, true);
    listeners.add(mark);
    document.body.appendChild(box);
    return box;
  }

  function fontScale(opt) {
    opt = opt || {};
    if (opt.root) document.documentElement.classList.add('gf-zoom-root');
    apply(read() || deflt(), 'init');
    if (!fontScale.keys) {
      fontScale.keys = true;
      addEventListener('keydown', (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
        if (e.key === '=' || e.key === '+') { e.preventDefault(); set(cur + 1); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); set(cur - 1); }
      });
    }
    if (opt.button) { if (document.body) fsButton(); else addEventListener('DOMContentLoaded', fsButton, { once: true }); }
    return { set, get: () => cur, onChange: (f) => listeners.add(f), button: fsButton };
  }

  // ——— 统一弹层 ———
  function closeDialog(d) {
    if (!d.open) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done = () => { d.classList.remove('gf-closing'); if (d.open) d.close(); };
    if (reduce) return done();
    d.classList.add('gf-closing');
    setTimeout(done, 170);
  }
  function wireDialog(d) {
    if (d.dataset.gf) return;
    d.dataset.gf = '1';
    d.classList.add('gf-dlg');
    let from = null, sy = 0, sx = 0;
    const scroller = () => document.scrollingElement || document.documentElement;
    const origShow = d.showModal.bind(d);
    d.showModal = function () { from = document.activeElement; sy = scroller().scrollTop; sx = scroller().scrollLeft; d.classList.remove('gf-closing'); origShow(); };
    // 点遮罩（点在 dialog 自身而非里面的内容上）就关
    d.addEventListener('mousedown', (e) => { d._down = e.target === d; });
    d.addEventListener('click', (e) => {
      if (e.target !== d || !d._down) return;
      const r = vrect(d);
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      // dialog 本身有内边距时，点在边框内的空白也算内容；只有在矩形外（::backdrop）才关
      if (!inside || getComputedStyle(d).backgroundColor === 'rgba(0, 0, 0, 0)') closeDialog(d);
    });
    d.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(d); });
    d.addEventListener('close', () => {
      const el = scroller(); el.scrollTop = sy; el.scrollLeft = sx;
      if (from && from.isConnected) { try { from.focus({ preventScroll: true }); } catch { /* */ } }
    });
    // 手机：内容在顶部时向下拖 80px 关
    let y0 = 0;
    d.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    d.addEventListener('touchend', (e) => { const sc = d.querySelector('[data-gf-scroll]') || d; if (sc.scrollTop <= 0 && e.changedTouches[0].clientY - y0 > 80) closeDialog(d); }, { passive: true });
  }
  function wireDialogs(root) {
    root = root || document;
    root.querySelectorAll('dialog').forEach(wireDialog);
    scrollHintsAll(root); imgFadeAll(root);
    if (!wireDialogs.mo) {
      wireDialogs.mo = new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'attributes') { if (m.target.tagName === 'IMG') imgFade(m.target); continue; } for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.tagName === 'DIALOG') wireDialog(n); else n.querySelectorAll?.('dialog').forEach(wireDialog); scrollHintsAll(n); imgFadeAll(n); } } });
      wireDialogs.mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] }); // 复用的 <img> 换图也重新淡入（审查 03:34）
    }
  }
  // 非 dialog 的浮层：点 el 自身（遮罩）或按 Esc 调 close
  function layer(el, close) {
    if (el.dataset.gfLayer) return;
    el.dataset.gfLayer = '1';
    let down = false;
    el.addEventListener('mousedown', (e) => { down = e.target === el; });
    el.addEventListener('click', (e) => { if (e.target === el && down && !el.hidden) close(e); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden && el.isConnected && getComputedStyle(el).display !== 'none') { close(e); } });
  }

  // ——— 滚动提示（10-18 老大：博古通今详情「相關」一节被底边切半、列表首行被顶边切半，「怎么还有这种显示不全的问题」）———
  //   GF.scrollHints(el, { hint })：接管一个能滚的容器——没到底时加 .gf-sc-more（底边渐隐 + 「↓ 往下翻」提示），离开顶部后加 .gf-sc-top（顶边渐隐），
  //   滚到底渐隐和提示一起消失，最后一行不再被淡掉；放不下才滚、放得下就什么都不加。hint 给一个父级元素时在里面放一枚 <span class="gf-sc-hint">。
  //   GF.wireDialogs() 的观察器会自动接管新出现的 [data-gf-scroll]（詩稿 / 畫中有話 / 博古通今详情本来就标了）。
  function scrollHints(el, opt) {
    if (!el) return () => {};
    opt = opt || {};
    if (!el._gfSc) {
      el.classList.add('gf-sc');
      const update = () => {
        if (!el.isConnected) return;
        const more = el.scrollTop + el.clientHeight < el.scrollHeight - 2, top = el.scrollTop > 2;
        el.classList.toggle('gf-sc-more', more); el.classList.toggle('gf-sc-top', top);
        if (el._gfScHint) el._gfScHint.hidden = !more;
      };
      el._gfSc = update;
      el.addEventListener('scroll', update, { passive: true });
      // 多处变化合并成一帧一次量
      let pending = false;
      const schedule = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; update(); }); };
      // 盯容器 + 当前的直接子元素（图加载撑高、列表重排都会动到它们）；直接子元素换了就整组重盯，旧的不再持有（审查 🔴：只增不减会漏内存）
      let ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(schedule); const watch = () => { ro.disconnect(); ro.observe(el); for (const c of el.children) ro.observe(c); }; watch(); el._gfScWatch = watch; }
      if (typeof MutationObserver === 'function') new MutationObserver((ms) => { if (ro && ms.some((m) => m.target === el)) el._gfScWatch(); schedule(); }).observe(el, { childList: true, subtree: true });
      update(); schedule(); setTimeout(update, 300);
    }
    if (opt.hint && !el._gfScHint) {
      let h = opt.hint.querySelector(':scope > .gf-sc-hint');
      if (!h) { h = document.createElement('span'); h.className = 'gf-sc-hint'; h.setAttribute('aria-hidden', 'true'); h.textContent = '↓ 往下翻'; opt.hint.appendChild(h); }
      el._gfScHint = h;
    }
    el._gfSc();
    return el._gfSc;
  }
  // 书案各册的滚动容器（lite 页 / 詩稿页才引 gf.js，正式版 daguanyuan.html 不受影响）：院落 #places、畫中有話 #albumNav、十二釵 #peopleNav、石頭記 #readerNav、行藏 #questList、占花名 #achieveNav、詩稿 #poemsNav、
  // 博古通今 .cxg-list、遊園記 .jn-page、锦函 / 图鉴 .dgy-cdx-main、詩稿页左栏 .index-list、注释 .annotation、手机版工作区 #workspace 与详情 #detail-body
  const SC_SEL = '[data-gf-scroll], #places, #albumNav, #peopleNav, #readerNav, #questList, #achieveNav, #poemsNav, .cxg-list, .jn-page, .dgy-cdx-main, .dk-card-in, .index-list, .annotation, #workspace, #detail-body';
  // 不接管手机博古通今的 #codexNav：它整页滚，详情栏 .cxg-detail 是它里面的 fixed 子元素，mask 会连详情栏底部一起淡掉（hud.css 那条 mask none !important 就是为此）
  function scrollHintsAll(root) { root = root || document; if (root.matches?.(SC_SEL)) scrollHints(root); root.querySelectorAll?.(SC_SEL).forEach((el) => scrollHints(el)); }

  // ——— 图片淡入（10-18 老大：「资源加载的时候，图片啊什么的，完全是硬切的感觉，一点啥也没有」）———
  //   还没载完的 <img> 先透明，载好了 0.4 秒淡进来；已经在缓存里、一进来就 complete 的不动（不闪）。载坏的也放出来（交给各处自己的占位 / 剪影逻辑）。
  //   审查（03:34）三条已改：同一个 <img> 换 src 再来一遍（詩稿 #carrier-image 反复换图）；8 秒兜底只是先放出来，之后真载好仍淡入；
  //   懒加载还没滚进视口的不计时；淡完把 .gf-img-in 摘掉，透明度回到元素自己的值。
  function imgFade(img) {
    if (!img || img.tagName !== 'IMG') return;
    const key = (img.getAttribute('src') || '') + '|' + (img.getAttribute('srcset') || '');
    if (img._gfKey === key) return; img._gfKey = key;
    img.classList.remove('gf-img-in'); clearTimeout(img._gfT);
    if (img.complete && img.naturalWidth) { img.classList.remove('gf-img-wait'); return; } // 缓存里现成的：不闪
    img.classList.add('gf-img-wait');
    if (!img._gfOn) {
      img._gfOn = true;
      const done = () => { clearTimeout(img._gfT); img.classList.remove('gf-img-wait'); img.classList.add('gf-img-in'); setTimeout(() => img.classList.remove('gf-img-in'), 600); /* 不在渲染树里的图没有 animationend，这里兜底摘类 */ };
      img.addEventListener('load', done); img.addEventListener('error', done);
      img.addEventListener('animationend', (e) => { if (e.animationName === 'gf-img-in') img.classList.remove('gf-img-in'); });
    }
    const r = img.getBoundingClientRect(), lazyOut = img.loading === 'lazy' && (r.bottom < -200 || r.top > innerHeight + 200);
    if (!lazyOut) img._gfT = setTimeout(() => img.classList.remove('gf-img-wait'), 8000); // 兜底：8 秒还没回就先放出来，不许一直空着；load 回来仍走淡入
  }
  function imgFadeAll(root) { root = root || document; if (root.tagName === 'IMG') imgFade(root); root.querySelectorAll?.('img').forEach(imgFade); }

  // 10-17 实测：Safari（WebKit）整页 zoom 时，getBoundingClientRect 给的是放大前的坐标，而鼠标 clientX / elementFromPoint 用放大后的坐标；
  // Chrome 两边一致。凡是拿元素矩形去和鼠标坐标、innerWidth、elementFromPoint 比的地方，改用 GF.vrect(el)（换成鼠标那一套坐标）。
  // 只拿两个矩形相减（动画位移、气泡定位）的地方不用改：两个都是同一套坐标。
  function zk() {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    if (Math.abs(z - 1) < 0.01 || !document.body) return 1;
    const p = document.createElement('div'); p.style.cssText = 'position:fixed;left:100px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none';
    document.body.appendChild(p); const L = p.getBoundingClientRect().left; p.remove();
    return Math.abs(L - 100 * z) < 2 ? 1 : z;
  }
  // 同一个毛病的另一面：Safari 里整页 zoom 后，100vw / 100dvh / 贴满屏幕的 fixed 都按「屏幕 ÷ 倍数 ÷ 倍数」算，整页缩在左上角。
  // 写到 html 的 --gf-vk（Chrome = 1，Safari = 倍数）；按屏幕尺寸写的地方用 calc(100dvh * var(--gf-vk, 1)) 补回来。
  function syncVk() {
    const run = () => document.documentElement.style.setProperty('--gf-vk', String(zk()));
    if (document.body) run(); else addEventListener('DOMContentLoaded', run, { once: true });
  }
  function vrect(el) {
    const r = el.getBoundingClientRect(), k = zk();
    return k === 1 ? r : { left: r.left * k, top: r.top * k, right: r.right * k, bottom: r.bottom * k, width: r.width * k, height: r.height * k, x: r.x * k, y: r.y * k };
  }

  window.GF = { fontScale, wireDialogs, closeDialog, layer, scrollHints, scrollHintsAll, NAMES, vrect, zk };
})();
