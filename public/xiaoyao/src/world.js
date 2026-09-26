import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { loadXiaoyaolou, setXiaoyaolouNight } from '/yunyou/src/xiaoyaolou-model.js';
import { createKarstHorizon } from '/yunyou/src/karst-horizon.js';
import { HORIZON_DAY, HORIZON_NIGHT } from '/yunyou/src/atmosphere.js';
import { LANDMARKS } from '/yunyou/data/landmarks.js';
import { buildWalkColliders, heightAt } from './colliders.js';
import { createLijiangWater } from './water-lijiang.js';
import { latLonToLocal, worldToLocal, footLocal, bearingToXZ, ORIGIN_XY } from './geo-utils.js';
import { createLocalCity } from './city.js';
import { createNightDome } from './night-dome.js';
import { createInterior } from './interior.js';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, ...o });

/** 回廊地面：以灰瓦 mesh 下沿为参考，保证眼高 1.6m 时低于檐口且不钻进瓦面。 */
function measureGalleryFromTower(tower, platforms) {
  tower.updateMatrixWorld(true);
  let tileMinY = Infinity;
  tower.traverse((o) => {
    if (!o.isMesh) return;
    const n = `${o.name || ''} ${o.parent?.name || ''}`;
    if (!/tile|clay|grey_clay/i.test(n)) return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.min.y > 5 && b.min.y < 9) tileMinY = Math.min(tileMinY, b.min.y);
  });
  // 实测：瓦面下沿约 6.59；地面取 6.9 → 眼高 8.5，射线南望不撞瓦
  const gy = Number.isFinite(tileMinY)
    ? THREE.MathUtils.clamp(tileMinY + 0.3, 6.85, 7.05)
    : 6.9;
  for (const p of platforms) {
    if (p.y > 6 && p.y < 8.5) p.y = gy;
  }
  return gy;
}

