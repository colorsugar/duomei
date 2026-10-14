/* 小院烟雨 — makes the 烟雨 control work in 多美的夏日小院 (the courtyard), like it does in 诗语江南.
 * The prebuilt bundle only wires the rain panel (and its rain renderer) for ?scene=garden, but still shows
 * the 烟雨 button in the courtyard, where it did nothing. This runtime layer, without touching the bundle:
 *  - wires the same panel: tap 烟雨 to start rain and open the panel, drag 雨量, 停雨 stops and closes,
 *    tap outside / Esc / 更多 closes; the label reads the same "小雨 8 mm/h" (xy-i18n translates it);
 *  - draws the rain itself as a light screen-space layer over the canvas (falling streaks + a soft grey
 *    mist), eased in/out over 0.8 s like the garden, sized to the drawing buffer at ≤1× DPR, and paused
 *    when there is no rain or the tab is hidden, so it costs nothing when off.
 * Clicks inside the rain panel don't end the guided tour (the bundle already exempts #btn-rain / #rain-controls). */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  if (q.get("scene") === "garden") return; // the garden has its own rain

  var st = { target: 0, last: 0.7, cur: 0, from: 0, start: 0, moving: false };
  var btn, pop, ctr, amt, label, more, layer, ctx, drops = [], raf = 0, lastT = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function setRain(t, remember) {
    t = clamp(t, 0, 2);
    if (remember !== false && t > 0) st.last = t;
    st.from = st.cur; st.target = t; st.start = performance.now(); st.moving = true;
    sync(); kick();
  }
  function sync() {
    var mm = st.target * 25;
    amt.value = String(Math.round(mm));
    btn.setAttribute("aria-pressed", String(mm > 0));
    var name = mm < 0.5 ? "无雨" : mm < 5 ? "小雨" : mm < 15 ? "中雨" : mm < 30 ? "大雨" : "暴雨";
    var text = name + " " + Math.round(mm) + " mm/h";
    if (label) label.textContent = text;
    amt.setAttribute("aria-valuetext", text);
    document.documentElement.classList.toggle("xy-courtyard-raining", mm > 0);
  }
  function openPop(open) {
    pop.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open && more && !more.hidden) document.getElementById("btn-more").click();
  }

  /* —— rain layer —— */
  function resize() {
    var dpr = Math.min(1, window.devicePixelRatio || 1);
    layer.width = Math.round(innerWidth * dpr);
    layer.height = Math.round(innerHeight * dpr);
  }
  function spawn(d, w, h, top) {
    d.x = Math.random() * (w + 80) - 40;
    d.y = top ? -Math.random() * h * 0.3 : Math.random() * h;
    d.z = 0.35 + Math.random() * 0.65;           // depth: near drops are longer, faster, brighter
    d.v = (900 + 700 * d.z) * (layer.height / 900);
    d.l = (10 + 26 * d.z) * (layer.height / 900);
  }
  function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    if (st.moving) {
      var e = clamp((now - st.start) / 800, 0, 1);
      st.cur = st.from + (st.target - st.from) * ease(e);
      if (e === 1) st.moving = false;
    }
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    var w = layer.width, h = layer.height, k = Math.min(1, st.cur);
    ctx.clearRect(0, 0, w, h);
    layer.style.opacity = String(k > 0.001 ? 1 : 0);
    if (k <= 0.001 && !st.moving) { drops.length = 0; return; }
    // Soft mist: greyer toward the top, like the garden's rain light.
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(96,108,122," + (0.30 * k) + ")");
    g.addColorStop(1, "rgba(120,128,136," + (0.12 * k) + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var want = Math.round((w * h) / (1280 * 800) * 520 * Math.min(2, st.cur));
    want = Math.min(want, 1100);
    while (drops.length < want) { var d = {}; spawn(d, w, h, drops.length > 0 && st.moving); drops.push(d); }
    if (drops.length > want) drops.length = want;
    var slant = 0.16;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(226,234,242," + (0.30 + 0.25 * k) + ")";
    ctx.lineWidth = Math.max(1, layer.height / 900);
    ctx.beginPath();
    for (var i = 0; i < drops.length; i++) {
      var p = drops[i];
      p.y += p.v * dt; p.x += p.v * dt * slant;
      if (p.y - p.l > h || p.x > w + 40) spawn(p, w, h, true);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.l * slant, p.y - p.l);
    }
    ctx.stroke();
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }

  function wire() {
    btn = document.getElementById("btn-rain");
    pop = document.getElementById("rain-pop");
    ctr = document.getElementById("rain-controls");
    amt = document.getElementById("rain-amount");
    label = document.getElementById("rain-label");
    more = document.getElementById("dock-more");
    var stop = document.getElementById("rain-auto");
    if (!btn || !pop || !ctr || !amt || btn.dataset.xyRain) return;
    btn.dataset.xyRain = "1";
    ctr.hidden = false;
    btn.hidden = false;
    btn.style.display = "inline-grid";
    layer = document.createElement("canvas");
    layer.id = "xy-courtyard-rain";
    layer.setAttribute("aria-hidden", "true");
    var view = document.getElementById("view");
    (view && view.parentNode || document.body).insertBefore(layer, view ? view.nextSibling : null);
    ctx = layer.getContext("2d");
    resize();
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && st.cur > 0) kick(); });
    btn.addEventListener("click", function () { st.target <= 0 ? (setRain(st.last), openPop(true)) : openPop(pop.hidden); });
    amt.addEventListener("input", function () { setRain(Number(amt.value) / 25); });
    if (stop) stop.addEventListener("click", function () { setRain(0); openPop(false); });
    document.addEventListener("pointerdown", function (e) { if (!pop.hidden && !e.target.closest("#rain-pop,#btn-rain")) openPop(false); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") openPop(false); });
    var bm = document.getElementById("btn-more"); if (bm) bm.addEventListener("click", function () { openPop(false); });
    sync();
    window.__xyCourtyardRain = { state: function () { return { target: st.target, cur: st.cur, drops: drops.length, open: !pop.hidden }; } };
  }
  // The bundle sets up its dock after the scene starts; wire once it's there (and only once).
  function tryWire(n) {
    if (document.getElementById("btn-rain")) wire();
    else if (n < 200) setTimeout(function () { tryWire(n + 1); }, 100);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { tryWire(0); });
  else tryWire(0);
})();
