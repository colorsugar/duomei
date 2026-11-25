// ============================================================================
// Multi-template share cards for Lingchuan map / gazetteer
// Templates: overview | township | culture-lion | village | landmark
// ============================================================================

const TEMPLATES = {
  overview: {
    id: 'overview',
    label: '地图总览',
    seal: '灵川',
    accent: '#2D615B',
    ribbon: '乡镇地图',
  },
  township: {
    id: 'township',
    label: '乡镇卡片',
    seal: '乡镇',
    accent: '#8C6223',
    ribbon: '区划风物',
  },
  'culture-lion': {
    id: 'culture-lion',
    label: '舞狮民俗',
    seal: '民俗',
    accent: '#B3261E',
    ribbon: '锣鼓喧天',
  },
  village: {
    id: 'village',
    label: '村落家书',
    seal: '村落',
    accent: '#5B4636',
    ribbon: '家乡一页',
  },
  landmark: {
    id: 'landmark',
    label: '景致印记',
    seal: '印',
    accent: '#B3261E',
    ribbon: '三十二景',
  },
};

export function listShareTemplates() {
  return Object.values(TEMPLATES);
}

export function resolveShareTemplate(hint, payload = {}) {
  if (hint && TEMPLATES[hint]) return TEMPLATES[hint];
  const cat = payload.category || '';
  if (/狮|傩|牌灯|草龙|民俗/.test(`${cat}${payload.title || ''}`)) return TEMPLATES['culture-lion'];
  if (/村|山口|大参/.test(`${payload.title || ''}${payload.subtitle || ''}`)) return TEMPLATES.village;
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
  return new Promise((resolve, reject) => {
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

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const chars = String(text || '');
  let line = '';
  let lines = 0;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines += 1;
      line = ch;
      if (lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

/**
 * @param {object} payload
 * @param {string} [payload.template]
 * @param {string} payload.title
 * @param {string} [payload.subtitle]
 * @param {string} [payload.tagline]
 * @param {string} [payload.body]
 * @param {string} [payload.imgUrl]
 * @param {string} [payload.footer]
 */
export async function renderShareCard(payload) {
  const tpl = resolveShareTemplate(payload.template, payload);
  const W = 720;
  const H = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Paper ground
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#F7F1E4');
  g.addColorStop(0.55, '#EFE6D4');
  g.addColorStop(1, '#E7DCC6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft ink edge
  ctx.strokeStyle = 'rgba(60,48,36,0.18)';
  ctx.lineWidth = 3;
  roundRect(ctx, 28, 28, W - 56, H - 56, 28);
  ctx.stroke();

  // Accent bar
  ctx.fillStyle = tpl.accent;
  roundRect(ctx, 56, 56, W - 112, 8, 4);
  ctx.fill();

  // Seal
  ctx.save();
  ctx.translate(W - 120, 120);
  ctx.rotate(0.12);
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 4;
  roundRect(ctx, -44, -44, 88, 88, 10);
  ctx.stroke();
  ctx.fillStyle = tpl.accent;
  ctx.font = '700 28px "Songti SC", "STSong", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tpl.seal, 0, 2);
  ctx.restore();

  ctx.fillStyle = 'rgba(60,48,36,0.55)';
  ctx.font = '600 22px "PingFang SC", "Heiti SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`多美 · ${tpl.ribbon}`, 64, 110);

  ctx.fillStyle = '#1C1916';
  ctx.font = '700 48px "Songti SC", "STSong", serif';
  wrapText(ctx, payload.title || '灵川', 64, 180, W - 160, 56, 2);

  if (payload.subtitle) {
    ctx.fillStyle = 'rgba(60,48,36,0.72)';
    ctx.font = '500 24px "PingFang SC", sans-serif';
    wrapText(ctx, payload.subtitle, 64, 290, W - 140, 34, 2);
  }

  const art = await loadImage(payload.imgUrl);
  const artY = 360;
  const artH = 420;
  roundRect(ctx, 64, artY, W - 128, artH, 22);
  ctx.save();
  ctx.clip();
  if (art) {
    const scale = Math.max((W - 128) / art.width, artH / art.height);
    const dw = art.width * scale;
    const dh = art.height * scale;
    ctx.drawImage(art, 64 + ((W - 128) - dw) / 2, artY + (artH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#E4D8C2';
    ctx.fillRect(64, artY, W - 128, artH);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,48,36,0.16)';
  ctx.lineWidth = 2;
  roundRect(ctx, 64, artY, W - 128, artH, 22);
  ctx.stroke();

  if (payload.tagline) {
    ctx.fillStyle = tpl.accent;
    ctx.font = 'italic 600 26px "Songti SC", serif';
    wrapText(ctx, payload.tagline, 64, 820, W - 128, 36, 2);
  }

  ctx.fillStyle = 'rgba(28,25,22,0.82)';
  ctx.font = '400 24px "PingFang SC", sans-serif';
  wrapText(ctx, payload.body || '', 64, 920, W - 128, 36, 5);

  ctx.fillStyle = 'rgba(60,48,36,0.5)';
  ctx.font = '500 20px "PingFang SC", sans-serif';
  ctx.fillText(payload.footer || 'duomei.site · 灵川行卷', 64, H - 72);

  return canvas;
}

export async function sharePayload(payload, { onNote } = {}) {
  const tpl = resolveShareTemplate(payload.template, payload);
  const canvas = await renderShareCard({ ...payload, template: tpl.id });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
  const fileName = `duomei-lingchuan-${tpl.id}.png`;
  const text = `${payload.title || '灵川'} · ${tpl.label}\n${payload.tagline || ''}\nhttps://duomei.site/lingchuan-walk/`;

  try {
    if (navigator.share && blob) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: payload.title, text });
        onNote?.(`已分享 · ${tpl.label}`);
        return { ok: true, mode: 'files', template: tpl.id };
      }
      await navigator.share({ title: payload.title, text });
      onNote?.(`已分享文字 · ${tpl.label}`);
      return { ok: true, mode: 'text', template: tpl.id };
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      onNote?.('已取消分享');
      return { ok: false, mode: 'abort', template: tpl.id };
    }
  }

  // Fallback: download + clipboard text
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  try {
    await navigator.clipboard?.writeText(text);
    onNote?.(`卡片已下载 · ${tpl.label}（文案已复制）`);
  } catch {
    onNote?.(`卡片已下载 · ${tpl.label}`);
  }
  return { ok: true, mode: 'download', template: tpl.id };
}

export { TEMPLATES };
