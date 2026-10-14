/* ZH/EN/JA switch for the 多美的夏日小院 / 诗语江南 scene runtime (prebuilt bundle).
 * Chinese is the default and is never rewritten: in zh mode this script only listens.
 * In en mode it swaps visible text and accessible labels through xy-i18n-en.js, keeps classical
 * verse in Chinese with the English beneath, and restores every original on switching back.
 * Other languages register a pack on window.__XY_I18N[lang] (xy-i18n-ja.js); en may also come from
 * window.__XY_I18N_EN. Language: ?lang=zh|en|ja, else localStorage "duomei-lang", else zh. The /xiaoyuan shell
 * posts {type: "duomei-lang", lang} to switch live without reloading the scene. */
(function () {
  var KEY = "duomei-lang";
  var ATTRS = ["aria-label", "title", "placeholder", "aria-valuetext", "alt"];
  var PACKS = window.__XY_I18N || {};
  if (!PACKS.en && window.__XY_I18N_EN) PACKS.en = window.__XY_I18N_EN;
  function known(l) { return l === "zh" || (typeof l === "string" && Object.prototype.hasOwnProperty.call(PACKS, l)); }
  var D = {}, POEMS = {}, RULES = [];
  function use(l) { var p = PACKS[l]; if (p) { D = p.dict; POEMS = p.poems; RULES = p.rules; } }
  function htmlLang(l) { return l === "zh" ? "zh-CN" : (PACKS[l] && PACKS[l].html) || l; }
  var lang = "zh";
  try {
    var q = new URLSearchParams(location.search).get("lang");
    var saved = localStorage.getItem(KEY);
    lang = known(q) ? q : (known(saved) ? saved : "zh");
  } catch (e) {}
  use(lang);

  var textState = new WeakMap(); // node -> {orig, out}
  var attrState = new WeakMap(); // element -> {attr: {orig, out}}
  var titleOrig = null, metaOrig = null;
  var observer = null, busy = false;

  var TAILS = { "下一处": "the next stop", "结束": "the end", "穿门": "the door" };
  function tr(s) {
    if (!s || !/[\u4e00-\u9fff]/.test(s)) return null;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), lead = m[1], core = m[2], tail = m[3];
    var out = trCore(core);
    return out == null ? null : lead + out + tail;
  }
  function trCore(s) {
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    for (var i = 0; i < RULES.length; i++) {
      var m = s.match(RULES[i][0]);
      if (m) {
        if (lang === "en" && /^约/.test(s) && TAILS[m[2]]) return "about " + m[1] + "s to " + TAILS[m[2]];
        var r = RULES[i][1](m, function (x) { var y = trCore(x); return y == null ? x : y; });
        // Japanese output is itself written in kanji, so only English results are screened for leftovers.
        if (lang !== "en" || !/[\u4e00-\u9fff]/.test(r)) return r;
      }
    }
    if (s.indexOf(" · ") > 0) {
      // Greedy: match the longest run of " · "-joined pieces the dictionary knows.
      var parts = s.split(" · "), outParts = [], i = 0;
      while (i < parts.length) {
        var hit = null, j;
        for (j = parts.length; j > i; j--) {
          var seg = parts.slice(i, j).join(" · ");
          hit = seg === "" ? "" : (j - i === parts.length ? null : trCore(seg));
          if (hit != null) break;
        }
        if (hit == null) return null;
        outParts.push(hit); i = j;
      }
      return outParts.join(" · ");
    }
    if (/ $/.test(s) || /^ /.test(s)) { var t2 = trCore(s.trim()); if (t2 != null) return s.replace(s.trim(), t2); }
    return null;
  }

  function applyText(node) {
    var st = textState.get(node), v = node.nodeValue;
    if (st && v === st.out) return;            // already ours
    var orig = v;                                // the app wrote something new (or first visit)
    var parent = node.parentElement;
    if (parent && parent.closest && parent.closest("script,style,[data-keep-zh]")) return;
    if (parent && parent.classList && parent.classList.contains("info-meaning")) { syncPoem(parent); return; }
    var out = tr(orig);
    if (out == null) { textState.delete(node); return; }
    textState.set(node, { orig: orig, out: out });
    node.nodeValue = out;
  }
  function applyAttrs(el) {
    var map = attrState.get(el) || {};
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (v == null) continue;
      if (map[a] && v === map[a].out) continue;
      var out = tr(v);
      if (out == null) { delete map[a]; continue; }
      map[a] = { orig: v, out: out };
      el.setAttribute(a, out);
    }
    attrState.set(el, map);
  }
  function syncPoem(el) {
    var zh = el.textContent;
    var next = el.nextElementSibling;
    var holder = next && next.classList.contains("info-meaning-en") ? next : null;
    var en = lang !== "zh" ? POEMS[zh.trim()] : null;
    if (!en) { if (holder) holder.remove(); return; }
    if (!holder) { holder = document.createElement("p"); holder.className = "info-meaning-en"; el.after(holder); }
    holder.setAttribute("lang", htmlLang(lang));
    if (holder.textContent !== en) holder.textContent = en;
    holder.hidden = el.hidden;
  }
  function syncInfoCard() {
    var card = document.getElementById("info-card");
    if (!card) return;
    var h2 = card.querySelector("h2"), sub = card.querySelector(".info-en");
    if (h2 && sub && lang !== "zh") {
      var st = h2.firstChild && textState.get(h2.firstChild);
      var zhTitle = st && h2.textContent === st.out ? st.orig : null;
      // English name as the heading; the Chinese name moves into the subtitle line.
      if (zhTitle && sub.textContent !== zhTitle) {
        sub.dataset.en = sub.textContent;
        sub.textContent = zhTitle;
        sub.setAttribute("lang", "zh-CN");
        sub.setAttribute("data-keep-zh", "");
      }
    }
    var meaning = card.querySelector(".info-meaning");
    if (meaning) syncPoem(meaning);
  }

  function walk(root) {
    if (root.nodeType === 3) { applyText(root); return; }
    if (root.nodeType !== 1) return;
    applyAttrs(root);
    var it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n;
    while ((n = it.nextNode())) { if (n.nodeType === 3) applyText(n); else applyAttrs(n); }
  }
  function applyAll() {
    busy = true;
    if (titleOrig == null) titleOrig = document.title;
    var tt = tr(titleOrig); if (tt) document.title = tt;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) { if (metaOrig == null) metaOrig = meta.content; var mt = tr(metaOrig); if (mt) meta.content = mt; }
    walk(document.body);
    syncInfoCard();
    busy = false;
  }
  function restoreAll() {
    busy = true;
    var it = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), n;
    var nodes = [document.body]; while ((n = it.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (node.nodeType === 3) { var st = textState.get(node); if (st && node.nodeValue === st.out) node.nodeValue = st.orig; textState.delete(node); return; }
      var map = attrState.get(node);
      if (map) { Object.keys(map).forEach(function (a) { if (node.getAttribute(a) === map[a].out) node.setAttribute(a, map[a].orig); }); attrState.delete(node); }
      if (node.classList && node.classList.contains("info-meaning-en")) node.remove();
      if (node.classList && node.classList.contains("info-en") && node.dataset.en != null) { node.textContent = node.dataset.en; delete node.dataset.en; node.removeAttribute("lang"); node.removeAttribute("data-keep-zh"); }
    });
    if (titleOrig != null) document.title = titleOrig;
    var meta = document.querySelector('meta[name="description"]'); if (meta && metaOrig != null) meta.content = metaOrig;
    busy = false;
  }

  function onMutations(list) {
    if (busy || lang === "zh") return;
    busy = true;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === "characterData") applyText(r.target);
      else if (r.type === "attributes") applyAttrs(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      if (r.target && r.target.closest && r.target.closest("#info-card")) syncInfoCard();
    }
    busy = false;
  }
  var titleObs = null;
  function setLang(next, persist) {
    if (!known(next)) return;
    var prev = lang;
    if (persist) { try { localStorage.setItem(KEY, next); } catch (e) {} }
    document.documentElement.lang = htmlLang(next);
    Object.keys(PACKS).forEach(function (l) { document.documentElement.classList.toggle("lang-" + l, next === l); });
    if (prev !== "zh" && prev !== next) restoreAll(); // back to the Chinese originals before re-translating
    lang = next; use(next);
    if (next !== "zh") {
      if (!observer) {
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        titleObs = new MutationObserver(function () { if (busy || lang === "zh") return; var t = tr(document.title); if (t) { titleOrig = document.title; busy = true; document.title = t; busy = false; } });
        var te = document.querySelector("title"); if (te) titleObs.observe(te, { childList: true, characterData: true, subtree: true });
      }
      applyAll();
      observer.takeRecords(); // our own rewrites
    } else {
      if (observer) { observer.disconnect(); observer = null; }
      if (titleObs) { titleObs.disconnect(); titleObs = null; }
    }
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (d && d.type === "duomei-lang") setLang(d.lang, false);
  });
  window.__xySetLang = setLang;
  if (lang !== "zh") {
    var first = lang; lang = "zh";
    document.documentElement.lang = htmlLang(first);
    document.documentElement.classList.add("lang-" + first);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setLang(first, false); });
    else setLang(first, false);
  }
})();
