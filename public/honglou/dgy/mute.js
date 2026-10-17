// v22 全站静音钮（只开发版页面引入）：一键关/开所有声音——BGM、环境声、音效、册页 iframe、视频；记在 localStorage「dgy-mute」
(function () {
  var KEY = 'dgy-mute', muted = false; try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  // 10-16：本机直接打开文件（file://，编辑器预览面板会在后台自动打开刚改的页面）一律静音，免得老大突然听见配乐又找不到是哪个页面
  if (location.protocol === 'file:') muted = true;
  var wins = [];
  function install(w) {
    if (!w || w.__dgyMute) return; w.__dgyMute = 1; wins.push(w);
    var ctxs = w.__dgyCtx = [];
    ['AudioContext', 'webkitAudioContext'].forEach(function (n) { var C = w[n]; if (!C || C.__dgyW) return;
      var W2 = function () { var c = new (Function.prototype.bind.apply(C, [null].concat([].slice.call(arguments))))(); ctxs.push(c); if (muted) try { c.suspend(); } catch (e) {} return c; };
      W2.prototype = C.prototype; W2.__dgyW = 1; try { Object.setPrototypeOf(W2, C); } catch (e) {} w[n] = W2; });
    var BA = w.BaseAudioContext || w.AudioContext; var res = BA && BA.prototype.resume;
    if (res && !BA.prototype.__dgyR) { BA.prototype.__dgyR = 1; BA.prototype.resume = function () { if (muted) return Promise.resolve(); return res.apply(this, arguments); }; }
    var M = w.HTMLMediaElement && w.HTMLMediaElement.prototype, play = M && M.play;
    if (play && !M.__dgyP) { M.__dgyP = 1; M.play = function () { var L = w.__dgyMed || (w.__dgyMed = []); if (L.indexOf(this) < 0) L.push(this); if (muted) { if (this.dataset && this.dataset.dgyM == null) this.dataset.dgyM = this.muted ? '1' : '0'; this.muted = true; } return play.apply(this, arguments); }; }
    var Au = w.Audio; if (Au && !Au.__dgyW) { var A2 = function (s) { var a = new Au(s); if (muted) a.muted = true; return a; }; A2.prototype = Au.prototype; A2.__dgyW = 1; w.Audio = A2; }
  }
  function applyTo(w) { try {
    (w.__dgyCtx || []).forEach(function (c) { try { if (muted) c.suspend(); else c.state !== 'closed' && c.resume(); } catch (e) {} });
    var ms = [].slice.call(w.document.querySelectorAll('audio,video')).concat((w.__dgyMed || []).filter(function (m) { return !m.isConnected; })); for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (muted) { if (m.dataset.dgyM == null) m.dataset.dgyM = m.muted ? '1' : '0'; m.muted = true; } else if (m.dataset.dgyM != null) { if (m.dataset.dgyM === '0') m.muted = false; delete m.dataset.dgyM; } }
  } catch (e) {} }
  function apply() { wins.forEach(applyTo); var b = document.getElementById('dgyMute'); if (b) { b.classList.toggle('off', muted); b.title = muted ? '已静音（点开声音）' : '点此静音'; b.setAttribute('aria-pressed', muted ? 'true' : 'false'); } }
  install(window);
  function hookFrames() { var fs = document.querySelectorAll('iframe'); for (var i = 0; i < fs.length; i++) { var f = fs[i]; if (f.__dgyH) continue; f.__dgyH = 1; var go = function (f) { return function () { try { install(f.contentWindow); applyTo(f.contentWindow); } catch (e) {} }; }(f); f.addEventListener('load', go); go(); } }
  new MutationObserver(function () { hookFrames(); if (muted) wins.forEach(applyTo); }).observe(document.documentElement, { childList: true, subtree: true });
  window.dgyMute = { get: function () { return muted; }, set: function (v) { muted = !!v; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {} apply(); }, media: function () { var a = []; wins.forEach(function (w) { a = a.concat(w.__dgyMed || []); }); return a; }, contexts: function () { var a = []; wins.forEach(function (w) { a = a.concat(w.__dgyCtx || []); }); return a; } };
  function btn() { if (document.getElementById('dgyMute')) return; var b = document.createElement('button'); b.id = 'dgyMute'; b.type = 'button'; b.innerHTML = '<span>樂</span>';
    var st = document.createElement('style'); st.textContent = '#dgyMute::after{content:"";position:absolute;inset:-6px}#dgyMute{bottom:calc(14px + env(safe-area-inset-bottom,0px))}' + '#dgyMute{position:fixed;right:14px;bottom:14px;z-index:2147483646;width:38px;height:38px;padding:0;border:1px solid #6e1f17;border-radius:4px;background:#a4342a;color:#f6ead2;font:600 19px/36px "STKaiti","Kaiti SC","KaiTi",serif;box-shadow:inset 0 0 0 2px rgba(246,234,210,.55),0 2px 6px rgba(40,20,10,.35);cursor:pointer;transition:transform .35s cubic-bezier(.34,1.56,.64,1),background .3s,opacity .3s;opacity:.9}#dgyMute:hover{transform:scale(1.08);opacity:1}#dgyMute.off{background:#d9cdb4;color:#6b5a44;border-color:#8a7a60;box-shadow:inset 0 0 0 2px rgba(255,255,255,.5),0 2px 6px rgba(40,20,10,.25)}#dgyMute.off span{position:relative}#dgyMute.off span:after{content:"";position:absolute;left:-5px;right:-5px;top:50%;height:2px;background:#a4342a;transform:rotate(-35deg)}';
    document.head.appendChild(st); document.body.appendChild(b);
    b.addEventListener('click', function (e) { e.stopPropagation(); window.dgyMute.set(!muted); }, true);
    ['pointerdown', 'mousedown'].forEach(function (k) { b.addEventListener(k, function (e) { e.stopPropagation(); }, true); }); apply(); }
  if (document.body) btn(); else document.addEventListener('DOMContentLoaded', btn);
})();
