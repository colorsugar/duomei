#!/usr/bin/env node
// 把 3D 场景的大素材（模型、贴图、音乐、视频、大图…）从主站部署包里分出去，放进同一 EdgeOne 账号下的
// 第二个免费网页项目 duomei-assets（域名 assets.duomei.site）。主站只留网页、脚本和小文件。
//
// 为什么这样拆：EdgeOne Pages 单次部署整站超过约 1.1GB 时整站 HTTPS 会断（10-16、10-18 实测），
// 主站已经 1.09GB。两个项目都在免费版 default-pages-zone 下，流量不限量，不花钱，国内可达。
//
// 页面代码一行不用改：小院、红楼梦影、云游都是别的项目的打包产物，路径照旧写 /honglou/dgy-assets/…；
// 主站 edgeone.json 里按目录加 302 跳转到 https://assets.duomei.site/同路径，素材项目回
// Access-Control-Allow-Origin: *（glb、贴图、字体、音频、HLS 都是 fetch / crossOrigin 加载的）。
// 本地开发（vite）和本地构建不受影响：只有 CI 里跑 apply 写出 .assets-split.json 后，build 才会去掉这些文件。
//
// 配置在 deploy/assets-split.json（include 只看这几个顶层目录；其中不含网页和脚本的目录、体积 ≥ minDirBytes 的整目录搬走）。
//
//   node scripts/assets-split.mjs plan   [--dir dist] [--json]       列出会分出去的目录和两边体积（只读）
//   node scripts/assets-split.mjs hash   [--dir dist]                本次素材内容的指纹（文件路径 + 大小 + 内容）
//   node scripts/assets-split.mjs remote [--base URL]                素材域名上线中的指纹（取不到输出空行）
//   node scripts/assets-split.mjs pack   [--dir dist] --out DIR      组装素材项目的部署目录（DIR/public + edgeone.json）
//   node scripts/assets-split.mjs apply  [--dir dist]                写 .assets-split.json + 往主站 edgeone.json 加 302（只在 CI 里跑）
//   node scripts/assets-split.mjs strip  [--dir dist]                按 .assets-split.json 从 dist 删掉已分出去的文件（npm run build 最后一步）
//   node scripts/assets-split.mjs check  [--dir dist] [--base URL] [--query q] [--origin URL]  抽查素材域名：206、大小、跨域头、类型
//   node scripts/assets-split.mjs guard  [--dir dist]                主站包和素材包各自的体积闸
//   node scripts/assets-split.mjs verify-site [--site URL] [--query q]  主站上被分出去的路径 302 到素材域名且能取到
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "deploy", "assets-split.json");
const MANIFEST_PATH = path.join(ROOT, ".assets-split.json");
const EDGEONE_JSON = path.join(ROOT, "edgeone.json");
// 素材项目根目录下的指纹文件（不用 .well-known：CLI 打包默认跳过隐藏目录）。
const REMOTE_MARKER = "duomei-assets.json";

const args = process.argv.slice(2);
const command = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};

const MB = 1024 * 1024;
const fmtMB = (bytes) => (bytes / MB).toFixed(1);

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const sw = process.env.DUOMEI_ASSETS_SPLIT;
  if (sw === "0" || sw === "false") config.enabled = false;
  if (sw === "1" || sw === "true") config.enabled = true;
  if (process.env.DUOMEI_ASSETS_BASE) config.base = process.env.DUOMEI_ASSETS_BASE;
  config.base = String(config.base).replace(/\/+$/, "");
  return config;
}

const extOf = (file) => {
  const m = /\.([A-Za-z0-9]+)$/.exec(file);
  return m ? m[1].toLowerCase() : "";
};

function scan(dir, codeExt) {
  const node = { rel: "", size: 0, files: 0, hasCode: false, children: [], loose: [] };
  const walk = (abs, rel, n) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const childAbs = path.join(abs, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const c = { rel: childRel, size: 0, files: 0, hasCode: false, children: [], loose: [] };
        walk(childAbs, childRel, c);
        n.children.push(c);
        n.size += c.size;
        n.files += c.files;
        n.hasCode ||= c.hasCode;
      } else if (entry.isFile()) {
        const size = fs.statSync(childAbs).size;
        n.loose.push({ rel: childRel, size });
        n.size += size;
        n.files += 1;
        if (codeExt.has(extOf(entry.name))) n.hasCode = true;
      }
    }
  };
  walk(dir, "", node);
  return node;
}

