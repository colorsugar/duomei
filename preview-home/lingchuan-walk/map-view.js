// ============================================================================
// 灵川全境 · 3D 立体纸艺活地图 HUD 与风物志联动层
// 透明覆盖在 Three.js 3D 宣纸立雕沙盘之上：实时投影 12 乡镇微签 + 弹起立绘纸签
// + 缩放控制 + 焦点乡镇轻浮条 + 可展开完整乡镇详卷 + 5 套宣纸分享笺
// ============================================================================

import {
  TOWNSHIPS,
  MAP_EXTRA_POIS,
  MAP_META,
  MAP_CATEGORIES,
  WATER_LABELS,
} from './map-townships.js';
import { listShareTemplates, openShareStudio } from './share-card.js';
import { REALMS } from './map-atmo.js';

const REALM_BY_ID = Object.fromEntries(REALMS.map((r) => [r.id, r]));

function assetUrl(rel) {
  if (!rel) return '';
  return `./img/${rel}.webp`;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const STANDEE_TAG_POOL_SIZE = 7;

function formatScaleBar(kmPer100Px) {
  if (!Number.isFinite(kmPer100Px) || kmPer100Px <= 0) return { label: '10 公里', px: 64 };
  const steps = [0.2, 0.5, 1, 2, 3, 5, 10, 15, 20, 30];
  let best = steps[0];
  let bestDiff = Infinity;
  for (const s of steps) {
    const px = (s / kmPer100Px) * 100;
    const diff = Math.abs(px - 68);
    if (px >= 34 && px <= 104 && diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  const px = clamp(Math.round((best / kmPer100Px) * 100), 34, 108);
  const label = best < 1 ? `${Math.round(best * 1000)} 米` : `${best} 公里`;
  return { label, px };
}

function zoomTierLabel(z) {
  if (z >= 5.2) return `山水微距 · ${z.toFixed(1)}×`;
  if (z >= 2.75) return `村落深游 · ${z.toFixed(1)}×`;
  if (z >= 1.48) return `乡镇近览 · ${z.toFixed(1)}×`;
  if (z >= 0.72) return `县域一览 · ${z.toFixed(1)}×`;
  return `桂林全境 · ${z.toFixed(1)}×`;
}

export function createMapView({
  root,
  landmarksById,
  onOpenLandmark,
  onOpenExtra,
  onShareNote,
  onCloseOverlay,
  onJumpToSegment,
}) {
  const state = {
    focusId: 'chaotian',
    zoomedId: null,
    overlayOpen: false,
    category: 'all',
    camZoom: 1.0,
    activeVillageId: null,
    folioCollapsed: false,
  };

  let map3d = null;
  const townById = (id) => TOWNSHIPS.find((t) => t.id === id);
  // 远景（全市总览）只留县级签：十县 + 灵川县（县治灵川镇）+ 桂林市区（秀峰）+ 临桂、雁山
  const FAR_ZOOM = 0.72;
  const FAR_NAME = { 'lingchuan-zhen': '灵川县', xiufeng: '桂林市区' };
  const FAR_DIR = { xiufeng: 'bottom', 'lingchuan-zhen': 'top' };
  const PIN_DIRS = ['top', 'right', 'bottom', 'left'];
  const farRank = (id) => {
    if (id === 'xiufeng') return -1; // 桂林市区先占位
    if (FAR_NAME[id] || id === 'lingui' || id === 'yanshan') return 0;
    return townById(id)?.countyLevel ? 1 : 2;
  };

  root.innerHTML = `
    <div class="lc-atlas-hud" data-focus="chaotian" data-zoomed="0">
      <!-- 1) 实时 3D->2D 投影层：水系题字 + 12 乡镇微签 + 靠近弹起立绘的防重叠纸签 -->
      <div class="lc-proj-layer" aria-label="灵川十二乡镇与立体纸雕标注">
        ${WATER_LABELS.map((w, i) => `
          <span class="lc-water-lbl" data-water-idx="${i}" aria-hidden="true">${w.text}</span>
        `).join('')}

        ${TOWNSHIPS.map((t) => {
          const cls = [
            'lc-pin',
            `dir-${t.dir || 'top'}`,
            t.county ? 'is-county' : '',
            t.featured ? 'is-featured' : '',
          ].filter(Boolean).join(' ');
          const near = t.featured
            ? `${t.name}<i class="lc-pin-seal">详卷</i>`
            : t.county
              ? `${t.name}<em>县治</em>`
              : t.name;
          // 全市远景：灵川只题「灵川县」，市区只题「桂林市区」，其余乡镇与城区签让位给各县
          const tagInner = FAR_NAME[t.id]
            ? `<span class="lc-pin-near">${near}</span><span class="lc-pin-far">${FAR_NAME[t.id]}</span>`
            : near;
          const realm = REALM_BY_ID[t.id];
          const epi = realm ? `<span class="lc-pin-epi" style="--epi:${realm.tint}" aria-hidden="true">${realm.epithet}</span>` : '';
          return `
            <button type="button" class="${cls}" data-town="${t.id}" data-dir="${t.dir || 'top'}" aria-label="飞往 ${t.name} · ${t.region}">
              <span class="lc-pin-dot" aria-hidden="true"></span>
              <span class="lc-pin-tag">${tagInner}${epi}</span>
            </button>
          `;
        }).join('')}

        <!-- 弹起立绘的屏幕防重叠宣纸浮签池（最多 5 枚，点击直开三层视差团扇详卡） -->
        ${Array.from({ length: STANDEE_TAG_POOL_SIZE }).map((_, i) => `
          <button type="button" class="lc-standee-tag" data-st-slot="${i}" hidden>
            <span class="lc-st-tick" aria-hidden="true"></span>
            <span class="lc-st-txt"></span>
          </button>
        `).join('')}
      </div>

      <!-- 2) 左下角全境书法落款（放大近览时优雅淡出让位给立绘） -->
      <div class="lc-colophon-float" id="lc-colophon-float" aria-hidden="true">
        <div class="lc-col-title">${MAP_META.title}</div>
        <div class="lc-col-sub">${MAP_META.subtitle}</div>
        <div class="lc-col-seal">${MAP_META.seal}</div>
      </div>

      <!-- 3) 右侧极轻巧的 3D 缩放、复位与桌面侧笺折叠控制钮 -->
      <div class="lc-zoom-ctrls" aria-label="地图缩放控制">
        <button type="button" class="lc-zctrl-btn is-folio-toggle" id="lc-folio-toggle" title="收起或展开风物侧笺" aria-label="收起侧笺">收起</button>
        <a class="lc-zctrl-btn is-yz" href="./youzong.html" title="吃什么、去哪里、哪天赶圩，排一卷游踪" aria-label="灵川游踪">游踪</a>
        <button type="button" class="lc-zctrl-btn is-tour" id="lc-tour-btn" title="自动漫游：一站一站飞过桂林" aria-label="开始自动漫游" aria-pressed="false">漫游</button>
        <button type="button" class="lc-zctrl-btn" id="lc-z-in" title="放大靠近看高清地形与立绘" aria-label="放大地图">+</button>
        <button type="button" class="lc-zctrl-btn" id="lc-z-out" title="缩小看全境" aria-label="缩小地图">−</button>
        <button type="button" class="lc-zctrl-btn is-reset" id="lc-z-reset" title="回到全境" aria-label="复位全境" hidden>全境</button>
        <button type="button" class="lc-zctrl-btn is-info" id="lc-credit-btn" title="地图数据来源" aria-label="地图数据来源">ⓘ</button>
      </div>

      <!-- 3.2) 漫游题签：到站时说这是哪里 -->
      <div class="lc-tour-cap" id="lc-tour-cap" aria-live="polite" hidden>
        <span class="lc-tc-seal" id="lc-tc-seal"></span>
        <div class="lc-tc-body">
          <div class="lc-tc-head"><b id="lc-tc-title"></b><em id="lc-tc-place"></em></div>
          <p id="lc-tc-line"></p>
        </div>
      </div>

      <!-- 3.5) 实时真实地理比例尺与缩放倍率浮标 -->
      <div class="lc-scale-bar" id="lc-scale-bar" aria-hidden="true">
        <span class="lc-scale-tier" id="lc-scale-tier">桂林全境 · 0.7×</span>
        <span class="lc-scale-rule"><i id="lc-scale-line"></i><em id="lc-scale-lbl">10 公里</em></span>
        <small class="lc-map-credit" id="lc-map-credit">路网水系 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 贡献者 · 地形 SRTM</small>
      </div>

      <!-- 4) 手机端底部轻透交互条（远观=分类+引导，靠近=当前焦点乡镇风物浮条，绝不糊脸弹窗） -->
      <div class="lc-mobile-dock" id="lc-mobile-dock">
        <div class="lc-focus-ribbon" id="lc-focus-ribbon">
          <div class="lc-fr-info">
            <strong id="lc-fr-name">潮田乡</strong>
            <span id="lc-fr-sub">灵川东南部 · 潮田河谷水果之乡</span>
          </div>
          <div class="lc-fr-acts">
            <button type="button" class="lc-fr-open" id="lc-fr-open">风物志</button>
            <button type="button" class="lc-fr-share" id="lc-fr-share">分享笺</button>
          </div>
        </div>

        <div class="lc-cat-strip" role="tablist" aria-label="按主题筛亮乡镇与立绘">
          ${MAP_CATEGORIES.map((c) => `
            <button type="button" class="lc-cat-btn${c.id === 'all' ? ' is-active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${c.id === 'all'}">${c.label}</button>
          `).join('')}
        </div>

        <div class="lc-whisper-row">
          <span class="lc-whisper-hint" id="lc-whisper-hint">自由滑动缩放 · 靠近弹出纸艺立绘</span>
          <div class="lc-whisper-acts">
            <button type="button" class="lc-whisper-share" id="lc-mob-share">分享笺</button>
          </div>
        </div>
      </div>

      <!-- 5) 桌面宽屏右侧：随 3D 沙盘焦点实时翻页的素雅宣纸风物侧笺 -->
      <aside class="lc-folio" aria-label="灵川乡镇风物侧笺">
        <div class="lc-folio-cats" role="tablist" aria-label="全县风物筛选">
          ${MAP_CATEGORIES.map((c) => `
            <button type="button" class="lc-cat-btn${c.id === 'all' ? ' is-active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${c.id === 'all'}">${c.label}</button>
          `).join('')}
        </div>

        <div class="lc-folio-body" id="lc-folio-body"></div>

        <div class="lc-folio-share">
          <div class="lc-folio-share-hd">
            <strong>多模板宣纸分享笺</strong>
            <span>点选模板即时预览导出</span>
          </div>
          <div class="lc-tpl-row">
            ${listShareTemplates().map((t) => `
              <button type="button" class="lc-share-tpl" data-share-tpl="${t.id}">${t.label}</button>
            `).join('')}
          </div>
        </div>

        <footer class="lc-folio-foot">
          <span>自由拖拽漫游 · 滚轮放大弹出纸艺立绘 · 点击立绘看详卡</span>
        </footer>
      </aside>

      <!-- 6) 按需展开的乡镇完整风物志详卷（含潮田专属立体画卷、12乡镇可点村落名录与专志） -->
      <section class="lc-zoom-panel" id="lc-zoom-panel" aria-hidden="true" hidden>
        <div class="lc-zoom-top" id="lc-zoom-top">
          <div class="lc-zoom-chrome">
            <div class="lc-zoom-crumb">灵川全境 <span aria-hidden="true">›</span> <b id="lc-zoom-crumb-name"></b></div>
            <button type="button" class="lc-zoom-close" aria-label="关闭乡镇风物志返回立体地图">
              <span aria-hidden="true">×</span>返回立体地图
            </button>
          </div>
          <div class="lc-zoom-stage" id="lc-zoom-stage">
            <img id="lc-zoom-art" class="lc-zoom-art" alt="" draggable="false">
            <div id="lc-zoom-pins" class="lc-zoom-pins"></div>
          </div>
        </div>

        <div class="lc-zoom-sheet" role="dialog" aria-modal="true" aria-labelledby="lc-zoom-title">
          <div class="lc-zoom-grab" aria-hidden="true"><i></i></div>
          <header class="lc-zoom-head">
            <div class="lc-zoom-title-group">
              <div class="lc-zoom-title-line">
                <h2 id="lc-zoom-title"></h2>
                <span id="lc-zoom-badge" class="lc-zoom-badge"></span>
              </div>
              <p id="lc-zoom-tagline" class="lc-zoom-tagline"></p>
            </div>
            <div class="lc-zoom-head-acts">
              <button type="button" class="lc-zoom-share-pill" id="lc-zoom-share-top">生成分享笺</button>
              <button type="button" class="lc-zoom-x" aria-label="收起详卷">×</button>
            </div>
          </header>

          <div class="lc-zoom-scroll" id="lc-zoom-scroll">
            <div class="lc-zoom-meta" id="lc-zoom-meta"></div>
            <p class="lc-zoom-blurb" id="lc-zoom-blurb"></p>
            <div class="lc-zoom-specs" id="lc-zoom-specs"></div>

            <section class="lc-zoom-block" id="lc-zoom-villages-wrap" hidden>
              <div class="lc-block-hd">
                <h3>村落与聚落名录</h3>
                <span>轻点村名看风物小注</span>
              </div>
              <div id="lc-zoom-villages" class="lc-village-chips"></div>
              <div id="lc-village-note" class="lc-village-note" hidden></div>
            </section>

            <section class="lc-zoom-block" id="lc-zoom-extras-wrap" hidden>
              <div class="lc-block-hd">
                <h3>风物专志</h3>
                <span>点击展开完整考据册页</span>
              </div>
              <div id="lc-zoom-extras" class="lc-zoom-cards"></div>
            </section>

            <section class="lc-zoom-block" id="lc-zoom-landmarks-wrap" hidden>
              <div class="lc-block-hd">
                <h3>关联行卷景致</h3>
                <span>含三层视差团扇详卡</span>
              </div>
              <div id="lc-zoom-landmarks" class="lc-zoom-cards"></div>
            </section>
          </div>

          <footer class="lc-zoom-foot">
            <button type="button" class="lc-zf-btn is-soft lc-zoom-share">分享笺</button>
            <button type="button" class="lc-zf-btn is-celadon" id="lc-zoom-walk-btn">入纸艺长卷 →</button>
            <button type="button" class="lc-zf-btn is-dismiss lc-zoom-dismiss">返回地图</button>
          </footer>
        </div>
      </section>
    </div>
  `;

  const hudEl = root.querySelector('.lc-atlas-hud');
  const colophonEl = root.querySelector('#lc-colophon-float');
  const folioToggleBtn = root.querySelector('#lc-folio-toggle');
  const scaleTierEl = root.querySelector('#lc-scale-tier');
  const scaleLineEl = root.querySelector('#lc-scale-line');
  const scaleLblEl = root.querySelector('#lc-scale-lbl');
  const zInBtn = root.querySelector('#lc-z-in');
  const zOutBtn = root.querySelector('#lc-z-out');
  const zResetBtn = root.querySelector('#lc-z-reset');
  const frNameEl = root.querySelector('#lc-fr-name');
  const frSubEl = root.querySelector('#lc-fr-sub');
  const frOpenBtn = root.querySelector('#lc-fr-open');
  const frShareBtn = root.querySelector('#lc-fr-share');
  const whisperHintEl = root.querySelector('#lc-whisper-hint');
  const folioBody = root.querySelector('#lc-folio-body');

  const pinMap = new Map();
  root.querySelectorAll('.lc-proj-layer .lc-pin').forEach((el) => {
    pinMap.set(el.dataset.town, el);
  });
  const waterEls = Array.from(root.querySelectorAll('.lc-water-lbl'));
  const standeeSlots = Array.from(root.querySelectorAll('.lc-standee-tag')).map((el) => ({
    el,
    txt: el.querySelector('.lc-st-txt'),
    id: null,
    kind: null,
  }));
  const catBtns = Array.from(root.querySelectorAll('.lc-cat-btn'));

  const zoomPanel = root.querySelector('#lc-zoom-panel');
  const zoomStage = root.querySelector('#lc-zoom-stage');
  const zoomSheet = root.querySelector('.lc-zoom-sheet');
  const zoomScroll = root.querySelector('#lc-zoom-scroll');
  const zoomCrumbName = root.querySelector('#lc-zoom-crumb-name');
  const zoomArt = root.querySelector('#lc-zoom-art');
  const zoomPins = root.querySelector('#lc-zoom-pins');
  const zoomTitle = root.querySelector('#lc-zoom-title');
  const zoomBadge = root.querySelector('#lc-zoom-badge');
  const zoomTagline = root.querySelector('#lc-zoom-tagline');
  const zoomMeta = root.querySelector('#lc-zoom-meta');
  const zoomBlurb = root.querySelector('#lc-zoom-blurb');
  const zoomSpecs = root.querySelector('#lc-zoom-specs');
  const zoomVillagesWrap = root.querySelector('#lc-zoom-villages-wrap');
  const zoomVillages = root.querySelector('#lc-zoom-villages');
  const villageNoteEl = root.querySelector('#lc-village-note');
  const zoomExtrasWrap = root.querySelector('#lc-zoom-extras-wrap');
  const zoomExtras = root.querySelector('#lc-zoom-extras');
  const zoomLandmarksWrap = root.querySelector('#lc-zoom-landmarks-wrap');
  const zoomLandmarks = root.querySelector('#lc-zoom-landmarks');
  const zoomWalkBtn = root.querySelector('#lc-zoom-walk-btn');

  // ---------- 3D Projection Sync (called every frame from map-3d.js) ----------
  let lastScaleText = '';
  let epiTick = 0;
  function syncProjection({ towns, waters, standees, zoom, kmPer100Px, focusTownId }) {
    state.camZoom = zoom;
    const isClose = zoom > 1.38;
    hudEl.dataset.zoomed = isClose ? '1' : '0';
    zResetBtn.hidden = zoom <= 0.82;
    colophonEl.style.opacity = clamp(1 - (zoom - 1.15) * 2.4, 0, 1).toFixed(3);

    // Real geographic scale bar & semantic zoom badge
    const sc = formatScaleBar(kmPer100Px);
    const tierTxt = zoomTierLabel(zoom);
    const nextScaleKey = `${tierTxt}|${sc.label}|${sc.px}`;
    if (nextScaleKey !== lastScaleText) {
      lastScaleText = nextScaleKey;
      scaleTierEl.textContent = tierTxt;
      scaleLblEl.textContent = sc.label;
      scaleLineEl.style.width = `${sc.px}px`;
    }

    const vw = window.innerWidth || 390;
    const vh = window.innerHeight || 740;
    const rightLimit = (vw >= 920 && !state.folioCollapsed) ? vw - 390 : vw - 16;

    // 0) 已站起立绘的屏幕占位（图 + 顶部浮签），放大时与之重叠的周边乡镇签让位，杜绝签压图
    const obstacles = [];
    if (isClose) {
      for (const s of standees) {
        if (s.box) obstacles.push({ x: s.box.sx, y: s.box.sy, hw: s.box.w * 0.5, hh: s.box.h * 0.5 });
        const tw = s.title.length * 11.5 + 26;
        obstacles.push({ x: s.sx, y: s.sy - 24, hw: tw * 0.5, hh: 17 });
      }
    }
    const pinHits = (pt, el) => {
      if (!obstacles.length) return false;
      const town = townById(pt.id);
      const w = ((town?.name || '').length * 13 + 34);
      const h = 30;
      const dir = el.dataset.dir || 'top';
      let cx = pt.sx;
      let cy = pt.sy - h * 0.5 + 9;
      if (dir === 'left') { cx = pt.sx - w * 0.5 + 9; cy = pt.sy; }
      else if (dir === 'right') { cx = pt.sx + w * 0.5 - 9; cy = pt.sy; }
      else if (dir === 'bottom') { cy = pt.sy + h * 0.5 - 9; }
      for (const o of obstacles) {
        if (Math.abs(cx - o.x) < w * 0.5 + o.hw + 4 && Math.abs(cy - o.y) < h * 0.5 + o.hh + 2) return true;
      }
      return false;
    };

    // 1) Update township / district 3D->2D pins（乡镇签之间也互相让位：靠前的先占位）
    const placedPins = [];
    const pinRect = (pt, el, dir = el.dataset.dir || 'top') => {
      const town = townById(pt.id);
      const w = ((town?.name || '').length * 13 + (town?.featured ? 52 : 34));
      const h = 30;
      let cx = pt.sx;
      let cy = pt.sy - h * 0.5 + 9;
      if (dir === 'left') { cx = pt.sx - w * 0.5 + 9; cy = pt.sy; }
      else if (dir === 'right') { cx = pt.sx + w * 0.5 - 9; cy = pt.sy; }
      else if (dir === 'bottom') { cy = pt.sy + h * 0.5 - 9; }
      return { cx, cy, hw: w * 0.5, hh: h * 0.5 };
    };
    const far = zoom < FAR_ZOOM;
    if (hudEl.dataset.far !== (far ? '1' : '0')) {
      // 远景时「桂林市区」签挂到点下方，免得压住北面的「灵川县」
      for (const [id, d] of Object.entries(FAR_DIR)) {
        const el = pinMap.get(id);
        if (!el) continue;
        el.dataset.nearDir ||= el.dataset.dir;
        const nd = far ? d : el.dataset.nearDir;
        el.classList.remove(`dir-${el.dataset.liveDir || el.dataset.dir}`);
        el.dataset.dir = nd;
        el.dataset.liveDir = nd;
        el.classList.add(`dir-${nd}`);
      }
    }
    hudEl.dataset.far = far ? '1' : '0';
    const ordered = far ? [...towns].sort((a, b) => farRank(a.id) - farRank(b.id)) : towns;
    for (const pt of ordered) {
      const el = pinMap.get(pt.id);
      if (!el) continue;
      if (far && farRank(pt.id) > 1) {  // 灵川各乡镇、市区其余城区
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }
      const inView = pt.visible && pt.sx > 14 && pt.sx < rightLimit && pt.sy > 72 && pt.sy < vh - 96;
      if (!inView) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }
      let dir = el.dataset.dir || 'top';
      const town = townById(pt.id);
      const catMatch = state.category === 'all' || (town?.tags || []).includes(state.category);
      // 放大靠近欣赏 3D 立绘时，焦点中心的乡镇签优雅淡出让位给立绘（底部风物条已标明该乡），周边乡镇保持轻提示
      let op = 1;
      let pe = 'auto';
      if (!catMatch) {
        op = 0.24;
      } else if (zoom > 1.85 && pt.id === focusTownId) {
        op = 0;
        pe = 'none';
      } else if (isClose && pt.id !== focusTownId) {
        if (pinHits(pt, el)) {
          op = 0;
          pe = 'none';
        } else {
          op = 0.62;
        }
      }
      if (op > 0) {
        // 签与已题的签相碰时，先换到点的另一侧再试，四面都碰才让位
        const hit = (r) => placedPins.some((q) => Math.abs(q.cx - r.cx) < q.hw + r.hw + 3 && Math.abs(q.cy - r.cy) < q.hh + r.hh + 2);
        const prev = el.dataset.liveDir;
        const tries = [dir, ...(prev && prev !== dir ? [prev] : []), ...PIN_DIRS.filter((d) => d !== dir && d !== prev)];
        let placed = null;
        for (const d of tries) {
          const r = pinRect(pt, el, d);
          if (!hit(r)) { placed = r; dir = d; break; }
        }
        if (placed) {
          placedPins.push(placed);
        } else {
          op = 0;
          pe = 'none';
        }
      }
      if (el.dataset.liveDir !== dir) {
        el.classList.remove(`dir-${el.dataset.liveDir || el.dataset.dir}`);
        el.classList.add(`dir-${dir}`);
        el.dataset.liveDir = dir;
      }
      const anchor = dir === 'left'
        ? 'translate(calc(-100% + 9px), -50%)'
        : dir === 'right'
          ? 'translate(-9px, -50%)'
          : dir === 'bottom'
            ? 'translate(-50%, -9px)'
            : 'translate(-50%, calc(-100% + 9px))';
      el.style.transform = `translate3d(${pt.sx.toFixed(1)}px, ${pt.sy.toFixed(1)}px, 0) ${anchor}`;
      el.style.opacity = op.toFixed(2);
      el.style.pointerEvents = pe;
      el.classList.toggle('is-active', pt.id === focusTownId);
      el.classList.toggle('is-matched', state.category !== 'all' && catMatch);
    }

    // 1b) 总览境名题签：与其他乡签或境名相碰的不题，宁缺勿挤
    if (!isClose && (epiTick++ % 12 === 0)) {
      const rects = [];
      const placed = [];
      for (const pt of towns) {
        const el = pinMap.get(pt.id);
        if (!el || el.style.opacity === '0') continue;
        const tag = el.querySelector('.lc-pin-tag');
        const epi = el.querySelector('.lc-pin-epi');
        if (!tag) continue;
        const r = tag.getBoundingClientRect();
        rects.push(r);
        if (epi) placed.push({ el: epi, r: epi.getBoundingClientRect(), tag: r });
      }
      const hit = (a, b, pad = 2) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
      const kept = [];
      for (const e of placed) {
        let ok = e.r.top > 64;
        if (ok) for (const r of rects) if (r !== e.tag && hit(e.r, r)) { ok = false; break; }
        if (ok) for (const k of kept) if (hit(e.r, k)) { ok = false; break; }
        if (ok) kept.push(e.r);
        e.el.style.visibility = ok ? '' : 'hidden';
      }
    }

    // 2) Update water labels
    for (let i = 0; i < waterEls.length; i++) {
      const w = waters[i];
      const el = waterEls[i];
      if (!w || !w.visible || w.sx < 24 || w.sx > rightLimit - 24 || w.sy < 80 || w.sy > vh - 110) {
        el.style.opacity = '0';
      } else {
        el.style.transform = `translate3d(${w.sx.toFixed(1)}px, ${w.sy.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${w.rot || 0}deg)`;
        el.style.opacity = '0.78';
      }
    }

    // 3) Collision-free floating paper tags above popped-up 3D standees (phone max 5, desktop max 7 — standees themselves are already decluttered!)
    const maxTags = vw < 720 ? 5 : 7;
    const chosen = [];
    if (!state.overlayOpen && (zoom > 1.32 || state.category !== 'all')) {
      for (const s of standees) {
        if (chosen.length >= maxTags) break;
        if (s.sx < 44 || s.sx > rightLimit - 38 || s.sy < 92 || s.sy > vh - 134) continue;
        const estW = s.title.length * 11.5 + 26;
        let blocked = false;
        for (const prev of chosen) {
          if (Math.abs(s.sx - prev.sx) < (estW + prev.w) * 0.5 + 10 && Math.abs(s.sy - prev.sy) < 32) {
            blocked = true;
            break;
          }
        }
        if (!blocked) chosen.push({ ...s, w: estW });
      }
    }

    for (let i = 0; i < standeeSlots.length; i++) {
      const slot = standeeSlots[i];
      const item = chosen[i];
      if (item) {
        slot.el.hidden = false;
        if (slot.id !== item.id) {
          slot.id = item.id;
          slot.kind = item.kind;
          slot.txt.textContent = item.title;
          slot.el.classList.toggle('is-featured', Boolean(item.featured));
        }
        slot.el.style.transform = `translate3d(${Math.round(item.sx)}px, ${Math.round(item.sy - 8)}px, 0) translate(-50%, -100%)`;
        slot.el.style.opacity = '1';
      } else {
        slot.el.style.opacity = '0';
        slot.el.hidden = true;
        slot.id = null;
      }
    }
  }

  // ---------- Helpers ----------
  function getTownLandmarks(town) {
    return (town.landmarks || [])
      .map((lid) => landmarksById.get(lid))
      .filter(Boolean)
      .map((entry) => ({
        kind: 'landmark',
        id: entry.spec.id,
        title: entry.spec.title,
        category: entry.spec.category,
        tagline: entry.spec.tagline,
        img: entry.spec.img,
      }));
  }

  function getTownExtras(town) {
    return MAP_EXTRA_POIS.filter((p) => p.townId === town.id).map((p) => ({
      kind: 'extra',
      id: p.id,
      title: p.title,
      category: p.category,
      tagline: p.tagline,
      img: p.img,
    }));
  }

  function cardHtml(item) {
    return `
      <button type="button" class="lc-zoom-card" data-open="${item.kind}" data-id="${item.id}">
        <span class="lc-zc-thumb"><img src="${assetUrl(item.img)}" alt="" loading="lazy"></span>
        <span class="lc-zc-body">
          <span class="lc-zc-top"><strong>${item.title}</strong><em>${item.category || ''}</em></span>
          <small>${item.tagline || ''}</small>
        </span>
      </button>
    `;
  }

  function openItem(kind, id) {
    if (kind === 'landmark') {
      const entry = landmarksById.get(id);
      if (entry) onOpenLandmark?.(entry);
      return;
    }
    const poi = MAP_EXTRA_POIS.find((p) => p.id === id);
    if (poi) onOpenExtra?.(poi);
  }

  // ---------- Focus Town Sync (Mobile Ribbon + Desktop Folio) ----------
  function setFocusTown(townId) {
    const town = townById(townId) || townById('chaotian');
    if (!town) return;
    state.focusId = town.id;
    hudEl.dataset.focus = town.id;

    // Mobile ribbon update
    frNameEl.textContent = town.name;
    frSubEl.textContent = town.villages?.length ? `${town.region} · ${town.villages.length} 处村落` : town.region;
    frOpenBtn.textContent = town.villages?.length ? `风物志 (${town.villages.length}村)` : "风物志";
    whisperHintEl.textContent = state.camZoom > 1.35
      ? `点立起来的纸雕看详卡 · 双指可缩回全境`
      : `自由滑动缩放 · 靠近弹出纸艺立绘`;

    // Desktop right folio update
    const idx = TOWNSHIPS.findIndex((t) => t.id === town.id) + 1;
    const marks = getTownLandmarks(town);
    const extras = getTownExtras(town);
    const previewItems = [...extras.slice(0, 2), ...marks.slice(0, 2)].slice(0, 3);

    folioBody.innerHTML = `
      <div class="lc-folio-kicker">GUILIN · ${String(idx).padStart(2, '0')} / ${TOWNSHIPS.length}</div>
      <div class="lc-folio-head">
        <h2>${town.name}</h2>
        <span class="lc-folio-region">${town.region}</span>
      </div>
      <p class="lc-folio-tagline">「${town.tagline}」</p>
      <p class="lc-folio-blurb">${town.blurb}</p>

      <div class="lc-folio-season"><strong>最佳时令</strong><span>${town.season}</span></div>

      <div class="lc-folio-villages">
        ${(town.villages || []).slice(0, 8).map((v) => `
          <span class="lc-fchip${v.highlight ? ' is-hi' : ''}${v.pending ? ' is-pending' : ''}">${v.name}</span>
        `).join('')}
        ${(town.villages || []).length > 8 ? `<span class="lc-fchip is-more">共 ${town.villages.length} 处</span>` : ''}
      </div>

      ${previewItems.length ? `
        <div class="lc-folio-cards">
          ${previewItems.map(cardHtml).join('')}
        </div>
      ` : ''}

      <div class="lc-folio-acts">
        <button type="button" class="lc-folio-primary" data-fly-town="${town.id}">飞近弹起立绘</button>
        <button type="button" class="lc-folio-sec" data-open-zoom="${town.id}">本乡风物志</button>
        <button type="button" class="lc-folio-sec" data-jump-seg="${town.segmentId || 'lijiang'}">入长卷</button>
      </div>
    `;
  }

  // ---------- Village Detail Note inside Monograph Drawer ----------
  function showVillageNote(town, villageId) {
    const v = (town.villages || []).find((x) => x.id === villageId);
    state.activeVillageId = v ? v.id : null;
    zoomVillages.querySelectorAll('.lc-vchip').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.vid === state.activeVillageId);
    });
    if (!v) {
      villageNoteEl.hidden = true;
      return;
    }
    const actionBtn = v.poiId
      ? `<button type="button" class="lc-vn-go" data-open="extra" data-id="${v.poiId}">展开风物详卡 →</button>`
      : v.landmarkId
        ? `<button type="button" class="lc-vn-go" data-open="landmark" data-id="${v.landmarkId}">展开团扇详卡 →</button>`
        : '';
    villageNoteEl.hidden = false;
    villageNoteEl.innerHTML = `
      <div class="lc-vn-top">
        <strong>${v.name}</strong>
        ${actionBtn}
      </div>
      <p>${v.note}</p>
    `;
  }

  // ---------- Open Full Township Monograph Drawer (on demand) ----------
  function openTown(id) {
    const town = townById(id) || townById(state.focusId);
    if (!town) return;
    state.zoomedId = town.id;
    state.overlayOpen = true;
    setFocusTown(town.id);

    zoomCrumbName.textContent = town.name;
    zoomTitle.textContent = town.name;
    zoomBadge.textContent = town.region;
    zoomTagline.textContent = town.tagline;
    zoomBlurb.textContent = town.blurb;

    zoomMeta.innerHTML = `
      <div class="lc-meta-item"><em>行政建制</em><span>${town.kind} · 代码 ${town.code}</span></div>
      <div class="lc-meta-item"><em>推荐时令</em><span>${town.season}</span></div>
    `;
    zoomSpecs.innerHTML = (town.specialties || [])
      .map((s) => `<span class="lc-spec-tag">${s}</span>`)
      .join('');

    if (town.zoomArt) {
      zoomStage.classList.add('is-bespoke');
      zoomArt.src = assetUrl(town.zoomArt);
      zoomArt.alt = `${town.name} 立体风物画卷`;
      zoomArt.style.transform = '';
      zoomArt.style.transformOrigin = '';
      zoomPins.innerHTML = (town.zoomPins || []).map((p) => {
        const cls = ['lc-pin', `dir-${p.dir || 'top'}`, p.featured ? 'is-featured' : ''].filter(Boolean).join(' ');
        const inner = p.badge ? `${p.label}<i class="lc-pin-seal">${p.badge}</i>` : p.label;
        return `
          <button type="button" class="${cls}" data-open="${p.kind}" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%;">
            <span class="lc-pin-dot" aria-hidden="true"></span>
            <span class="lc-pin-tag">${inner}</span>
          </button>
        `;
      }).join('');
    } else {
      zoomStage.classList.remove('is-bespoke');
      zoomArt.src = assetUrl(MAP_META.baseArt);
      zoomArt.alt = `${town.name} 立雕地形聚焦`;
      const ox = clamp(town.x, 16, 84);
      const oy = clamp(town.y, 16, 84);
      zoomArt.style.transformOrigin = `${ox}% ${oy}%`;
      zoomArt.style.transform = 'scale(2.15)';
      zoomPins.innerHTML = `
        <div class="lc-focus-pin" style="left:50%;top:50%;">
          <span class="lc-pin-dot" aria-hidden="true"></span>
          <span class="lc-pin-tag">${town.name}<em>${town.kind}</em></span>
        </div>
      `;
    }

    if (town.villages?.length) {
      zoomVillagesWrap.hidden = false;
      zoomVillages.innerHTML = town.villages.map((v) => `
        <button type="button" class="lc-vchip${v.highlight ? ' is-hi' : ''}${v.pending ? ' is-pending' : ''}" data-vid="${v.id}">
          ${v.name}
        </button>
      `).join('');
      const firstHi = town.villages.find((v) => v.highlight) || town.villages[0];
      showVillageNote(town, firstHi?.id);
    } else {
      zoomVillagesWrap.hidden = true;
      zoomVillages.innerHTML = '';
      villageNoteEl.hidden = true;
    }

    const extras = getTownExtras(town);
    zoomExtrasWrap.hidden = !extras.length;
    zoomExtras.innerHTML = extras.map(cardHtml).join('');

    const marks = getTownLandmarks(town);
    zoomLandmarksWrap.hidden = !marks.length;
    zoomLandmarks.innerHTML = marks.map(cardHtml).join('');

    zoomWalkBtn.dataset.seg = town.segmentId || 'lijiang';
    zoomScroll.scrollTop = 0;

    zoomPanel.hidden = false;
    zoomPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lc-zoom-open');
    requestAnimationFrame(() => zoomPanel.classList.add('open'));
  }

  function closeZoom() {
    if (!state.overlayOpen && zoomPanel.hidden) return;
    state.overlayOpen = false;
    state.zoomedId = null;
    document.body.classList.remove('lc-zoom-open');
    zoomPanel.classList.remove('open');
    zoomPanel.setAttribute('aria-hidden', 'true');
    zoomSheet.style.transform = '';
    zoomPanel.hidden = true;
    onCloseOverlay?.();
  }

  // ---------- Share Helpers ----------
  async function shareTown(templateHint) {
    const town = townById(state.zoomedId || state.focusId) || townById('chaotian');
    await openShareStudio({
      template: templateHint || 'township',
      title: town.name,
      subtitle: `${town.region} · ${town.season.split('·')[0].trim()}`,
      tagline: town.tagline,
      body: town.blurb,
      imgUrl: assetUrl(town.zoomArt || [...getTownLandmarks(town), ...getTownExtras(town)].find((i) => i.img)?.img || MAP_META.baseArt),
      footer: `桂林全境 · ${town.name}`,
      townName: town.name,
      kind: 'township',
    }, { onNote: onShareNote });
  }

  async function shareOverview(templateId) {
    await openShareStudio({
      template: templateId || 'overview',
      mapOverview: true,
      title: '桂林全境 · 十七县区',
      subtitle: '资江之源至漓江下游 · 立体纸艺志',
      tagline: '一脉山水，十七县区，纸艺立雕随行展开。',
      body: '北起资源、全州的湘资二水，经兴安灵渠、龙胜梯田、灵川山乡与市区两江四湖，南到阳朔、荔浦、平乐、恭城。',
      imgUrl: assetUrl(MAP_META.baseArt),
      footer: '桂林全境立体地图',
    }, { onNote: onShareNote });
  }

  // ---------- Events ----------
  pinMap.forEach((btn, townId) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 如果已经在近景聚焦这个乡镇了，再点一次展开它的完整风物志；否则先 3D 俯冲飞过去让它的立绘咔哒弹起来！
      if (state.camZoom > 2.0 && state.focusId === townId) {
        openTown(townId);
      } else if (state.camZoom < FAR_ZOOM && townId === 'lingchuan-zhen') {
        // 远景点「灵川县」：飞到县域中心，一县铺满，十二乡镇签随之出现
        map3d?.flyToTown(townId, window.innerWidth / Math.max(1, window.innerHeight) < 0.75 ? 0.8 : 1.0, [110.45, 25.40]);
        setFocusTown(townId);
      } else if (townById(townId)?.countyLevel) {
        // 十县暂无立绘，停在县域一览
        map3d?.flyToTown(townId, 1.5);
        setFocusTown(townId);
      } else {
        map3d?.flyToTown(townId, 2.55);
        setFocusTown(townId);
      }
    });
  });

  standeeSlots.forEach((slot) => {
    slot.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!slot.id) return;
      if (map3d) map3d.triggerStandeeById(slot.kind, slot.id);
      else openItem(slot.kind, slot.id);
    });
  });

  const tourBtn = root.querySelector('#lc-tour-btn');
  const tourCap = root.querySelector('#lc-tour-cap');
  const CN_NUM = '一二三四五六七八九十';
  tourBtn.addEventListener('click', () => {
    if (map3d?.isTouring()) map3d.stopTour();
    else map3d?.startTour();
  });
  function setTourStep(info) {
    const on = Boolean(info?.active);
    tourBtn.classList.toggle('is-on', on);
    tourBtn.textContent = on ? '停' : '漫游';
    tourBtn.setAttribute('aria-pressed', String(on));
    tourBtn.setAttribute('aria-label', on ? '停止自动漫游' : '开始自动漫游');
    hudEl.classList.toggle('is-touring', on);
    if (!on) {
      tourCap.classList.remove('is-shown');
      tourCap.hidden = true;
      return;
    }
    if (!info.title) {
      tourCap.classList.remove('is-shown');
      return;
    }
    tourCap.hidden = false;
    tourCap.classList.remove('is-shown');
    root.querySelector('#lc-tc-seal').textContent = info.index === 0 ? '总览' : `第${CN_NUM[info.index - 1] || info.index}站`;
    root.querySelector('#lc-tc-title').textContent = info.title;
    root.querySelector('#lc-tc-place').textContent = info.place || '';
    root.querySelector('#lc-tc-line').textContent = info.line || '';
    requestAnimationFrame(() => tourCap.classList.add('is-shown'));
  }

  zInBtn.addEventListener('click', () => map3d?.nudgeZoom(0.65));
  zOutBtn.addEventListener('click', () => map3d?.nudgeZoom(-0.65));
  zResetBtn.addEventListener('click', () => map3d?.resetOverview());
  folioToggleBtn.addEventListener('click', () => {
    state.folioCollapsed = !state.folioCollapsed;
    hudEl.dataset.folioCollapsed = state.folioCollapsed ? '1' : '0';
    folioToggleBtn.textContent = state.folioCollapsed ? '侧笺' : '收起';
    folioToggleBtn.setAttribute('aria-label', state.folioCollapsed ? '展开风物侧笺' : '收起风物侧笺');
    map3d?.setDesktopPanelOpen(!state.folioCollapsed);
  });

  frOpenBtn.addEventListener('click', () => openTown(state.focusId));
  frShareBtn.addEventListener('click', () => shareTown('township'));

  // 数据署名：开场显示，5 秒后或首次操作地图时收起，ⓘ 可随时再看（OSMF 署名指引允许的做法）
  const foldCredit = () => hudEl.classList.add("is-credit-folded");
  const creditTimer = setTimeout(foldCredit, 5000);
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('#lc-credit-btn, #lc-map-credit')) return;
    clearTimeout(creditTimer);
    foldCredit();
  }, { once: true, capture: true });
  root.querySelector('#lc-credit-btn').addEventListener('click', () => {
    clearTimeout(creditTimer);
    hudEl.classList.toggle("is-credit-folded");
  });
  root.querySelector('#lc-mob-share').addEventListener('click', () => shareOverview('overview'));

  catBtns.forEach((b) => {
    b.addEventListener('click', () => {
      state.category = b.dataset.cat;
      catBtns.forEach((x) => {
        const on = x.dataset.cat === state.category;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-selected', String(on));
      });
      map3d?.setCategory(state.category);
    });
  });

  folioBody.addEventListener('click', (e) => {
    const flyBtn = e.target.closest('[data-fly-town]');
    if (flyBtn) {
      map3d?.flyToTown(flyBtn.dataset.flyTown, 2.55);
      return;
    }
    const zoomBtn = e.target.closest('[data-open-zoom]');
    if (zoomBtn) {
      openTown(zoomBtn.dataset.openZoom);
      return;
    }
    const segBtn = e.target.closest('[data-jump-seg]');
    if (segBtn) {
      onJumpToSegment?.(segBtn.dataset.jumpSeg);
      return;
    }
    const card = e.target.closest('.lc-zoom-card');
    if (card) openItem(card.dataset.open, card.dataset.id);
  });

  root.querySelectorAll('.lc-share-tpl').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.shareTpl;
      if (id === 'overview') shareOverview(id);
      else shareTown(id);
    });
  });

  root.querySelector('.lc-zoom-close').addEventListener('click', closeZoom);
  root.querySelector('.lc-zoom-x').addEventListener('click', closeZoom);
  root.querySelector('.lc-zoom-dismiss').addEventListener('click', closeZoom);
  root.querySelector('.lc-zoom-share').addEventListener('click', () => shareTown('township'));
  root.querySelector('#lc-zoom-share-top').addEventListener('click', () => shareTown('township'));
  zoomWalkBtn.addEventListener('click', () => {
    const seg = zoomWalkBtn.dataset.seg || 'lijiang';
    closeZoom();
    onJumpToSegment?.(seg);
  });
  zoomPins.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) openItem(btn.dataset.open, btn.dataset.id);
  });
  zoomVillages.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-vchip');
    const town = townById(state.zoomedId);
    if (btn && town) showVillageNote(town, btn.dataset.vid);
  });
  villageNoteEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-vn-go');
    if (btn) openItem(btn.dataset.open, btn.dataset.id);
  });
  zoomExtras.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-zoom-card');
    if (btn) openItem(btn.dataset.open, btn.dataset.id);
  });
  zoomLandmarks.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-zoom-card');
    if (btn) openItem(btn.dataset.open, btn.dataset.id);
  });

  // Swipe-down dismiss on zoom sheet grabber & header
  let startY = null;
  let dy = 0;
  const grabEl = root.querySelector('.lc-zoom-grab');
  const headEl = root.querySelector('.lc-zoom-head');
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    startY = e.clientY;
    dy = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.clientY - startY);
    if (dy > 4) {
      zoomSheet.style.transition = 'none';
      zoomSheet.style.transform = `translate3d(0, ${dy}px, 0)`;
    }
  };
  const onUp = () => {
    if (startY == null) return;
    zoomSheet.style.transition = '';
    if (dy > 85) closeZoom();
    else zoomSheet.style.transform = '';
    startY = null;
    dy = 0;
  };
  [grabEl, headEl].forEach((el) => {
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.overlayOpen) closeZoom();
  });

  setFocusTown('chaotian');

  return {
    attach3D(api) {
      map3d = api;
    },
    syncProjection,
    setFocusTown,
    setTourStep,
    flyToTown: (id, z) => map3d?.flyToTown(id, z),
    resetOverview: () => map3d?.resetOverview(),
    openTown,
    closeZoom,
    isOverlayOpen: () => state.overlayOpen,
    shareTown,
    shareOverview,
  };
}

export function extraPoiToCardSpec(poi) {
  return {
    id: poi.id,
    code: '风物志',
    title: poi.title,
    category: poi.category,
    zoneName: poi.subtitle,
    img: poi.img,
    tagline: poi.tagline,
    town: poi.town,
    season: poi.season,
    stat: poi.stat,
    story: poi.story,
    tips: poi.tips,
    fanFx: 'mist',
    fanBg: 'autumn',
    shareTemplate: poi.shareTemplate || 'village',
  };
}
