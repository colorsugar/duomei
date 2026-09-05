// Close-view curved roof: overlapping half-round clay tiles, individual end caps,
// thin eaves and solid ridge ornaments. Repeated tiles share two instance batches.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { metricUV, solidBox } from './architectural.js';

export function tiledRoof({ rx, rz = rx, over, h, ridge, y, curl = .65, material, wood }) {
  const root = new THREE.Group(), ex = rx + over, ez = rz + over;
  const corners = [[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez]], r = ridge / 2;
  const tops = [[[r, 0], [-r, 0]], [[-r, 0], [-r, 0]], [[-r, 0], [r, 0]], [[r, 0], [r, 0]]];
  const point = (f, t, s) => {
    const a = corners[f], b = corners[(f + 1) % 4], [ta, tb] = tops[f];
    return new THREE.Vector3(
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(ta[0], tb[0], t), s),
      y + h * Math.pow(s, 1.55) + curl * Math.pow(Math.abs(t * 2 - 1), 3) * Math.pow(1 - s, 2.2),
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(a[1], b[1], t), THREE.MathUtils.lerp(ta[1], tb[1], t), s),
    );
  };
  const tiles = [], ends = [], surfaces = [], matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
  const quat = new THREE.Quaternion(), across = new THREE.Vector3(), up = new THREE.Vector3(), slope = new THREE.Vector3();
  const ridgePaths = [];
  for (let f = 0; f < 4; f++) {
    const positions = [], uv = [], indices = [], rows = 16, cols = 32;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
      const p = point(f, col / cols, row / rows);
      positions.push(p.x, p.y - .035, p.z); uv.push(p.x / .8, p.z / .8);
      if (row < rows && col < cols) { const a = row * (cols + 1) + col; indices.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2); }
    }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shell.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    shell.setIndex(indices); shell.computeVertexNormals(); surfaces.push(shell);
    const depth = point(f, .5, 0).distanceTo(point(f, .5, 1));
    const courses = Math.max(5, Math.ceil(depth / .49));
    for (let row = 0; row < courses; row++) {
      const s = (row + .35) / courses, width = point(f, 0, s).distanceTo(point(f, 1, s));
      const columns = Math.max(1, Math.round(width / .29));
      for (let col = 0; col < columns; col++) {
        const t = (col + .5) / columns, centre = point(f, t, s);
        across.copy(point(f, Math.min(1, t + .001), s)).sub(point(f, Math.max(0, t - .001), s)).normalize();
        slope.copy(point(f, t, Math.min(1, s + .001))).sub(point(f, t, Math.max(0, s - .001))).normalize();
        up.crossVectors(slope, across).normalize(); slope.crossVectors(across, up).normalize();
        quat.setFromRotationMatrix(matrix.makeBasis(across, up, slope));
        const courseLength = point(f, t, Math.min(1, s + .5 / courses)).distanceTo(point(f, t, Math.max(0, s - .5 / courses)));
        scale.set(Math.min(1.16, width / columns / .29), 1, (courseLength + .075) / .57);
        matrix.compose(centre.addScaledVector(up, .025), quat, scale);
        tiles.push(matrix.clone());
        if (row === 0) {
          const e = point(f, t, 0).addScaledVector(slope, -.02).addScaledVector(up, .038);
          matrix.compose(e, quat, new THREE.Vector3(scale.x, 1, 1)); ends.push(matrix.clone());
        }
      }
    }
    const path = Array.from({ length: 19 }, (_, i) => point(f, 0, i / 18).add(new THREE.Vector3(0, .15, 0)));
    ridgePaths.push(path);
    const eave = Array.from({ length: 33 }, (_, i) => point(f, i / 32, 0).add(new THREE.Vector3(0, -.14, 0)));
    const fascia = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(eave), 32, .09, 5, false), wood); root.add(fascia);
    // Exposed rafter tails under the eave are separate timber members.
    const n = Math.round(point(f, 0, 0).distanceTo(point(f, 1, 0)) / .52);
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, p = point(f, t, .065).add(new THREE.Vector3(0, -.21, 0));
      const timber = solidBox(root, .105, .13, .8, wood, p.x, p.y, p.z, .014);
      timber.rotation.y = -f * Math.PI / 2;
    }
  }
  const underMat = material.clone(); underMat.color.multiplyScalar(.64); underMat.side = THREE.DoubleSide;
  root.add(new THREE.Mesh(mergeGeometries(surfaces), underMat)); surfaces.forEach(g => g.dispose());
  const barrel = new THREE.CylinderGeometry(.113, .134, .57, 6, 1, true, Math.PI / 2, Math.PI);
  barrel.rotateX(Math.PI / 2); metricUV(barrel, .8);
  const tileBatch = new THREE.InstancedMesh(barrel, material, tiles.length), tint = new THREE.Color();
  tiles.forEach((m, i) => { tileBatch.setMatrixAt(i, m); const v = .85 + ((Math.imul(i + 13, 2654435761) >>> 0) % 100) / 360; tint.setRGB(v, v, v * .985); tileBatch.setColorAt(i, tint); });
  tileBatch.castShadow = tileBatch.receiveShadow = true; tileBatch.computeBoundingSphere(); tileBatch.name = 'overlapping-clay-tiles'; tileBatch.userData.nearDetail = true; root.add(tileBatch);
  const cap = new THREE.CylinderGeometry(.139, .139, .055, 10, 1); cap.rotateX(Math.PI / 2); metricUV(cap, .8);
  const capBatch = new THREE.InstancedMesh(cap, material, ends.length);
  ends.forEach((m, i) => capBatch.setMatrixAt(i, m)); capBatch.castShadow = true; capBatch.receiveShadow = true; capBatch.computeBoundingSphere(); capBatch.name = 'individual-eave-tile-ends'; capBatch.userData.nearDetail = true; root.add(capBatch);
  for (const path of ridgePaths) root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 22, .17, 8, false), material));
  solidBox(root, ridge + .55, .38, .49, material, 0, y + h + .14, 0, .065);
  solidBox(root, ridge + .72, .12, .63, material, 0, y + h + .4, 0, .025);
  // Curled ridge-end silhouettes, replacing the former stacked square blocks.
  const profile = new THREE.Shape();
  profile.moveTo(-.35, 0); profile.lineTo(.38, 0); profile.bezierCurveTo(.54, .45, .79, .73, .71, 1.11);
  profile.bezierCurveTo(.67, 1.48, .11, 1.69, -.11, 1.32); profile.bezierCurveTo(-.27, 1.03, .08, .78, .29, 1.06);
  profile.bezierCurveTo(.26, .76, -.17, .72, -.23, .38); profile.closePath();
  for (const side of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(profile, { depth: .23, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 8, steps: 1 });
    g.translate(0, 0, -.115); metricUV(g, .8);
    const scroll = new THREE.Mesh(g, material); scroll.position.set(side * (ridge / 2 + .12), y + h + .42, 0); scroll.scale.x = side; root.add(scroll);
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  root.userData.tileCount = tiles.length;
  return root;
}
