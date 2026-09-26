import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { loadXiaoyaolou, setXiaoyaolouNight } from '/yunyou/src/xiaoyaolou-model.js';
import { createKarstHorizon } from '/yunyou/src/karst-horizon.js';
import { XIAOYAO_LIGHTS } from '/yunyou/src/waterfront.js';
import { LANDMARKS } from '/yunyou/data/landmarks.js';
import { buildWalkColliders, heightAt } from './colliders.js';
import { createLijiangWater } from './water-lijiang.js';
import { latLonToLocal, worldToLocal, footLocal, bearingToXZ, ORIGIN_XY } from './geo-utils.js';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, ...o });

export async function buildWorld({ scene, mobile }) {
  const { walls, platforms } = buildWalkColliders();
  const colliders = walls;

  const root = new THREE.Group();
  root.name = 'xiaoyao-world';
  scene.add(root);

  // 可走面示意（低面数）
  const walkGroup = new THREE.Group();
  walkGroup.name = 'walk-debug';
  for (const p of platforms) {
    const g = new THREE.BoxGeometry(p.x1 - p.x0, 0.08, p.z1 - p.z0);
    const m = mat(0x8a7f6a, { transparent: true, opacity: 0.12 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((p.x0 + p.x1) / 2, p.y - 0.04, (p.z0 + p.z1) / 2);
    mesh.receiveShadow = true;
    walkGroup.add(mesh);
  }
  root.add(walkGroup);

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    mat(0x5a6b52)
  );
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

  // 逍遥楼精模：子节点 matrixWorld 已按 yunyou 世界坐标烘焙且冻结，
  // 不能靠 position 挪；直接给 matrixWorld 乘平移，对齐本页原点。
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
    setXiaoyaolouNight(tower, true);
  } catch (e) {
    console.warn('逍遥楼精模加载失败', e);
  }

  const jf = footLocal('jiefangqiao');
  if (jf) {
    const bridge = await loadGlb('jiefangqiao', jf, -0.55);
    bridge.userData.isBridge = true;
  }

  const xb = latLonToLocal(25.2700731, 110.2915099);
  await loadGlb('xiangbishan-far', xb, 0, 1);

  const fb = latLonToLocal(25.2865648, 110.2993679);
  await loadGlb('fuboshan-far', fb, 0, 1);

  const qx = bearingToXZ(1050, 112);
  await loadGlb('fuboshan-far', qx, 0.2, 1.4); // 七星方向远景占位

  const pt = bearingToXZ(1150, 121);
  await loadGlb('fuboshan-far', pt, -0.3, 1.35); // 普陀方向

  const karst = createKarstHorizon({ center: new THREE.Vector3(0, 0, 80), inner: 800, outer: 4200, count: mobile ? 90 : 130 });
  root.add(karst.group);

  const water = createLijiangWater({ mobile });
  root.add(water.mesh);

  // 滨江灯柱（简化）
  const lampGroup = new THREE.Group();
  lampGroup.name = 'binjiang-lamps';
  const lampMat = mat(0x74ece2, { emissive: 0x74ece2, emissiveIntensity: 0 });
  const warmMat = mat(0xffcf83, { emissive: 0xffcf83, emissiveIntensity: 0 });
  for (const [wx, wz] of XIAOYAO_LIGHTS) {
    const [lx, lz] = worldToLocal(wx, wz);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8, 0.35), lampMat);
    pole.position.set(lx, 4, lz);
    lampGroup.add(pole);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12), lampMat);
    arch.position.set(lx, 7, lz);
    lampGroup.add(arch);
  }
  root.add(lampGroup);

  // 垛口冷白灯带、檐边灯串（示意）
  const decoLights = [];
  const eave = new THREE.PointLight(0xffc870, 0, 18);
  eave.position.set(0, 8.5, 0);
  root.add(eave);
  decoLights.push({ light: eave, night: 1.2, day: 0 });
  const battlement = new THREE.PointLight(0xd8ecff, 0, 14);
  battlement.position.set(0, 3.2, 12);
  root.add(battlement);
  decoLights.push({ light: battlement, night: 0.85, day: 0 });

  const sun = new THREE.Vector3();
  const sky = new Sky();
  sky.scale.setScalar(4500);
  root.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 2;
  skyUniforms.rayleigh.value = 1.2;

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

  const labelTargets = buildLabelTargets();

  function setBridgeNight(on) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (!m?.isMaterial) continue;
        const ns = m.userData?.nightStrength;
        if (ns != null) {
          m.emissiveIntensity = on ? ns : 0;
        }
      }
    });
    lampMat.emissiveIntensity = on ? 2.2 : 0;
    warmMat.emissiveIntensity = on ? 1.4 : 0;
  }

  let night = 1;

  return {
    root,
    colliders,
    platforms,
    labelTargets,
    water,
    sky,
    skyUniforms,
    sun,
    dir,
    hemi,
    decoLights,
    lampMat,
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
      for (const d of decoLights) d.light.intensity = on ? d.night : d.day;
      dir.intensity = on ? 0.08 : 1.05;
      hemi.intensity = on ? 0.22 : 0.55;
      scene.background = null;
      this.updateSun(0);
    },
    updateSun(el) {
      const phi = THREE.MathUtils.degToRad(88 - (night ? -8 : 28));
      const theta = THREE.MathUtils.degToRad(200);
      sun.setFromSphericalCoords(1, phi, theta);
      skyUniforms.sunPosition.value.copy(sun);
      dir.position.copy(sun).multiplyScalar(80);
      dir.target.position.set(0, 0, 0);
      dir.target.updateMatrixWorld();
    },
    update(t) {
      water.update(t, sun, night);
    },
  };
}

function buildLabelTargets() {
  const ids = [
    'jiefangqiao',
    'xiangbishan',
    'fuboshan',
    'zizhou',
    'dongxixiang',
  ];
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
    out.push({ id, name: lm.name, pos: [pos[0], 7.35, pos[1]], minYaw: null, maxYaw: null });
  }
  for (const n of named) {
    out.push({ id: n.id, name: n.name, pos: [n.pos[0], 7.35, n.pos[1]], minYaw: null, maxYaw: null });
  }
  // 二层南望解放桥、东望漓江
  out.find((l) => l.id === 'jiefangqiao').minYaw = 2.0;
  out.find((l) => l.id === 'jiefangqiao').maxYaw = -2.6;
  out.find((l) => l.id === 'lijiang').minYaw = -1.2;
  out.find((l) => l.id === 'lijiang').maxYaw = 0.6;
  return out;
}