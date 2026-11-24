// Shared loading and printing of 老大's paintings onto paper cards.
import { shape } from '../lib/paperkit-2d.js';
import { paperSheet } from '../lib/paperkit-2d.js';
import { groundBase, titleSlip, rr, PAPER } from './kit.js';

export const IMGS = {};
export async function loadArt(names) {
  await Promise.all(names.map((n) => new Promise((res) => {
    if (IMGS[n]) return res();
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { IMGS[n] = im; res(); };
    im.onerror = () => res();
    im.src = `img/${n}.webp`;
  })));
}

export function drawCover(g, img, box, { sx = 0, sy = 0, sw = img.width, sh = img.height } = {}) {
  const k = Math.max(box.w / sw, box.h / sh), w = sw * k, h = sh * k;
  g.save(); g.translate((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2); g.scale(1, -1);
  g.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}

export function tint(P, color, a = 1) {
  P.draw((g) => { g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = color; g.fillRect(P.box.x0 - 1, P.box.y0 - 1, P.box.w + 2, P.box.h + 2); });
}

export function imgOutline(img, w, h) {
  return shape.fromDrawing((g) => { g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); }, { w, h, res: 36, simplify: 0.6 });
}

export function paintImg(img, w, h, { glow = 0, t = null } = {}) {
  return (P) => {
    P.fill('#efe8dc');
    P.draw((g) => { g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); });
    if (t) tint(P, t, 1);
    if (glow) P.glow((g) => { g.globalAlpha = glow; g.save(); g.scale(1, -1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); });
  };
}

export function emptyMask() {
  const S = 24, c = document.createElement('canvas');
  c.width = 40 * S; c.height = 26 * S;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function waterBand(z0 = 6, z1 = 13) {
  const S = 24, c = document.createElement('canvas');
  c.width = 40 * S; c.height = 26 * S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  const y0 = (z0 + 13) / 26 * c.height, y1 = (z1 + 13) / 26 * c.height;
  g.fillRect(0, Math.min(y0, y1), c.width, Math.abs(y1 - y0));
  return c;
}
