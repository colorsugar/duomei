import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mediaExtensions = new Set([".pdf", ".webp", ".png", ".jpg", ".jpeg"]);
const forbiddenBundleText = [
  "vercel.app",
  "workers.dev",
  "cloudflare",
  "GUYU_ANSWER_HASH",
  "GUYU_SESSION_SECRET",
  "GUYU_ANSWER_SALT",
  "private-media/guyu/meiyou-yujian/pages/001.webp",
];

async function walk(directory, skipDirectories = new Set()) {
  const files = [];
  for (const entry of await readdir(directory)) {
    if (skipDirectories.has(entry)) continue;
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path, skipDirectories));
    else files.push(path);
  }
  return files;
}

const sourceFiles = await walk(root, new Set(["node_modules", "dist"]));
const forbiddenMedia = sourceFiles.filter((path) => mediaExtensions.has(extname(path).toLowerCase()));
if (forbiddenMedia.length) {
  throw new Error(`原稿/图片文件不得进入候选目录：${forbiddenMedia.map((path) => relative(root, path)).join(", ")}`);
}

const distFiles = await walk(join(root, "dist"));
for (const path of distFiles) {
  if (mediaExtensions.has(extname(path).toLowerCase())) throw new Error(`前端制品包含图片：${relative(root, path)}`);
  const content = await readFile(path, "utf8");
  for (const value of forbiddenBundleText) {
    if (content.includes(value)) throw new Error(`前端制品包含禁止值 ${value}: ${relative(root, path)}`);
  }
}

console.log("bundle audit passed: no originals, foreign image hosts, private paths, or secret names in the frontend bundle");
