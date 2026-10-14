/* 题字释读 — inscription translations for the 小院 / 江南 scene runtime (prebuilt bundle).
 * When the camera comes near a painted inscription (plaques, couplets, lantern mottoes, the 清风徐来 sign),
 * a small seal-style button fades in beside it; tapping it opens a card with the original text and its
 * reading in the current language (中: 白话 explanation · EN · 日: 書き下し + 現代語訳). It fades out again as the
 * camera moves away, never takes pointer events outside itself, and works during the guided tour.
 *
 * The bundle exposes neither scene nor camera, so this script (which runs before the module bundle):
 *  - remembers which characters were drawn onto each 2D canvas (fillText / strokeText),
 *  - collects meshes as three.js constructs them (isMesh) and keeps only those textured with such a canvas,
 *  - wraps WebGLRenderer#render to learn the scene + main camera actually on screen.
 * Nothing in the bundle is modified; if any hook is missing the feature simply stays hidden. */
(function () {
  "use strict";
  var CJK = /[\u4e00-\u9fff]/;

  /* —— inscription catalogue —— */
  var ENTRIES = [
    /* 诗语江南 (garden) */
    { id: "hall-plaque", keys: ["清籁"], r: 11, orig: "清籁",
      zh: "匾额「清籁」：清越的天籁之声，说的是风过竹梢的簌簌声。这是主厅清籁堂的匾。",
      en: "\u201cClear Rustle\u201d — the pure sound of wind through the bamboo tops. The plaque of the main hall, the Hall of Clear Rustle.",
      ja: "清籟（せいらい）\n清らかな自然の響き。竹の梢を渡る風の音のことで、母屋・清籟堂の扁額です。" },
    { id: "hall-couplet", keys: ["一窗新绿分茶色", "半榻清凉听竹声"], r: 11, orig: "一窗新绿分茶色\n半榻清凉听竹声",
      zh: "满窗新绿映进茶汤，连茶色都分了几分绿；半张卧榻清清凉凉，躺着听竹叶沙沙作响。",
      en: "A window of fresh green lends its colour to the tea;\nhalf a couch of coolness, listening to the bamboo.",
      ja: "一窓の新緑 茶色を分かち　半榻の清涼 竹声を聴く\n窓いっぱいの若葉が茶に緑を映し、寝台に涼をとりながら竹の音に耳を澄ます。" },
    { id: "south-plaque", keys: ["蕉月棠风"], r: 11, orig: "蕉月棠风",
      zh: "匾额「蕉月棠风」：芭蕉映着月色，海棠迎着清风。院门两侧正种着芭蕉和海棠。",
      en: "\u201cPlantain Moon, Crabapple Breeze\u201d — moonlight on the plantain, a breeze through the crabapple, the two plants that flank this gate.",
      ja: "蕉月棠風（しょうげつとうふう）\n芭蕉に月が映え、海棠に風がそよぐ。門の両脇に植えられた芭蕉と海棠を詠んだ扁額です。" },
    { id: "south-couplet", keys: ["海棠雨后胭脂薄", "蕉叶风前翡翠长"], r: 11, orig: "海棠雨后胭脂薄\n蕉叶风前翡翠长",
      zh: "雨后的海棠，像胭脂被雨洗淡了；风里的芭蕉叶，像一片片翡翠舒展得更长。",
      en: "After rain the crabapple's rouge runs thin;\nbefore the wind the plantain's jade leaves grow long.",
      ja: "海棠 雨後 臙脂薄く　蕉葉 風前 翡翠長し\n雨上がりの海棠は紅がうすれ、風に揺れる芭蕉の葉は翡翠のように長くのびる。" },
    { id: "studio-plaque", keys: ["漱石"], r: 11, orig: "漱石",
      zh: "匾额「漱石」：出自「枕流漱石」的典故——以流水为枕、用山石漱口，比喻隐居山林、志趣高洁。",
      en: "\u201cRinsing with Stones\u201d — from the old saying \u201cpillow on the stream, rinse with stones,\u201d an emblem of a pure, reclusive life among hills and water.",
      ja: "漱石（そうせき）\n「石に漱ぎ流れに枕す」の故事から。山水に隠れ住む清らかな暮らしを表します。夏目漱石の号もこの故事に由来します。" },
    { id: "studio-couplet", keys: ["石瘦留云住", "泉清照影闲"], r: 11, orig: "石瘦留云住\n泉清照影闲",
      zh: "瘦削的山石把云留住了；清澈的泉水悠闲地映出人影。",
      en: "Lean stones keep the clouds from leaving;\na clear spring mirrors shadows at their ease.",
      ja: "石痩せて雲を留めて住ましめ　泉清くして影を照らして閑かなり\n痩せた石は雲を引きとめ、清らかな泉はのどかに人影を映す。" },
    { id: "water-hall", keys: ["听荷"], r: 10, orig: "听荷",
      zh: "匾额「听荷」：听雨打荷叶的声音。这是池上的水榭听荷榭。",
      en: "\u201cListening to the Lotus\u201d — to the rain pattering on lotus leaves. The pavilion over the pond.",
      ja: "聴荷（ちょうか）\n蓮の葉を打つ雨音に耳を傾けること。池に張り出した聴荷榭の扁額です。" },
    { id: "moon-pavilion", keys: ["涵月"], r: 10, orig: "涵月",
      zh: "匾额「涵月」：水面涵着月影。月到中天时，天上水中各有一轮。",
      en: "\u201cHolding the Moon\u201d — the pond holds the moon's reflection; at its height there is one in the sky and one in the water.",
      ja: "涵月（かんげつ）\n水面が月影を宿すこと。月が中天に昇ると、空と水に二つの月が浮かびます。" },
    { id: "spring-pavilion", keys: ["听泉"], r: 9, orig: "听泉",
      zh: "匾额「听泉」：坐在亭中，听泉水从石间流出的声音。",
      en: "\u201cListening to the Spring\u201d — sit in the pavilion and hear the water slipping from the stones.",
      ja: "聴泉（ちょうせん）\n亭に腰を下ろし、石の間から湧く泉の音を聴くこと。" },
    { id: "lantern", keys: ["清风明月听荷诗语江南"], r: 4.5, orig: "清风 · 明月 · 听荷\n诗语江南",
      zh: "灯笼上的题字：「清风」「明月」「听荷」，背面是园名「诗语江南」——用诗的语言写江南。",
      en: "Lantern mottoes: \u201cClear Breeze,\u201d \u201cBright Moon,\u201d \u201cListening to the Lotus\u201d — and on the back the garden's name, \u201cJiangnan in Verse.\u201d",
      ja: "清風 · 明月 · 聴荷 ／ 詩語江南\n提灯の題字。「清らかな風」「明るい月」「蓮を聴く」、裏には庭の名「詩語江南（詩の言葉で描く江南）」。" },
    /* 多美的夏日小院 (courtyard) */
    { id: "yard-plaque", keys: ["多美小院"], r: 7, orig: "多美小院",
      zh: "门楣上的匾额「多美小院」：多美的夏日小院。",
      en: "\u201cDuomei's Courtyard\u201d — the plaque over the door of Duomei's summer home.",
      ja: "多美小院（ドゥオメイしょういん）\n「多美の小さな庭」。夏の住まいの門に掛かる扁額です。" },
    { id: "yard-couplet", keys: ["葡萄满架乐童心", "西瓜清甜消暑气"], r: 7, orig: "葡萄满架乐童心\n西瓜清甜消暑气",
      zh: "满架葡萄，让人像孩子一样开心；西瓜清甜，一口下去暑气全消。",
      en: "A trellis full of grapes delights the child at heart;\nsweet, cool watermelon chases off the summer heat.",
      ja: "葡萄 架に満ちて童心を楽しませ　西瓜 清甜にして暑気を消す\n棚いっぱいのぶどうに童心がはずみ、甘く冷たいスイカが夏の暑さを払う。" },
    { id: "yard-sign", keys: ["清风徐来"], r: 8, orig: "清风徐来",
      zh: "「清风徐来」：清凉的风缓缓吹来。出自苏轼《赤壁赋》「清风徐来，水波不兴」。旁边的红印是「多美」。",
      en: "\u201cA cool breeze comes gently\u201d — from Su Shi's Red Cliff Rhapsody: \u201ca cool breeze comes gently, and the water stirs no wave.\u201d The red seal reads \u201cDuomei.\u201d",
      ja: "清風 徐（おもむろ）に来たる\n涼しい風がゆるやかに吹いてくる。蘇軾『赤壁賦』の「清風徐に来たりて、水波興らず」から。赤い印は「多美」。" }
  ];
  var UI = {
    zh: { open: "题字释读", close: "关闭", glyph: "释", head: "白话" },
    en: { open: "Translate this inscription", close: "Close", glyph: "Aa", head: "English", orig: "Original, as written" },
    ja: { open: "題字の読みと意味", close: "閉じる", glyph: "訳", head: "書き下し · 現代語訳", orig: "原文（書かれたままの中国の簡体字）" }
  };

  /* —— hooks (installed before the bundle runs) —— */
  var canvasChars = new WeakMap();
  [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].forEach(function (K) {
    if (!K) return;
    ["fillText", "strokeText"].forEach(function (n) {
      var P = K.prototype, f = P[n];
      if (typeof f !== "function") return;
      P[n] = function (t) {
        try {
          var s = String(t);
          if (CJK.test(s)) {
            var set = canvasChars.get(this.canvas);
            if (!set) canvasChars.set(this.canvas, (set = new Set()));
            if (set.size < 64) for (var i = 0; i < s.length; i++) if (CJK.test(s[i])) set.add(s[i]);
          }
        } catch (e) {}
        return f.apply(this, arguments);
      };
    });
  });
  function hookFlag(flag, onSet) {
    try {
      Object.defineProperty(Object.prototype, flag, {
        configurable: true,
        set: function (v) {
          Object.defineProperty(this, flag, { value: v, writable: true, configurable: true, enumerable: true });
          try { onSet(this); } catch (e) {}
        }
      });
    } catch (e) {}
  }
  var pending = [];
  hookFlag("isMesh", function (m) { if (pending.length < 50000) pending.push(m); });
  var view = { scene: null, camera: null };
  hookFlag("isWebGLRenderer", function (r) {
    var inner = null;
    Object.defineProperty(r, "render", {
      configurable: true, enumerable: true,
      get: function () { return inner; },
      set: function (fn) {
        inner = typeof fn !== "function" ? fn : function (scene, camera) {
          // Main view: a perspective camera whose aspect matches the window (post-processing may render into a target).
          if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.children.length > 2 && Math.abs(camera.aspect - innerWidth / innerHeight) < 0.05) {
            view.scene = scene; view.camera = camera;
          }
          return fn.apply(this, arguments);
        };
      }
    });
  });

  /* —— resolve inscription meshes —— */
  var found = []; // {entry, mesh}
  function entryFor(chars) {
    for (var i = 0; i < ENTRIES.length; i++) {
      var e = ENTRIES[i];
      for (var k = 0; k < e.keys.length; k++) {
        var key = e.keys[k], ok = chars.size <= key.length + 2;
        for (var j = 0; ok && j < key.length; j++) ok = chars.has(key[j]);
        if (ok) return e;
      }
    }
    return null;
  }
  function scan() {
    var keep = [];
    for (var i = 0; i < pending.length; i++) {
      var m = pending[i], mat = m.material;
      if (!mat) { keep.push(m); continue; }
      var mats = Array.isArray(mat) ? mat : [mat];
      for (var j = 0; j < mats.length; j++) {
        var img = mats[j] && mats[j].map && mats[j].map.image;
        var chars = img && canvasChars.get(img);
        if (!chars) continue;
        var e = entryFor(chars);
        if (e) { found.push({ entry: e, mesh: m }); break; }
      }
    }
    pending = keep.length > 2000 ? [] : keep;
  }

  /* —— geometry helpers (plain arrays; no three.js import) —— */
  function rootOf(o) { while (o.parent) o = o.parent; return o; }
  function project(cam, x, y, z) {
    var v = cam.matrixWorldInverse.elements, p = cam.projectionMatrix.elements;
    var vx = v[0] * x + v[4] * y + v[8] * z + v[12], vy = v[1] * x + v[5] * y + v[9] * z + v[13], vz = v[2] * x + v[6] * y + v[10] * z + v[14];
    var cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12], cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13], cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15];
    if (cw <= 0.01) return null;
    return { x: (cx / cw * 0.5 + 0.5) * innerWidth, y: (0.5 - cy / cw * 0.5) * innerHeight };
  }
  // Painted boards are planes whose text faces local +Z.
  function facing(m, cx, cy, cz) {
    var w = m.matrixWorld.elements;
    return w[8] * (cx - w[12]) + w[9] * (cy - w[13]) + w[10] * (cz - w[14]) > 0;
  }
  function anchors(f) {
    var m = f.mesh, w = m.matrixWorld.elements, out = [];
    if (m.isInstancedMesh && m.instanceMatrix) {
      var a = m.instanceMatrix.array, n = Math.min(m.count, 400);
      for (var i = 0; i < n; i++) {
        var x = a[i * 16 + 12], y = a[i * 16 + 13], z = a[i * 16 + 14];
        out.push([w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14]]);
      }
    } else out.push([w[12], w[13], w[14]]);
    return out;
  }

  /* —— UI —— */
  var layer, card, buttons = {}, openId = null, lang = "zh";
  function curLang() { var l = (document.documentElement.lang || "zh").slice(0, 2); return UI[l] ? l : "zh"; }
  function build() {
    layer = document.createElement("div");
    layer.id = "xy-inscriptions";
    layer.setAttribute("data-keep-zh", "");
    document.body.appendChild(layer);
    card = document.createElement("div");
    card.className = "xyi-card";
    card.setAttribute("role", "dialog");
    card.hidden = true;
    layer.appendChild(card);
    ["pointerdown", "pointerup", "click", "dblclick", "wheel", "touchstart"].forEach(function (t) {
      layer.addEventListener(t, function (ev) { if (ev.target !== layer) ev.stopPropagation(); }, { passive: t !== "click" });
    });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && openId) closeCard(); });
    new MutationObserver(function () { if (curLang() !== lang) { lang = curLang(); relabel(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    lang = curLang();
  }
  function button(e) {
    var b = buttons[e.id];
    if (b) return b;
    b = document.createElement("button");
    b.type = "button";
    b.className = "xyi-btn";
    b.dataset.id = e.id;
    b.addEventListener("click", function () { openId === e.id ? closeCard() : openCard(e); });
    layer.appendChild(b);
    buttons[e.id] = b;
    label(b, e);
    return b;
  }
  function label(b, e) {
    var u = UI[lang];
    b.textContent = u.glyph;
    b.setAttribute("lang", lang === "zh" ? "zh-CN" : lang);
    b.setAttribute("aria-label", u.open + "：" + e.orig.replace(/\n/g, " "));
    b.title = u.open;
    b.setAttribute("aria-expanded", openId === e.id ? "true" : "false");
  }
  function relabel() {
    Object.keys(buttons).forEach(function (id) { label(buttons[id], byId(id)); });
    if (openId) openCard(byId(openId));
  }
  function byId(id) { for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].id === id) return ENTRIES[i]; return null; }
  function openCard(e) {
    var u = UI[lang];
    openId = e.id;
    card.innerHTML = "";
    var close = document.createElement("button");
    close.type = "button"; close.className = "xyi-close"; close.textContent = "×"; close.setAttribute("aria-label", u.close);
    close.addEventListener("click", closeCard);
    var o = document.createElement("p"); o.className = "xyi-orig"; o.lang = "zh-CN"; o.textContent = e.orig;
    var h = document.createElement("p"); h.className = "xyi-head"; h.textContent = u.head;
    var t = document.createElement("p"); t.className = "xyi-text"; t.lang = lang === "zh" ? "zh-CN" : lang; t.textContent = e[lang];
    // (EN / JA: the original is shown as it is written on the plaque — simplified Chinese — and says so)
    if (u.orig) { var ol = document.createElement("p"); ol.className = "xyi-origlab"; ol.textContent = u.orig; card.append(close, ol, o, h, t); }
    else card.append(close, o, h, t);
    card.setAttribute("aria-label", u.open);
    card.hidden = false;
    Object.keys(buttons).forEach(function (id) { buttons[id].setAttribute("aria-expanded", id === e.id ? "true" : "false"); });
    requestAnimationFrame(function () { card.classList.add("is-on"); });
  }
  function closeCard() {
    openId = null;
    card.classList.remove("is-on");
    card.hidden = true;
    Object.keys(buttons).forEach(function (id) { buttons[id].setAttribute("aria-expanded", "false"); });
  }

  var SEAL_HALF = window.matchMedia && matchMedia("(pointer: coarse)").matches ? 22 : 17; // the seal is 34 px, 44 px on touch screens (CSS)
  /* —— per-frame placement —— */
  var lastScan = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - lastScan > 1200 && pending.length) { lastScan = now; scan(); }
    var cam = view.camera, scene = view.scene;
    var loading = document.getElementById("loading");
    var ready = cam && scene && loading && loading.classList.contains("is-done") && !document.documentElement.classList.contains("is-crossing");
    var cx = 0, cy = 0, cz = 0;
    if (ready) { var cw = cam.matrixWorld.elements; cx = cw[12]; cy = cw[13]; cz = cw[14]; }
    var best = {};
    if (ready) for (var i = 0; i < found.length; i++) {
      var f = found[i];
      if (!f.mesh.visible || rootOf(f.mesh) !== scene) continue;
      if (!f.mesh.isInstancedMesh && !facing(f.mesh, cx, cy, cz)) continue; // plaques read from the front only
      var as = anchors(f);
      for (var k = 0; k < as.length; k++) {
        var a = as[k], d = Math.hypot(a[0] - cx, a[1] - cy, a[2] - cz);
        if (d > f.entry.r) continue;
        var cur = best[f.entry.id];
        if (!cur) best[f.entry.id] = cur = { d: d, sx: 0, sy: 0, sz: 0, n: 0, e: f.entry };
        // Couplets are two meshes: anchor between them. Lanterns: just the nearest one.
        if (f.entry.id === "lantern") { if (d <= cur.d || !cur.n) { cur.d = d; cur.sx = a[0]; cur.sy = a[1]; cur.sz = a[2]; cur.n = 1; } }
        else { cur.d = Math.min(cur.d, d); cur.sx += a[0]; cur.sy += a[1]; cur.sz += a[2]; cur.n++; }
      }
    }
    var shown = Object.keys(best).map(function (id) { return best[id]; }).sort(function (p, q) { return p.d - q.d; }).slice(0, 3);
    var live = {};
    var W = innerWidth, H = innerHeight, dockTop = H - 120;
    var dock = document.getElementById("dock"); if (dock) { var r = dock.getBoundingClientRect(); if (r.height) dockTop = r.top; }
    shown.forEach(function (s) {
      var p = project(cam, s.sx / s.n, s.sy / s.n, s.sz / s.n);
      if (!p || p.x < 24 || p.x > W - 24 || p.y < 64 || p.y > dockTop - 24) return;
      var b = button(s.e);
      var bx = Math.min(W - 40, p.x + 22), by = Math.max(56, p.y - 18);
      var half = SEAL_HALF;
      b.style.transform = "translate(" + Math.round(bx - half) + "px," + Math.round(by - half) + "px)";
      b.classList.add("is-on");
      live[s.e.id] = { x: bx, y: by };
    });
    Object.keys(buttons).forEach(function (id) { if (!live[id]) buttons[id].classList.remove("is-on"); });
    if (openId) {
      var at = live[openId];
      if (!at) { closeCard(); return; }
      var cwid = card.offsetWidth || 260, chei = card.offsetHeight || 120;
      var x = at.x + 24, y = at.y - 12;
      if (x + cwid > W - 12) x = at.x - 24 - cwid;
      x = Math.max(12, Math.min(W - 12 - cwid, x));
      y = Math.max(56, Math.min(dockTop - 12 - chei, y));
      card.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    }
  }
  window.__xyInscriptions = {
    state: function () {
      var c = view.camera && view.camera.matrixWorld.elements;
      return { found: found.map(function (f) { return f.entry.id; }),
        facing: c ? found.map(function (f) { return f.entry.id + ":" + (f.mesh.isInstancedMesh ? "-" : facing(f.mesh, c[12], c[13], c[14]) ? "F" : "B"); }) : null, camera: !!view.camera,
        visible: Object.keys(buttons).filter(function (id) { return buttons[id].classList.contains("is-on"); }), open: openId };
    },
    entries: ENTRIES
  };
  function start() { build(); requestAnimationFrame(tick); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
