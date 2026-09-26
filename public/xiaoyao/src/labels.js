import * as THREE from 'three';
import { PLACE_PHOTOS } from '/yunyou/data/place-photos.js';
import { PLACE_GALLERY } from '/yunyou/data/place-gallery.js';

const _v = new THREE.Vector3();

const PHOTO_BASE = '/yunyou/';

export function createLabelUI(container, onOpenCard) {
  const layer = document.createElement('div');
  layer.id = 'labels';
  container.appendChild(layer);

  const card = document.createElement('div');
  card.id = 'photo-card';
  card.hidden = true;
  card.innerHTML = `
    <button type="button" class="card-close" aria-label="关闭">×</button>
    <img alt="" />
    <p class="cap"></p>`;
  container.appendChild(card);
  const img = card.querySelector('img');
  const cap = card.querySelector('.cap');
  card.querySelector('.card-close').onclick = () => {
    card.hidden = true;
  };

  function photoFor(id) {
    const p = PLACE_PHOTOS[id] || PLACE_GALLERY[id]?.[0];
    if (!p) return null;
    let src = p.src;
    if (src.startsWith('./')) src = PHOTO_BASE + src.slice(2);
    return { src, alt: p.alt || '', caption: p.caption || p.alt || '' };
  }

  function openCard(id) {
    const p = photoFor(id);
    if (!p) return;
    img.src = p.src;
    img.alt = p.alt;
    cap.textContent = p.caption;
    card.hidden = false;
    onOpenCard?.(id);
  }

  return {
    layer,
    openCard,
    update({ camera, player, targets, minHeight = 6.8 }) {
      layer.replaceChildren();
      if (player.pos.y < minHeight) return;
      const forward = new THREE_FWD(player.yaw);
      for (const t of targets) {
        const dx = t.pos[0] - player.pos.x;
        const dz = t.pos[2] - player.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 30 || dist > 2200) continue;
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const dot = forward.x * dirX + forward.z * dirZ;
        if (dot < 0.82) continue;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'lbl';
        el.textContent = t.name;
        el.onclick = () => openCard(t.id);
        const sp = project(camera, t.pos);
        if (!sp) continue;
        el.style.left = `${sp.x}px`;
        el.style.top = `${sp.y}px`;
        layer.appendChild(el);
      }
    },
  };
}

function THREE_FWD(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

function project(camera, pos) {
  _v.set(pos[0], pos[1], pos[2]).project(camera);
  if (_v.z > 1) return null;
  const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
  if (x < 8 || y < 8 || x > window.innerWidth - 8 || y > window.innerHeight - 8) return null;
  return { x, y };
}
