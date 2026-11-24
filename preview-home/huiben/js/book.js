import * as THREE from 'three';
import { paperTextures, PAPER_LIGHT, rng } from '../lib/paperkit-3d.js';
import { paperSheet } from '../lib/paperkit-2d.js';
import { SPREADS, turnTarget, lastChapterIndex, STORE_KEY } from './flow.js';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const EMBED = Q.has('embed');
if (EMBED) document.documentElement.classList.add('embed');
const INK = '#1C1916', PAPER = '#F3EEE6', VERM = '#B3261E';
const PW = 20, PD = 26, STACK = 0.7, TOP = 0;   // page width, depth; page tops at y = 0

// SPREADS (map + Guilin chapters + nested dive pages) live in flow.js

const ui = {
  loader: document.getElementById('loader'), bar: document.getElementById('bar'), pct: document.getElementById('pct'),
  stage: document.getElementById('stage'), frame: document.getElementById('frame'), nav: document.getElementById('nav'),
  cap: document.getElementById('cap'), open: document.getElementById('open'),
};
const setProgress = (v) => { ui.bar.style.transform = `scaleX(${v})`; ui.pct.textContent = String(Math.round(v * 100)).padStart(2, '0'); if (window.parent && window.parent !== window) { try { parent.postMessage({ sb: 'progress', v }, '*'); } catch {} } };
const nextFrame = () => new Promise((res) => (CAPTURE ? setTimeout(res, 0) : requestAnimationFrame(() => res())));

// ---------- renderer ----------
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, alpha: false, powerPreference: MOBILE ? 'default' : 'high-performance' });
renderer.setPixelRatio(Math.min(Math.max(1, window.devicePixelRatio || 1), 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
ui.stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(INK);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

// lights (mood lerps per spread)
const key = new THREE.DirectionalLight('#fff', 2.6), fill = new THREE.DirectionalLight('#fff', 0.8), sky = new THREE.HemisphereLight('#fff', '#888', 0.5);
key.castShadow = true; const SHADOW = MOBILE ? 1024 : 2048; key.shadow.mapSize.set(SHADOW, SHADOW);
Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 110 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
scene.add(key, key.target, fill, fill.target, sky);
const DAY = { bg: '#1C1916', key: '#ffe6c8', keyI: 2.7, keyDir: [-0.75, 0.95, 0.5], fill: '#f2dcc2', fillI: 0.8, sky: '#fff0da', ground: '#b39a78', skyI: 0.5, leak: '#8a5a34', wrap: 0.3, exposure: 1.0, trans: 0.3, transTint: '#ffb070' };
const mood = { ...DAY, col: {} };
function applyMood(m) {
  key.color.set(m.key); key.intensity = m.keyI; fill.color.set(m.fill); fill.intensity = m.fillI;
  sky.color.set(m.sky); sky.groundColor.set(m.ground); sky.intensity = m.skyI;
  const d = new THREE.Vector3(...m.keyDir).normalize(); key.position.copy(d.multiplyScalar(60)); key.target.position.set(0, 0, 0);
  fill.position.set(25, 30, 60);
  PAPER_LIGHT.leak.value.set(m.leak); PAPER_LIGHT.wrap.value = m.wrap; PAPER_LIGHT.trans.value = m.trans; PAPER_LIGHT.transTint.value.set(m.transTint);
  renderer.toneMappingExposure = m.exposure;
}
const lerpMood = (a, b, k) => { const o = {}; for (const kk in a) { if (typeof a[kk] === 'number') o[kk] = a[kk] + (b[kk] - a[kk]) * k; else if (Array.isArray(a[kk])) o[kk] = a[kk].map((v, i) => v + (b[kk][i] - v) * k); else o[kk] = '#' + new THREE.Color(a[kk]).lerp(new THREE.Color(b[kk]), k).getHexString(); } return o; };

const paper = paperTextures(renderer, { color: PAPER, seed: 7, unitsPerTile: 7 });

// ---------- the book body ----------
const book = new THREE.Group(); scene.add(book);
const sheetTex = (() => { const t = new THREE.CanvasTexture(paperSheet({ size: 512, color: '#e9e1d2', seed: 3 })); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
// page block edges: fine page lines
const edgeTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#ece4d4'; g.fillRect(0, 0, 8, 128);
  for (let y = 0; y < 128; y += 3) { g.fillStyle = `rgba(120,100,80,${0.12 + Math.random() * 0.1})`; g.fillRect(0, y, 8, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const clothTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#26211d'; g.fillRect(0, 0, 256, 256);
  const r = rng(4); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,240,220' : '0,0,0'},${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; })();
const boardMat = new THREE.MeshLambertMaterial({ map: clothTex, color: '#ffffff' });
const blockMat = new THREE.MeshLambertMaterial({ map: edgeTex });
// boards
const boardL = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.9, 0.32, PD + 1.2), boardMat); boardL.position.set(-PW / 2 - 0.25, -STACK - 0.16, 0);
const boardR = boardL.clone(); boardR.position.x = PW / 2 + 0.25;
const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, PD + 1.2, 24, 1, true, Math.PI / 2, Math.PI), boardMat); spine.rotation.x = Math.PI / 2; spine.rotation.z = 0; spine.position.set(0, -STACK - 0.3, 0); spine.rotation.y = 0;
// page blocks (the stacks under each page)
const blockGeo = new THREE.BoxGeometry(PW, STACK, PD);
const blockL = new THREE.Mesh(blockGeo, blockMat); blockL.position.set(-PW / 2, -STACK / 2 - 0.004, 0);
const blockR = new THREE.Mesh(blockGeo, blockMat); blockR.position.set(PW / 2, -STACK / 2 - 0.004, 0);
for (const m of [boardL, boardR, blockL, blockR]) { m.castShadow = true; m.receiveShadow = true; }
book.add(boardL, boardR, blockL, blockR);
// table: a soft shadow catcher in ink
const table = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ color: '#000', opacity: 0.45 }));
table.rotation.x = -Math.PI / 2; table.position.y = -STACK - 0.33; table.receiveShadow = true; scene.add(table);

// ---------- page surfaces ----------
function pageMat(tex) { const m = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' }); return m; }
function halves(canvas) {
  const mk = (x0) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.repeat.set(0.5, 1); t.offset.set(x0, 0); return t; };
  return { L: mk(0), R: mk(0.5) };
}
// gutter shading overlay, shared by both static pages
const gutterTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 4; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(20,14,8,0.10)'); gr.addColorStop(0.04, 'rgba(20,14,8,0)'); gr.addColorStop(0.9, 'rgba(20,14,8,0)'); gr.addColorStop(0.97, 'rgba(20,14,8,0.22)'); gr.addColorStop(1, 'rgba(20,14,8,0.45)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 4); const t = new THREE.CanvasTexture(c); return t; })();
const pageGeoL = new THREE.PlaneGeometry(PW, PD); pageGeoL.rotateX(-Math.PI / 2); pageGeoL.translate(-PW / 2, 0, 0);
const pageGeoR = new THREE.PlaneGeometry(PW, PD); pageGeoR.rotateX(-Math.PI / 2); pageGeoR.translate(PW / 2, 0, 0);
boardL.visible = blockL.visible = false;
const pageL = new THREE.Mesh(pageGeoL, pageMat(null)); pageL.receiveShadow = true; pageL.position.y = 0.03;
const pageR = new THREE.Mesh(pageGeoR, pageMat(null)); pageR.receiveShadow = true;
const gutMatL = new THREE.MeshBasicMaterial({ map: gutterTex, transparent: true, depthWrite: false });
const gutMatR = gutMatL.clone(); gutMatR.map = gutterTex.clone(); gutMatR.map.repeat.x = -1; gutMatR.map.offset.x = 1; gutMatR.map.wrapS = THREE.RepeatWrapping; gutMatR.map.needsUpdate = true;
const gutL = new THREE.Mesh(pageGeoL, gutMatL); gutL.position.y = 0.036; gutL.renderOrder = 2;
const gutR = new THREE.Mesh(pageGeoR, gutMatR); gutR.position.y = 0.006; gutR.renderOrder = 2;
book.add(pageL, pageR, gutL, gutR);

