import * as THREE from 'three';
import { HORIZON_NIGHT } from '/yunyou/src/atmosphere.js';
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
scene.fog = new THREE.FogExp2(HORIZON_NIGHT.clone(), mobile ? 0.0028 : 0.0022);

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
    player.teleport([t.pos[0], resolveTeleportY(t), t.pos[2]], t.yaw, t.pitch);
  },
});

function resolveTeleportY(t) {
  const hinted = t.pos[1];
  const y = heightAt(t.pos[0], t.pos[2], world.platforms, hinted);
  // 江面等无平台点：保留显式高度，避免掉回 y=0
  if (hinted != null && Math.abs(y - hinted) > 2.5) return hinted;
  return y;
}

const clock = new THREE.Clock();
let raf = 0;

function frame() {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  player.update(dt);
  world.update(t, camera);
  labels.update({ camera, player, targets: world.labelTargets });
  renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

const GALLERY_PITCH = -0.12;
const TELEPORTS = {
  plaza: { pos: [0, 0, 22], yaw: 0, pitch: -0.12 },
  // 铜地图 + 西墙书法同框
  floor1: { pos: [-0.5, 3.05, 0.8], yaw: 1.35, pitch: -0.06 },
  stairs: { pos: [-8.8, 4.5, -1.5], yaw: 0, pitch: -0.08 },
  // 缩进檐下：z/x≈8.9，眼高≈8.5，俯望江面，瓦面压到下缘
  south: { pos: [0, 6.9, 8.9], yaw: Math.PI, pitch: GALLERY_PITCH },
  gallerySouth: { pos: [0, 6.9, 8.9], yaw: Math.PI, pitch: GALLERY_PITCH },
  east: { pos: [8.9, 6.9, 0], yaw: -Math.PI / 2, pitch: GALLERY_PITCH },
  galleryEast: { pos: [8.9, 6.9, 0], yaw: -Math.PI / 2, pitch: GALLERY_PITCH },
  riverNight: { pos: [38, 6.2, 78], yaw: Math.atan2(38, 78), pitch: -0.03 },
};

function doTeleport(name) {
  const t = TELEPORTS[name];
  if (!t) return null;
  const y = resolveTeleportY(t);
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
