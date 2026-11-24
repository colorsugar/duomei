import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../public/lingchuan/', import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL('deployment.json', root)));
const regions = ['whole', 'courtyard', 'academic', 'athletics'];

for (const region of regions) {
  const gzName = `models/lingchuan-${region}.glb.gz`;
  const entry = manifest.files.find((file) => file.path === gzName);
  assert.ok(entry, `missing manifest entry for ${gzName}`);
  const gz = await fs.readFile(new URL(gzName, root));
  assert.equal(gz.length, entry.size, gzName);
  assert.equal(createHash('sha256').update(gz).digest('hex'), entry.sha256, gzName);
  const bytes = gunzipSync(gz);
  assert.equal(bytes.length, entry.uncompressedSize, `${gzName} uncompressed size`);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    entry.uncompressedSha256,
    `${gzName} uncompressed hash`,
  );
}

console.log('Campus gzip models verified; raw GLBs are not materialized for deploy.');
