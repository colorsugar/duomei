// ============================================================================
// 多美 · 灵川宣纸手账多模板分享笺引擎（5 套现网同款审美模板 + 实时预览弹层）
// Templates: overview | township | culture-lion | village | landmark
// ============================================================================

const TEMPLATES = {
  overview: {
    id: 'overview',
    label: '水墨明信片',
    seal: '桂林',
    accent: '#1F5E5B',
    ribbon: '桂林全境 · 明信片签',
    layout: 'postcard',
  },
  township: {
    id: 'township',
    label: '宣纸手账签',
    seal: '风物',
    accent: '#B3261E',
    ribbon: '十七县区 · 手账竖签',
    layout: 'vertical-seal',
  },
  village: {
    id: 'village',
    label: '山乡风物志',
    seal: '乡情',
    accent: '#5B4636',
    ribbon: '桂北村落 · 风物一页',
    layout: 'postcard',
  },
  'culture-lion': {
    id: 'culture-lion',
    label: '民俗节庆笺',
    seal: '民俗',
    accent: '#B3261E',
    ribbon: '桂北节庆 · 锣鼓薪传',
    layout: 'festival',
  },
  landmark: {
    id: 'landmark',
    label: '青绿印记卡',
    seal: '印',
    accent: '#1F5E5B',
    ribbon: '桂林全境 · 青绿印记',
    layout: 'vertical-seal',
  },
};

export function listShareTemplates() {
  return Object.values(TEMPLATES);
}

export function resolveShareTemplate(hint, payload = {}) {
  if (hint && TEMPLATES[hint]) return TEMPLATES[hint];
  const cat = payload.category || '';
  if (/狮|傩|牌灯|草龙|民俗/.test(`${cat}${payload.title || ''}`)) return TEMPLATES['culture-lion'];
  if (/村|山口/.test(`${payload.title || ''}${payload.subtitle || ''}`)) return TEMPLATES.village;
  if (payload.kind === 'township' || payload.townName) return TEMPLATES.township;
  if (payload.mapOverview) return TEMPLATES.overview;
  return TEMPLATES.landmark;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const NO_LINE_START = /[，。、；：！？）」』》〉,.;:!?)\]]/;

function layoutLines(ctx, text, maxW) {
  const lines = [];
  for (const para of String(text || '').split('\n')) {
    let line = '';
    for (const ch of Array.from(para)) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        if (NO_LINE_START.test(ch)) {
          // 标点不起行：把上一行最后一个字带下来
          const arr = Array.from(line);
          const last = arr.pop();
          lines.push(arr.join(''));
          line = last + ch;
        } else {
          lines.push(line);
          line = ch;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  let lines = layoutLines(ctx, text, maxW);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > maxW) last = Array.from(last).slice(0, -1).join('');
    lines[maxLines - 1] = last.replace(/[，。、；：,.;:]$/, '') + '…';
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}

// 在给定高度内放下全文：逐级缩小字号，实在放不下才省略
function fitText(ctx, text, x, y, maxW, maxH, { weight = 400, family = '"Songti SC", "PingFang SC", serif', size = 23, min = 17, lead = 1.62 } = {}) {
  for (let fs = size; fs >= min; fs -= 1) {
    ctx.font = `${weight} ${fs}px ${family}`;
    const lh = Math.round(fs * lead);
    const n = layoutLines(ctx, text, maxW).length;
    if (n * lh <= maxH || fs === min) {
      return wrapText(ctx, text, x, y, maxW, lh, Math.max(1, Math.floor(maxH / lh))) * lh;
    }
  }
  return 0;
}

function drawVerticalColumn(ctx, text, x, y, stepY, maxChars = 10) {
  const chars = Array.from(String(text || '')).slice(0, maxChars);
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, x, y + idx * stepY);
  });
}

function drawSquareSeal(ctx, text, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  roundRect(ctx, -size / 2, -size / 2, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 245, 236, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, -size / 2 + 5, -size / 2 + 5, size - 10, size - 10, 5);
  ctx.stroke();

  const chars = Array.from(String(text || '印')).slice(0, 2);
  ctx.fillStyle = '#FAF5EC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (chars.length === 1) {
    ctx.font = `700 ${Math.round(size * 0.48)}px "Songti SC", "STSong", serif`;
    ctx.fillText(chars[0], 0, 2);
  } else {
    ctx.font = `700 ${Math.round(size * 0.34)}px "Songti SC", "STSong", serif`;
    ctx.fillText(chars[0], 0, -size * 0.17);
    ctx.fillText(chars[1], 0, size * 0.19);
  }
  ctx.restore();
}

