import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { createLabelUI } from './labels.js';
import { bindUI } from './ui.js';
import { heightAt } from './colliders.js';

const mobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = !mobile;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = mobile ? 0.95 : 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1420, mobile ? 0.0028 : 0.0022);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 8000);

const world = await buildWorld({ scene, mobile });
world.setNight(true);
world.updateSun(0);

const player = new Player(camera, canvas, world);
player.teleport([0, 0, 22], 0, -0.12);

if (mobile) {
  player.bindTouch(document.getElementById('joystick'), document.getElementById('look-pad'));
}

const labels = createLabelUI(document.getElementById('hud'), () => {});

bindUI({
  onNight: (n) => world.setNight(n),
  onTeleport: (t) => {
    const y = heightAt(t.pos[0], t.pos[2], world.platforms, t.pos[1] ?? 0);
    player.teleport([t.pos[0], y, t.pos[2]], t.yaw, t.pitch);
  },
});

const clock = new THREE.Clock();
let raf = 0;

function frame() {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  player.update(dt);
  world.update(t);
  labels.update({ camera, player, targets: world.labelTargets });
  renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

const TELEPORTS = {
  plaza: { pos: [0, 0, 22], yaw: 0, pitch: -0.12 },
  floor1: { pos: [0, 3.05, 2], yaw: 0, pitch: -0.02 },
  stairs: { pos: [-8.8, 4.5, -1.5], yaw: 0, pitch: -0.08 },
  south: { pos: [0, 7.35, 9.2], yaw: Math.PI, pitch: -0.05 },
  gallerySouth: { pos: [0, 7.35, 9.2], yaw: Math.PI, pitch: -0.05 },
  east: { pos: [9.2, 7.35, 0], yaw: -Math.PI / 2, pitch: -0.04 },
  galleryEast: { pos: [9.2, 7.35, 0], yaw: -Math.PI / 2, pitch: -0.04 },
};

function doTeleport(name) {
  const t = TELEPORTS[name];
  if (!t) return null;
  // 用目标高度附近的平台，避免重叠平面取最高层
  const y = heightAt(t.pos[0], t.pos[2], world.platforms, t.pos[1]);
  player.teleport([t.pos[0], y, t.pos[2]], t.yaw, t.pitch);
  return { name, y, camY: camera.position.y };
}

window.__xiaoyao = {
  ready: true,
  scene,
  camera,
  player,
  world,
  THREE,
  teleport: doTeleport,
  setNight: (n) => world.setNight(!!n),
  simulateWASD: (opts) => player.simulateInput(opts),
  getCameraHeight: () => camera.position.y,
};