export async function buildWorld({ scene, mobile }) {
  const { walls, platforms } = buildWalkColliders();
  const colliders = walls;

  const root = new THREE.Group();
  root.name = 'xiaoyao-world';
  scene.add(root);

  const walkGroup = new THREE.Group();
  walkGroup.name = 'walk-debug';
  walkGroup.visible = false;
  for (const p of platforms) {
    const g = new THREE.BoxGeometry(p.x1 - p.x0, 0.08, p.z1 - p.z0);
    const m = mat(0x8a7f6a, { transparent: true, opacity: 0.12 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((p.x0 + p.x1) / 2, p.y - 0.04, (p.z0 + p.z1) / 2);
    mesh.receiveShadow = true;
    walkGroup.add(mesh);
  }
  root.add(walkGroup);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(0x5a6b52));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  root.add(ground);

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('/yunyou/vendor/three/addons/libs/draco/gltf/');
  draco.setWorkerLimit(1);
  loader.setDRACOLoader(draco);

  async function loadGlb(name, [lx, lz], ry = 0, scale = 1) {
    const url = `/yunyou/assets/blender/${name}.glb`;
    const gltf = await loader.loadAsync(url);
    const g = gltf.scene;
    g.position.set(lx, 0, lz);
    g.rotation.y = ry;
    g.scale.setScalar(scale);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = !mobile;
        o.receiveShadow = true;
      }
    });
    root.add(g);
    return g;
  }

  try {
    const tower = await loadXiaoyaolou();
    const shift = new THREE.Matrix4().makeTranslation(-ORIGIN_XY[0], 0, -ORIGIN_XY[1]);
    tower.traverse((o) => {
      o.matrixWorld.premultiply(shift);
      if (o.isMesh) {
        o.castShadow = !mobile;
        o.receiveShadow = true;
      }
    });
    root.add(tower);
    root.userData.tower = tower;
    measureGalleryFromTower(tower, platforms);
    setXiaoyaolouNight(tower, true);
  } catch (e) {
    console.warn('逍遥楼精模加载失败', e);
  }

  const city = await createLocalCity({ mobile });
  root.add(city.group);

  const jf = footLocal('jiefangqiao');
  if (jf) {
    const bridge = await loadGlb('jiefangqiao', jf, -0.55);
    bridge.userData.isBridge = true;
  }

  await loadGlb('xiangbishan-far', latLonToLocal(25.2700731, 110.2915099), 0, 1);
  await loadGlb('fuboshan-far', latLonToLocal(25.2865648, 110.2993679), 0, 1);
  await loadGlb('diecaishan-far', latLonToLocal(25.2932353, 110.298895), 0, 1);

  const qx = latLonToLocal(25.2754513, 110.3063811);
  await loadGlb('qixing', qx, 0.15, 0.42);
  await loadGlb('fuboshan-far', latLonToLocal(25.2757586, 110.3073327), -0.25, 1.05);

  const karst = createKarstHorizon({
    center: new THREE.Vector3(0, 0, 80),
    inner: 800,
    outer: 4200,
    count: mobile ? 90 : 130,
  });
  root.add(karst.group);

  const water = createLijiangWater({ mobile, waterPolys: city.waterPolys });
  root.add(water.mesh);

  const interior = createInterior(root);

  const decoLights = [];
  const eave = new THREE.PointLight(0xffc870, 0, 18);
  eave.position.set(0, 9.8, 0);
  root.add(eave);
  decoLights.push({ light: eave, night: 0.55, day: 0 });
  const battlement = new THREE.PointLight(0xd8ecff, 0, 14);
  battlement.position.set(0, 3.2, 12);
  root.add(battlement);
  decoLights.push({ light: battlement, night: 0.85, day: 0 });

  const sun = new THREE.Vector3();
  const sky = new Sky();
  sky.scale.setScalar(4500);
  sky.material.fog = false;
  root.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 2;
  skyUniforms.rayleigh.value = 1.2;
  skyUniforms.mieCoefficient.value = 0.004;
  skyUniforms.mieDirectionalG.value = 0.8;

  const nightDome = createNightDome();
  nightDome.visible = true;
  root.add(nightDome);

  const hemi = new THREE.HemisphereLight(0xc8dbff, 0x3a4a32, 0.35);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffe8c8, 0);
  dir.castShadow = !mobile;
  dir.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 120;
  dir.shadow.camera.left = -40;
  dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 40;
  dir.shadow.camera.bottom = -40;
  scene.add(dir);

  const labelTargets = buildLabelTargets(platforms);

  function setBridgeNight(on) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (!m?.isMaterial) continue;
        const ns = m.userData?.nightStrength;
        if (ns != null) m.emissiveIntensity = on ? Math.max(ns, 1.8) : 0;
      }
    });
  }

  let night = 1;

  return {
    root,
    colliders,
    platforms,
    labelTargets,
    water,
    sky,
    nightDome,
    skyUniforms,
    sun,
    dir,
    hemi,
    decoLights,
    city,
    interior,
    get night() {
      return night;
    },
    feetY(x, z, fromY) {
      return heightAt(x, z, platforms, fromY);
    },
    setNight(on) {
      night = on ? 1 : 0;
      if (root.userData.tower) setXiaoyaolouNight(root.userData.tower, on);
      setBridgeNight(on);
      city.setNight(on);
      interior.setNight(on);
      for (const d of decoLights) d.light.intensity = on ? d.night : d.day;
      dir.intensity = on ? 0.08 : 1.05;
      hemi.intensity = on ? 0.22 : 0.55;
      sky.visible = !on;
      nightDome.visible = !!on;
      scene.background = on ? HORIZON_NIGHT.clone() : null;
      scene.fog.color.copy(on ? HORIZON_NIGHT : HORIZON_DAY);
      scene.fog.density = on ? (mobile ? 0.0018 : 0.0014) : mobile ? 0.0014 : 0.0010;
      water.setSkyColor(on ? HORIZON_NIGHT : HORIZON_DAY);
      this.updateSun(0);
    },
    updateSun(el) {
      if (night) {
        sun.set(0.35, 0.55, 0.75).normalize();
        dir.position.set(40, 60, 80);
      } else {
        const phi = THREE.MathUtils.degToRad(90 - 32);
        const theta = THREE.MathUtils.degToRad(200 + el * 0.02);
        sun.setFromSphericalCoords(1, phi, theta);
        skyUniforms.sunPosition.value.copy(sun);
        dir.position.copy(sun).multiplyScalar(80);
      }
      dir.target.position.set(0, 0, 0);
      dir.target.updateMatrixWorld();
    },
    update(t, camera) {
      water.update(t, sun, night);
      city.update(camera);
    },
  };
}

function buildLabelTargets(platforms) {
  const gy = platforms.find((p) => p.z0 >= 8)?.y ?? 6.92;
  const ids = ['jiefangqiao', 'xiangbishan', 'fuboshan', 'zizhou', 'dongxixiang'];
  const named = [
    { id: 'lijiang', name: '漓江', pos: bearingToXZ(180, 165) },
    { id: 'qixing', name: '七星山', pos: bearingToXZ(1000, 112) },
    { id: 'putuo', name: '普陀山', pos: bearingToXZ(1100, 121) },
  ];
  const out = [];
  for (const id of ids) {
    const lm = LANDMARKS.find((l) => l.id === id);
    if (!lm) continue;
    const pos = latLonToLocal(lm.lat, lm.lon);
    out.push({ id, name: lm.name, pos: [pos[0], gy, pos[1]], minYaw: null, maxYaw: null });
  }
  for (const n of named) {
    out.push({ id: n.id, name: n.name, pos: [n.pos[0], gy, n.pos[1]], minYaw: null, maxYaw: null });
  }
  out.find((l) => l.id === 'jiefangqiao').minYaw = 2.0;
  out.find((l) => l.id === 'jiefangqiao').maxYaw = -2.6;
  out.find((l) => l.id === 'lijiang').minYaw = -1.2;
  out.find((l) => l.id === 'lijiang').maxYaw = 0.6;
  return out;
}
