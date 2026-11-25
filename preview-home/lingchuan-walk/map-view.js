// ============================================================================
// Map-first township explorer for Lingchuan walk
// ============================================================================

import { TOWNSHIPS, MAP_EXTRA_POIS, MAP_META } from './map-townships.js';
import { listShareTemplates, sharePayload } from './share-card.js';

function assetUrl(rel) {
  if (!rel) return '';
  if (rel.startsWith('map/')) return `./img/${rel}.webp`;
  return `./img/${rel}.webp`;
}

export function createMapView({
  root,
  landmarksById,
  onOpenLandmark,
  onOpenExtra,
  onShareNote,
  onCloseOverlay,
}) {
  const state = {
    focusId: null,
    overlayOpen: false,
  };

  root.innerHTML = `
    <div class="lc-map" data-focus="">
      <div class="lc-map-parallax" aria-hidden="true">
        <div class="lc-map-layer lc-map-far"></div>
        <div class="lc-map-layer lc-map-mid"></div>
        <div class="lc-map-layer lc-map-near"></div>
      </div>

      <div class="lc-map-stage">
        <img class="lc-map-base" src="${assetUrl(MAP_META.baseArt)}" alt="" decoding="async">
        <svg class="lc-map-svg" viewBox="0 0 1000 1200" role="img" aria-label="灵川县乡镇示意地图">
          <defs>
            <filter id="lcSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#3a2a18" flood-opacity="0.18"/>
            </filter>
          </defs>
          ${TOWNSHIPS.map((t) => `
            <g class="lc-town-node${t.featured ? ' is-featured' : ''}" data-town="${t.id}" transform="translate(${t.cx} ${t.cy})">
              <circle class="lc-town-halo" r="${t.r * 1.18}"></circle>
              <circle class="lc-town-disk" r="${t.r}" filter="url(#lcSoft)"></circle>
              <text class="lc-town-label" text-anchor="middle" dy="0.35em">${t.name}</text>
              ${t.featured ? '<text class="lc-town-badge" text-anchor="middle" dy="28">放大</text>' : ''}
            </g>
          `).join('')}
        </svg>
        <img class="lc-map-guide" src="${assetUrl(MAP_META.guideArt)}" alt="" decoding="async">
      </div>

      <aside class="lc-map-rail" aria-label="乡镇列表">
        <header class="lc-map-rail-head">
          <strong>${MAP_META.title}</strong>
          <span>${MAP_META.sub}</span>
        </header>
        <p class="lc-map-source">${MAP_META.sourceNote}</p>
        <div class="lc-map-chip-row" role="list">
          ${TOWNSHIPS.map((t) => `
            <button type="button" class="lc-map-chip${t.featured ? ' is-featured' : ''}" data-town="${t.id}" role="listitem">
              <span class="lc-map-chip-name">${t.name}</span>
              <span class="lc-map-chip-kind">${t.kind}</span>
            </button>
          `).join('')}
        </div>
        <div class="lc-map-share-row">
          <span class="lc-map-share-label">分享模板</span>
          ${listShareTemplates().map((t) => `
            <button type="button" class="lc-share-tpl" data-share-tpl="${t.id}">${t.label}</button>
          `).join('')}
        </div>
      </aside>

      <section class="lc-zoom-panel" id="lc-zoom-panel" aria-hidden="true" hidden>
        <div class="lc-zoom-sheet" role="dialog" aria-modal="true" aria-labelledby="lc-zoom-title">
          <div class="lc-zoom-grab" aria-hidden="true"><i></i></div>
          <header class="lc-zoom-head">
            <div>
              <p class="lc-zoom-kicker">乡镇放大</p>
              <h2 id="lc-zoom-title"></h2>
              <p id="lc-zoom-blurb" class="lc-zoom-blurb"></p>
            </div>
            <button type="button" class="lc-zoom-close" aria-label="关闭乡镇版块">关闭</button>
          </header>
          <div class="lc-zoom-hero">
            <img id="lc-zoom-art" alt="">
          </div>
          <div class="lc-zoom-sections">
            <section>
              <h3>风物景致</h3>
              <div id="lc-zoom-landmarks" class="lc-zoom-cards"></div>
            </section>
            <section id="lc-zoom-villages-wrap" hidden>
              <h3>村落名录</h3>
              <div id="lc-zoom-villages" class="lc-zoom-villages"></div>
            </section>
            <section>
              <h3>扩写内容</h3>
              <div id="lc-zoom-extras" class="lc-zoom-cards"></div>
            </section>
          </div>
          <footer class="lc-zoom-foot">
            <button type="button" class="lc-zoom-share">分享本乡镇</button>
            <button type="button" class="lc-zoom-dismiss">完成 · 回地图</button>
          </footer>
        </div>
      </section>
    </div>
  `;

  const mapEl = root.querySelector('.lc-map');
  const zoomPanel = root.querySelector('#lc-zoom-panel');
  const zoomSheet = root.querySelector('.lc-zoom-sheet');
  const zoomTitle = root.querySelector('#lc-zoom-title');
  const zoomBlurb = root.querySelector('#lc-zoom-blurb');
  const zoomArt = root.querySelector('#lc-zoom-art');
  const zoomLandmarks = root.querySelector('#lc-zoom-landmarks');
  const zoomVillages = root.querySelector('#lc-zoom-villages');
  const zoomVillagesWrap = root.querySelector('#lc-zoom-villages-wrap');
  const zoomExtras = root.querySelector('#lc-zoom-extras');

  function townById(id) {
    return TOWNSHIPS.find((t) => t.id === id);
  }

  function setFocusVisual(id) {
    mapEl.dataset.focus = id || '';
    root.querySelectorAll('.lc-town-node').forEach((n) => {
      n.classList.toggle('is-active', n.dataset.town === id);
    });
    root.querySelectorAll('.lc-map-chip').forEach((n) => {
      n.classList.toggle('is-active', n.dataset.town === id);
    });
  }

  function closeZoom() {
    state.overlayOpen = false;
    state.focusId = null;
    setFocusVisual(null);
    zoomPanel.hidden = true;
    zoomPanel.setAttribute('aria-hidden', 'true');
    zoomPanel.classList.remove('open');
    zoomSheet.style.transform = '';
    onCloseOverlay?.();
  }

  function cardHtml(item) {
    const img = assetUrl(item.img);
    return `
      <button type="button" class="lc-zoom-card" data-open="${item.kind}" data-id="${item.id}">
        <img src="${img}" alt="" loading="lazy">
        <span class="lc-zoom-card-body">
          <strong>${item.title}</strong>
          <em>${item.category || ''}</em>
          <small>${item.tagline || item.note || ''}</small>
        </span>
      </button>
    `;
  }

  function openTown(id) {
    const town = townById(id);
    if (!town) return;
    state.focusId = id;
    state.overlayOpen = true;
    setFocusVisual(id);

    zoomTitle.textContent = town.name;
    zoomBlurb.textContent = town.blurb;
    const art = town.zoomArt || MAP_META.baseArt;
    zoomArt.src = assetUrl(art);
    zoomArt.alt = `${town.name} 风貌`;

    const marks = (town.landmarks || [])
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
    zoomLandmarks.innerHTML = marks.map(cardHtml).join('') || '<p class="lc-empty">本乡镇景致正在补录</p>';

    if (town.villages?.length) {
      zoomVillagesWrap.hidden = false;
      zoomVillages.innerHTML = town.villages.map((v) => `
        <div class="lc-village-pill">
          <strong>${v.name}</strong>
          <span>${v.note || ''}</span>
        </div>
      `).join('');
    } else {
      zoomVillagesWrap.hidden = true;
      zoomVillages.innerHTML = '';
    }

    const extras = MAP_EXTRA_POIS.filter((p) => p.townId === id).map((p) => ({
      kind: 'extra',
      id: p.id,
      title: p.title,
      category: p.category,
      tagline: p.tagline,
      img: p.img,
    }));
    zoomExtras.innerHTML = extras.map(cardHtml).join('') || '<p class="lc-empty">点选上方景致即可展开册页</p>';

    zoomPanel.hidden = false;
    zoomPanel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => zoomPanel.classList.add('open'));
  }

  function openCardFromZoom(btn) {
    const kind = btn.dataset.open;
    const id = btn.dataset.id;
    if (kind === 'landmark') {
      const entry = landmarksById.get(id);
      if (entry) onOpenLandmark?.(entry);
      return;
    }
    const poi = MAP_EXTRA_POIS.find((p) => p.id === id);
    if (poi) onOpenExtra?.(poi);
  }

  async function shareTown(templateHint) {
    const town = townById(state.focusId) || townById('chaotian');
    const payload = {
      template: templateHint || 'township',
      title: town?.name || MAP_META.title,
      subtitle: town ? `${town.kind} · 代码 ${town.code}` : MAP_META.sub,
      tagline: town?.blurb?.slice(0, 36) || MAP_META.sub,
      body: town?.blurb || MAP_META.sourceNote,
      imgUrl: assetUrl(town?.zoomArt || MAP_META.baseArt),
      footer: 'duomei.site · 灵川乡镇地图',
      townName: town?.name,
      kind: 'township',
    };
    await sharePayload(payload, { onNote: onShareNote });
  }

  async function shareOverview(templateId) {
    await sharePayload({
      template: templateId || 'overview',
      mapOverview: true,
      title: '灵川乡镇地图',
      subtitle: '按真实区划 · 潮田放大',
      tagline: '纸墨里的家乡坐标',
      body: MAP_META.sourceNote,
      imgUrl: assetUrl(MAP_META.baseArt),
    }, { onNote: onShareNote });
  }

  // Events
  root.querySelectorAll('.lc-town-node').forEach((node) => {
    node.addEventListener('click', () => openTown(node.dataset.town));
  });
  root.querySelectorAll('.lc-map-chip').forEach((chip) => {
    chip.addEventListener('click', () => openTown(chip.dataset.town));
  });
  root.querySelector('.lc-zoom-close').addEventListener('click', closeZoom);
  root.querySelector('.lc-zoom-dismiss').addEventListener('click', closeZoom);
  root.querySelector('.lc-zoom-share').addEventListener('click', () => shareTown('township'));
  root.querySelectorAll('.lc-share-tpl').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.shareTpl;
      if (state.focusId && (id === 'township' || id === 'village' || id === 'culture-lion')) {
        shareTown(id);
      } else {
        shareOverview(id);
      }
    });
  });
  zoomLandmarks.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-zoom-card');
    if (btn) openCardFromZoom(btn);
  });
  zoomExtras.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-zoom-card');
    if (btn) openCardFromZoom(btn);
  });

  // Swipe-down dismiss on zoom sheet
  let startY = null;
  let dy = 0;
  const grab = root.querySelector('.lc-zoom-grab');
  const onDown = (e) => {
    startY = e.clientY;
    dy = 0;
    grab.setPointerCapture?.(e.pointerId);
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
    if (dy > 80) closeZoom();
    else zoomSheet.style.transform = '';
    startY = null;
    dy = 0;
  };
  grab.addEventListener('pointerdown', onDown);
  grab.addEventListener('pointermove', onMove);
  grab.addEventListener('pointerup', onUp);
  grab.addEventListener('pointercancel', onUp);
  root.querySelector('.lc-zoom-head').addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    onDown(e);
  });
  root.querySelector('.lc-zoom-head').addEventListener('pointermove', onMove);
  root.querySelector('.lc-zoom-head').addEventListener('pointerup', onUp);

  // Soft parallax
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    const far = root.querySelector('.lc-map-far');
    const mid = root.querySelector('.lc-map-mid');
    const near = root.querySelector('.lc-map-near');
    const onPointer = (e) => {
      const r = mapEl.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      far.style.transform = `translate3d(${x * -6}px, ${y * -4}px, 0)`;
      mid.style.transform = `translate3d(${x * -12}px, ${y * -8}px, 0)`;
      near.style.transform = `translate3d(${x * -18}px, ${y * -12}px, 0)`;
    };
    mapEl.addEventListener('pointermove', onPointer);
  }

  // Default open tip: highlight chaotian gently
  setTimeout(() => setFocusVisual('chaotian'), 400);

  return {
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
    code: 'MAP',
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