// ---------- the turning leaf (bends as it turns) ----------
const SEG = 40;
const leafGeo = new THREE.PlaneGeometry(PW, PD, SEG, 1); leafGeo.rotateX(-Math.PI / 2); leafGeo.translate(PW / 2, 0, 0);
const leafBase = leafGeo.attributes.position.array.slice();
const leafFront = new THREE.Mesh(leafGeo, new THREE.MeshLambertMaterial({ side: THREE.FrontSide }));
const leafBack = new THREE.Mesh(leafGeo, new THREE.MeshLambertMaterial({ side: THREE.BackSide }));
leafFront.castShadow = leafBack.castShadow = true; leafFront.receiveShadow = leafBack.receiveShadow = true;
const leaf = new THREE.Group(); leaf.add(leafFront, leafBack); leaf.visible = false; book.add(leaf);
function bendLeaf(theta, dir) {    // theta 0 (lying right) .. PI (lying left); dir +1 forward, -1 back
  const pos = leafGeo.attributes.position.array, n = SEG + 1, ds = PW / SEG;
  const lag = 0.55 * Math.sin(theta);
  const xs = [0], ys = [0];
  for (let i = 1; i < n; i++) {
    const u = i / SEG; let a = theta - dir * lag * u * u * 1.4;
    a = Math.min(Math.PI - 0.002, Math.max(0.002, a));
    xs.push(xs[i - 1] + Math.cos(a) * ds); ys.push(ys[i - 1] + Math.sin(a) * ds);
  }
  for (let j = 0; j < pos.length / 3; j++) {
    const i = j % n; pos[j * 3] = xs[i]; pos[j * 3 + 1] = ys[i] + 0.045 + 0.03 * Math.sin(theta); pos[j * 3 + 2] = leafBase[j * 3 + 2];
  }
  leafGeo.attributes.position.needsUpdate = true; leafGeo.computeVertexNormals();
}
function flipTex(t) { const f = t.clone(); f.wrapS = f.wrapT = THREE.RepeatWrapping; f.repeat.set(-t.repeat.x, -t.repeat.y); f.offset.set(t.offset.x + t.repeat.x, t.offset.y + t.repeat.y); f.needsUpdate = true; return f; }
function setLeafTextures(frontTex, backTex) {
  leafFront.material.map = frontTex; leafFront.material.needsUpdate = true;
  const b = backTex.clone(); b.repeat.x = -backTex.repeat.x; b.offset.x = backTex.offset.x + backTex.repeat.x; b.wrapS = THREE.RepeatWrapping; b.needsUpdate = true;
  leafBack.material.map = b; leafBack.material.needsUpdate = true;
}

// ---------- the cover (a stiff board that swings open over the gutter) ----------
function coverCanvas() {
  const S = 64, c = document.createElement('canvas'); c.width = (PW + 0.9) * S; c.height = (PD + 1.2) * S; const g = c.getContext('2d');
  g.fillStyle = g.createPattern(clothTex.image, 'repeat'); g.fillRect(0, 0, c.width, c.height);
  const r = rng(9);
  // a printed ink-wash mountain band at the foot, cut paper
  g.fillStyle = 'rgba(243,238,230,0.07)';
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, c.height); for (let x = 0; x <= c.width; x += 8) g.lineTo(x, c.height * (0.78 - k * 0.06) - Math.abs(Math.sin(x * 0.006 + k * 1.3)) * 140 * (1 + k * 0.3) - Math.sin(x * 0.02 + k) * 12); g.lineTo(c.width, c.height); g.fill(); }
  // title slip
  const lw = 3.2 * S, lh = 13.5 * S, lx = c.width - lw - 1.6 * S, ly = 1.8 * S;
  g.fillStyle = PAPER; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 6; rr(g, lx, ly, lw, lh, 16); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(28,25,22,0.6)'; g.lineWidth = 3; rr(g, lx + 14, ly + 14, lw - 28, lh - 28, 10); g.stroke();
  g.fillStyle = INK; g.font = `${2.1 * S}px ZMX, "Ma Shan Zheng", KaiTi, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...'云游绘本'].forEach((ch, i) => g.fillText(ch, lx + lw / 2, ly + 1.9 * S + i * 2.45 * S));
  g.fillStyle = VERM; rr(g, lx + lw / 2 - 0.85 * S, ly + lh - 2.35 * S, 1.7 * S, 1.7 * S, 12); g.fill();
  g.fillStyle = PAPER; g.font = `${0.66 * S}px MSZ, KaiTi, serif`; g.fillText('多', lx + lw / 2, ly + lh - 1.86 * S); g.fillText('美', lx + lw / 2, ly + lh - 1.12 * S);
  g.fillStyle = 'rgba(243,238,230,0.55)'; g.font = `${0.55 * S}px MSZ, KaiTi, serif`; g.textAlign = 'left';
  g.fillText('桂林 · 江南 · 小院　立体绘本', 1.6 * S, c.height - 1.6 * S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const coverPivot = new THREE.Group(); coverPivot.position.set(0, 0.02, 0); book.add(coverPivot);
const coverGeo = new THREE.BoxGeometry(PW + 0.9, 0.32, PD + 1.2); coverGeo.translate((PW + 0.9) / 2, 0.16, 0);
const endpaperMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
const coverTopMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
const coverMesh = new THREE.Mesh(coverGeo, [boardMat, boardMat, coverTopMat, endpaperMat, boardMat, boardMat]);
coverMesh.castShadow = coverMesh.receiveShadow = true; coverPivot.add(coverMesh);
const innerGeo = new THREE.PlaneGeometry(PW, PD); innerGeo.rotateX(Math.PI / 2); innerGeo.translate(PW / 2, -0.004, 0);
const innerMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
const inner = new THREE.Mesh(innerGeo, innerMat); inner.receiveShadow = true; coverPivot.add(inner);
endpaperMat.color.set('#e9e1d2');

// ---------- water sheen (for the spread that asks for it) ----------
function makeSheen(maskCanvas) {
  const t = new THREE.CanvasTexture(maskCanvas);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMask: { value: t }, uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D uMask; uniform float uT, uK;
      void main(){ float m = texture2D(uMask, vUv).r; vec2 p = vUv*vec2(40.,26.);
        float s = sin(p.y*7.0 + sin(p.x*0.7 + uT*0.45)*1.6 + sin(p.x*2.3 - uT*0.3)*0.35 + uT*0.35);
        float w = smoothstep(0.93, 1.0, s) * (0.35 + 0.65*smoothstep(0.2, 1.0, sin(p.x*0.33 - uT*0.25 + p.y*0.2)*0.5+0.5));
        gl_FragColor = vec4(vec3(0.62,0.68,0.8)*w*m*0.3*uK, 1.); }` });
  const g = new THREE.PlaneGeometry(PW * 2, PD); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.position.y = 0.01; mesh.renderOrder = 3; return mesh;
}

