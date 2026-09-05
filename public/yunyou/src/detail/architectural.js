// Metre-scale UVs and solid, chamfered architectural parts for close views.
import * as THREE from 'three';

export function metricUV(geometry, metres = 1, grainAxis) {
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const xyz = [p.getX(i), p.getY(i), p.getZ(i)];
    const normal = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    const face = normal.indexOf(Math.max(...normal));
    const axes = face === 0 ? [2, 1] : face === 1 ? [0, 2] : [0, 1];
    if (grainAxis !== undefined && axes.includes(grainAxis) && axes[1] !== grainAxis) axes.reverse();
    uv[i * 2] = xyz[axes[0]] / metres;
    uv[i * 2 + 1] = xyz[axes[1]] / metres;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

export function chamferBox(w, h, d, bevel = .025, metres = 1, grainAxis) {
  const r = Math.min(bevel, w * .18, h * .18, d * .18);
  if (r < .005) return metricUV(new THREE.BoxGeometry(w, h, d), metres, grainAxis);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2 + r);
  shape.lineTo(w / 2 - r, -h / 2 + r);
  shape.lineTo(w / 2 - r, h / 2 - r);
  shape.lineTo(-w / 2 + r, h / 2 - r);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 1, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -d / 2 + r);
  return metricUV(g, metres, grainAxis);
}

export function solidBox(parent, w, h, d, material, x = 0, y = 0, z = 0, bevel = .025) {
  const timber = material.userData?.surface === 'wood';
  const longest = [w, h, d].indexOf(Math.max(w, h, d));
  const mesh = new THREE.Mesh(chamferBox(w, h, d, bevel, material.userData?.metres ?? 1, timber ? longest : undefined), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function member(parent, a, b, w, d, material) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
  const mesh = solidBox(parent, w, delta.length(), d, material, 0, 0, 0, .018);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.position.copy(from.add(to).multiplyScalar(.5));
  return mesh;
}
