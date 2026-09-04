// node --loader ./scripts/yunyou-node-loader.mjs scripts/bake-yunyou.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { XBS } from '../public/yunyou/src/landmarks.js';
import { sdfHill } from '../public/yunyou/src/lib.js';
const mesh = sdfHill({ ...XBS, res: 116, seed: 3 });
const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
g.computeBoundingBox();
const min = g.boundingBox.min, size = g.boundingBox.max.clone().sub(min);
const buffer = new ArrayBuffer(36 + p.count * 12 + g.index.count * 4);
const head = new DataView(buffer); head.setUint32(0, 0x47554c31, true); head.setUint32(4, p.count, true); head.setUint32(8, g.index.count, true);
new Float32Array(buffer, 12, 6).set([...min, ...size]);
const pos = new Uint16Array(buffer, 36, p.count * 3), normal = new Int16Array(buffer, 36 + p.count * 6, p.count * 3);
for (let i = 0; i < p.count; i++) for (let j = 0; j < 3; j++) {
  pos[i * 3 + j] = Math.round((p.array[i * 3 + j] - min.getComponent(j)) / size.getComponent(j) * 65535);
  normal[i * 3 + j] = Math.round(n.array[i * 3 + j] * 32767);
}
new Uint32Array(buffer, 36 + p.count * 12).set(g.index.array);
await mkdir(new URL('../public/yunyou/assets/models/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/yunyou/assets/models/xiangbishan.bin', import.meta.url), new Uint8Array(buffer));
console.log(JSON.stringify({ vertices: p.count, triangles: g.index.count / 3, bytes: buffer.byteLength }));
