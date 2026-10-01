import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'public/xiaoyuan-scene/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);
if (!scripts.length || !styles.length) throw new Error('Scene must have executable and stylesheet entry assets');
for (const url of [...scripts, ...styles]) {
  if (!/^\/xiaoyuan-scene\/assets\/[^/]+\.(js|css)$/.test(url)) throw new Error(`Invalid scene asset base: ${url}`);
  if (!existsSync(resolve(root, 'public', url.slice(1)))) throw new Error(`Missing scene asset: ${url}`);
}
console.log('Embedded scene scripts and styles resolve within /xiaoyuan-scene/.');
