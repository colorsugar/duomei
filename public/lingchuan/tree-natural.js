/**
 * Photo-guided, texture-free campus trees. Ragged twig envelopes supply canopy
 * coverage at campus viewing distance; folded sprays break up their edges.
 * Integration:
 *   import { createTreeBuilder } from './tree-natural.js';
 *   const tree = createTreeBuilder({ T, add, beam, bark, leaf, random, detail });
 * Call the factory once per createCampus(), not once per tree. Material clones
 * are collected by createCampus's final root.traverse material registration.
 */
export function createTreeBuilder({ T, add, beam, bark, leaf, random, detail = 1 }) {
  if (!T || !add || !bark || !leaf?.length || typeof random !== 'function') {
    throw new TypeError('createTreeBuilder needs T, add, bark, leaf, and random.');
  }
  const dense = detail > 0;
  const up = new T.Vector3(0, 1, 0);
  const foliage = (prefix, colors) => colors.map((color, i) => {
    const m = leaf[Math.min(i, leaf.length - 1)].clone();
    m.name = `${prefix}_${i}`;
    m.color.set(color);
    m.side = T.DoubleSide;
    m.roughness = .94;
    m.metalness = 0;
    m.map = null;
    m.userData = {};
    return m;
  });
  // Sunlit tips are restrained; no lime-green spherical highlight patches.
  const pineMaterials = foliage('pine_needles', ['#1d3528', '#274332', '#35533a', '#496045']);
  const broadMaterials = foliage('broad_leaves', ['#27412b', '#385332', '#4b653e', '#60794b']);

  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function limb(a, b, r0, r1, sides = 5) {
    const direction = b.clone().sub(a), length = direction.length();
    if (length < .00001) return;
    const geo = new T.CylinderGeometry(r1, r0, length, sides, 1, true);
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(up, direction.multiplyScalar(1 / length)));
    add(geo, bark, a.clone().add(b).multiplyScalar(.5).toArray());
  }

  return function buildTree(x, z, h = 12, kind = 'pine') {
    if (![x, z, h].every(Number.isFinite) || h <= 0) throw new RangeError('Tree coordinates/height must be finite and height positive.');
    const seed = Math.floor(random() * 4294967296) >>> 0;
    const shapeRandom = seeded(seed), leafRandom = seeded(seed ^ 0x9e3779b9);
    const isPine = kind === 'pine';
    const materials = isPine ? pineMaterials : broadMaterials;
    const faces = materials.map(() => []);
    const V = (a, b, c) => new T.Vector3(a, b, c);
    const leanX = (shapeRandom() - .5) * h * .026;
    const leanZ = (shapeRandom() - .5) * h * .026;
    const trunkAt = t => V(x + leanX * t * t, h * t, z + leanZ * t * t);
    const choose = () => {
      const q = leafRandom();
      return q < .38 ? 0 : q < .77 ? 1 : q < .95 ? 2 : 3;
    };
    function triangle(buffer, a, b, c) { buffer.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
    function branchEnvelope(center, direction, length, depth, thickness, broad = false) {
      // Two irregular polygon rings and offset tips: a small, lobed twig fan,
      // not a sphere. Every envelope follows its supporting branch direction.
      const axis = direction.clone().setY(0).normalize();
      if (axis.lengthSq() < .01) axis.set(1, 0, 0);
      const cross = new T.Vector3(-axis.z, 0, axis.x);
      const n = broad ? 8 : 6, rings = [];
      for (let ring = 0; ring < 2; ring++) {
        const vertices = [];
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2 + (leafRandom() - .5) * .22;
          const radius = .76 + leafRandom() * .35;
          const lobe = 1 + Math.sin(j * 2.3 + ring) * .12;
          vertices.push(center.clone().addScaledVector(axis, Math.cos(a) * length * radius * lobe)
            .addScaledVector(cross, Math.sin(a) * depth * radius)
            .addScaledVector(up, thickness * ((ring ? .27 : -.27) + (leafRandom() - .5) * .26)));
        }
        rings.push(vertices);
      }
      const top = center.clone().addScaledVector(up, thickness * (.86 + leafRandom() * .2)).addScaledVector(axis, length * .14);
      const bottom = center.clone().addScaledVector(up, -thickness * (.67 + leafRandom() * .18)).addScaledVector(axis, -length * .17);
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n, buffer = faces[leafRandom() < .72 ? 0 : 1];
        triangle(buffer, bottom, rings[0][k], rings[0][j]);
        triangle(buffer, rings[0][j], rings[0][k], rings[1][k]);
        triangle(buffer, rings[0][j], rings[1][k], rings[1][j]);
        triangle(buffer, rings[1][j], rings[1][k], top);
      }
    }
    // Two faces form a very narrow folded needle bundle; broad leaves use four.
    // The fold is genuine geometry, so side lighting does not flatten the canopy.
    function blade(base, direction, length, halfWidth, broad = false) {
      const axis = direction.clone().normalize();
      const side = new T.Vector3().crossVectors(axis, Math.abs(axis.y) > .92 ? V(1, 0, 0) : up).normalize();
      side.applyAxisAngle(axis, (leafRandom() - .5) * 1.5);
      const normal = new T.Vector3().crossVectors(axis, side).normalize();
      const tip = base.clone().addScaledVector(axis, length);
      const left = base.clone().addScaledVector(axis, length * .43).addScaledVector(side, halfWidth);
      const right = base.clone().addScaledVector(axis, length * .51).addScaledVector(side, -halfWidth);
      const buffer = faces[choose()];
      if (broad) {
        const keel = base.clone().addScaledVector(axis, length * .52).addScaledVector(normal, length * .065);
        triangle(buffer, base, left, keel); triangle(buffer, left, tip, keel);
        triangle(buffer, tip, right, keel); triangle(buffer, right, base, keel);
      } else {
        // Cross-seam offset creates a narrow V without a bulky closed volume.
        left.addScaledVector(normal, length * .025);
        right.addScaledVector(normal, length * .025);
        triangle(buffer, base, left, tip); triangle(buffer, base, tip, right);
      }
    }
    function needleSpray(a, b, size) {
      const axis = b.clone().sub(a).normalize();
      const side = new T.Vector3().crossVectors(axis, up).normalize();
      if (side.lengthSq() < .01) side.set(1, 0, 0);
      const vertical = new T.Vector3().crossVectors(side, axis).normalize();
      const count = dense ? 10 : 7;
      for (let i = 0; i < count; i++) {
        const t = .13 + .82 * (i / (count - 1));
        const attachment = a.clone().lerp(b, t);
        const angle = i * 2.399963 + leafRandom() * .65;
        const direction = axis.clone().multiplyScalar(.5 + leafRandom() * .25)
          .addScaledVector(side, Math.cos(angle) * (.65 + leafRandom() * .2))
          .addScaledVector(vertical, Math.sin(angle) * .45 + .12);
        const length = size * 2.75 * (.66 + leafRandom() * .6);
        blade(attachment, direction, length, length * (.20 + leafRandom() * .055));
      }
    }
    function leafSpray(a, b, size) {
      const axis = b.clone().sub(a).normalize();
      const side = new T.Vector3().crossVectors(axis, up).normalize();
      if (side.lengthSq() < .01) side.set(1, 0, 0);
      const count = dense ? 31 : 22;
      for (let i = 0; i < count; i++) {
        const t = .14 + leafRandom() * .86;
        const angle = i * 2.399963 + leafRandom() * .8;
        const fan = side.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle) * .62);
        const petiole = a.clone().lerp(b, t);
        const direction = axis.clone().multiplyScalar(.38 + leafRandom() * .42).addScaledVector(fan, .8);
        // Blades begin on the twig. Their varied lengths make ragged fine edges.
        blade(petiole, direction, size * 2.30 * (.65 + leafRandom() * .7), size * (.64 + leafRandom() * .14), true);
      }
    }

    const trunkTop = isPine ? .965 : .77;
    let previous = V(x, -.035, z);
    for (let i = 1; i <= 6; i++) {
      const t = trunkTop * i / 6;
      const next = trunkAt(t);
      const radius0 = h * (isPine ? .0115 : .0145) * (1 - (i - 1) / 6 * .88);
      const radius1 = h * (isPine ? .0115 : .0145) * (1 - i / 6 * .88);
      limb(previous, next, radius0, radius1, 7);
      previous = next;
    }

    if (isPine) {
      // The old facade has both narrow tall airy pines and denser short tiers.
      const airy = h >= 12.7;
      const levels = airy ? 6 : 7;
      const bottom = airy ? .36 : .27;
      const phase = shapeRandom() * Math.PI * 2;
      for (let level = 0; level < levels; level++) {
        const q = level / (levels - 1);
        const t = bottom + (.885 - bottom) * q;
        const tierRadius = h * (airy ? .178 : .21) * (1 - q * .82);
        const branches = level === levels - 1 ? 4 : 5;
        for (let j = 0; j < branches; j++) {
          const angle = phase + j / branches * Math.PI * 2 + level * .77 + (shapeRandom() - .5) * .43;
          const radial = V(Math.cos(angle), 0, Math.sin(angle));
          const sideways = V(-Math.sin(angle), 0, Math.cos(angle));
          const radius = tierRadius * (.79 + shapeRandom() * .36);
          const start = trunkAt(t + (shapeRandom() - .5) * .026);
          const elbow = start.clone().addScaledVector(radial, radius * .49).addScaledVector(up, -h * .008);
          const tip = start.clone().addScaledVector(radial, radius).addScaledVector(up, h * (.011 + shapeRandom() * .018));
          limb(start, elbow, h * .0039 * (1 - q * .54), h * .0020);
          limb(elbow, tip, h * .0020, h * .00065);
          // Needles run along the outer half of each limb. Two ragged envelopes
          // connect neighboring sprays while the space between tiers stays open.
          for (let k = 0; k < 4; k++) {
            const u = .42 + k * .17;
            const a = u < .49 ? start.clone().lerp(elbow, u / .49) : elbow.clone().lerp(tip, (u - .49) / .51);
            const sideSign = k % 2 ? 1 : -1;
            const twigLength = h * (.034 + shapeRandom() * .017) * (1 - q * .53);
            const b = a.clone().addScaledVector(radial, twigLength * .59)
              .addScaledVector(sideways, sideSign * twigLength * (.57 + shapeRandom() * .24))
              .addScaledVector(up, twigLength * (.16 + shapeRandom() * .17));
            limb(a, b, h * .00082, h * .00022, 4);
            if (k % 2) branchEnvelope(a.clone().lerp(b, .42), radial,
              h * .056 * (1 - q * .60), h * .047 * (1 - q * .60),
              h * (airy ? .049 : .045) * (1 - q * .46));
            needleSpray(a, b, h * (airy ? .019 : .023) * (1 - q * .3));
          }
        }
      }
      // Short upright leader closes the top without a final globe.
      for (let j = 0; j < 4; j++) {
        const a = trunkAt(.925 + j * .01);
        const angle = phase + j * Math.PI / 2;
        const b = a.clone().add(V(Math.cos(angle) * h * .018, h * .025, Math.sin(angle) * h * .018));
        limb(a, b, h * .0008, h * .0002, 4);
        needleSpray(a, b, h * .016);
      }
    } else {
      const phase = shapeRandom() * Math.PI * 2;
      for (let branch = 0; branch < 8; branch++) {
        const angle = phase + branch * 2.399963 + (shapeRandom() - .5) * .28;
        const radial = V(Math.cos(angle), 0, Math.sin(angle));
        const sideways = V(-Math.sin(angle), 0, Math.cos(angle));
        const origin = trunkAt(.36 + branch * .047);
        const reach = Math.min(4.8, h * (.24 + shapeRandom() * .055)) * (branch > 5 ? .66 : 1);
        const tip = V(x, h * (.75 + shapeRandom() * .19 + (branch > 5 ? .04 : 0)), z).addScaledVector(radial, reach);
        const elbow = origin.clone().lerp(tip, .55).addScaledVector(up, h * .035);
        limb(origin, elbow, h * .005, h * .0030);
        limb(elbow, tip, h * .003, h * .0010);
        branchEnvelope(elbow.clone().lerp(tip, .12), radial,
          h * .13, h * .12, h * .085, true);
        for (let fork = 0; fork < 3; fork++) {
          const a = elbow.clone().lerp(tip, .35 + fork * .25);
          const branchLength = h * (.052 + shapeRandom() * .025);
          const b = a.clone().addScaledVector(radial, branchLength * .48)
            .addScaledVector(sideways, (fork - 1) * branchLength * .79)
            .addScaledVector(up, branchLength * (.23 + shapeRandom() * .58));
          limb(a, b, h * .0012, h * .00035, 4);
          branchEnvelope(a.clone().lerp(b, .40), radial,
            Math.min(1.5, h * .13), Math.min(1.5, h * .12),
            h * (.057 + shapeRandom() * .014), true);
          leafSpray(a, b, h * .029);
        }
      }
      for (let k = 0; k < 3; k++) {
        const angle = phase + k * 2.4, radial = V(Math.cos(angle), 0, Math.sin(angle));
        branchEnvelope(trunkAt(.65 + k * .085).addScaledVector(radial, h * .022), radial,
          h * .080, h * .078, h * .065, true);
      }
    }
    for (let i = 0; i < faces.length; i++) {
      if (!faces[i].length) continue;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(faces[i], 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(faces[i].length / 3 * 2), 2));
      geometry.computeVertexNormals();
      add(geometry, materials[i]);
    }
  };
}
