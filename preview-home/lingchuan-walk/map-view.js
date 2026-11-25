// ============================================================================
// 灵川全境 · 宣纸立雕地图与十二乡镇风物志（完全贴合多美现网气质）
// ============================================================================

import {
  TOWNSHIPS,
  MAP_EXTRA_POIS,
  MAP_META,
  MAP_CATEGORIES,
  WATER_LABELS,
} from './map-townships.js';
import { listShareTemplates, openShareStudio } from './share-card.js';

function assetUrl(rel) {
  if (!rel) return '';
  return `./img/${rel}.webp`;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
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
    selectedId: 'chaotian',
    zoomedId: null,
    overlayOpen: false,
    category: 'all',
    scale: 1,
    tx: 0,
    ty: 0,
    activeVillageId: null,
  };

  const townById = (id) => TOWNSHIPS.find((t) => t.id === id);

  root.innerHTML = `
    <div class="lc-atlas" data-focus="chaotian">
      <div class="lc-atlas-shell">
        <!-- 左侧 / 手机主画布：宣纸立雕全境地图 -->
        <section class="lc-atlas-stage" aria-label="灵川全境宣纸立雕地图">
          <div class="lc-atlas-viewport" id="lc-atlas-viewport">
            <div class="lc-atlas-transform" id="lc-atlas-transform">
              <div class="lc-atlas-plate">
                <div class="lc-compass" aria-hidden="true"><span>北</span><i></i></div>
                <img class="lc-relief-img" src="${assetUrl(MAP_META.baseArt)}" alt="灵川县全境宣纸层叠立雕地图" decoding="async" draggable="false">
                ${WATER_LABELS.map((w) => `
                  <span class="lc-water-lbl" style="left:${w.x}%;top:${w.y}%;${w.rot ? `transform:translate(-50%,-50%) rotate(${w.rot}deg)` : ''}" aria-hidden="true">${w.text}</span>
                `).join('')}
                <div class="lc-pins-layer">
                  ${TOWNSHIPS.map((t) => {
                    const cls = [
                      'lc-pin',
                      `dir-${t.dir || 'top'}`,
                      t.county ? 'is-county' : '',
                      t.featured ? 'is-featured' : '',
                    ].filter(Boolean).join(' ');
                    const tagInner = t.featured
                      ? `${t.name}<i class="lc-pin-seal">详卷</i>`
                      : t.county
                        ? `${t.name}<em>县治</em>`
                        : t.name;
                    return `
                      <button type="button" class="${cls}" data-town="${t.id}" style="left:${t.x}%;top:${t.y}%;" aria-label="${t.name} · ${t.region}">
                        <span class="lc-pin-dot" aria-hidden="true"></span>
                        <span class="lc-pin-tag">${tagInner}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
                <div class="lc-colophon" aria-hidden="true">
                  <div class="lc-col-title">${MAP_META.title}</div>
                  <div class="lc-col-sub">${MAP_META.subtitle}</div>
                  <div class="lc-col-seal">${MAP_META.seal}</div>
                </div>
              </div>
            </div>

            <!-- 缩放后出现的极简复位微钮 -->
            <button type="button" class="lc-reset-btn" id="lc-reset-btn" hidden aria-label="复位全境视图">复位全境</button>
          </div>

          <!-- 手机端底部克制发丝提示栏（无卡片墙） -->
          <div class="lc-mobile-bar">
            <div class="lc-cat-strip" role="tablist" aria-label="按主题筛亮乡镇">
              ${MAP_CATEGORIES.map((c) => `
                <button type="button" class="lc-cat-btn${c.id === 'all' ? ' is-active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${c.id === 'all'}">${c.label}</button>
              `).join('')}
            </div>
            <div class="lc-whisper-row">
              <span class="lc-whisper-hint">轻点乡镇放大细览 · 双指缩放</span>
              <div class="lc-whisper-acts">
                <button type="button" class="lc-whisper-share" id="lc-mob-share">分享笺</button>
                <button type="button" class="lc-whisper-go" id="lc-mob-chaotian">直入潮田乡 →</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 桌面宽屏右侧：素雅宣纸风物侧笺 -->
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
            <span>${MAP_META.sourceNote}</span>
          </footer>
        </aside>
      </div>

      <!-- 乡镇放大详卷（潮田专属立体画卷 / 其余11乡智能聚焦 + 宣纸详笺抽屉） -->
      <section class="lc-zoom-panel" id="lc-zoom-panel" aria-hidden="true" hidden>
        <div class="lc-zoom-top" id="lc-zoom-top">
          <div class="lc-zoom-chrome">
            <div class="lc-zoom-crumb">灵川全境 <span aria-hidden="true">›</span> <b id="lc-zoom-crumb-name"></b></div>
            <button type="button" class="lc-zoom-close" aria-label="关闭乡镇放大并返回全境">
              <span aria-hidden="true">×</span>返回全境
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
            <button type="button" class="lc-zf-btn is-dismiss lc-zoom-dismiss">返回全境</button>
          </footer>
        </div>
      </section>
    </div>
  `;

  const atlasEl = root.querySelector('.lc-atlas');
  const viewportEl = root.querySelector('#lc-atlas-viewport');
  const transformEl = root.querySelector('#lc-atlas-transform');
  const resetBtn = root.querySelector('#lc-reset-btn');
  const folioBody = root.querySelector('#lc-folio-body');
  const pinEls = Array.from(root.querySelectorAll('.lc-pin'));
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

  // ---------- Pan & Pinch-Zoom for Full County Relief Map ----------
  function applyTransform(animate = false) {
    const vw = viewportEl.clientWidth || 390;
    const vh = viewportEl.clientHeight || 600;
    const maxTx = Math.max(0, (vw * (state.scale - 1)) * 0.52);
    const maxTy = Math.max(0, (vh * (state.scale - 1)) * 0.52);
    state.tx = clamp(state.tx, -maxTx, maxTx);
    state.ty = clamp(state.ty, -maxTy, maxTy);
    transformEl.style.transition = animate ? 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    transformEl.style.transform = `translate3d(${state.tx.toFixed(1)}px, ${state.ty.toFixed(1)}px, 0) scale(${state.scale.toFixed(3)})`;
    resetBtn.hidden = state.scale <= 1.04 && Math.abs(state.tx) < 8 && Math.abs(state.ty) < 8;
  }

  function resetCamera() {
    state.scale = 1;
    state.tx = 0;
    state.ty = 0;
    applyTransform(true);
  }

  const pointers = new Map();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let dragLast = null;
  let movedDist = 0;

  viewportEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedDist = 0;
    if (pointers.size === 1) {
      dragLast = { x: e.clientX, y: e.clientY };
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchStartScale = state.scale;
    }
    viewportEl.setPointerCapture?.(e.pointerId);
  });

  viewportEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      state.scale = clamp(pinchStartScale * (dist / pinchStartDist), 1, 2.5);
      applyTransform(false);
    } else if (pointers.size === 1 && dragLast) {
      const dx = e.clientX - dragLast.x;
      const dy = e.clientY - dragLast.y;
      movedDist += Math.hypot(dx, dy);
      dragLast = { x: e.clientX, y: e.clientY };
      if (state.scale > 1.02) {
        state.tx += dx;
        state.ty += dy;
        applyTransform(false);
      }
    }
  });

  const endPtr = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStartDist = 0;
    if (pointers.size === 1) {
      const [rem] = Array.from(pointers.values());
      dragLast = { x: rem.x, y: rem.y };
    } else {
      dragLast = null;
    }
  };
  viewportEl.addEventListener('pointerup', endPtr);
  viewportEl.addEventListener('pointercancel', endPtr);

  viewportEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    state.scale = clamp(state.scale * factor, 1, 2.5);
    if (state.scale <= 1.01) {
      state.tx = 0;
      state.ty = 0;
    }
    applyTransform(true);
  }, { passive: false });

  resetBtn.addEventListener('click', resetCamera);

  // ---------- Category Filter ----------
  function setCategory(cat) {
    state.category = cat;
    catBtns.forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    pinEls.forEach((p) => {
      const town = townById(p.dataset.town);
      const match = cat === 'all' || (town?.tags || []).includes(cat);
      p.classList.toggle('is-dimmed', !match);
      p.classList.toggle('is-matched', cat !== 'all' && match);
    });
  }

  catBtns.forEach((b) => {
    b.addEventListener('click', () => setCategory(b.dataset.cat));
  });

  // ---------- Helpers for Landmarks & Extras ----------
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

  // ---------- Desktop Right Editorial Folio ----------
  function renderDesktopFolio(townId) {
    const town = townById(townId) || townById('chaotian');
    if (!town) return;
    state.selectedId = town.id;
    atlasEl.dataset.focus = town.id;
    pinEls.forEach((p) => p.classList.toggle('is-active', p.dataset.town === town.id));

    const idx = TOWNSHIPS.findIndex((t) => t.id === town.id) + 1;
    const marks = getTownLandmarks(town);
    const extras = getTownExtras(town);
    const previewItems = [...extras.slice(0, 2), ...marks.slice(0, 2)].slice(0, 3);

    folioBody.innerHTML = `
      <div class="lc-folio-kicker">LINGCHUAN · ${String(idx).padStart(2, '0')} / ${TOWNSHIPS.length}</div>
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
        <button type="button" class="lc-folio-primary" data-open-zoom="${town.id}">放大细览 ${town.name} →</button>
        <button type="button" class="lc-folio-sec" data-jump-seg="${town.segmentId || 'lijiang'}">入纸艺长卷</button>
      </div>
    `;
  }

  folioBody.addEventListener('click', (e) => {
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

  // ---------- Village Detail Note inside Zoom Sheet ----------
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

  villageNoteEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.lc-vn-go');
    if (btn) openItem(btn.dataset.open, btn.dataset.id);
  });

  // ---------- Open Township Zoom View ----------
  function openTown(id) {
    const town = townById(id);
    if (!town) return;
    state.zoomedId = town.id;
    state.overlayOpen = true;
    renderDesktopFolio(town.id);

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

    // Upper hero: bespoke diorama for Chaotian, or precision zoomed relief crop for other 11 townships
    if (town.zoomArt) {
      zoomStage.classList.add('is-bespoke');
      zoomArt.src = assetUrl(town.zoomArt);
      zoomArt.alt = `${town.name} 立体风物画卷`;
      zoomArt.style.transform = '';
      zoomArt.style.transformOrigin = '';
      zoomPins.innerHTML = (town.zoomPins || []).map((p) => {
        const cls = ['lc-pin', `dir-${p.dir || 'top'}`, p.featured ? 'is-featured' : ''].filter(Boolean).join(' ');
        const inner = p.badge
          ? `${p.label}<i class="lc-pin-seal">${p.badge}</i>`
          : p.label;
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

    // Villages
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

    // Extras
    const extras = getTownExtras(town);
    if (extras.length) {
      zoomExtrasWrap.hidden = false;
      zoomExtras.innerHTML = extras.map(cardHtml).join('');
    } else {
      zoomExtrasWrap.hidden = true;
      zoomExtras.innerHTML = '';
    }

    // Landmarks
    const marks = getTownLandmarks(town);
    if (marks.length) {
      zoomLandmarksWrap.hidden = false;
      zoomLandmarks.innerHTML = marks.map(cardHtml).join('');
    } else {
      zoomLandmarksWrap.hidden = true;
      zoomLandmarks.innerHTML = '';
    }

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
    const town = townById(state.zoomedId || state.selectedId) || townById('chaotian');
    await openShareStudio({
      template: templateHint || 'township',
      title: town.name,
      subtitle: `${town.region} · ${town.season.split('·')[0].trim()}`,
      tagline: town.tagline,
      body: town.blurb,
      imgUrl: assetUrl(town.zoomArt || MAP_META.baseArt),
      footer: `桂林 · 灵川全境 · ${town.name}`,
      townName: town.name,
      kind: 'township',
    }, { onNote: onShareNote });
  }

  async function shareOverview(templateId) {
    await openShareStudio({
      template: templateId || 'overview',
      mapOverview: true,
      title: '灵川全境 · 七镇五乡',
      subtitle: '青狮潭至漓江 · 十二乡镇立体风物志',
      tagline: '一脉山水，七镇五乡，皆收纸墨之间。',
      body: '北起兰田瑶山与青狮潭，中经甘棠江与县城古圩，东接海洋百万银杏，南连大圩古镇、潮田果谷与大境雾凇。',
      imgUrl: assetUrl(MAP_META.baseArt),
      footer: '桂林 · 灵川全境地图',
    }, { onNote: onShareNote });
  }

  // ---------- Event Wiring ----------
  pinEls.forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      if (window.innerWidth >= 920) renderDesktopFolio(btn.dataset.town);
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (movedDist > 12) return;
      openTown(btn.dataset.town);
    });
  });

  root.querySelector('#lc-mob-chaotian').addEventListener('click', () => openTown('chaotian'));
  root.querySelector('#lc-mob-share').addEventListener('click', () => shareOverview('overview'));

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

  // Keyboard Escape closes zoom
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.overlayOpen) closeZoom();
  });

  // Initial desktop folio population
  renderDesktopFolio('chaotian');

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