function plan(dir, config) {
  const codeExt = new Set(config.codeExtensions.map((e) => e.toLowerCase()));
  const under = (rel, list) => list.some((x) => rel === x || rel.startsWith(`${x}/`));
  const included = (rel) => under(rel, config.include);
  const excluded = (rel) => under(rel, config.exclude ?? []);
  const tree = scan(dir, codeExt);
  const dirs = [];
  const files = [];
  const visit = (n, depth) => {
    if (n.rel && excluded(n.rel)) return;
    if (depth === 1 && !included(n.rel)) return;
    if (n.rel && depth >= config.minDepth && !n.hasCode && n.size >= config.minDirBytes) {
      dirs.push({ prefix: n.rel, size: n.size, files: n.files });
      return;
    }
    for (const c of n.children) visit(c, depth + 1);
    if (n.rel && depth >= config.minDepth - 1) {
      for (const f of n.loose) {
        if (f.size >= config.minLooseFileBytes && !codeExt.has(extOf(f.rel)) && !excluded(f.rel)) {
          files.push({ path: f.rel, size: f.size });
        }
      }
    }
  };
  visit(tree, 0);
  dirs.sort((a, b) => a.prefix.localeCompare(b.prefix));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const moved = dirs.reduce((s, d) => s + d.size, 0) + files.reduce((s, f) => s + f.size, 0);
  return { total: tree.size, totalFiles: tree.files, moved, remaining: tree.size - moved, dirs, files };
}

const encodePath = (rel) => rel.split("/").map(encodeURIComponent).join("/");

function redirectsFor(p, base) {
  return [
    ...p.dirs.map((d) => ({ source: `/${d.prefix}/*`, destination: `${base}/${d.prefix}/:splat`, statusCode: 302 })),
    ...p.files.map((f) => ({ source: `/${encodePath(f.path)}`, destination: `${base}/${encodePath(f.path)}`, statusCode: 302 })),
  ];
}

function listMovedFiles(dir, manifest) {
  const out = [];
  const walk = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const a = path.join(abs, entry.name);
      const r = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(a, r);
      else if (entry.isFile()) out.push({ rel: r, abs: a, size: fs.statSync(a).size });
    }
  };
  for (const d of manifest.dirs) {
    const abs = path.join(dir, d.prefix);
    if (fs.existsSync(abs)) walk(abs, d.prefix);
  }
  for (const f of manifest.files) {
    const abs = path.join(dir, f.path);
    if (fs.existsSync(abs)) out.push({ rel: f.path, abs, size: fs.statSync(abs).size });
  }
  out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return out;
}

const CONTENT_TYPES = {
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", avif: "image/avif",
  svg: "image/svg+xml", ktx2: "image/ktx2", glb: "model/gltf-binary", gltf: "model/gltf+json",
  mp4: "video/mp4", webm: "video/webm", ts: "video/mp2t", m3u8: "application/vnd.apple.mpegurl",
  mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav",
  json: "application/json", pdf: "application/pdf", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
};

// 素材内容指纹：路径 + 大小 + 内容 sha1。主站发布前拿它和素材域名上线中的比，一样才拆（不一样说明素材还没发上去）。
function fingerprint(local) {
  const h = createHash("sha256");
  for (const f of local) {
    const c = createHash("sha1").update(fs.readFileSync(f.abs)).digest("hex");
    h.update(`${f.rel}\0${f.size}\0${c}\n`);
  }
  return h.digest("hex").slice(0, 32);
}

