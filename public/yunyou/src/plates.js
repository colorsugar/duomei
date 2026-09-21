const frame = document.getElementById('plate-frame');
const note = document.getElementById('plate-note');
const chips = document.getElementById('plate-chips');
const nightBtn = document.getElementById('plate-night');
const liveBtn = document.getElementById('plate-live');
const stage = document.getElementById('plates');
const bar = document.getElementById('plate-bar');

const manifest = await fetch(new URL('../assets/plates/manifest.json', import.meta.url)).then((response) => {
  if (!response.ok) throw new Error('Plate manifest ' + response.status);
  return response.json();
});

let set = manifest.sets.find((item) => item.id === location.hash.slice(1)) || manifest.sets[0];
let night = false;
let index = 0;
let scale = 1;
let panX = 0;
let panY = 0;
const pointers = new Map();
let carry = 0;
let pinch = null;
const warmed = new Map();
let paintGen = 0;

function list() {
  return night && set.night?.length ? set.night : set.day;
}
// ponytail: plates are base64 text so they can be stored without a binary git push. Decode once per frame.
function fileUrl(rel) {
  if (warmed.has(rel)) return warmed.get(rel);
  const pending = fetch(new URL('../assets/plates/' + rel, import.meta.url)).then(async (response) => {
    if (!response.ok) throw new Error(rel);
    const bytes = Uint8Array.from(atob((await response.text()).replace(/\s/g, '')), (char) => char.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  });
  warmed.set(rel, pending);
  return pending;
}
function warm(rel) {
  fileUrl(rel);
}
async function paint() {
  const gen = ++paintGen;
  const files = list();
  index = (index + files.length) % files.length;
  const rel = files[index];
  const url = await fileUrl(rel);
  if (gen !== paintGen) return;
  frame.src = url;
  frame.alt = set.name + '模型，预先渲染';
  frame.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  note.textContent = files.length > 1 ? set.name + ' · 左右滑动转动 · 画面已预先渲染' : set.name + ' · 画面已预先渲染';
  nightBtn.hidden = !set.night?.length;
  nightBtn.setAttribute('aria-pressed', night ? 'true' : 'false');
  for (const step of [1, -1, 2]) warm(files[(index + step + files.length) % files.length]);
}
async function select(next, keepAngle) {
  const ratio = list().length ? index / list().length : 0;
  set = next;
  if (!set.night?.length) night = false;
  const files = list();
  index = keepAngle ? Math.round(ratio * files.length) % files.length : 0;
  scale = 1; panX = 0; panY = 0;
  for (const button of chips.children) button.setAttribute('aria-pressed', button.dataset.id === set.id ? 'true' : 'false');
  history.replaceState(null, '', '#' + set.id);
  paint();
}

for (const item of manifest.sets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.id = item.id;
  button.textContent = item.name;
  button.setAttribute('aria-pressed', item === set ? 'true' : 'false');
  button.addEventListener('click', () => select(item, false));
  chips.appendChild(button);
}
nightBtn.addEventListener('click', () => {
  if (!set.night?.length) return;
  night = !night;
  paint();
});
bar.addEventListener('pointerdown', (event) => event.stopPropagation());

function applyMove(event) {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  pointers.set(event.pointerId, [event.clientX, event.clientY]);
  if (pointers.size >= 2) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
    if (!pinch) pinch = { dist, scale };
    scale = Math.min(2.6, Math.max(1, pinch.scale * (dist / pinch.dist)));
    if (scale === 1) { panX = 0; panY = 0; }
    frame.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    return;
  }
  const dx = event.clientX - previous[0];
  const dy = event.clientY - previous[1];
  if (scale > 1.02) {
    panX += dx; panY += dy;
    frame.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    return;
  }
  carry += dx;
  const step = Math.max(28, stage.clientWidth / 18);
  while (carry >= step) { carry -= step; index += 1; paint(); }
  while (carry <= -step) { carry += step; index -= 1; paint(); }
}

stage.addEventListener('pointerdown', (event) => {
  if (event.target.closest('#plate-bar')) return;
  stage.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, [event.clientX, event.clientY]);
  if (pointers.size < 2) pinch = null;
});
stage.addEventListener('pointermove', applyMove);
function endPointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = null;
  if (!pointers.size) carry = 0;
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  scale = Math.min(2.6, Math.max(1, scale * (event.deltaY > 0 ? 0.92 : 1.08)));
  if (scale === 1) { panX = 0; panY = 0; }
  frame.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}, { passive: false });
addEventListener('keydown', (event) => {
  if (event.target.closest?.('input,textarea,select,[contenteditable]')) return;
  if (event.key === 'ArrowRight') { index += 1; paint(); }
  if (event.key === 'ArrowLeft') { index -= 1; paint(); }
});

liveBtn.addEventListener('click', async () => {
  document.documentElement.classList.remove('plates-on');
  const loading = document.getElementById('loading');
  const fallback = document.getElementById('map-fallback');
  if (loading) loading.hidden = false;
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) throw new Error('WebGL unavailable');
    const url = new URL(location.href);
    url.searchParams.set('live', '1');
    history.replaceState(null, '', url);
    await import('./main.js');
  } catch (error) {
    console.error('Yunyou live view failed', error);
    if (loading) loading.hidden = true;
    if (fallback) fallback.hidden = false;
    document.body.classList.add('map-failed');
  }
});

paint();
