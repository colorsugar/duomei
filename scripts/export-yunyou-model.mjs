// Export the actual site geometry for offline model inspection, never a page screenshot.
// node --loader ./scripts/yunyou-node-loader.mjs scripts/export-yunyou-model.mjs <runtime> <output>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { createCanvas } = createRequire(import.meta.url)('@napi-rs/canvas');
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const runtime = path.resolve(process.argv[2] ?? 'public/yunyou');
const output = path.resolve(process.argv[3] ?? '/tmp/yunyou-model');
fs.mkdirSync(output, { recursive: true });
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { FOOT } = await import(pathToFileURL(path.join(runtime, 'data/geo.js')));
const { build } = await import(pathToFileURL(path.join(runtime, 'src/detail/xiaoyaolou.js')));
const tex = (relative, data = false) => {
  const t = new THREE.Texture(); t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.sourcePath = path.join(runtime, 'assets/tex', relative); return t;
};
const TEX = {};
for (const name of ['stone', 'tile', 'copper', 'glaze', 'brick', 'karst']) TEX[name] = tex(name + '.jpg');
if (fs.existsSync(path.join(runtime, 'assets/tex/pbr'))) {
  TEX.pbr = {};
  for (const surface of ['wood', 'paving', 'plaster']) {
    TEX.pbr[surface] = {};
    for (const channel of ['color', 'normal', 'roughness', 'ao']) TEX.pbr[surface][channel] = tex('pbr/' + surface + '/' + channel + '.jpg', channel !== 'color');
  }
}
const root = build({ F: FOOT, TEX }); root.updateMatrixWorld(true);
const centre = FOOT.xiaoyaolou.c;
const recenter = new THREE.Matrix4().makeRotationY(-root.children[0].rotation.y).multiply(new THREE.Matrix4().makeTranslation(-centre[0], 0, -centre[1]));
const buckets = new Map(), transform = new THREE.Matrix4(), instance = new THREE.Matrix4(), tint = new THREE.Color();
function addGeometry(o, g, m, color) {
  g.applyMatrix4(transform);
  if (!g.attributes.normal) g.computeVertexNormals();
  const count = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  const colors = new Float32Array(count * 3), source = g.attributes.color;
  for (let v = 0; v < count; v++) {
    colors[v * 3] = color.r * (source?.getX(v) ?? 1);
    colors[v * 3 + 1] = color.g * (source?.getY(v) ?? 1);
    colors[v * 3 + 2] = color.b * (source?.getZ(v) ?? 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  for (const key of Object.keys(g.attributes)) if (!['position','normal','uv','color'].includes(key)) g.deleteAttribute(key);
  if (!buckets.has(m.uuid)) buckets.set(m.uuid, { material:m, geos:[] });
  buckets.get(m.uuid).geos.push(g);
}
root.traverse(o => {
  if (!o.isMesh || !o.visible) return;
  const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  const instances = o.isInstancedMesh ? o.count : 1;
  for (let i = 0; i < instances; i++) {
    if (o.isInstancedMesh) { o.getMatrixAt(i, instance); transform.multiplyMatrices(recenter, o.matrixWorld).multiply(instance); }
    else transform.multiplyMatrices(recenter, o.matrixWorld);
    tint.setRGB(1,1,1); if (o.instanceColor) o.getColorAt(i, tint);
    if (Array.isArray(o.material)) {
      for (const part of base.groups) {
        const g = new THREE.BufferGeometry();
        for (const [key, a] of Object.entries(base.attributes)) g.setAttribute(key, new THREE.BufferAttribute(a.array.slice(part.start*a.itemSize,(part.start+part.count)*a.itemSize),a.itemSize));
        addGeometry(o,g,o.material[part.materialIndex],tint);
      }
    } else addGeometry(o, base.clone(), o.material, tint);
  }
  base.dispose();
});
let imageIndex = 0, triangleCount = 0;
const textures = new Map();
function textureData(t) {
  if (!t) return null;
  if (textures.has(t.uuid)) return textures.get(t.uuid);
  let filename = t.userData?.sourcePath;
  if (!filename && t.image?.toBuffer) {
    filename = path.join(output, 'canvas-' + imageIndex++ + '.png'); fs.writeFileSync(filename, t.image.toBuffer('image/png'));
  }
  if (!filename) return null;
  const result = { filename, repeat:t.repeat.toArray(), offset:t.offset.toArray(), flipY:t.flipY };
  textures.set(t.uuid, result); return result;
}
const meshes = [];
for (const {material:m, geos} of buckets.values()) {
  const g = mergeGeometries(geos, false); geos.forEach(x=>x.dispose());
  const id = meshes.length, count = g.attributes.position.count;
  const parts = [];
  for (const key of ['position','normal','uv','color']) { const a=g.attributes[key].array; parts.push(Buffer.from(a.buffer,a.byteOffset,a.byteLength)); }
  fs.writeFileSync(path.join(output,'mesh-'+id+'.bin'),Buffer.concat(parts));
  meshes.push({file:'mesh-'+id+'.bin',vertices:count,material:{
    name:m.name||'surface-'+id, color:m.color.toArray(),roughness:m.roughness??.9,metalness:m.metalness??0,
    side:m.side,map:textureData(m.map),normalMap:textureData(m.normalMap),normalScale:m.normalScale?.toArray()??[1,1],
    roughnessMap:textureData(m.roughnessMap),bumpMap:textureData(m.bumpMap),bumpScale:m.bumpScale??0,
  }});
  triangleCount += count / 3; g.dispose();
}
fs.writeFileSync(path.join(output,'scene.json'),JSON.stringify({runtime,meshes,triangleCount,model:'xiaoyaolou',kind:'actual-site-geometry-offline-render'},null,2));
console.log(JSON.stringify({output,meshes:meshes.length,triangles:triangleCount}));
