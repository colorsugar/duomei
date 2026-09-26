import * as THREE from 'three';

function mat(c, o = {}) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, ...o });
}

function calligraphyTexture(title, lines) {
  const w = 1024;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe4';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3a2f28';
  g.lineWidth = 6;
  g.strokeRect(40, 40, w - 80, h - 80);
  g.fillStyle = '#1a1410';
  g.textAlign = 'center';
  g.font = 'bold 72px "STKaiti", "KaiTi", serif';
  g.fillText(title, w / 2, 120);
  g.font = '42px "STKaiti", "KaiTi", serif';
  let y = 220;
  for (const line of lines) {
    g.fillText(line, w / 2, y);
    y += 64;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 一层大厅陈设 + 楼前碑亭 */
export function createInterior(root) {
  const group = new THREE.Group();
  group.name = 'xiaoyao-interior';

  const floorY = 3.05;
  const copper = mat(0xb87333, { metalness: 0.55, roughness: 0.62 });
  const stone = mat(0x8a8580, { roughness: 0.94 });
  const wood = mat(0x4a3528, { roughness: 0.88 });

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 2.8), stone);
  pedestal.position.set(-2.5, floorY + 0.28, -1.2);
  pedestal.castShadow = true;
  group.add(pedestal);
  const mapRelief = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.4), copper);
  mapRelief.position.set(-2.5, floorY + 0.62, -1.2);
  group.add(mapRelief);
  for (let i = 0; i < 6; i++) {
    const bx = -3.8 + (i % 3) * 0.55;
    const bz = -1.6 + Math.floor(i / 3) * 0.45;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.32), copper);
    block.position.set(bx, floorY + 0.7, bz);
    group.add(block);
  }

  const stands = [
    [2.2, -2.8, 0.35],
    [3.4, 0.2, 0.28],
    [1.8, 2.6, 0.32],
  ];
  for (const [x, z, h] of stands) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.45, 8), wood);
    base.position.set(x, floorY + 0.23, z);
    group.add(base);
    const model = new THREE.Mesh(new THREE.BoxGeometry(0.55, h, 0.55), mat(0xc8c0b8));
    model.position.set(x, floorY + 0.45 + h / 2, z);
    model.castShadow = true;
    group.add(model);
  }

  const poemTex = calligraphyTexture('逍遥楼', [
    '逍遥楼上望乡关，',
    '绿水泓澄云雾间。',
    '北去衡阳二千里，',
    '无因雁足系书还。',
    '—— 宋之问《登逍遥楼》',
  ]);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.2, 3.2),
    wood
  );
  frame.position.set(-10.15, floorY + 2.1, 0);
  group.add(frame);
  const scroll = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.0),
    new THREE.MeshStandardMaterial({ map: poemTex, roughness: 0.9 })
  );
  scroll.position.set(-10.05, floorY + 2.1, 0);
  scroll.rotation.y = Math.PI / 2;
  group.add(scroll);

  const lamp = new THREE.PointLight(0xffc870, 0.9, 14);
  lamp.position.set(0, floorY + 5.2, 0);
  group.add(lamp);
  const lampMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 0.25, 12),
    mat(0xffe0a8, { emissive: 0xffc870, emissiveIntensity: 0.35 })
  );
  lampMesh.position.copy(lamp.position);
  group.add(lampMesh);

  const pavilion = new THREE.Group();
  pavilion.position.set(0, 0, 13.5);
  const tortoise = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.2), stone);
  tortoise.position.y = 0.28;
  pavilion.add(tortoise);
  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.18), mat(0x6a6560));
  stele.position.set(0, 1.55, 0);
  pavilion.add(stele);
  const steleTex = calligraphyTexture('逍遥楼', ['颜真卿 · 大历五年']);
  const steleFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshStandardMaterial({ map: steleTex, roughness: 0.92 })
  );
  steleFace.position.set(0, 1.55, 0.1);
  pavilion.add(steleFace);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 4), wood);
  roof.position.y = 3.1;
  roof.rotation.y = Math.PI / 4;
  pavilion.add(roof);
  group.add(pavilion);

  root.add(group);
  return {
    group,
    lamp,
    setNight(on) {
      lamp.intensity = on ? 1.1 : 0.15;
      lampMesh.material.emissiveIntensity = on ? 0.55 : 0.1;
    },
  };
}
