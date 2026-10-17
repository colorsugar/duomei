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
  const PORDER = ['daiyu', 'baochai', 'baoyu', 'tanchun', 'xiangyun', 'liwan', 'yingchun', 'xichun', 'miaoyu', 'xifeng', 'baoqin', 'xiangling', 'xiuyan', 'liwen', 'liqi', 'yuanchun', 'qinkeqing', 'jialan', 'jiazheng', 'jiahuan', 'jiayucun', 'zhenshiyin', 'bozudaoren', 'yiseng', 'laitouheshang', 'fengziying', 'yuner', 'jiangyuhan', 'zhenzhenguo', 'taixu'];
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
    // 异文（程乙本对照 / 底本存疑处的另一种读法）：条目带「异文」才出；仍存疑的在小标题后注明
    const pp = db.作品[id], yw = pp && pp.异文 ? [].concat(pp.异文) : [];
    if (!yw.length && pp && typeof pp.待核 === 'string') yw.push(pp.待核); // 只有「待核」说明、没有异文数组的条目（如 guihua-ci）也要让读者看见
    if (yw.length) {
      const sec = document.createElement('div'); sec.className = 'sg-extra sg-yw';
      sec.innerHTML = '<h3>異文' + (pp.待核 ? ' · 仍存疑' : '') + '</h3><ul>' + yw.map((t) => '<li>' + esc(String(t)) + '</li>').join('') + '</ul>';
      box.appendChild(sec);
    }
  };
  // 10-17 Fable 第三轮（总指挥退回：读诗页右栏「賞析」最后一句被渐隐截掉，老大要的是右栏「一览无余」）：矮窗电脑里右栏只有 ~430px 高，串講 + 字裡尋意 + 賞析 + 難字 四节叠着怎么压字都放不下
  //   → 布局高 ≤820 的电脑版面上右栏改成三页签「箋邊串講 / 字裡尋意 / 賞析」，一次只摊一节、每节整段看完；点诗里的朱字自动翻到「字裡尋意」。宽屏（1440×900）右栏够高，照旧整栏
  const AN_TABS = [['talk', '箋邊串講'], ['note', '字裡尋意'], ['more', '賞析']];
  function annTabbed() { const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; return document.body.dataset.layout === 'desktop' && (matchMedia('(max-height: 820px)').matches || innerHeight / z < 820); }
  function annTab(name) {
    const an = $('.annotation'); if (!an) return; an.dataset.tab = name; an.querySelectorAll('.sg-atabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name))); an.scrollTop = 0;
    an.classList.toggle('sg-over', an.scrollHeight > an.clientHeight + 2); // 这一页放不下一屏（賞析常常近五屏）→ 页签条右端亮「往下翻」
  }
  function annSetup(reset) {
    const an = $('.annotation'); if (!an) return;
    const on = annTabbed(); an.classList.toggle('sg-tabbed', on);
    if (!on) { delete an.dataset.tab; return; }
    if (!an.querySelector('.sg-atabs')) {
      const bar = document.createElement('div'); bar.className = 'sg-atabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', '箋邊');
      bar.innerHTML = AN_TABS.map(([k, t]) => '<button type="button" role="tab" data-tab="' + k + '">' + t + '</button>').join('') + '<span class="sg-more" aria-hidden="true">↓ 往下翻</span>';
      bar.addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) annTab(b.dataset.tab); });
      // 第三轮审查 🟢4：页签上按左右键原来冒泡到读诗弹窗的处理器变成「上一首 / 下一首」→ 在页签条里左右键只切页签并把焦点带过去
      bar.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
        const bs = [...bar.querySelectorAll('button[data-tab]')], i = bs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
        const j = e.key === 'Home' ? 0 : e.key === 'End' ? bs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length;
        e.preventDefault(); e.stopPropagation(); annTab(bs[j].dataset.tab); bs[j].focus();
      });
      const art = an.querySelector('.carrier-art'); an.insertBefore(bar, art ? art.nextSibling : an.firstChild);
    }
    if (reset || !an.dataset.tab) annTab('talk');
  }
  const showNote0 = showNote;
  showNote = function (term, node) { showNote0(term, node); const an = $('.annotation'); if (an && an.classList.contains('sg-tabbed')) annTab('note'); };
  const openPoem0 = openPoem;
  openPoem = function (index) {
    openPoem0(index);
    annSetup(true);
    const id = activeIds[currentPoem], p = db.作品[id]; if (!p) return;
    const by = $('#detail-byline');
    by.innerHTML = authorIds(p).map((a) => people[a] ? '<button type="button" class="sg-who" data-person="' + a + '">' + esc(people[a].name) + '</button>' : esc(a)).join('、') + ' · 第' + cn(p.回) + '回';
    by.querySelectorAll('[data-person]').forEach((b) => { b.onclick = () => emit('person', b.dataset.person); });
    readArm(id);
    requestAnimationFrame(() => { const an = $('.annotation'); if (an) an.scrollTop = 0; const db2 = $('#detail-body'); if (db2) db2.scrollTop = 0; });
    emit('sfx', 'paper-set');
  };
  // 10-15（界面督察：Chrome 按人第 3 组第 1 首点不开）：连续开合几首诗后再换组，Chrome 里新一组的诗笺整片点不到
  // （elementFromPoint 只落在 #workspace 上，鼠标点了没反应；Safari 没有）。换组渲染完后只在「确实点不到」时把栏重新挂一次版面。
  { const pf = $('#portfolio'); let tick = 0;
    const stale = () => { const s = $('.slip'); if (!s) return false; const r = window.GF && GF.vrect ? GF.vrect(s) : s.getBoundingClientRect(); /* Safari 整页 zoom：换成和 elementFromPoint 同一套坐标 */ const x =r.left + r.width / 2, y = r.top + r.height / 2;
      if (!r.width || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false; const t = document.elementFromPoint(x, y); return !!t && !s.contains(t) && !t.closest('dialog'); };
    if (pf && /Chrome\//.test(navigator.userAgent)) new MutationObserver(() => {
      const my = ++tick;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (my !== tick || !stale()) return; const w = $('#workspace'); if (!w) return; const d = w.style.display; w.style.display = 'none'; void w.offsetHeight; w.style.display = d; }));
    }).observe(pf, { childList: true }); }
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
  entry.insertAdjacentHTML('beforeend', '<button type="button" class="gf-btn is-seal sg-entry-x" id="sg-entry-x" aria-label="合上詩稿，回到冊">閉</button>');
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

  // ——— 10-17 Fable：签卡上的竖排诗题（「詠白海棠（其二）」八字、「中秋夜大觀園即景聯句三十五韻」十五字）在限高里会折成第二列，括号压到诗句上 ———
  // 办法：诗题一律不折列；按字数把字号缩到限高装得下为止（最小 13px）；真装不下的长题才允许两列，并让诗句多让出一列宽（game.css .sg-two-col）
  // 诗句列同理：1000×600 里卡只剩 ~257 高，诗句列 115px 装不下七言一句（八字要 131px），尾字被切 → 先量实际可用高度，装不下就缩字（最小 12px）
  // 样张里 font-size 多带 !important（html body .slip .verse-preview p {font-size:16px!important}），所以这里一律 setProperty(..., 'important')
  const setI = (el, k, v) => el.style.setProperty(k, v, 'important');
  // rect 坐标 ÷ 布局像素 的倍数：Chrome 整页 zoom 时 rect 含 zoom（GF.zk 回 1）→ 倍数 = zoom；Safari rect 不含（GF.zk 回 zoom）→ 1
  const rectK = () => { const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; if (Math.abs(z - 1) < 0.01) return 1; const k = (window.GF && GF.zk) ? GF.zk() : 1; return z / k; };
  // 第四轮审查：竖排（vertical-rl）里 line-height 管的是列距不是字高，拿它估字高会过早缩字 → 改成实测：一列的真实高度 = p.scrollHeight，超出可用高度多少就按比例缩多少
  function fitVerses() {
    for (const v of document.querySelectorAll('.verse-preview')) {
      const ps = [...v.querySelectorAll('p')]; if (!ps.length) continue;
      v.style.removeProperty('font-size'); ps.forEach((p) => p.style.removeProperty('font-size'));
      const cs = getComputedStyle(v), fs0 = parseFloat(cs.fontSize); if (!fs0) continue;
      const avail = v.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - 2;
      const need = Math.max(...ps.map((p) => p.scrollHeight)); if (!need || avail <= 0 || need <= avail) continue;
      const fs = Math.max(14, Math.floor(fs0 * avail / need)); // 第六轮审查 🟡3：下限 14px（核查单的小字下限）
      setI(v, 'font-size', fs + 'px'); ps.forEach((p) => setI(p, 'font-size', fs + 'px'));
    }
  }
  function fitTitles() {
    const K = rectK(); // 第六轮审查 🟢4：GF.zk 要插测量节点，整轮算一次就够
    for (const t of document.querySelectorAll('.slip-title')) {
      t.style.removeProperty('font-size'); t.style.removeProperty('max-height'); setI(t, 'white-space', 'nowrap'); t.classList.remove('sg-two-col');
      if (!t.textContent.length) continue;
      const cs = getComputedStyle(t), fs0 = parseFloat(cs.fontSize); if (!fs0) continue;
      let maxH = parseFloat(cs.maxHeight) || 1e9;
      // 限高还要让开底下的署名 / 印章行：诗题是绝对定位的，卡矮时会一直伸到印章底下去
      const v = t.parentElement && t.parentElement.querySelector('.verse-preview');
      // 第五轮审查：整页 zoom≠1 时 Chrome 的 getBoundingClientRect 含 zoom、scrollHeight / max-height 不含，直接相减单位不一致 → 先换算回布局像素（Safari 的 rect 本来就不含 zoom，GF.zk 能分辨）
      if (v) { const room = (v.getBoundingClientRect().bottom - t.getBoundingClientRect().top) / K - 4; if (room > 40 && room < maxH) { maxH = room; setI(t, 'max-height', Math.floor(room) + 'px'); } }
      let need = t.scrollHeight; // 已禁折列，这就是整题一列的真实高度
      if (need <= maxH) continue;
      // 第六轮审查 🔴1：字距（letter-spacing 2px）不随字号缩，按比例缩一次可能还差几像素 → 缩完再量，最多补三轮；到 14px 下限还放不下才分两列
      let fs = Math.floor(fs0 * maxH / need), fit = false;
      for (let i = 0; i < 4 && fs >= 14; i++) {
        setI(t, 'font-size', fs + 'px'); need = t.scrollHeight;
        if (need <= maxH) { fit = true; break; }
        fs = Math.min(fs - 1, Math.floor(fs * maxH / need));
      }
      if (fit) continue;
      setI(t, 'font-size', '14px'); t.style.removeProperty('white-space'); t.classList.add('sg-two-col');
    }
  }
  // 10-17 Fable 第三轮（总指挥退回：「按回」翻到后几张时最左那张签卡只露半截「全粉箋 / 字注 / 串講」）：卡轨滚到头时 scrollLeft 被夹在最大值，末尾几张永远贴不到左边、第一张可见的卡就被切半
  //   → 卡轨尾部补一块占位（CSS #card-track::after 吃 --sg-tail），宽度 = 让末卡也能贴左对齐还差的那一截；手机是整屏一张、不需要
  function fitTail() {
    const t = $('#card-track'); if (!t) return;
    t.style.setProperty('--sg-tail', '0px');
    if (document.body.dataset.layout !== 'desktop') return;
    const targets = cardTargets(), last = targets[targets.length - 1]; if (!last) return;
    const want = last.offsetLeft - t.offsetLeft - 5, need = want - (t.scrollWidth - t.clientWidth);
    if (need > 0) t.style.setProperty('--sg-tail', Math.ceil(need) + 'px');
  }
  const fitAll = () => { fitVerses(); fitTitles(); fitTail(); annSetup(false); };
  { let raf = 0; const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fitAll); };
    const pf = $('#portfolio'); if (pf) new MutationObserver(queue).observe(pf, { childList: true });
    new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ['data-layout'] });
    new MutationObserver(queue).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fs'] });
    addEventListener('resize', queue); if (document.fonts) document.fonts.ready.then(queue);
    // 开册有一段放大过渡，首次渲染时卡还是小尺寸、会按小尺寸把字缩掉 → 工作区一变大小就重算
    if (window.ResizeObserver) { const ro = new ResizeObserver(queue); const ws = $('#workspace'); if (ws) ro.observe(ws); ro.observe(document.body); }
    // 只认会改变卡尺寸的那几层容器的过渡（开册放大 / 卷轴 / 卡轨），签卡自己的悬停 transform 过渡不触发全量重算（第五轮审查）
    addEventListener('transitionend', (e) => { const el = e.target; if (el && el.matches && el.matches('#workspace, .entry, .portfolio, .scroll-wrap, .card-track')) queue(); }, true); }

  // ——— 对游戏的接口 ———
  const ready = () => (loaded ? Promise.resolve() : load());
  function setMode(m) { root.classList.toggle('sg-single', m === 'single'); root.classList.toggle('sg-club', m === 'club'); }
  function syncTabs() { $$('.mode-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === mode))); resetScroll(); }
  // 10-17 Fable：切「按人 / 按社 / 按回」时 #workspace 的滚动位置原样留着（手机社页滚到底看四钮再切按人，段头就滚到页签条后面、人名被盖）→ 切视图一律回到顶
  function resetScroll() { requestAnimationFrame(() => { const w = $('#workspace'); if (w) w.scrollTop = 0; }); }
  addEventListener('click', (e) => { const t = e.target; if (t && t.closest && t.closest('.mode-tabs button')) resetScroll(); }, true);
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
    // 退一层（游戏一侧的 Esc / 浏览器返回 / 书案「返」都走这里，和页内按 Esc 同一规则）：有对话框先关最上面那个，没有才收起整套回到册
    back() {
      const d = ($('#reader').open && $('#reader')) || ($('#poem-dialog').open && $('#poem-dialog')) || document.querySelector('dialog[open]');
      if (d) { try { d.close(); } catch (e) { /* */ } return 'dialog'; }
      emit('close'); return 'close';
    },
    reset() { closeDialogs(); finishWriting(); },
    get state() { return { loaded, mode, selected, single: root.classList.contains('sg-single'), dialog: $('#poem-dialog').open, phase: boxPhase }; },
  };
  // 预载时先把三套行书字库解开、诗稿数据读好，第一次开函不卡
  setTimeout(() => { try { ['28px "DGY All"'].forEach((f) => document.fonts.load(f, '詩稿彩箋').catch(() => {})); } catch (e) { /* */ } ready().catch(() => {}); }, 300);
  emit('ready');

  // ——— 10/15 书写体标签转繁体：行书字库是繁体字库，「笺 读 诗 讲 边 籤…」这些简体字取不到字形会回落楷体 / 宋体。
  //     只处理用书写体的短标签（纸型、操作字、页码、批注来源）；正文白话仍是简体。表同 dgy/s2t.js。
  const SG_S2T = {"万":"萬","与":"與","专":"專","东":"東","丝":"絲","丢":"丟","两":"兩","丧":"喪","个":"個","临":"臨","为":"爲","丽":"麗","举":"舉","么":"麼","义":"義","乌":"烏","乐":"樂","习":"習","书":"書","乱":"亂","于":"於","云":"雲","亲":"親","从":"從","仪":"儀","们":"們","众":"衆","优":"優","会":"會","传":"傳","体":"體","余":"餘","侧":"側","儿":"兒","兑":"兌","兰":"蘭","关":"關","兽":"獸","内":"內","册":"冊","写":"寫","农":"農","冲":"衝","决":"決","况":"況","冻":"凍","净":"淨","准":"準","凉":"涼","减":"減","几":"幾","凤":"鳳","击":"擊","凿":"鑿","划":"劃","刘":"劉","则":"則","刚":"剛","创":"創","删":"刪","别":"別","办":"辦","务":"務","动":"動","势":"勢","区":"區","单":"單","占":"佔","卧":"臥","厅":"廳","历":"歷","压":"壓","厢":"廂","厦":"廈","厨":"廚","厮":"廝","参":"參","双":"雙","发":"發","变":"變","叙":"敘","叠":"疊","台":"臺","叶":"葉","号":"號","吃":"喫","后":"後","听":"聽","启":"啓","响":"響","啰":"囉","嘱":"囑","团":"團","园":"園","围":"圍","国":"國","图":"圖","圣":"聖","场":"場","块":"塊","坛":"壇","坞":"塢","墙":"牆","声":"聲","壳":"殼","处":"處","备":"備","复":"復","够":"夠","头":"頭","夹":"夾","妇":"婦","妈":"媽","孙":"孫","宁":"寧","宝":"寶","实":"實","宫":"宮","宽":"寬","宾":"賓","对":"對","导":"導","寿":"壽","将":"將","尔":"爾","尘":"塵","尽":"盡","层":"層","属":"屬","峰":"峯","帘":"簾","带":"帶","帧":"幀","并":"並","广":"廣","庄":"莊","床":"牀","库":"庫","应":"應","废":"廢","开":"開","异":"異","弃":"棄","张":"張","弯":"彎","弹":"彈","强":"強","归":"歸","当":"當","录":"錄","径":"徑","怀":"懷","态":"態","总":"總","悬":"懸","惯":"慣","戏":"戲","户":"戶","扑":"撲","扩":"擴","扫":"掃","抚":"撫","抛":"拋","护":"護","报":"報","拟":"擬","拢":"攏","拦":"攔","挂":"掛","挡":"擋","挤":"擠","换":"換","据":"據","搂":"摟","摆":"擺","摇":"搖","数":"數","斋":"齋","斗":"鬥","断":"斷","无":"無","旧":"舊","时":"時","旷":"曠","显":"顯","晒":"曬","晓":"曉","晕":"暈","暂":"暫","机":"機","杂":"雜","条":"條","来":"來","极":"極","标":"標","栈":"棧","栊":"櫳","栋":"棟","栏":"欄","树":"樹","栗":"慄","样":"樣","档":"檔","桥":"橋","桨":"槳","梦":"夢","检":"檢","楼":"樓","横":"橫","橱":"櫥","毕":"畢","气":"氣","汇":"匯","沟":"溝","没":"沒","泻":"瀉","洼":"窪","浅":"淺","测":"測","浏":"瀏","涂":"塗","涨":"漲","渍":"漬","渐":"漸","游":"遊","湾":"灣","溆":"漵","滚":"滾","满":"滿","滩":"灘","潇":"瀟","灯":"燈","炉":"爐","点":"點","烛":"燭","烟":"煙","热":"熱","爷":"爺","状":"狀","犹":"猶","独":"獨","狮":"獅","环":"環","现":"現","珑":"瓏","画":"畫","盖":"蓋","盘":"盤","着":"著","矶":"磯","码":"碼","砖":"磚","确":"確","礼":"禮","离":"離","种":"種","称":"稱","稳":"穩","竖":"豎","笔":"筆","笼":"籠","筑":"築","签":"籤","简":"簡","篱":"籬","类":"類","紧":"緊","红":"紅","纤":"纖","约":"約","级":"級","纨":"紈","纬":"緯","纯":"純","纱":"紗","纵":"縱","纸":"紙","纹":"紋","线":"線","组":"組","细":"細","终":"終","经":"經","结":"結","绕":"繞","绘":"繪","给":"給","继":"繼","绫":"綾","续":"續","绰":"綽","维":"維","绿":"綠","缀":"綴","编":"編","缘":"緣","缩":"縮","网":"網","罢":"罷","群":"羣","耸":"聳","联":"聯","肠":"腸","脉":"脈","脚":"腳","脸":"臉","舆":"輿","艳":"豔","节":"節","芜":"蕪","芦":"蘆","苇":"葦","苍":"蒼","范":"範","茎":"莖","荡":"蕩","荣":"榮","荫":"蔭","药":"藥","获":"獲","萝":"蘿","蓝":"藍","蔷":"薔","藓":"蘚","虚":"虛","蜡":"蠟","衔":"銜","补":"補","见":"見","观":"觀","规":"規","视":"視","览":"覽","觉":"覺","触":"觸","计":"計","认":"認","让":"讓","记":"記","讲":"講","许":"許","论":"論","设":"設","证":"證","识":"識","诉":"訴","词":"詞","试":"試","诗":"詩","话":"話","该":"該","语":"語","说":"說","请":"請","诸":"諸","读":"讀","谁":"誰","调":"調","质":"質","贮":"貯","贴":"貼","贾":"賈","资":"資","赏":"賞","赐":"賜","赛":"賽","车":"車","轩":"軒","转":"轉","轮":"輪","轳":"轤","轴":"軸","轻":"輕","载":"載","轿":"轎","辘":"轆","边":"邊","过":"過","还":"還","这":"這","进":"進","远":"遠","连":"連","迹":"跡","选":"選","遗":"遺","遥":"遙","邻":"鄰","采":"採","释":"釋","里":"裡","鉴":"鑑","錾":"鏨","针":"針","钓":"釣","钗":"釵","钟":"鐘","钩":"鉤","钮":"鈕","铜":"銅","银":"銀","铺":"鋪","链":"鏈","锁":"鎖","错":"錯","锡":"錫","锦":"錦","键":"鍵","镂":"鏤","镜":"鏡","长":"長","门":"門","闭":"閉","问":"問","闲":"閒","间":"間","闷":"悶","闸":"閘","闻":"聞","阁":"閣","阔":"闊","阳":"陽","阴":"陰","阵":"陣","阶":"階","际":"際","陈":"陳","随":"隨","隐":"隱","霭":"靄","静":"靜","韵":"韻","页":"頁","顶":"頂","顺":"順","须":"須","顾":"顧","颂":"頌","预":"預","频":"頻","题":"題","颜":"顏","额":"額","颤":"顫","风":"風","飞":"飛","饭":"飯","饰":"飾","馆":"館","馈":"饋","骂":"罵","鲜":"鮮","鳅":"鰍","鸟":"鳥","鹉":"鵡","鹦":"鸚","黄":"黃","齐":"齊","龙":"龍","袭":"襲","岁":"歲","学":"學","兴":"興","鸳":"鴛","鸯":"鴦","苏":"蘇","琏":"璉","莲":"蓮","评":"評","劝":"勸","铰":"鉸","妆":"妝","冯":"馮","撵":"攆","灵":"靈","烧":"燒","鹃":"鵑","爱":"愛","诔":"誄","渊":"淵","员":"員","咏":"詠","业":"業","钏":"釧","讨":"討","扬":"揚","袄":"襖","卖":"賣","庙":"廟","权":"權","乡":"鄉","浑":"渾","伤":"傷","难":"難","钱":"錢","掷":"擲","养":"養","却":"卻","嬷":"嬤","坠":"墜","绝":"絕","绮":"綺","赠":"贈","买":"買","执":"執","罗":"羅","电":"電","败":"敗","验":"驗","账":"賬","领":"領","剧":"劇","谈":"談","战":"戰","递":"遞","担":"擔","钉":"釘","莺":"鶯","樯":"檣","协":"協","蒋":"蔣","脱":"脫","圆":"圓","荐":"薦","抢":"搶","雾":"霧","项":"項","谢":"謝","鸣":"鳴","较":"較","议":"議","监":"監","顿":"頓","夸":"誇","软":"軟","军":"軍","帮":"幫","闹":"鬧","赵":"趙","输":"輸","赖":"賴","纪":"紀","骑":"騎","赶":"趕","审":"審","浊":"濁","骗":"騙","虾":"蝦","镯":"鐲","虽":"雖","癞":"癩","织":"織","奁":"奩","泪":"淚","飘":"飄","炼":"煉","盐":"鹽","讳":"諱","龄":"齡","窑":"窯","谱":"譜","脑":"腦","锚":"錨","昼":"晝","络":"絡","统":"統","鲤":"鯉","虫":"蟲","扰":"擾","勋":"勳","呜":"嗚","唤":"喚","盏":"盞","尝":"嘗","谜":"謎","驳":"駁","奖":"獎","绍":"紹","贪":"貪","鲍":"鮑","攒":"攢","烫":"燙","营":"營","缮":"繕","温":"溫","寻":"尋","婶":"嬸","钥":"鑰","赎":"贖","霁":"霽","吓":"嚇","辈":"輩","泼":"潑","瞒":"瞞","凑":"湊","缎":"緞","鸭":"鴨","践":"踐","胆":"膽","马":"馬","谙":"諳","穷":"窮","饮":"飲","辞":"辭","剑":"劍","阊":"閶","禀":"稟","绛":"絳","肃":"肅","谦":"謙","殡":"殯","鹡":"鶺","鸰":"鴒","贺":"賀","凭":"憑","腾":"騰","费":"費","愿":"願","汤":"湯","钦":"欽","贯":"貫","殁":"歿","讯":"訊","夺":"奪","争":"爭","饼":"餅","衬":"襯","迁":"遷","娇":"嬌","恼":"惱","誊":"謄","笺":"箋","拥":"擁","罚":"罰","访":"訪","鹤":"鶴","闺":"閨","挥":"揮","诌":"謅"};
  const SG_LABEL = '.signature small, .slip-head small, .card-actions, .detail-counter, .annotation-source, .sg-kind, .section-count, #section-count, .detail-kind, .index-item small, #total-label, #paper-name, #poem-form';
  const sgFan = (s) => { let o = ''; for (const ch of s) o += SG_S2T[ch] || ch; return o; };
  const sgText = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const t = sgFan(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  };
  function sgConv(root) { root.querySelectorAll(SG_LABEL).forEach(sgText); }
  // 只处理这一批变化涉及的节点（长诗逐字呈现时不再整页重扫）：新加的元素自己 / 子孙里的标签，和文字变了的那个标签
  const sgPending = new Set(); let sgT = 0;
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') { const el = m.target.parentElement?.closest?.(SG_LABEL); if (el) sgPending.add(el); continue; }
      for (const n of m.addedNodes) {
        if (n.nodeType === 3) { const el = n.parentElement?.closest?.(SG_LABEL); if (el) sgPending.add(el); }
        else if (n.nodeType === 1) { const up = n.closest?.(SG_LABEL); if (up) sgPending.add(up); else n.querySelectorAll?.(SG_LABEL).forEach((e) => sgPending.add(e)); }
      }
    }
    if (!sgPending.size || sgT) return;
    sgT = requestAnimationFrame(() => { sgT = 0; const els = [...sgPending]; sgPending.clear(); els.forEach((e) => e.isConnected && sgText(e)); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  sgConv(document);
})();
