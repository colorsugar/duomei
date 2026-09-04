import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), m4 = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || o.children.length || Array.isArray(o.material)) return;
    const g = o.geometry, key = `${o.material.uuid}|${Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize).join()}|${!!g.index}|${o.castShadow}${o.receiveShadow}${o.renderOrder}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)).push(o);
  });
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const temporary = list.map((o) => o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)));
    const merged = mergeGeometries(temporary, false);
    temporary.forEach(g => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
    root.add(m);
    const old = new Set(list.map(o => o.geometry));
    for (const o of list) o.removeFromParent();
    for (const geo of old) geo.dispose();
  }
}