function drawCoverArt(ctx, art, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = '#F2EBDC';
  ctx.fillRect(x, y, w, h);
  if (art) {
    const scale = Math.min(w / art.width, h / art.height);
    const dw = art.width * scale;
    const dh = art.height * scale;
    ctx.drawImage(art, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(28, 25, 22, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

export async function renderShareCard(payload) {
  const tpl = resolveShareTemplate(payload.template, payload);
  const W = 760;
  const H = 1260;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Warm Duomei xuan-paper ground (#F5F0E3)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#F7F2E6');
  bg.addColorStop(0.55, '#F4EFE2');
  bg.addColorStop(1, '#ECE4D3');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Delicate double classical paper border
  ctx.strokeStyle = tpl.layout === 'festival' ? 'rgba(179, 38, 30, 0.28)' : 'rgba(28, 25, 22, 0.13)';
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 22);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(28, 25, 22, 0.06)';
  ctx.lineWidth = 1;
  roundRect(ctx, 38, 38, W - 76, H - 76, 16);
  ctx.stroke();

  const art = await loadImage(payload.imgUrl);

  if (tpl.layout === 'vertical-seal') {
    // Editorial Vertical Seal Xuan-Paper Card
    ctx.fillStyle = '#8C8176';
    ctx.font = '500 20px "Songti SC", "STSong", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DUOMEI 多美 · ${tpl.ribbon}`, 68, 92);

    // Upper art centerpiece
    drawCoverArt(ctx, art, 68, 126, W - 136, 510, 18);

    // Right vertical calligraphy title + square seal
    ctx.fillStyle = '#1C1916';
    ctx.textAlign = 'center';
    const titleShort = String(payload.title || '桂林全境').split('·')[0].trim();
    const tn = Array.from(titleShort).length;
    const step = Math.min(58, Math.floor(330 / Math.max(tn, 1)));
    ctx.font = `700 ${Math.round(step * 0.86)}px "Songti SC", "STSong", serif`;
    drawVerticalColumn(ctx, titleShort, W - 116, 715, step, 8);
    drawSquareSeal(ctx, tpl.seal, W - 116, 1086, 58, tpl.accent);

    // Left poetic tagline & monograph
    ctx.textAlign = 'left';
    ctx.fillStyle = tpl.accent;
    ctx.font = '600 22px "Songti SC", "STSong", serif';
    wrapText(ctx, payload.subtitle || '桂林', 72, 706, W - 250, 34, 2);

    ctx.fillStyle = '#1C1916';
    const tagH = fitText(ctx, payload.tagline || '一脉山水，十七县区。', 72, 780, W - 250, 130, { weight: 600, family: '"Songti SC", "STSong", serif', size: 28, min: 22, lead: 1.5 });

    ctx.fillStyle = 'rgba(28, 25, 22, 0.72)';
    const bodyY = 780 + tagH + 34;
    fitText(ctx, payload.body || '', 72, bodyY, W - 250, (H - 130) - bodyY, { size: 23, min: 17 });
  } else {
    // Postcard / Festival Layout
    ctx.fillStyle = tpl.accent;
    ctx.font = '600 20px "Songti SC", "STSong", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DUOMEI 多美 · ${tpl.ribbon}`, 68, 94);

    drawSquareSeal(ctx, tpl.seal, W - 98, 92, 54, tpl.accent);

    drawCoverArt(ctx, art, 64, 136, W - 128, 510, 18);

    ctx.fillStyle = '#1C1916';
    ctx.font = '700 46px "Songti SC", "STSong", serif';
    wrapText(ctx, payload.title || '桂林全境', 68, 720, W - 136, 56, 2);

    if (payload.subtitle) {
      ctx.fillStyle = tpl.accent;
      ctx.font = '500 23px "Songti SC", "PingFang SC", serif';
      wrapText(ctx, payload.subtitle, 68, 792, W - 136, 34, 1);
    }

    // Hairline divider
    ctx.strokeStyle = 'rgba(28, 25, 22, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(68, 822);
    ctx.lineTo(W - 68, 822);
    ctx.stroke();

    let bodyY = 878;
    if (payload.tagline) {
      ctx.fillStyle = '#2A231D';
      bodyY += fitText(ctx, payload.tagline, 68, 878, W - 136, 84, { weight: 600, family: '"Songti SC", "STSong", serif', size: 27, min: 21, lead: 1.48 });
    }

    ctx.fillStyle = 'rgba(28, 25, 22, 0.76)';
    bodyY += 24;
    fitText(ctx, payload.body || '', 68, bodyY, W - 136, (H - 130) - bodyY, { size: 23, min: 17 });
  }

  // Unified Duomei whisper footer
  ctx.strokeStyle = 'rgba(28, 25, 22, 0.11)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(68, H - 102);
  ctx.lineTo(W - 68, H - 102);
  ctx.stroke();

  ctx.fillStyle = '#8C8176';
  ctx.font = '500 20px "Songti SC", "PingFang SC", serif';
  ctx.textAlign = 'left';
  ctx.fillText(payload.footer || '桂林全境风物志', 68, H - 64);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5A5147';
  ctx.font = '600 20px Georgia, "Songti SC", serif';
  ctx.fillText('DUOMEI · duomei.site', W - 68, H - 64);

  return canvas;
}

async function dispatchCanvasShare(canvas, payload, tpl, onNote) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.94));
  const fileName = `duomei-lingchuan-${tpl.id}.png`;
  const text = `${payload.title || '桂林全境'} · ${tpl.label}\n${payload.tagline || ''}\nhttps://duomei.site/lingchuan-walk/`;

  try {
    if (navigator.share && blob) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: payload.title, text });
        onNote?.(`已分享 · ${tpl.label}`);
        return { ok: true, mode: 'files', template: tpl.id };
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      onNote?.('已取消分享');
      return { ok: false, mode: 'abort', template: tpl.id };
    }
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
  try {
    await navigator.clipboard?.writeText(text);
    onNote?.(`高清分享笺已保存（文案已复制）`);
  } catch {
    onNote?.(`高清分享笺已保存 · ${tpl.label}`);
  }
  return { ok: true, mode: 'download', template: tpl.id };
}

