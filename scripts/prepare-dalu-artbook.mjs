import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'src/content/daluArtbook.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const output = path.join(root, 'public', manifest.pdf);
try {
  const existing = await readFile(output);
  if (existing.length === manifest.bytes && hash(existing) === manifest.sha256) {
    console.log('Dalu artbook PDF hash verified.');
    process.exit(0);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const parts = [];
for (const part of manifest.parts) {
  if (!/^part-\d{3}\.bin$/.test(part.file)) throw new Error('Invalid PDF part name');
  const bytes = await readFile(path.join(root, 'artifacts/dalu', part.file));
  if (bytes.length !== part.bytes || hash(bytes) !== part.sha256) throw new Error(`Invalid PDF part: ${part.file}`);
  parts.push(bytes);
}
const pdf = Buffer.concat(parts);
if (pdf.length !== manifest.bytes || hash(pdf) !== manifest.sha256 || pdf.subarray(0,5).toString() !== '%PDF-') {
  throw new Error('Dalu PDF assembly failed validation');
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, pdf);
console.log('Dalu artbook PDF assembled and hash verified.');