// ---------- spreads ----------
const spreads = [];   // { meta, api, tex: {L,R}, frameReady }
async function loadModuleSpread(i, onProgress) {
  const meta = SPREADS[i];
  const mod = await import(meta.mod);
  await document.fonts.ready;
  const api = await mod.build({ paper, yieldFn: nextFrame, progress: onProgress, meta });
  const canvas = (mod.groundFor ? mod.groundFor(meta) : mod.groundCanvas());
  api.group.visible = false; book.add(api.group);
  // cross-doors between chapters, and drop doors that lead to pages not shipped in this build
  const MORE = MORE_DIVES[meta.id] || {}; const used = new Set();
  const fixHot = (h) => { if (!h) return h; if (h.dive && SPREADS.findIndex((x) => x.id === h.dive) < 0) { const { dive, ...rest } = h; return { ...rest, line: rest.line.replace(/点进去[^。]*。?/, '').trim() || rest.line }; }
    const m = MORE[h.title]; if (m && !h.dive && !used.has(h.title)) { used.add(h.title); return { ...h, dive: m[0], line: h.line + m[1] }; } return h; };
  for (const p of api.pieces) p.hot = fixHot(p.hot);
  for (const m of api.extraHots || []) m.userData.hot = fixHot(m.userData.hot);
  QUEST[meta.id] = new Set([...api.pieces.map((p) => p.hot && p.hot.title), ...(api.extraHots || []).map((m) => m.userData.hot && m.userData.hot.title)].filter(Boolean));
  for (const p of api.pieces) { p.h.group.userData.piece = p; addRing(api, p.hot, () => ringPos(p)); }
  for (const m of api.extraHots || []) { m.userData.piece = { hot: m.userData.hot, mesh: m, extra: true }; addRing(api, m.userData.hot, () => m.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.9, 0.3)), m); }
  const sheen = makeSheen((mod.riverMask || mod.waterMask)()); api.group.add(sheen); api.sheen = sheen;
  return { api, tex: halves(canvas) };
}
const MORE_DIVES = {};   // cross-doors between Guilin chapters go here
const ART = {};
async function loadImg(src) { if (ART[src]) return ART[src]; return ART[src] = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
function placeholderCanvas(meta, img) {
  const S = 64, c = document.createElement('canvas'); c.width = PW * 2 * S; c.height = PD * S; const g = c.getContext('2d');
  g.fillStyle = g.createPattern(paperSheet({ size: 512, color: PAPER, seed: 5 + meta.title.length }), 'repeat'); g.fillRect(0, 0, c.width, c.height);
  // his painting, tipped in on the right page with a deckled paper mount
  if (img) { const w = PW * S * 0.84, h = w * img.height / img.width, x = PW * S + PW * S * 0.08, y = (c.height - h) / 2 - 1.2 * S;
    g.save(); g.shadowColor = 'rgba(60,40,20,0.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = '#fbf8f2'; rr(g, x - 18, y - 18, w + 36, h + 36, 14); g.fill(); g.restore();
    g.save(); rr(g, x, y, w, h, 8); g.clip(); g.drawImage(img, x, y, w, h); g.restore();
    g.fillStyle = 'rgba(28,25,22,0.5)'; g.font = `${0.62 * S}px MSZ, KaiTi, serif`; g.textAlign = 'right'; g.fillText(meta.line, x + w, y + h + 1.4 * S); }
  // left page: vertical brush title and seal
  g.fillStyle = INK; g.font = `${2.4 * S}px ZMX, "Ma Shan Zheng", KaiTi, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...meta.title].forEach((ch, i) => g.fillText(ch, PW * S * 0.62, 5.0 * S + i * 2.8 * S));
  g.fillStyle = VERM; rr(g, PW * S * 0.62 - 0.85 * S, 16.6 * S, 1.7 * S, 1.7 * S, 12); g.fill();
  g.fillStyle = PAPER; g.font = `${0.66 * S}px MSZ, KaiTi, serif`; [...meta.place].forEach((ch, i) => g.fillText(ch, PW * S * 0.62, 17.1 * S + i * 0.74 * S));
  g.fillStyle = 'rgba(28,25,22,0.38)'; g.font = `${0.5 * S}px MSZ, KaiTi, serif`; g.fillText('立体页制作中', PW * S * 0.62, 20.4 * S);
  return c;
}

// ---------- interaction: hotspots, intro cards, actions, nested dives ----------
const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 30, 64, 64, 62); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.7, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(64, 64, 9, 0, 6.28); g.fill(); return new THREE.CanvasTexture(c); })();
const rings = [];
function ringPos(p) { const w = new THREE.Vector3(); p.h.group.getWorldPosition(w); w.y += 0.28 * Math.max(0.35, p.h.p || 0); w.z += 0.22; return w; }
// ---- game layer: discoveries, cues, feedback ----
const QUEST = {}; const FOUND = {}; let lastTapT = 0; let cueTarget = null;
const qEl = document.getElementById('quest'), toastEl = document.getElementById('toast'), cueEl = document.getElementById('cue');
function questUI(pop) {
  const id = SPREADS[cur] && SPREADS[cur].id; if (!id || !QUEST[id]) { qEl.classList.remove('on'); return; }
  const tot = Object.values(QUEST).reduce((a, q) => a + q.size, 0), got = Object.values(FOUND).reduce((a, f) => a + f.size, 0);
  const here = QUEST[id].size, hf = (FOUND[id] || new Set()).size;
  qEl.innerHTML = `<b>寻景</b><span>${hf}<i>/${here}</i></span><u style="--k:${(hf / here).toFixed(3)}"></u><small>全书 ${got}/${tot}</small>` + (guideOn ? `<button type="button" class="skip" id="guideSkip">退出导览</button>` : '');
  qEl.classList.add('on'); if (pop) { qEl.classList.remove('pop'); void qEl.offsetWidth; qEl.classList.add('pop'); }
}
let toastT = 0;
function toast(html) { toastEl.innerHTML = html; toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on'); toastT = clock.t; }
function persistFinds() {
  try { const o = {}; for (const id in FOUND) o[id] = [...FOUND[id]]; localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch {}
}
function restoreFinds() {
  try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); for (const id of Object.keys(o)) FOUND[id] = new Set(o[id]); } catch {}
}
function discover(hot) {
  lastTapT = clock.t; const id = SPREADS[cur].id; const f = FOUND[id] || (FOUND[id] = new Set());
  if (f.has(hot.title)) return; f.add(hot.title); persistFinds(); questUI(true); trail();
  const done = QUEST[id] && f.size >= QUEST[id].size;
  toast(done ? `<em>印</em>${SPREADS[cur].title} · 全部寻到` : `<em>${hot.dive ? '门' : hot.food ? '食' : '景'}</em>发现 · ${hot.title}<i>+1</i>`);
}
function paintAlbum() {
  const box = document.getElementById('album'); if (!box) return;
  const rows = [];
  const tot = Object.values(QUEST).reduce((a, q) => a + q.size, 0);
  const got = Object.values(FOUND).reduce((a, f) => a + f.size, 0);
  rows.push(`<p class="sum">已寻 ${got} / 全书 ${tot}。点过的亮着，没点过的还淡着，等你走进去。</p>`);
  for (const s of SPREADS) {
    const q = QUEST[s.id]; if (!q || !q.size) continue;
    const f = FOUND[s.id] || new Set();
    rows.push(`<h5>${s.title}<small>${[...q].filter((t) => f.has(t)).length}/${q.size}</small></h5>`);
    rows.push('<p>' + [...q].map((title) => `<i class="${f.has(title) ? 'got' : ''}">${title}</i>`).join('') + '</p>');
  }
  box.innerHTML = '<div class="sheet"><button type="button" class="x" aria-label="关闭图鉴">关闭</button><em>图鉴</em>' + (rows.join('') || '<p>翻开绘本，靠近发光处看看景物，一层层走进去。</p>') + '</div>';
}
function toggleAlbum() {
  const box = document.getElementById('album'); if (!box) return;
  const on = !box.classList.contains('on');
  if (on) paintAlbum();
  box.classList.toggle('on', on);
}
let guideOn = false;
function setGuide(on) {
  guideOn = !!on; cueTarget = null; if (cueEl) cueEl.classList.remove('on');
  document.body.classList.toggle('guide-off', !guideOn);
  const skip = document.getElementById('guideSkip'); if (skip) skip.hidden = !guideOn;
}
function updateCue(t) {
  if (toastEl.classList.contains('on') && t - toastT > 2.2) toastEl.classList.remove('on');
  // 导览不再强行指路或弹出「点这里」；光圈只在靠近时由 updateRings 亮起
  if (!guideOn || !cueEl) { if (cueEl) cueEl.classList.remove('on'); cueTarget = null; return; }
  cueEl.classList.remove('on');
  cueTarget = null;
}
function addRing(api, hot, posFn, obj) {
  if (!hot) return; const dive = !!hot.dive;
  if (!dive && !hot.food && rings.filter((r) => r.api === api).length > 18) return;
  const m = new THREE.SpriteMaterial({ map: ringTex, color: dive ? '#ff6a4a' : hot.food ? '#ffd27a' : '#ffffff', transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
  const sp = new THREE.Sprite(m); sp.renderOrder = 20; sp.scale.setScalar(dive ? 1.5 : 0.9); scene.add(sp); rings.push({ api, sp, posFn, dive, obj, hot, ph: Math.random() * 6 });
}
function updateRings(t) {
  const px = lastPtr.x, py = lastPtr.y, cx = innerWidth / 2, cy = innerHeight * 0.46;
  for (const r of rings) { const s = spreads.find((x) => x && x.api === r.api); const on = s && s.api.group.visible && (s.rev || 0) > 0.9 && !diving && !card.classList.contains('on');
    if (!on) { r.sp.visible = false; r.near = 0; continue; }
    r.sp.position.copy(r.posFn());
    const v = r.sp.position.clone().project(camera);
    const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
    const behind = v.z > 1;
    const dPtr = Math.hypot(sx - px, sy - py), dCam = Math.hypot(sx - cx, sy - cy);
    const dist = Math.min(dPtr, dCam);
    const want = behind ? 0 : Math.max(0, Math.min(1, (220 - dist) / 140));
    r.near = (r.near || 0) + (want - (r.near || 0)) * 0.16;
    if (r.near < 0.04) { r.sp.visible = false; continue; }
    r.sp.visible = true;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + r.ph);
    const zoom = 0.82 + 0.22 * Math.sin(t * 1.6 + r.ph * 0.7);
    const fd = FOUND[s.meta ? s.meta.id : ''] || FOUND[SPREADS[cur] && SPREADS[cur].id];
    const seen = fd && r.hot && fd.has(r.hot.title) ? 0.45 : 1;
    r.sp.material.opacity = Math.min(1, r.near * seen * (r.dive ? 0.7 + 0.3 * pulse : 0.4 + 0.25 * pulse));
    r.sp.scale.setScalar((r.dive ? 1.35 : 0.78) * zoom); }
}
const card = document.getElementById('intro');
let cardTimer = 0;
function showCard(hot, x, y) {
  discover(hot); if (lastHit && lastHit.point) panGoal = lastHit.point.x; card.querySelector('h4').textContent = hot.title; card.querySelector('p').textContent = hot.line;
  card.querySelector('em').textContent = hot.dive ? '入画' : hot.food ? '风物 · 吃食' : '景物';
  const go = card.querySelector('button.go'); if (go) { go.hidden = !hot.dive; go.onclick = (e) => { e.stopPropagation(); hideCard(); dive(hot); }; }
  const W = innerWidth, H = innerHeight, cw = Math.min(300, W - 32);
  card.style.left = Math.max(16, Math.min(W - cw - 16, x - cw / 2)) + 'px'; card.style.top = Math.max(70, Math.min(H - 230, y - 190)) + 'px'; card.style.width = cw + 'px';
  card.classList.add('on'); clearTimeout(cardTimer); cardTimer = 0;
}
function hideCard() { card.classList.remove('on'); panGoal = null; clearTimeout(cardTimer); }
const burst = [];
function leaves(p, color = '#b8432c') {
  const at = ringPos(p); const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, transparent: true });
  const nLeaf = MOBILE ? 10 : 26;
  for (let i = 0; i < nLeaf; i++) { const m = new THREE.Mesh(leafShapeGeo, mat.clone()); m.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 1.2, (Math.random() - 0.5) * 1.2));
    m.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 1.2, -0.6 - Math.random() * 0.8, (Math.random() - 0.2) * 0.8), w: Math.random() * 6, life: 2.6 + Math.random() }; scene.add(m); burst.push(m); }
}
const leafShapeGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.14, 0.12, 0, 0.32); s.quadraticCurveTo(-0.14, 0.12, 0, 0); return new THREE.ShapeGeometry(s); })();
function updateBurst(dt) { for (let i = burst.length - 1; i >= 0; i--) { const m = burst[i], d = m.userData; d.life -= dt; m.position.addScaledVector(d.v, dt); m.position.x += Math.sin(clock.t * 2 + d.w) * dt * 0.8; m.rotation.set(clock.t * 2 + d.w, clock.t * 1.3, d.w);
  if (m.position.y < 0.05) { m.position.y = 0.05; d.v.set(0, 0, 0); } m.material.opacity = Math.min(1, d.life); if (d.life <= 0) { scene.remove(m); burst.splice(i, 1); } } }
const glows = [];
function act(p, hot) {
  const t = clock.t;
  if (hot.act === 'sail') p.boostUntil = t + 3.2;
  if (hot.act === 'light') { p.mesh.traverse((o) => { if (o.userData.setGlow) glows.push({ o, t0: t }); }); }
  if (hot.act === 'leaves') leaves(p, hot.color);
  if (hot.act === 'spin') { const m = p.mesh; const r0 = m.rotation.y; tween(1.1, (k) => { m.rotation.y = r0 + ease(k) * Math.PI * 2; }); }
  if (p.h && p.h.spring) { p.h.spring.v -= 2.2; p.h.spring.atRest = false; }   // every tap: the card dips and springs back
}
function updateGlows() { for (let i = glows.length - 1; i >= 0; i--) { const g = glows[i], k = clock.t - g.t0; g.o.userData.setGlow(1.3 + 4 * Math.exp(-k * 0.8)); if (k > 6) glows.splice(i, 1); } }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(cx, cy) {
  const s = spreads[cur]; if (!s || !s.api || (s.rev || 0) < 0.5) return null;
  const r = el.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObject(s.api.group, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.piece) o = o.parent; if (o && o.userData.piece && o.userData.piece.hot && (o.userData.piece.extra || o.userData.piece.h.p > 0.6)) return { p: o.userData.piece, point: h.point }; }
  return null;
}
function tap(cx, cy) {
  const hit = pick(cx, cy);
  if (!hit) { hideCard(); return false; }
  lastHit = hit; act(hit.p, hit.p.hot); showCard(hit.p.hot, cx, cy); return true;
}
let lastHit = null;
// ---- the dive: the camera falls into a picture, the picture becomes the page ----
const stack = [];              // spread indices we dived out of
let diving = false;
const iris = document.getElementById('iris');
function setIris(k, x = innerWidth / 2, y = innerHeight / 2) {   // k 0 = open, 1 = closed (paper covers the screen)
  const R = Math.hypot(innerWidth, innerHeight) * (1 - k);
  iris.style.setProperty('--x', x + 'px'); iris.style.setProperty('--y', y + 'px'); iris.style.setProperty('--r', R + 'px'); iris.style.opacity = k > 0.001 ? 1 : 0;
}

// ---- zoom trail: the picture-in-picture levels as cascading inset frames (第N层) ----
const trailEl = document.getElementById('trail');
const SNAP = {};            // spread index -> { url, hints: [{ x, y, t, dive, food }] } (normalised screen coords at snapshot time)
const FROM = {};            // child spread index -> { x, y } normalised point in the parent's view it was entered from
let snapWant = -1, snapAt = 0;
const snapCv = document.createElement('canvas');
function wantSnap(i, delay = 2.4) { snapWant = i; snapAt = clock.t + delay; }
function takeSnap() {
  const i = snapWant; snapWant = -1; const s = spreads[i]; if (!s || !s.api) return;
  // crop to the open book itself (pages + pop-up height), centred, so the thumbnail isn't off to one side
  const src = renderer.domElement, SW = src.width, SH = src.height;
  let x0 = SW, y0 = SH, x1 = 0, y1 = 0;
  for (const [x, y, z] of [[-PW, 0, -PD / 2], [PW, 0, -PD / 2], [-PW, 0, PD / 2], [PW, 0, PD / 2], [-PW, 7, -PD / 2], [PW, 7, -PD / 2], [0, 9, -PD / 2]]) { const v = new THREE.Vector3(x, y, z).project(camera); const px = (v.x + 1) / 2 * SW, py = (1 - v.y) / 2 * SH; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(SW, x1); y1 = Math.min(SH, y1);
  let cw = (x1 - x0) * 1.04, ch = (y1 - y0) * 1.04; if (!(cw > 40 && ch > 40)) { cw = SW; ch = SH; }
  if (cw / ch < FR_ASP) cw = ch * FR_ASP; else ch = cw / FR_ASP;
  cw = Math.min(cw, SW); ch = Math.min(ch, SH);
  const cx = Math.max(0, Math.min(SW - cw, (x0 + x1) / 2 - cw / 2)), cy = Math.max(0, Math.min(SH - ch, (y0 + y1) / 2 - ch / 2));
  const w = 420, h = Math.round(w * ch / cw);
  snapCv.width = w; snapCv.height = h; snapCv.getContext('2d').drawImage(src, cx, cy, cw, ch, 0, 0, w, h);
  const hints = rings.filter((r) => r.api === s.api && r.hot).map((r) => { const v = r.posFn().project(camera); return { x: ((v.x + 1) / 2 * SW - cx) / cw, y: ((1 - v.y) / 2 * SH - cy) / ch, t: r.hot.title, dive: !!r.dive, food: !!r.hot.food }; })
    .filter((p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98);
  SNAP[i] = { url: snapCv.toDataURL('image/jpeg', 0.74), hints, asp: cw / ch }; trail();
}
const FR_ASP = 1.62;        // frames are 16:10-ish; thumbnails are cover-cropped into them
function trailGeom(n) {
  const W = innerWidth, H = innerHeight, mob = W < 760;
  if (mob) { const fw = Math.min(W - 40, 340), fh = fw / FR_ASP, dy = Math.min(fh * 0.74, (H - 190 - fh) / Math.max(1, n - 1)); return { fw, fh, dx: 0, dy, x0: (W - fw) / 2, y0: 104 }; }
  const fw = n > 1 ? Math.min(300, W * 0.23) : Math.min(210, W * 0.17), fh = fw / FR_ASP, dx = fw * 0.15, dy = Math.min(fh * 0.8, (H - 150 - fh) / Math.max(1, n - 1));
  return { fw, fh, dx, dy, x0: W - 18 - fw - (n - 1) * dx, y0: 64 };
}
function mapPt(p, snap, fw, fh) {      // normalised screen point -> px inside a cover-cropped frame
  const A = snap ? snap.asp : innerWidth / innerHeight;
  if (A < FR_ASP) { const ih = fw / A; return [p.x * fw, (fh - ih) / 2 + p.y * ih]; }
  const iw = fh * A; return [(fw - iw) / 2 + p.x * iw, p.y * fh];
}
function trail() {
  if (!trailEl) return; const here = SPREADS[cur]; if (cur < 0 || !here) { trailEl.classList.remove('on'); return; }
  const lv = [...stack, cur], n = lv.length, g = trailGeom(n), mob = innerWidth < 760;
  trailEl.classList.add('on'); trailEl.classList.toggle('deep', n > 1);
  let html = '', svg = '';
  lv.forEach((si, k) => {
    const m = SPREADS[si], sn = SNAP[si], x = g.x0 + k * g.dx, y = g.y0 + k * g.dy, isCur = k === n - 1;
    const f = FOUND[m.id] || new Set();
    let inner = `<img src="${sn ? sn.url : `img/thumb/${m.id}.webp`}" alt="">`;
    if (sn) for (const h of sn.hints) { if (f.has(h.t)) continue; const [hx, hy] = mapPt(h, sn, g.fw, g.fh); if (hx < 0 || hx > g.fw || hy < 0 || hy > g.fh) continue;
      inner += `<b class="hint${h.dive ? ' door' : h.food ? ' food' : ''}" style="left:${hx.toFixed(1)}px;top:${hy.toFixed(1)}px"></b>`; }
    const child = lv[k + 1];
    if (child !== undefined) { const p = FROM[child] || { x: 0.5, y: 0.5 }; const [cx, cy] = mapPt(p, sn, g.fw, g.fh); const rw = g.fw * 0.22, rh = g.fh * 0.26;
      const rx = Math.max(2, Math.min(g.fw - rw - 2, cx - rw / 2)), ry = Math.max(2, Math.min(g.fh - rh - 2, cy - rh / 2));
      inner += `<s class="from" style="left:${rx.toFixed(1)}px;top:${ry.toFixed(1)}px;width:${rw.toFixed(1)}px;height:${rh.toFixed(1)}px"></s>`;
      const nx = g.x0 + (k + 1) * g.dx, ny = g.y0 + (k + 1) * g.dy;   // guide lines: rect corners -> child frame corners
      svg += `<line x1="${x + rx}" y1="${y + ry + rh}" x2="${nx}" y2="${ny}"/><line x1="${x + rx + rw}" y1="${y + ry + rh}" x2="${nx + g.fw}" y2="${ny}"/>`; }
    const q = QUEST[m.id]; const prog = q && q.size ? `<u>${f.size}/${q.size}</u>` : '';
    html += `<div class="fr${isCur ? ' cur' : ''}" data-k="${k}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${g.fw.toFixed(1)}px;height:${g.fh.toFixed(1)}px;z-index:${k + 1}">${inner}<em>${m.title}</em>${prog}${isCur ? '<strong>你在这里</strong>' : ''}</div>`;
  });
  const chipSn = SNAP[cur];
  trailEl.innerHTML = `<svg class="guides">${svg}</svg>${html}<button class="up"${stack.length ? '' : ' hidden'}>↶ 返回</button>`
    + `<button class="chip"><img src="${chipSn ? chipSn.url : `img/thumb/${here.id}.webp`}" alt=""><b>${here.title}</b><i>▾</i></button>`;
  if (mob && !trailEl.classList.contains('open')) trailEl.classList.add('chiponly'); else trailEl.classList.remove('chiponly');
}
async function jumpLevel(k) {
  trailEl.classList.remove('open'); const lv = [...stack, cur]; if (k < 0 || k >= lv.length - 1 || busy || diving) { trail(); return; }
  busy = true; const target = lv[k]; stack.length = k; await swapTo(target, new THREE.Vector3(0, 0, 0)); busy = false;
}
if (trailEl) {
  trailEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  trailEl.addEventListener('click', (e) => { e.stopPropagation();
    if (e.target.closest('.up')) { trailEl.classList.remove('open'); back(); return; }
    if (e.target.closest('.chip')) { trailEl.classList.toggle('open'); trail(); return; }
    const fr = e.target.closest('.fr'); if (fr) jumpLevel(+fr.dataset.k); });
  addEventListener('resize', () => trail());
}
async function swapTo(next, focus, sx, sy) {
  diving = true; resetPan(); hideCard(); iris.style.background = getComputedStyle(iris).backgroundColor;   // hold the old paper colour while closed: no theme flash
  const a = spreads[cur]; const b = await ensure(next);
  const f0 = anim.focus.clone(); const tgt = focus || new THREE.Vector3();
  await tween(1.1, (k) => { const e = ease(k); anim.zoom = e; anim.focus.copy(f0).lerp(tgt, e); setIris(Math.max(0, (k - 0.45) / 0.55) ** 1.4, sx, sy); });
  if (a.api) { a.api.group.visible = false; for (const p of a.api.pieces) p.h.reset(0); a.rev = 0; a.api.setReveal(0); }
  cur = next; showSpreadStatic(cur); b.api.group.visible = true; for (const p of b.api.pieces) p.h.reset(0); b.rev = 0;
  moodFrom = spreadMood(cur); moodTo = moodFrom; moodK = 1; setNav();
  anim.focus.set(0, 0, 0);
  raise(cur); revealTo(cur, 1, 2.0);
  await tween(1.2, (k) => { const e = ease(k); anim.zoom = 1 - e; setIris(1 - e); });
  setIris(0); iris.style.background = ''; diving = false; crumbs(); trail();
}
async function dive(hot) {
  if (busy || diving) return; const next = SPREADS.findIndex((m) => m.id === hot.dive); if (next < 0 || next === cur || stack.includes(next)) return;
  busy = true; stack.push(cur);
  const focus = lastHit ? lastHit.point.clone() : new THREE.Vector3();
  const v = focus.clone().project(camera); FROM[next] = { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; await swapTo(next, focus, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight); busy = false;
}
async function back() { if (busy || diving || !stack.length) return; busy = true; const prev = stack.pop(); await swapTo(prev, new THREE.Vector3(0, 0, 0)); busy = false; }
function crumbs() {
  const cb = document.getElementById('crumbs');
  if (!stack.length) { cb.classList.remove('on'); ui.nav.classList.toggle('show', cur >= 0); return; }
  const names = [...stack, cur].map((i) => SPREADS[i] && SPREADS[i].title);
  cb.querySelector('span').innerHTML = names.length > 2
    ? names.map((n) => `<i>${n}</i>`).join('<b>›</b>')
    : names.map((n, i) => `<i>${i ? '画中 · ' : ''}${n}</i>`).join('<b>›</b>');
  cb.classList.add('on'); ui.nav.classList.remove('show');
}
document.getElementById('back').addEventListener('click', () => back());

// ---------- state & choreography ----------
let cur = -1;               // -1 = cover closed; 0..n-1 = open at spread
let busy = false;
const anim = { coverT: 0, coverTarget: 0, camX: PW / 2, zoom: 0, focus: new THREE.Vector3(), panX: 0, shift: 0 };
let panGoal = null;   // portrait: world x the camera should keep in frame (the tapped piece / the hinted piece)
const clock = { t: 0 };
const tweens = [];
const tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res }));
const wait = (s) => tween(s, () => {});
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function showSpreadStatic(i) {
  const s = spreads[i];
  pageL.material.map = s.tex.L; pageL.material.needsUpdate = true; pageR.material.map = s.tex.R; pageR.material.needsUpdate = true;
}
const LIGHT = { ...DAY, bg: '#e4dccf' };
function spreadMood(i) { return (spreads[i] && spreads[i].api && spreads[i].api.mood) || (SPREADS[i] && SPREADS[i].light ? LIGHT : DAY); }
let moodFrom = DAY, moodTo = DAY, moodK = 1;
function goMood(m) { moodFrom = lerpMood(moodFrom, moodTo, moodK); moodTo = m; moodK = 0; }

async function raise(i, side = 0) {        // pop pieces up, from the gutter outward
  const s = spreads[i]; if (!s || !s.api) return;
  s.api.group.visible = true;
  for (const p of s.api.pieces) { if (side && Math.sign(p.x || 1) !== side) continue; p.h.set(1, 0.08 + Math.abs(p.x) * 0.045 + (p.z + 13) * 0.008); }
}
async function lower(i) {
  const s = spreads[i]; if (!s || !s.api) return;
  for (const p of s.api.pieces) p.h.set(0, (20 - Math.abs(p.x)) * 0.012);
  await wait(0.75);
}
function revealTo(i, v, dur = 1.2) { const s = spreads[i]; if (!s || !s.api) return; const from = s.rev || 0; return tween(dur, (k) => { s.rev = from + (v - from) * k; s.api.setReveal(s.rev); }); }

// keep only the few most recently visited spreads built; drop the rest (geometry, materials, textures, rings) and rebuild on demand
const USED = {}; const KEEP = Math.min(innerWidth, innerHeight) < 760 ? 3 : 4;
function disposeObj(o) { o.traverse((n) => { if (n.geometry) n.geometry.dispose(); const ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : []; for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) v.dispose(); } m.dispose(); } }); }
function evict() {
  if (busy) { setTimeout(evict, 1500); return; }
  const built = spreads.map((s, i) => [s, i]).filter(([s, i]) => s && s.api && !s.pending && i !== cur && !s.api.group.visible);
  const n = spreads.filter((s) => s && s.api).length; if (n <= KEEP) return;
  built.sort((a, b) => (USED[a[1]] || 0) - (USED[b[1]] || 0));
  for (const [s, i] of built.slice(0, n - KEEP)) {
    book.remove(s.api.group); disposeObj(s.api.group); s.tex.L.dispose(); s.tex.R.dispose();
    for (let k = rings.length - 1; k >= 0; k--) if (rings[k].api === s.api) { scene.remove(rings[k].sp); rings[k].sp.material.dispose(); rings.splice(k, 1); }
    spreads[i] = undefined;
  }
}
async function ensure(i) {
  USED[i] = clock.t;
  if (spreads[i]) { if (spreads[i].pending) await spreads[i].pending; return spreads[i]; }
  const meta = SPREADS[i];
  if (meta.mod) { const p = loadModuleSpread(i, () => {}); spreads[i] = { meta, pending: p }; Object.assign(spreads[i], await p); delete spreads[i].pending; }
  else { spreads[i] = { meta, tex: halves(placeholderCanvas(meta, await loadImg(meta.art))), api: null }; }
  return spreads[i];
}
async function probeFrame(s) {
  try { const r = await fetch(s.meta.src, { method: 'GET', cache: 'no-store' }); s.frameReady = r.ok; } catch { s.frameReady = false; }
}
function hideFrame() { ui.frame.classList.remove('on'); document.body.classList.remove('light'); setTimeout(() => { if (!ui.frame.classList.contains('on')) ui.frame.src = 'about:blank'; }, 600); }
function showFrame(s) {
  if (!s.frameReady) return;
  ui.frame.onload = () => { if (SPREADS[cur] !== s.meta) return; ui.frame.classList.add('on'); document.body.classList.add('light'); };
  ui.frame.src = s.meta.src + '?embed=1&t=' + Date.now();
}

async function openBook() {
  if (busy || cur !== -1) return; busy = true; resetPan();
  const s = await ensure(0);
  ui.open.classList.add('gone');
  // inside of the cover is the first spread's left page
  innerMat.map = flipTex(s.tex.L); innerMat.needsUpdate = true;
  showSpreadStatic(0); pageL.visible = false; gutL.visible = false;
  s.api.group.visible = true; goMood(spreadMood(0));
  wait(0.7).then(() => { raise(0, 1); revealTo(0, 1, 2.4); });
  await tween(1.7, (k) => { anim.coverT = ease(k);  });
  inner.visible = false; pageL.visible = true; gutL.visible = true; raise(0, -1);
  cur = 0; setNav(); busy = false;
}
function raiseLater(i, at) { wait(at).then(() => { raise(i); revealTo(i, 1, 2.2); }); }

async function turn(dir) {
  if (busy || diving) return; if (stack.length) { stack.length = 0; crumbs(); } if (cur === -1) { if (dir > 0) openBook(); return; }
  const nxt = turnTarget(cur, dir); if (nxt === cur) return;
  busy = true; resetPan(); hideFrame(); hideCard();
  const a = await ensure(cur), b = await ensure(nxt);
  if (a.api) { revealTo(cur, 0, 0.6); await lower(cur); }
  // leaf: forward = current right page lifts and lands on the left showing next's left; back = mirror
  if (dir > 0) { setLeafTextures(a.tex.R, b.tex.L); pageR.material.map = b.tex.R; }
  else { setLeafTextures(b.tex.R, a.tex.L); pageL.material.map = b.tex.L; }
  pageR.material.needsUpdate = pageL.material.needsUpdate = true;
  leaf.visible = true; goMood(spreadMood(nxt));
  if (b.api) { b.api.group.visible = true; }
  let raisedFar = false;
  await tween(1.35, (k) => {
    const e = ease(k), th = dir > 0 ? e * Math.PI : (1 - e) * Math.PI; bendLeaf(th, dir);
    if (!raisedFar && k > 0.55 && b.api) { raisedFar = true; raise(nxt, dir > 0 ? 1 : -1); revealTo(nxt, 1, 2.0); }
  });
  leaf.visible = false; if (a.api) a.api.group.visible = false;
  cur = nxt; showSpreadStatic(cur);
  if (b.api) raise(cur, dir > 0 ? -1 : 1);
  setNav(); busy = false;
}

// ---------- camera, framing, orbit ----------
const orbit = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
const pan = { x: 0, y: 0, vx: 0, vy: 0 };
const userZoom = { val: 1, target: 1, min: 0.62, max: 1.75 };
const clOrbit = (v, a, b) => Math.max(a, Math.min(b, v));
const PANX = 11.6, PANY = 3.6;
function clampPan() {
  const extra = Math.max(0, userZoom.val - 1);
  const mx = PANX + extra * 9.5;
  const my = PANY + extra * 5.2;
  if (pan.x > mx) { pan.x = mx; if (pan.vx > 0) pan.vx = 0; }
  if (pan.x < -mx) { pan.x = -mx; if (pan.vx < 0) pan.vx = 0; }
  if (pan.y > my) { pan.y = my; if (pan.vy > 0) pan.vy = 0; }
  if (pan.y < -my) { pan.y = -my; if (pan.vy < 0) pan.vy = 0; }
}
function resetPan() { pan.x = pan.y = pan.vx = pan.vy = 0; userZoom.target = 1; }
const gyro = { on: false, sb: 0, sg: 0, baseB: null, baseG: null, got: false, timer: 0 };
function onOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  gyro.got = true;
  if (gyro.baseB == null) gyro.baseB = e.beta;
  if (gyro.baseG == null) gyro.baseG = e.gamma;
  const db = Math.max(-20, Math.min(20, e.beta - gyro.baseB));
  const dg = Math.max(-20, Math.min(20, e.gamma - gyro.baseG));
  gyro.sb += (db - gyro.sb) * 0.16;
  gyro.sg += (dg - gyro.sg) * 0.16;
}
async function setTilt(on) {
  const btn = document.getElementById('tilt');
  clearTimeout(gyro.timer);
  if (!on) {
    gyro.on = false; gyro.baseB = null; gyro.baseG = null; gyro.sb = 0; gyro.sg = 0; gyro.got = false;
    window.removeEventListener('deviceorientation', onOrientation, true);
    if (btn) { btn.classList.remove('on'); btn.textContent = '开启体感'; }
    return;
  }
  if (typeof DeviceOrientationEvent === 'undefined') {
    if (btn) btn.hidden = true;
    return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') { if (btn) btn.textContent = '未允许体感'; return; }
    }
    gyro.baseB = null; gyro.baseG = null; gyro.sb = 0; gyro.sg = 0; gyro.got = false;
    window.addEventListener('deviceorientation', onOrientation, true);
    gyro.on = true;
    if (btn) { btn.classList.add('on'); btn.textContent = '体感已开'; }
    gyro.timer = setTimeout(() => {
      if (gyro.on && !gyro.got) {
        setTilt(false);
        if (btn) btn.textContent = '无传感器';
      }
    }, 1800);
  } catch (_) { if (btn) btn.textContent = '无法开启'; }
}
function frame() {
  const w = ui.stage.clientWidth, h = ui.stage.clientHeight; const asp = w / h; const portrait = asp < 0.9;
  renderer.setSize(w, h, false); camera.aspect = asp;
  camera.fov = portrait ? 34 : 28; camera.updateProjectionMatrix();
  return { portrait, asp };
}
let view = frame();
window.addEventListener('resize', () => { view = frame(); });
const _lblW = new THREE.Vector3(), _lblC = new THREE.Vector3(), _camRight = new THREE.Vector3(), _camUp = new THREE.Vector3();
function avoidLabelOverlap() {
  const labels = [];
  for (const s of spreads) {
    if (!s || !s.api || !s.api.group || !s.api.group.visible) continue;
    s.api.group.traverse((o) => { if (o.isSprite && o.userData && o.userData.tag) labels.push(o); });
  }
  if (!labels.length) return;
  camera.updateMatrixWorld();
  _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const upProj = Math.max(0.35, Math.abs(_camUp.y));
  const rightProj = Math.max(0.35, Math.abs(_camRight.x));
  const W = renderer.domElement.clientWidth || innerWidth;
  const H = renderer.domElement.clientHeight || innerHeight;
  const halfTan = Math.tan((camera.fov * Math.PI / 180) * 0.5);

  labels.forEach((o) => {
    o.position.x = o.userData.baseX ?? 0;
    if (o.userData.baseY != null) o.position.y = o.userData.baseY;
    o.updateMatrixWorld(true);
  });

  const measure = (item) => {
    const o = item.o;
    o.updateMatrixWorld(true);
    o.getWorldPosition(_lblW);
    const dist = Math.max(1, -_lblW.clone().applyMatrix4(camera.matrixWorldInverse).z);
    const worldPerPx = (2 * dist * halfTan) / Math.max(1, H);
    _lblC.copy(_lblW).addScaledVector(_camUp, o.scale.y * 0.5);
    const v = _lblC.project(camera);
    item.visible = v.z >= -1 && v.z <= 1;
    item.cx = (v.x + 1) * 0.5 * W;
    item.cy = (1 - v.y) * 0.5 * H;
    item.bw = (o.scale.x / worldPerPx) + 8;
    item.bh = (o.scale.y / worldPerPx) + 8;
    item.worldPerPx = worldPerPx;
  };

  const items = labels.map((o) => {
    const it = { o, visible: true, cx: 0, cy: 0, bw: 0, bh: 0, worldPerPx: 0.05 };
    measure(it);
    return it;
  }).filter((it) => it.visible);
  if (items.length < 2) return;

  const signX = _camRight.x >= 0 ? 1 : -1;
  for (let pass = 0; pass < 8; pass++) {
    let any = false;
    items.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const ox = (a.bw + b.bw) * 0.5 - Math.abs(a.cx - b.cx);
        const oy = (a.bh + b.bh) * 0.5 - Math.abs(a.cy - b.cy);
        if (ox <= 0 || oy <= 0) continue;
        any = true;
        // Separate cleanly without crossing: lift upper label further up in world +Y, or the second if nearly level
        const lift = (b.cy - a.cy) < 6 ? b : a;
        const dyWorld = ((oy + 2) * lift.worldPerPx) / upProj;
        const maxY = (lift.o.userData.baseY ?? 2) + 4.8;
        lift.o.position.y = Math.min(maxY, lift.o.position.y + dyWorld);
        const dir = a.cx <= b.cx ? -1 : 1;
        const nudgePx = Math.min(ox * 0.28, 16);
        const baseXA = a.o.userData.baseX ?? 0, baseXB = b.o.userData.baseX ?? 0;
        a.o.position.x = Math.max(baseXA - 2.2, Math.min(baseXA + 2.2, a.o.position.x + (nudgePx * a.worldPerPx) / rightProj * dir * signX));
        b.o.position.x = Math.max(baseXB - 2.2, Math.min(baseXB + 2.2, b.o.position.x - (nudgePx * b.worldPerPx) / rightProj * dir * signX));
        measure(a);
        measure(b);
      }
    }
    if (!any) break;
  }
}
function placeCamera() {
  const { portrait, asp } = view;
  const open = cur >= 0 || anim.coverT > 0.02 ? 1 : 0;
  const tx = (1 - anim.coverT) * PW / 2;                      // closed book sits on the right half
  const gOn = gyro.on && !down && !pinch;
  const gyroYaw = gyro.on ? clOrbit((gyro.sg / 20) * 0.26, -0.26, 0.26) : 0;
  const gyroPitch = gyro.on ? clOrbit((gyro.sb / 20) * 0.14, -0.14, 0.14) : 0;
  const pitch = clOrbit((portrait ? 58 + 5 * anim.coverT : 46) * Math.PI / 180 + orbit.pitch + gyroPitch, 0.32, 1.42);
  // fit: open spread (42 wide) or closed book (22 wide) in the frame's width, plus room for the pop-up height
  // portrait: the open book is cropped to ~20 of its 42 units so it fills the tall screen; panning shows the rest
  const spanW = portrait ? 22 - 2 * anim.coverT : 22 + 17.5 * anim.coverT;
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
  let dist = (spanW / 2) / Math.tan(hf / 2) * (portrait ? 1.04 : 1.0);
  const dH = (PD + 10) / 2 / Math.tan(vf / 2) * 0.78; dist = Math.max(dist, dH * (portrait ? 0.62 : 1.0));
  dist /= userZoom.val;
  // free pan stays where released; gyro adds subtle pan + real 3D camera yaw/pitch parallax
  const gx = gOn ? clOrbit((gyro.sg / 20) * 1.35, -1.35, 1.35) : 0;
  const gy = gOn ? clOrbit((-gyro.sb / 20) * 0.85, -0.85, 0.85) : 0;
  const panX = anim.coverT * (pan.x + gx);
  const panY = anim.coverT * (pan.y + gy);
  const target = new THREE.Vector3(tx + panX, (portrait ? 4.2 - 1.4 * anim.coverT : 1.6) + panY, portrait ? 0.2 + 0.6 * anim.coverT : 1.2);
  const yaw = (portrait ? orbit.yaw * 0.15 : orbit.yaw) + gyroYaw;
  if (anim.zoom > 0) { target.lerp(anim.focus, anim.zoom); dist *= 1 - 0.84 * anim.zoom; }
  dist *= 1 + anim.shift / Math.max(1, innerWidth) * 1.1;
  camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(target);
  // desktop: when the zoom trail is open on the right, slide the book left so the frames don't cover it
  const vw = renderer.domElement.clientWidth || innerWidth, vh = renderer.domElement.clientHeight || innerHeight;
  if (anim.shift > 0.5) camera.setViewOffset(vw, vh, anim.shift, 0, vw, vh); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
}

// pointer: 1-finger free pan with inertia (stays where released); 2-finger pinch zoom + midpoint pan; desktop wheel zoom.
let down = null;
let pinch = null;
let pinchUsed = false;
const activePointers = new Map();
const lastPtr = { x: innerWidth / 2, y: innerHeight / 2 };
const el = renderer.domElement;
const DRAG_MIN = 8;
el.addEventListener('pointerdown', (e) => {
  lastPtr.x = e.clientX; lastPtr.y = e.clientY;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { el.setPointerCapture(e.pointerId); } catch {}
  if (activePointers.size === 1) {
    pinch = null; pinchUsed = false;
    const wasOn = card.classList.contains('on');
    if (wasOn && !card.contains(e.target)) { hideCard(); }
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), panX: pan.x, panY: pan.y, yaw: orbit.ty, pitch: orbit.tp, hid: wasOn, moved: false, lt: performance.now() };
    pan.vx = pan.vy = 0;
    el.classList.add('drag');
  } else if (activePointers.size === 2) {
    pinchUsed = true; down = null; pan.vx = pan.vy = 0;
    const pts = [...activePointers.values()];
    const dist0 = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
    pinch = { dist0, zoom0: userZoom.target, midX0: (pts[0].x + pts[1].x) * 0.5, midY0: (pts[0].y + pts[1].y) * 0.5, panX0: pan.x, panY0: pan.y };
  }
});
el.addEventListener('pointermove', (e) => {
  lastPtr.x = e.clientX; lastPtr.y = e.clientY;
  if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size >= 2 && pinch) {
    const pts = [...activePointers.values()];
    const dist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
    const midX = (pts[0].x + pts[1].x) * 0.5, midY = (pts[0].y + pts[1].y) * 0.5;
    const nextZ = clOrbit(pinch.zoom0 * (dist / pinch.dist0), userZoom.min, userZoom.max);
    userZoom.target = nextZ;
    userZoom.val += (nextZ - userZoom.val) * 0.45;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    const worldW = (view.portrait ? 22 : 34) / userZoom.val, worldH = worldW * (h / w);
    pan.x = pinch.panX0 - ((midX - pinch.midX0) / w) * worldW;
    pan.y = pinch.panY0 + ((midY - pinch.midY0) / h) * worldH * 0.5;
    clampPan();
    return;
  }
  if (!down || down.id !== e.pointerId) return;
  const dxPx = e.clientX - down.x, dyPx = e.clientY - down.y;
  if (Math.hypot(dxPx, dyPx) > DRAG_MIN) down.moved = true;
  if (!down.moved) return;
  const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
  const worldW = (view.portrait ? 22 : 34) / userZoom.val, worldH = worldW * (h / w);
  // content moves with the finger
  const nx = down.panX - (dxPx / w) * worldW;
  const ny = down.panY + (dyPx / h) * worldH * 0.5;
  const now = performance.now(), dt = Math.max(8, now - down.lt);
  pan.vx = (nx - pan.x) / (dt / 1000);
  pan.vy = (ny - pan.y) / (dt / 1000);
  down.lt = now;
  pan.x = nx; pan.y = ny; clampPan();
  if (!view.portrait) {
    orbit.ty = clOrbit(down.yaw + (dxPx / w) * 0.35, -0.45, 0.45);
    orbit.tp = clOrbit(down.pitch - (dyPx / h) * 0.25, -0.16, 0.14);
  }
});
function endPointer(e, isCancel) {
  activePointers.delete(e.pointerId);
  try { el.releasePointerCapture(e.pointerId); } catch {}
  if (activePointers.size === 1) {
    // Seamlessly transition back to 1-finger pan without jump
    pinch = null;
    const [[remId, remPos]] = activePointers.entries();
    down = { id: remId, x: remPos.x, y: remPos.y, t: performance.now(), panX: pan.x, panY: pan.y, yaw: orbit.ty, pitch: orbit.tp, hid: false, moved: true, lt: performance.now() };
    pan.vx = pan.vy = 0;
    return;
  }
  if (activePointers.size > 1) return;
  pinch = null;
  el.classList.remove('drag');
  if (!isCancel && down && !pinchUsed) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const touch = e.pointerType === 'touch'; const hid = down.hid; const moved = down.moved || Math.hypot(dx, dy) >= DRAG_MIN;
    if (!moved) {
      if (cur === -1) openBook();
      else {
        const wasCard = card.classList.contains('on') || hid;
        const hit = tap(e.clientX, e.clientY);
        if (!wasCard && !hit && !stack.length && !EMBED && !touch) turn(e.clientX > el.clientWidth / 2 ? 1 : -1);
      }
    }
  }
  down = null;
  pinchUsed = false;
}
el.addEventListener('pointerup', (e) => endPointer(e, false));
el.addEventListener('pointercancel', (e) => endPointer(e, true));
el.addEventListener('wheel', (e) => {
  if (EMBED || cur < 0) return;
  e.preventDefault();
  const stepZ = Math.max(-0.18, Math.min(0.18, -e.deltaY * 0.0014));
  userZoom.target = clOrbit(userZoom.target * Math.exp(stepZ), userZoom.min, userZoom.max);
  clampPan();
}, { passive: false });
window.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === ' ') turn(1); if (e.key === 'ArrowLeft') turn(-1); });
window.addEventListener('message', (e) => { if (e.data && e.data.type === 'storybook:turn') turn(e.data.dir > 0 ? 1 : -1); });
ui.open.addEventListener('click', () => openBook());
document.getElementById('prev').addEventListener('click', () => turn(-1));
document.getElementById('next').addEventListener('click', () => turn(1));
function goToChapter(to) {
  (async () => {
    if (cur === -1) await openBook();
    while (!busy && !diving && cur !== to && turnTarget(cur, to > cur ? 1 : -1) !== cur) await turn(to > cur ? 1 : -1);
  })();
}
function mountNav() {
  ui.nav.querySelectorAll('[data-go]').forEach((b) => b.remove());
  const next = document.getElementById('next');
  SPREADS.forEach((s, i) => {
    if (!s.chapter) return;
    const b = document.createElement('button'); b.dataset.go = String(i); b.textContent = s.place;
    b.addEventListener('click', () => goToChapter(i));
    ui.nav.insertBefore(b, next);
  });
}
function setNav() { setTimeout(trail, 0); if (cur >= 0) { wantSnap(cur); USED[cur] = clock.t; setTimeout(evict, 1500); } setTimeout(() => questUI(false), 0);
  document.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', +b.dataset.go === cur));
  const chapter = SPREADS[cur] && SPREADS[cur].chapter;
  document.getElementById('prev').disabled = cur <= 0 || !chapter; document.getElementById('next').disabled = !chapter || cur >= lastChapterIndex();
  ui.nav.classList.toggle('show', cur >= 0 && !stack.length);
  const meta = SPREADS[cur];
  document.body.classList.toggle('light', !!(meta && meta.light));
  document.body.dataset.theme = meta ? meta.id : 'cover'; if (EMBED) parent.postMessage({ sb: 'theme', id: document.body.dataset.theme }, '*');
  if (meta) ui.cap.innerHTML = `<b>${meta.place}</b><span>${meta.title}</span>`;
}

// ---------- loop ----------
function step(dt) {
  clock.t += dt;
  for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tweens.splice(i, 1); tw.res(); } }
  coverPivot.rotation.z = anim.coverT * Math.PI;
  if (moodK < 1) { moodK = Math.min(1, moodK + dt / 1.4); }
  const m = lerpMood(moodFrom, moodTo, ease(moodK)); applyMood(m); scene.background.set(m.bg);
  // keep orbit / pan where the user left them; inertia then clamp; no auto-recenter
  userZoom.val += (userZoom.target - userZoom.val) * Math.min(1, dt * 10);
  if (Math.abs(userZoom.target - userZoom.val) < 0.0005) userZoom.val = userZoom.target;
  if (!down && !pinch) {
    pan.x += pan.vx * dt; pan.y += pan.vy * dt;
    pan.vx *= Math.exp(-dt * 4.4); pan.vy *= Math.exp(-dt * 4.4);
    if (Math.abs(pan.vx) < 0.15) pan.vx = 0;
    if (Math.abs(pan.vy) < 0.15) pan.vy = 0;
    clampPan();
  }
  orbit.yaw += (orbit.ty - orbit.yaw) * Math.min(1, dt * 8);
  orbit.pitch += (orbit.tp - orbit.pitch) * Math.min(1, dt * 8);
  for (const s of spreads) if (s && s.api && s.api.group.visible) { s.api.update(clock.t, dt); if (s.api.sheen) { s.api.sheen.material.uniforms.uT.value = clock.t; s.api.sheen.material.uniforms.uK.value = s.rev || 0; } }
  updateRings(clock.t); updateCue(clock.t); updateBurst(dt); updateGlows();
  { const deep = stack.length > 0 && !view.portrait && innerWidth >= 760; const want = deep ? Math.min(300, innerWidth * 0.23) * 0.6 : 0;
    anim.shift += (want - anim.shift) * Math.min(1, dt * 2.5); }
  placeCamera();
  avoidLabelOverlap();
  renderer.render(scene, camera);
  if (snapWant >= 0 && clock.t >= snapAt && !diving && !busy) takeSnap();
}
let last = performance.now();
let paused = false;
document.addEventListener('visibilitychange', () => { paused = document.hidden; });
window.addEventListener('message', (e) => { const d = e.data || {}; if (d.sb === 'pause') paused = !!d.v; if (d.sb === 'open') openBook(); if (d.sb === 'go' && cur >= 0 && !busy && !diving && d.i !== cur) turn(d.i > cur ? 1 : -1); if (d.sb === 'orbit') { orbit.ty = d.y; orbit.tp = d.p || 0; } });
let fpsN = 0, fpsT = 0; window.__fps = 0;
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!paused) { step(dt); fpsN++; fpsT += dt; if (fpsT > 1) { window.__fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; } } requestAnimationFrame(loop); }

// ---------- boot (lazy: the book shell first, spreads on demand) ----------
(async function boot() {
  setProgress(0.05);
  await document.fonts.load('80px ZMX', '云游绘本漓江夜游'); await document.fonts.load('40px MSZ', '多美桂林');
  coverTopMat.map = coverCanvas(); coverTopMat.needsUpdate = true;
  setProgress(0.15); await nextFrame();
  // build the first spread behind the loader so the cover opens straight into it
  const meta = SPREADS[0];
  spreads[0] = { meta, ...(await loadModuleSpread(0, (v) => setProgress(0.15 + v * 0.8))) };
  innerMat.map = flipTex(spreads[0].tex.L); innerMat.needsUpdate = true; showSpreadStatic(0); pageL.visible = false; gutL.visible = false;
  // pre-compile
  spreads[0].api.group.visible = true; renderer.compile(scene, camera); spreads[0].api.group.visible = false;
  setProgress(1); await nextFrame();
  ui.loader.classList.add('done');
  mountNav(); restoreFinds();
  qEl.addEventListener('click', (e) => { if (e.target.closest('.skip')) { e.stopPropagation(); setGuide(false); return; } toggleAlbum(); });
  const album = document.getElementById('album'); if (album) {
    album.addEventListener('click', (e) => { if (e.target.id === 'album' || e.target.closest('.x')) toggleAlbum(); });
  }
  const introX = card && card.querySelector('.x'); if (introX) introX.addEventListener('click', (e) => { e.stopPropagation(); hideCard(); });
  if (card) {
    let swipeY = null;
    card.addEventListener('pointerdown', (e) => { if (e.target.closest('button.go')) return; swipeY = e.clientY; });
    card.addEventListener('pointermove', (e) => { if (swipeY != null && Math.abs(e.clientY - swipeY) > 48) { hideCard(); swipeY = null; } });
    card.addEventListener('pointerup', () => { swipeY = null; });
    card.addEventListener('pointercancel', () => { swipeY = null; });
  }
  const tiltBtn = document.getElementById('tilt');
  if (tiltBtn) {
    tiltBtn.hidden = !(MOBILE && typeof DeviceOrientationEvent !== 'undefined');
    tiltBtn.addEventListener('click', (e) => { e.stopPropagation(); setTilt(!gyro.on); });
  }
  const skip = document.getElementById('guideSkip'); if (skip) skip.addEventListener('click', (e) => { e.stopPropagation(); setGuide(false); });
  // phones: don't prefetch every chapter up front (that was a multi-MB hitch)
  if (!MOBILE) setTimeout(() => { SPREADS.map((m, i) => (m.chapter && i > 0 ? i : -1)).filter((i) => i > 0).reduce((p, i) => p.then(() => ensure(i)), Promise.resolve()); }, 800);
  const FX = [];
  window.__book = { mem() { return JSON.stringify(renderer.info.memory) + " built=" + spreads.filter((s) => s && s.api).length; }, snaps() { return Object.keys(SNAP).map((i) => [SPREADS[i].id, SNAP[i].url]); }, tapAt(x, y) { return tap(x, y); }, tapHot(id, title) { const s = spreads[cur]; const p = s.api.pieces.find((q) => q.hot && q.hot.title === title) || (s.api.extraHots || []).map((m) => m.userData.piece).find((q) => q.hot.title === title); if (!p) return 'none'; const w = p.extra ? p.mesh.getWorldPosition(new THREE.Vector3()) : ringPos(p); const v = w.clone().project(camera); const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight; lastHit = { p, point: w }; act(p, p.hot); showCard(p.hot, x, y); const fx = document.createElement('i'); fx.className = 'tapfx'; fx.style.left = x + 'px'; fx.style.top = y + 'px'; document.body.appendChild(fx); FX.push({ el: fx, t: 0, w }); return [x, y]; }, dive() { const c = card.querySelector('button.go'); if (c && !c.hidden) c.click(); }, back, cam: () => [camera.position.x.toFixed(3), camera.position.y.toFixed(3), camera.position.z.toFixed(3), anim.coverT.toFixed(3), orbit.yaw.toFixed(4)], turn, openBook, step, orbit(y, p) { orbit.ty = y; orbit.tp = p; }, get cur() { return cur; }, get busy() { return busy; } };
  { const b = window.__book; if (b) { const st = b.step; b.step = (dt) => { st(dt); for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const k = Math.min(1, f.t / 0.8); if (f.w) { const v = f.w.clone().project(camera); f.el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; f.el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; } f.el.style.transform = `scale(${0.35 + k * 1.3})`; f.el.style.opacity = String(1 - k); if (k >= 1) { f.el.remove(); FX.splice(i, 1); } } }; } }
  window.__book.jumpLevel = jumpLevel; window.__book.mmBig = (v) => { trailEl.classList.toggle('open', !!v); trail(); };
  window.__ready = true;
  if (!CAPTURE) { last = performance.now(); requestAnimationFrame(loop); if (Q.has('auto')) setTimeout(openBook, 900); }
  else step(0);
})();

