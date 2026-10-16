// 红楼梦影·纸上游 全站共用小工具（2026-10-16）：字号四档 + 统一弹层。普通脚本（不是 module），主页面和 iframe 子页都能 <script src> 引。
//   window.GF.fontScale({ root, button })：读 / 写 localStorage「dgy-fs」(1–4，默认 3「大」)，写到 html[data-fs]；
//     同源 iframe 之间靠 storage 事件 + postMessage 同步；⌘/Ctrl + = / - 换档；button:true 时右上角放印章「字」钮。
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
      if (window.parent !== window) { try { window.parent.postMessage({ gfFs: v }, '*'); } catch { /* */ } }
    }
  }
  function set(v) { apply(v); try { localStorage.setItem(KEY, String(cur)); } catch { /* */ } }
  addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) apply(+e.newValue, 'peer'); });
  addEventListener('message', (e) => { const v = e.data && e.data.gfFs; if (v && v !== cur) { apply(v, 'peer'); for (const f of document.querySelectorAll('iframe')) { if (f.contentWindow !== e.source) try { f.contentWindow?.postMessage({ gfFs: v }, '*'); } catch { /* */ } } } });

  function fsButton() {
    if (document.querySelector('.gf-fs')) return;
    const box = document.createElement('div');
    box.className = 'gf-fs';
    box.innerHTML = '<button class="gf-btn is-seal" type="button" aria-haspopup="true" aria-expanded="false" title="字號（⌘/Ctrl ＋ / －）">字</button><div class="gf-fs-menu" role="menu">' +
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
    if (!wireDialogs.mo) {
      wireDialogs.mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.tagName === 'DIALOG') wireDialog(n); else n.querySelectorAll?.('dialog').forEach(wireDialog); } });
      wireDialogs.mo.observe(document.documentElement, { childList: true, subtree: true });
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

  window.GF = { fontScale, wireDialogs, closeDialog, layer, NAMES, vrect, zk };
})();
