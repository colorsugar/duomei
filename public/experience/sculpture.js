import * as THREE from '/yunyou/vendor/three/three.module.js';

// A closed, twisted ribbon. Shared geometry with the offline poster renderer.
function ribbonGeometry() {
  const positions = [], indices = [], N = 320, M = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    const radius = 1.65 + .36 * Math.cos(3 * t);
    for (let j = 0; j <= M; j++) {
      const u = j / M * Math.PI * 2;
      const a = .61 * Math.cos(u), b = .065 * Math.sin(u);
      const r = a * Math.cos(2 * t) - b * Math.sin(2 * t);
      const z = a * Math.sin(2 * t) + b * Math.cos(2 * t);
      positions.push((radius + r) * Math.cos(t), (radius + r) * Math.sin(t), .48 * Math.sin(3 * t) + z);
      if (i < N && j < M) {
        const k = i * (M + 1) + j;
        indices.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function mountSculpture(canvas, { onReady, onFailure, reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 40);
  camera.position.set(0, 0, 8.7);
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#463653');
  const lamps = [];
  [[-5, 5, 4, '#fff5e3', 12, 4], [5, 0, 2, '#d5deff', 9, 2], [0, -5, -3, '#ff631c', 7, 3], [-2, 2, -4, '#efffc8', 8, 5]].forEach(([x,y,z,color,w,h]) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide}));
    panel.position.set(x,y,z); panel.lookAt(0,0,0); envScene.add(panel); lamps.push(panel);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(envScene, .04, .1, 40);
  scene.environment = environment.texture;
  const geometry = ribbonGeometry();
  const material = new THREE.MeshPhysicalMaterial({color:'#e7d4b7', metalness:.96, roughness:.19, clearcoat:1, clearcoatRoughness:.14, iridescence:.55, iridescenceIOR:1.35, side:THREE.DoubleSide});
  const sculpture = new THREE.Mesh(geometry, material); scene.add(sculpture);
  const light = new THREE.DirectionalLight('#fff0d5', 3); light.position.set(-3,5,5); scene.add(light);
  scene.add(new THREE.AmbientLight('#a197c0', .6));
  const media = matchMedia('(max-width: 768px)');
  let width = 1, height = 1, frame = 0, visible = true, paused = reduced, disposed = false;
  let pointerX = 0, pointerY = 0, x = 0, y = 0, progress = 0, time = 0, last = 0, slowFrames = 0;
  let quality = Math.min(devicePixelRatio || 1, media.matches ? 1.4 : 1.8);
  const resize = () => {
    const box = canvas.getBoundingClientRect(); width = box.width; height = box.height;
    if (!width || !height) return;
    renderer.setPixelRatio(quality); renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.position.z = camera.aspect < .9 ? 10.1 : 8.7;
    camera.updateProjectionMatrix(); draw(0);
  };
  const draw = (stamp) => {
    if (disposed) return;
    const delta = last ? Math.min(stamp - last, 80) : 16; last = stamp;
    if (!paused) time += delta * .001;
    x += (pointerX - x) * .055; y += (pointerY - y) * .055;
    sculpture.rotation.set(.28 + y * .24 + progress * .9, -.32 + x * .3 + progress * .7, -.28 + Math.sin(time * .22) * .13);
    sculpture.position.y = Math.sin(time * .65) * .08 - progress * .55;
    sculpture.scale.setScalar(1 + progress * .3);
    renderer.render(scene, camera);
    if (delta > 35 && ++slowFrames > 75 && quality > 1) {
      quality = 1; renderer.setPixelRatio(quality); renderer.setSize(width, height, false); slowFrames = 0;
    }
  };
  const tick = (stamp) => { frame = 0; if (!visible || document.hidden || paused || disposed) return; draw(stamp); frame = requestAnimationFrame(tick); };
  const sync = () => { cancelAnimationFrame(frame); frame = 0; last = 0; if (visible && !document.hidden && !paused && !disposed) frame = requestAnimationFrame(tick); };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {rootMargin:'60px'});
  observer.observe(canvas);
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const lost = event => { event.preventDefault(); paused = true; sync(); onFailure(); };
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', sync);
  resize(); onReady(); sync();
  return {
    update: (next) => { pointerX = next.x; pointerY = next.y; progress = next.progress; if (paused && visible) draw(0); },
    pause: value => { paused = value; sync(); },
    dispose: () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', sync); canvas.removeEventListener('webglcontextlost', lost); geometry.dispose(); material.dispose(); environment.dispose(); lamps.forEach(p => {p.geometry.dispose();p.material.dispose();}); pmrem.dispose(); renderer.dispose(); },
  };
}

window.duomeiSculpture = { mountSculpture };