function pickSamples(local, p) {
  const out = [];
  for (const d of p.dirs) {
    const inDir = local.filter((f) => f.rel.startsWith(`${d.prefix}/`));
    if (!inDir.length) continue;
    const chosen = new Map();
    chosen.set(inDir[0].rel, inDir[0]);
    const biggest = inDir.reduce((a, b) => (b.size > a.size ? b : a));
    chosen.set(biggest.rel, biggest);
    for (const f of inDir) {
      if (chosen.size >= 4) break;
      if (![...chosen.values()].some((c) => extOf(c.rel) === extOf(f.rel))) chosen.set(f.rel, f);
    }
    out.push(...chosen.values());
  }
  for (const f of p.files) {
    const hit = local.find((x) => x.rel === f.path);
    if (hit) out.push(hit);
  }
  return out;
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function printPlan(p, config, dir) {
  console.log(`扫描目录：${dir}`);
  console.log(`素材域名：${config.base}（EdgeOne 项目 ${config.project}）${config.enabled ? "" : "  开关已关：不拆，全部留在主站"}`);
  console.log("");
  console.log("整目录分到素材项目：");
  for (const d of p.dirs) console.log(`  ${fmtMB(d.size).padStart(7)} MB  ${String(d.files).padStart(5)} 个  /${d.prefix}/`);
  if (p.files.length) {
    console.log("单个大文件分到素材项目：");
    for (const f of p.files) console.log(`  ${fmtMB(f.size).padStart(7)} MB          /${f.path}`);
  }
  console.log("");
  console.log(`原来整包：${fmtMB(p.total)} MB（${p.totalFiles} 个文件）`);
  console.log(`素材项目：${fmtMB(p.moved)} MB（${p.dirs.length} 个目录 + ${p.files.length} 个单文件 = ${p.dirs.length + p.files.length} 条跳转）`);
  console.log(`主站留下：${fmtMB(p.remaining)} MB`);
}

const distDir = () => path.resolve(ROOT, opt("dir", "dist"));
const writeOutput = (key, value) => {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

async function cmdPlan() {
  const config = loadConfig();
  const dir = distDir();
  const p = plan(dir, config);
  if (opt("json", false)) console.log(JSON.stringify(p, null, 2));
  else printPlan(p, config, dir);
}

async function cmdHash() {
  const config = loadConfig();
  const dir = distDir();
  const p = plan(dir, config);
  const value = fingerprint(listMovedFiles(dir, p));
  writeOutput("hash", value);
  console.log(value);
}

async function fetchRemoteMarker(base) {
  try {
    const res = await fetch(`${base}/${REMOTE_MARKER}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function cmdRemote() {
  const config = loadConfig();
  const base = String(opt("base", config.base)).replace(/\/+$/, "");
  const marker = await fetchRemoteMarker(base);
  const value = marker?.hash ?? "";
  writeOutput("hash", value);
  console.log(value);
}

function linkOrCopy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.linkSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
  }
}

async function cmdPack() {
  const config = loadConfig();
  const dir = distDir();
  const out = opt("out", null);
  if (!out || out === true) throw new Error("pack 要 --out 目录");
  const outDir = path.resolve(ROOT, out);
  fs.rmSync(outDir, { recursive: true, force: true });
  const p = plan(dir, config);
  const local = listMovedFiles(dir, p);
  const hash = fingerprint(local);
  for (const f of local) linkOrCopy(f.abs, path.join(outDir, "public", f.rel));
  const bytes = local.reduce((s, f) => s + f.size, 0);
  const marker = {
    hash,
    commit: process.env.GITHUB_SHA ?? "local",
    run: process.env.GITHUB_RUN_ID ?? "0",
    builtAt: new Date().toISOString(),
    files: local.length,
    bytes,
    dirs: p.dirs.map((d) => d.prefix),
  };
  fs.writeFileSync(path.join(outDir, "public", REMOTE_MARKER), `${JSON.stringify(marker, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "public", "index.html"), "<!doctype html><meta charset=\"utf-8\"><title>duomei assets</title><p>多美素材站。网站在 <a href=\"https://duomei.site\">duomei.site</a>。</p>\n");
  fs.writeFileSync(path.join(outDir, "public", "robots.txt"), "User-agent: *\nDisallow: /\n");
  // 素材项目自己的 edgeone.json：不装依赖、不构建，原样发布 public/；全站开跨域（只读公开素材），缓存 1 小时。
  const edgeone = {
    name: config.project,
    installCommand: "echo skip-install",
    buildCommand: "echo skip-build",
    outputDirectory: "public",
    headers: [
      {
        source: "/*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Expose-Headers", value: "Content-Length, Content-Range, Accept-Ranges, ETag" },
          { key: "Timing-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: config.cacheControl },
        ],
      },
      { source: `/${REMOTE_MARKER}`, headers: [{ key: "Cache-Control", value: "no-store" }] },
      ...(config.extraHeaders ?? []),
    ],
  };
  fs.writeFileSync(path.join(outDir, "edgeone.json"), `${JSON.stringify(edgeone, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "package.json"), `${JSON.stringify({ name: config.project, private: true, version: "1.0.0", scripts: { build: "echo skip-build" } }, null, 2)}\n`);
  writeOutput("hash", hash);
  writeOutput("bytes", bytes);
  console.log(`素材包：${local.length} 个文件，${fmtMB(bytes)} MB，指纹 ${hash} → ${path.relative(ROOT, outDir) || outDir}`);
  if (bytes > config.maxAssetsMB * MB) {
    console.error(`::error::素材包 ${fmtMB(bytes)} MB 超过 ${config.maxAssetsMB} MB（单项目约 1.1GB 会断站），先瘦身或再拆一个素材项目。`);
    process.exitCode = 1;
  }
}

async function cmdApply() {
  const config = loadConfig();
  if (!config.enabled) {
    console.log("素材拆分开关已关：不写清单、不加跳转，整站照旧全部放主站。");
    if (fs.existsSync(MANIFEST_PATH)) fs.rmSync(MANIFEST_PATH);
    return;
  }
  const dir = distDir();
  const p = plan(dir, config);
  printPlan(p, config, dir);
  const local = listMovedFiles(dir, p);
  const samples = pickSamples(local, p).map((f) => ({ rel: f.rel, size: f.size }));
  const manifest = { base: config.base, hash: fingerprint(local), generatedAt: new Date().toISOString(), dirs: p.dirs, files: p.files, samples };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const eo = JSON.parse(fs.readFileSync(EDGEONE_JSON, "utf8"));
  const ours = redirectsFor(p, config.base);
  const kept = (eo.redirects ?? []).filter((r) => !String(r.destination).startsWith(`${config.base}/`));
  if (ours.length + kept.length > 100) throw new Error(`跳转 ${ours.length + kept.length} 条，超过 EdgeOne 上限 100 条；把 minDirBytes 调大或在 include 里合并目录。`);
  eo.redirects = [...ours, ...kept];
  fs.writeFileSync(EDGEONE_JSON, `${JSON.stringify(eo, null, 2)}\n`);
  console.log(`已写 ${path.relative(ROOT, MANIFEST_PATH)}（指纹 ${manifest.hash}），edgeone.json 加了 ${ours.length} 条 302 跳转。`);
}

async function cmdStrip() {
  const manifest = readManifest();
  if (!manifest) return; // 本地构建、开关关闭：什么都不做
  const dir = distDir();
  const local = listMovedFiles(dir, manifest);
  const bytes = local.reduce((s, f) => s + f.size, 0);
  for (const d of manifest.dirs) fs.rmSync(path.join(dir, d.prefix), { recursive: true, force: true });
  for (const f of manifest.files) fs.rmSync(path.join(dir, f.path), { force: true });
  console.log(`[assets-split] 已从 ${path.relative(ROOT, dir) || dir} 去掉分到素材项目的 ${local.length} 个文件（${fmtMB(bytes)} MB），由 edgeone.json 302 到 ${manifest.base}。`);
}

async function pool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function cmdCheck() {
  const config = loadConfig();
  const base = String(opt("base", config.base)).replace(/\/+$/, "");
  const query = opt("query", "");
  const origin = String(opt("origin", "https://duomei.site"));
  const dir = distDir();
  const manifest = readManifest() ?? (() => {
    const p = plan(dir, config);
    return { dirs: p.dirs, files: p.files };
  })();
  const local = fs.existsSync(dir) ? listMovedFiles(dir, manifest) : [];
  const picks = local.length ? pickSamples(local, manifest) : manifest.samples ?? [];
  let bad = 0;
  await pool(picks, 8, async (f) => {
    const url = `${base}/${encodePath(f.rel)}${query ? `?${query}` : ""}`;
    try {
      const res = await fetch(url, { headers: { Origin: origin, Range: "bytes=0-15" }, signal: AbortSignal.timeout(30000) });
      await res.arrayBuffer();
      const total = Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? res.headers.get("content-length"));
      const acao = res.headers.get("access-control-allow-origin");
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const want = CONTENT_TYPES[extOf(f.rel)];
      const problems = [];
      if (res.status !== 206) problems.push(`状态 ${res.status}（要 206）`);
      if (total !== f.size) problems.push(`大小 ${total}/${f.size}`);
      if (!(acao === "*" || acao === origin)) problems.push(`跨域头 ${acao}`);
      if (want && type !== want && !(want === "model/gltf-binary" && type === "application/octet-stream")) problems.push(`类型 ${type}（要 ${want}）`);
      if (problems.length) {
        bad += 1;
        console.log(`  ✗ ${problems.join("，")}  ${url}`);
      }
    } catch (error) {
      bad += 1;
      console.log(`  ✗ ${error.message} ${url}`);
    }
  });
  console.log(`抽查素材域名 ${picks.length} 个文件，${picks.length - bad} 个正常，${bad} 个有问题。`);
  if (bad) process.exitCode = 1;
}

// 体积闸：EdgeOne 单次部署超过约 1.1GB 会整站 HTTPS 断开。拆了：主站留下的要 ≤ maxSiteMB；没拆：只防断站线。
async function cmdGuard() {
  const config = loadConfig();
  const dir = distDir();
  const manifest = readManifest();
  const maxMB = manifest ? Number(opt("max-site-mb", config.maxSiteMB)) : Number(opt("max-mb", 1095));
  const total = scan(dir, new Set()).size;
  // strip 之后再跑 guard 时 dist 里已没有被分走的文件，listMovedFiles 自然是 0。
  const moved = manifest ? listMovedFiles(dir, manifest).reduce((s, f) => s + f.size, 0) : 0;
  const remaining = total - moved;
  console.log(`主站这次要部署 ${fmtMB(remaining)} MB（dist 现有 ${fmtMB(total)} MB${manifest ? `，其中 ${fmtMB(moved)} MB 归素材项目` : "，没拆"}），上限 ${maxMB} MB。`);
  if (remaining > maxMB * MB) {
    console.error(`::error::主站包 ${fmtMB(remaining)} MB 超过 ${maxMB} MB，停止发布。`);
    process.exitCode = 1;
  }
}

async function cmdVerifySite() {
  const site = String(opt("site", "https://duomei.site")).replace(/\/+$/, "");
  const query = opt("query", "");
  const manifest = readManifest();
  if (!manifest) {
    console.log("没有 .assets-split.json：这次没拆，跳过。");
    return;
  }
  const samples = manifest.samples ?? [];
  const picks = [
    ...manifest.dirs.map((d) => samples.find((f) => f.rel.startsWith(`${d.prefix}/`))),
    ...manifest.files.map((f) => samples.find((s) => s.rel === f.path)),
  ].filter(Boolean);
  if (!picks.length) throw new Error(".assets-split.json 里没有样本文件");
  let bad = 0;
  await pool(picks, 6, async (f) => {
    const url = `${site}/${encodePath(f.rel)}${query ? `?${query}` : ""}`;
    try {
      const first = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
      const location = first.headers.get("location") ?? "";
      const final = await fetch(url, { headers: { Origin: site }, signal: AbortSignal.timeout(60000) });
      const body = final.body ? await final.arrayBuffer() : new ArrayBuffer(0);
      const acao = final.headers.get("access-control-allow-origin");
      const ok = [301, 302, 307, 308].includes(first.status) && location.startsWith(`${manifest.base}/`) && final.status === 200 && body.byteLength === f.size && acao === "*";
      if (!ok) {
        bad += 1;
        console.log(`  ✗ ${first.status} → ${location || "(无跳转)"} → ${final.status} ${body.byteLength}/${f.size} acao=${acao}  ${url}`);
      }
    } catch (error) {
      bad += 1;
      console.log(`  ✗ ${error.message} ${url}`);
    }
  });
  console.log(`主站跳转验证：${picks.length} 处，${picks.length - bad} 个正常，${bad} 个有问题。`);
  if (bad) process.exitCode = 1;
}

const commands = { plan: cmdPlan, hash: cmdHash, remote: cmdRemote, pack: cmdPack, apply: cmdApply, strip: cmdStrip, check: cmdCheck, guard: cmdGuard, "verify-site": cmdVerifySite };
if (!commands[command]) {
  console.error("用法：node scripts/assets-split.mjs <plan|hash|remote|pack|apply|strip|check|guard|verify-site> [--dir dist] …");
  process.exit(2);
}
commands[command]().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
