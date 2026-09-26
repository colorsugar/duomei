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
import { latLonToLocal, bearingToXZ, ORIGIN_XY } from './geo-utils.js';
import { createLocalCity } from './city.js';
import { createNightDome } from './night-dome.js';
import { createInterior } from './interior.js';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, ...o });

/** 回廊地面标高：眼高 1.6m；楼板已挑出下檐外，不再压在瓦下。 */
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

  // 可见回廊：仅外沿窄条木地板 + 寻杖（整圈厚板会挡广场仰望）
  {
    const gy = platforms.find((p) => p.y > 6)?.y ?? 6.9;
    const deckMat = mat(0x5a4638, { roughness: 0.9 });
    const railMat = mat(0x3a2a22, { roughness: 0.85 });
    const deck = new THREE.Group();
    deck.name = 'gallery-deck';
    const outer = 16.55;
    const inner = 15.2;
    const band = (x0, x1, z0, z1) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(x1 - x0, 0.12, z1 - z0),
        deckMat
      );
      mesh.position.set((x0 + x1) / 2, gy - 0.06, (z0 + z1) / 2);
      mesh.receiveShadow = true;
      deck.add(mesh);
    };
    band(-outer, outer, inner, outer);
    band(-outer, outer, -outer, -inner);
    band(-outer, -inner, -inner, inner);
    band(inner, outer, -inner, inner);
    const railH = 1.0;
    for (const [x0, x1, z0, z1] of [
      [-outer, outer, outer, outer + 0.12],
      [-outer, outer, -outer - 0.12, -outer],
      [outer, outer + 0.12, -outer, outer],
      [-outer - 0.12, -outer, -outer, outer],
    ]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.12, x1 - x0), railH, Math.max(0.12, z1 - z0)),
        railMat
      );
      post.position.set((x0 + x1) / 2, gy + railH / 2, (z0 + z1) / 2);
      deck.add(post);
    }
    root.add(deck);
  }

  // 城市铺装底：灰 + 绿地底色（避免日景大白）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4200, 4200),
    mat(0x5e6860, { roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  root.add(ground);

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('/yunyou/vendor/three/addons/libs/draco/gltf/');
  draco.setWorkerLimit(1);
  loader.setDRACOLoader(draco);

  /** Blender 资产已是云游世界坐标：只平移 −ORIGIN，勿再叠 footLocal。 */
  async function loadWorldGlb(name, { rotateY = 0, scale = 1 } = {}) {
    const url = `/yunyou/assets/blender/${name}.glb`;
    const gltf = await loader.loadAsync(url);
    const g = gltf.scene;
    g.position.set(-ORIGIN_XY[0], 0, -ORIGIN_XY[1]);
    if (rotateY) g.rotation.y = rotateY;
    if (scale !== 1) g.scale.setScalar(scale);
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
    // 精模关掉了 matrixWorldAutoUpdate：只能 bake −ORIGIN 进 matrixWorld
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

  // 解放桥：南偏东 ≈150°、≈220m；GLB 世界坐标 + −ORIGIN
  const bridge = await loadWorldGlb('jiefangqiao');
  bridge.userData.isBridge = true;
  bridge.name = 'jiefangqiao';
  root.userData.bridge = bridge;
  // 夜景蓝紫拱灯：强化带 nightStrength 的 emissive
  bridge.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (!m?.isMaterial) continue;
      const ns = m.userData?.nightStrength;
      if (ns == null) continue;
      if (!m.emissive) continue;
      // led / arch 偏蓝紫，灯暖黄保留
      const name = (m.name || '').toLowerCase();
      if (/led|arch/.test(name)) {
        m.emissive.setHex(0x6a5cff);
        m.userData.nightStrength = Math.max(ns, 3.2);
      } else if (/lamp/.test(name)) {
        m.emissive.setHex(0xffc070);
        m.userData.nightStrength = Math.max(ns, 2.4);
      }
      m.userData.originalEmission = m.emissive.clone();
    }
  });

  // 象鼻山：南偏西 205°、1.4km（审查指定）；其余远峰跟世界坐标 GLB
  const xbsPos = bearingToXZ(1400, 205);
  const xbs = await loadWorldGlb('xiangbishan-far');
  // 若远模中心偏离指定方位，整体挪到 205°/1.4km
  {
    xbs.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(xbs);
    const c = box.getCenter(new THREE.Vector3());
    xbs.position.x += xbsPos[0] - c.x;
    xbs.position.z += xbsPos[1] - c.z;
    xbs.name = 'xiangbishan-far';
  }
  await loadWorldGlb('fuboshan-far');
  await loadWorldGlb('diecaishan-far');

  const qxLocal = latLonToLocal(25.2754513, 110.3063811);
  const qixing = await loadWorldGlb('qixing');
  qixing.scale.setScalar(0.42);
  qixing.rotation.y = 0.15;
  {
    qixing.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(qixing);
    const c = box.getCenter(new THREE.Vector3());
    qixing.position.x += qxLocal[0] - c.x;
    qixing.position.z += qxLocal[1] - c.z;
  }

  const karst = createKarstHorizon({
    center: new THREE.Vector3(0, 0, 80),
    inner: 700,
    outer: 4800,
    count: mobile ? 100 : 150,
  });
  // 顶点色峰林：略提饱和，日景不被雾洗成灰块
  karst.peaks.material.color = new THREE.Color(0xd8e0d0);
  karst.peaks.material.roughness = 0.92;
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

  const labelTargets = buildLabelTargets(platforms, bridge);

  function setBridgeNight(on) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (!m?.isMaterial) continue;
        const ns = m.userData?.nightStrength;
        if (ns != null) m.emissiveIntensity = on ? Math.max(ns, 2.2) : 0;
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
    /** 解放桥屏幕包围框（验收用） */
    bridgeScreenBox(camera, width, height) {
      const b = root.userData.bridge;
      if (!b) return null;
      b.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(b);
      const pts = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
      ];
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let any = false;
      for (const p of pts) {
        p.project(camera);
        if (p.z < -1 || p.z > 1) continue;
        const sx = (p.x * 0.5 + 0.5) * width;
        const sy = (-p.y * 0.5 + 0.5) * height;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
        any = true;
      }
      if (!any) return { inView: false };
      return {
        inView: maxX > 0 && minX < width && maxY > 0 && minY < height,
        minX: +minX.toFixed(1),
        minY: +minY.toFixed(1),
        maxX: +maxX.toFixed(1),
        maxY: +maxY.toFixed(1),
        w: +(maxX - minX).toFixed(1),
        h: +(maxY - minY).toFixed(1),
      };
    },
    setNight(on) {
      night = on ? 1 : 0;
      if (root.userData.tower) setXiaoyaolouNight(root.userData.tower, on);
      setBridgeNight(on);
      city.setNight(on);
      interior.setNight(on);
      for (const d of decoLights) d.light.intensity = on ? d.night : d.day;
      dir.intensity = on ? 0.08 : 1.45;
      hemi.intensity = on ? 0.22 : 0.95;
      // 日景略提楼体 day 态亮度，避免仰望剪影
      if (!on && root.userData.tower) {
        root.userData.tower.traverse((o) => {
          for (const m of o.material ? [].concat(o.material) : []) {
            if (!m?.userData?.prebuiltNight) continue;
            if (m.userData._dayBoosted) continue;
            m.userData._dayBoosted = true;
            m.color?.multiplyScalar?.(1.15);
            if (m.emissiveIntensity != null && m.emissiveIntensity < 0.35) {
              m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.28);
            }
          }
        });
      }
      sky.visible = !on;
      nightDome.visible = !!on;
      scene.background = on ? HORIZON_NIGHT.clone() : null;
      scene.fog.color.copy(on ? HORIZON_NIGHT : HORIZON_DAY);
      scene.fog.density = on ? (mobile ? 0.0016 : 0.0012) : mobile ? 0.0011 : 0.00085;
      water.setSkyColor(on ? HORIZON_NIGHT : new THREE.Color(0x5a9aaa));
      this.updateSun(0);
    },
    updateSun(el) {
      if (night) {
        sun.set(0.35, 0.55, 0.75).normalize();
        dir.position.set(40, 60, 80);
      } else {
        // 日景：太阳偏东南，广场仰望南立面有受光，不当剪影
        const phi = THREE.MathUtils.degToRad(90 - 38);
        const theta = THREE.MathUtils.degToRad(145);
        sun.setFromSphericalCoords(1, phi, theta);
        skyUniforms.sunPosition.value.copy(sun);
        dir.position.copy(sun).multiplyScalar(90);
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

function buildLabelTargets(platforms, bridge) {
  const gy = platforms.find((p) => p.z0 >= 8)?.y ?? 6.92;
  const ids = ['xiangbishan', 'fuboshan', 'zizhou', 'dongxixiang'];
  const named = [
    { id: 'lijiang', name: '漓江', pos: bearingToXZ(165, 180) },
    { id: 'qixing', name: '七星山', pos: bearingToXZ(1000, 112) },
    { id: 'putuo', name: '普陀山', pos: bearingToXZ(1100, 121) },
  ];
  const out = [];
  // 解放桥名牌钉在桥身中心（世界 GLB −ORIGIN 后）
  {
    bridge.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(bridge);
    const c = box.getCenter(new THREE.Vector3());
    out.push({
      id: 'jiefangqiao',
      name: '解放桥',
      pos: [c.x, Math.max(c.y, gy + 2), c.z],
      minYaw: 2.0,
      maxYaw: -2.6,
    });
  }
  // 象鼻山按 205°/1.4km
  {
    const p = bearingToXZ(1400, 205);
    out.push({ id: 'xiangbishan', name: '象鼻山', pos: [p[0], gy + 40, p[1]], minYaw: null, maxYaw: null });
  }
  for (const id of ids) {
    if (id === 'xiangbishan') continue;
    const lm = LANDMARKS.find((l) => l.id === id);
    if (!lm) continue;
    const pos = latLonToLocal(lm.lat, lm.lon);
    out.push({ id, name: lm.name, pos: [pos[0], gy, pos[1]], minYaw: null, maxYaw: null });
  }
  for (const n of named) {
    out.push({ id: n.id, name: n.name, pos: [n.pos[0], gy, n.pos[1]], minYaw: null, maxYaw: null });
  }
  out.find((l) => l.id === 'lijiang').minYaw = -1.2;
  out.find((l) => l.id === 'lijiang').maxYaw = 0.6;
  return out;
}