// Live Xuan-Paper Share Studio Modal (preview + switch 5 templates + save/share)
let studioEl = null;

function ensureShareStudio() {
  if (studioEl) return studioEl;
  const el = document.createElement('div');
  el.id = 'lc-share-studio';
  el.className = 'lc-share-studio';
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="lc-share-backdrop" data-close="1"></div>
    <div class="lc-share-dialog" role="dialog" aria-modal="true" aria-label="生成宣纸分享笺">
      <header class="lc-share-head">
        <div>
          <span class="lc-share-k">DUOMEI · 宣纸分享笺</span>
          <h3>换一种手账模板，留存这一页桂林</h3>
        </div>
        <button type="button" class="lc-share-close" data-close="1" aria-label="关闭分享预览">×</button>
      </header>
      <div class="lc-share-stage">
        <img id="lc-share-preview-img" alt="宣纸分享笺预览">
      </div>
      <div class="lc-share-tpls" role="tablist" aria-label="分享笺模板">
        ${listShareTemplates().map((t) => `
          <button type="button" class="lc-share-tpl-btn" data-tpl="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      <p id="lc-share-status" class="lc-share-status" aria-live="polite"></p>
      <footer class="lc-share-foot">
        <button type="button" class="lc-share-save" id="lc-share-save-btn">保存 / 分享高清画笺</button>
        <button type="button" class="lc-share-done" data-close="1">关闭</button>
      </footer>
    </div>
  `;
  document.body.appendChild(el);
  studioEl = el;
  return el;
}

export async function openShareStudio(payload, { onNote } = {}) {
  const studio = ensureShareStudio();
  const imgEl = studio.querySelector('#lc-share-preview-img');
  const statusEl = studio.querySelector('#lc-share-status');
  const saveBtn = studio.querySelector('#lc-share-save-btn');
  const tplBtns = Array.from(studio.querySelectorAll('.lc-share-tpl-btn'));

  let currentTpl = resolveShareTemplate(payload.template, payload);
  let currentCanvas = null;

  const paint = async (tplId) => {
    currentTpl = resolveShareTemplate(tplId, payload);
    tplBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.tpl === currentTpl.id));
    statusEl.textContent = `正在渲染「${currentTpl.label}」…`;
    currentCanvas = await renderShareCard({ ...payload, template: currentTpl.id });
    imgEl.src = currentCanvas.toDataURL('image/png', 0.92);
    statusEl.textContent = `当前模板：${currentTpl.label} · 点击下方保存或分享`;
  };

  const close = () => {
    studio.classList.remove('open');
    studio.setAttribute('aria-hidden', 'true');
    setTimeout(() => { studio.hidden = true; }, 220);
  };

  studio.onclick = (e) => {
    if (e.target.closest('[data-close="1"]')) close();
  };
  tplBtns.forEach((b) => {
    b.onclick = () => paint(b.dataset.tpl);
  });
  saveBtn.onclick = async () => {
    if (!currentCanvas) return;
    await dispatchCanvasShare(currentCanvas, payload, currentTpl, (msg) => {
      statusEl.textContent = msg;
      onNote?.(msg);
    });
  };

  studio.hidden = false;
  studio.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => studio.classList.add('open'));
  await paint(currentTpl.id);
}

export async function sharePayload(payload, { onNote } = {}) {
  await openShareStudio(payload, { onNote });
  return { ok: true, mode: 'studio', template: resolveShareTemplate(payload.template, payload).id };
}

export { TEMPLATES };
