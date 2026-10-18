#!/usr/bin/env node
// 把网站里的大文件（模型、贴图、大图、视频、音频…）拆到腾讯云 COS，经 assets.duomei.site（EdgeOne 加速、回源 COS）提供；
// EdgeOne Pages 只部署剩下的小网站，被拆走的目录由 edgeone.json 里的 302 跳转接到 assets.duomei.site。
//
// 页面代码一行不用改：子站（小院、红楼梦影、云游、图志…）都是别的项目的打包产物，路径照旧写 /honglou/dgy-assets/…，
// 浏览器请求时由 EdgeOne 302 到同路径的 https://assets.duomei.site/…。本地开发（vite）和本地构建照旧走本地文件。
//
// 唯一的「资产根地址」和搬哪些东西，都在 deploy/cos-assets.json：
//   base            资产根地址（默认 https://assets.duomei.site）
//   enabled         总开关；GitHub 仓库变量 DUOMEI_ASSETS_ON_COS=0 也能一键关（回到全部放 EdgeOne）
//   minDepth / minDirBytes / codeExtensions / exclude   自动挑目录的规则：
//     不含网页和脚本（codeExtensions）的目录，体积 ≥ minDirBytes 就整目录搬走；含脚本的目录往下一层再挑。
//     混在脚本目录里的单个大文件（≥ minLooseFileBytes）单独搬。以后新增的大目录自动走 COS，不用改配置。
//
// 用法（都在仓库根目录跑）：
//   node scripts/cos-assets.mjs plan  [--dir dist] [--json]   列出会搬哪些目录、体积前后（只读）
//   node scripts/cos-assets.mjs apply [--dir dist]            写 .cos-split.json 清单 + 往 edgeone.json 加跳转（只在 CI 里跑）
//   node scripts/cos-assets.mjs strip [--dir dist]            按 .cos-split.json 从 dist 删掉已搬走的文件（npm run build 最后一步；没有清单就什么都不做）
//   node scripts/cos-assets.mjs sync  [--dir dist] [--dry-run] [--force]  增量上传（--force 全部重传，改了类型/缓存规则时用）到 COS（要 OIDC 换来的临时凭证 COS_TMP_SECRET_ID / COS_TMP_SECRET_KEY / COS_TMP_TOKEN 和 COS_SDK_DIR，见 scripts/cos-oidc-credentials.sh）
//   node scripts/cos-assets.mjs check [--dir dist] [--base URL] [--origin URL]  抽查资产域名：Range 206、大小、跨域头、类型
//   node scripts/cos-assets.mjs guard [--dir dist] [--max-mb 1000]          留在 EdgeOne 的体积超上限就失败（发布前）
//   node scripts/cos-assets.mjs verify-site [--site URL] [--query q]        站点上被搬的路径 302 到资产域名且能取到（发布后）
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "deploy", "cos-assets.json");
const MANIFEST_PATH = path.join(ROOT, ".cos-split.json");
const EDGEONE_JSON = path.join(ROOT, "edgeone.json");

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
  const envSwitch = process.env.DUOMEI_ASSETS_ON_COS;
  if (envSwitch === "0" || envSwitch === "false") config.enabled = false;
  if (envSwitch === "1" || envSwitch === "true") config.enabled = true;
  if (process.env.COS_ASSETS_BASE) config.base = process.env.COS_ASSETS_BASE;
  if (process.env.COS_BUCKET) config.bucket = process.env.COS_BUCKET;
  if (process.env.COS_REGION) config.region = process.env.COS_REGION;
  config.base = String(config.base).replace(/\/+$/, "");
  return config;
}

const extOf = (file) => {
  const m = /\.([A-Za-z0-9]+)$/.exec(file);
  return m ? m[1].toLowerCase() : "";
};

// 扫一遍目录树：每个目录的体积、文件数、是否含网页/脚本。
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
  const excluded = (rel) => config.exclude.some((x) => rel === x || rel.startsWith(`${x}/`));
  const tree = scan(dir, codeExt);
  const dirs = [];
  const files = [];
  const visit = (n, depth) => {
    if (n.rel && excluded(n.rel)) return;
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
  return out;
}

const CONTENT_TYPES = {
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", avif: "image/avif",
  svg: "image/svg+xml", ico: "image/x-icon", ktx2: "image/ktx2",
  glb: "model/gltf-binary", gltf: "model/gltf+json", bin: "application/octet-stream", drc: "application/octet-stream",
  hdr: "application/octet-stream", exr: "application/octet-stream",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", ts: "video/mp2t", m3u8: "application/vnd.apple.mpegurl",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", flac: "audio/flac",
  json: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8", pdf: "application/pdf",
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
  // .gz 由页面自己用 DecompressionStream 解压（凌川校园模型），不能带 Content-Encoding。
  gz: "application/gzip", zip: "application/zip",
};
const contentTypeOf = (rel) => CONTENT_TYPES[extOf(rel)] ?? "application/octet-stream";
// 文件名里带构建哈希（如 main-C-FMGBEi.css、x.3f9a2c1b.webp）的可以长缓存，其余 1 小时，改了文件一小时内全网生效。
const looksHashed = (rel) => /[.-][A-Za-z0-9_]{8,}\.[a-z0-9]+$/i.test(path.basename(rel)) && /[0-9]/.test(path.basename(rel));

const md5File = (abs) => createHash("md5").update(fs.readFileSync(abs)).digest("hex");

// 抽样：每个目录取第一个、最大的一个、每种扩展名各一个（视频、字体、.gz、m3u8 这些容易出头部问题的都能覆盖到），最多 6 个。
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
      if (chosen.size >= 6) break;
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
  console.log(`资产根地址：${config.base}${config.enabled ? "" : "（开关已关：不会搬，全部留在 EdgeOne）"}`);
  console.log("");
  console.log("整目录搬到 COS：");
  for (const d of p.dirs) console.log(`  ${fmtMB(d.size).padStart(7)} MB  ${String(d.files).padStart(5)} 个  /${d.prefix}/`);
  if (p.files.length) {
    console.log("单个大文件搬到 COS：");
    for (const f of p.files) console.log(`  ${fmtMB(f.size).padStart(7)} MB          /${f.path}`);
  }
  console.log("");
  console.log(`原来整包：${fmtMB(p.total)} MB（${p.totalFiles} 个文件）`);
  console.log(`搬到 COS：${fmtMB(p.moved)} MB（${p.dirs.length} 个目录 + ${p.files.length} 个单文件，${p.dirs.length + p.files.length} 条跳转）`);
  console.log(`留在 EdgeOne：${fmtMB(p.remaining)} MB`);
}

async function cmdPlan() {
  const config = loadConfig();
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  const p = plan(dir, config);
  if (opt("json", false)) console.log(JSON.stringify(p, null, 2));
  else printPlan(p, config, dir);
}

async function cmdApply() {
  const config = loadConfig();
  if (!config.enabled) {
    console.log("COS 拆分开关已关（deploy/cos-assets.json enabled=false 或 DUOMEI_ASSETS_ON_COS=0）：不写清单，不加跳转，整站照旧全部放 EdgeOne。");
    if (fs.existsSync(MANIFEST_PATH)) fs.rmSync(MANIFEST_PATH);
    return;
  }
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  const p = plan(dir, config);
  printPlan(p, config, dir);
  // 每个目录记几个样本文件（路径 + 大小），发布后 dist 已被 CLI 重新构建（拆过），验证时用它们。
  const samples = pickSamples(listMovedFiles(dir, { dirs: p.dirs, files: p.files }), p).map((f) => ({ rel: f.rel, size: f.size }));
  const manifest = { base: config.base, generatedAt: new Date().toISOString(), dirs: p.dirs, files: p.files, samples };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const eo = JSON.parse(fs.readFileSync(EDGEONE_JSON, "utf8"));
  const ours = new Set(redirectsFor(p, config.base).map((r) => r.source));
  const kept = (eo.redirects ?? []).filter((r) => !ours.has(r.source) && !String(r.destination).startsWith(`${config.base}/`));
  eo.redirects = [...redirectsFor(p, config.base), ...kept];
  fs.writeFileSync(EDGEONE_JSON, `${JSON.stringify(eo, null, 2)}\n`);
  console.log(`已写 ${path.relative(ROOT, MANIFEST_PATH)}，edgeone.json 加了 ${ours.size} 条 302 跳转。`);
}

async function cmdStrip() {
  const manifest = readManifest();
  if (!manifest) return; // 本地构建、开关关闭：什么都不做
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  let bytes = 0;
  let count = 0;
  for (const f of listMovedFiles(dir, manifest)) {
    bytes += f.size;
    count += 1;
  }
  for (const d of manifest.dirs) fs.rmSync(path.join(dir, d.prefix), { recursive: true, force: true });
  for (const f of manifest.files) fs.rmSync(path.join(dir, f.path), { force: true });
  console.log(`[cos-assets] 已从 ${path.relative(ROOT, dir) || dir} 去掉搬到 COS 的 ${count} 个文件（${fmtMB(bytes)} MB），由 edgeone.json 跳转到 ${manifest.base}。`);
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

async function cmdSync() {
  const config = loadConfig();
  const dryRun = Boolean(opt("dry-run", false));
  const force = Boolean(opt("force", false)); // 全部重传（改了 Content-Type / Cache-Control 规则时用）
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  const manifest = readManifest() ?? (() => {
    const p = plan(dir, config);
    return { base: config.base, dirs: p.dirs, files: p.files };
  })();
  const local = listMovedFiles(dir, manifest);
  const totalBytes = local.reduce((s, f) => s + f.size, 0);
  console.log(`本地待同步：${local.length} 个文件，${fmtMB(totalBytes)} MB`);

  if (dryRun && !process.env.COS_TMP_SECRET_ID) {
    const byType = {};
    for (const f of local) {
      const t = contentTypeOf(f.rel);
      byType[t] = (byType[t] ?? 0) + 1;
    }
    console.log("（演练：没有 COS 临时凭证，只列计划，不连 COS）");
    for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${t}`);
    const sample = local.slice(0, 5).map((f) => `  ${f.rel} → ${config.base}/${encodePath(f.rel)}  [${contentTypeOf(f.rel)}; ${looksHashed(f.rel) ? config.immutableCacheControl : config.cacheControl}]`);
    console.log(sample.join("\n"));
    return;
  }

  // 只用 OIDC 换来的 STS 临时凭证（三件套缺一不可），不接受长期密钥。
  const { COS_TMP_SECRET_ID, COS_TMP_SECRET_KEY, COS_TMP_TOKEN, COS_SDK_DIR } = process.env;
  if (!COS_TMP_SECRET_ID || !COS_TMP_SECRET_KEY || !COS_TMP_TOKEN) throw new Error("缺 COS 临时凭证（CI 里先 source scripts/cos-oidc-credentials.sh 再 cos_oidc_assume）。");
  if (!config.bucket) throw new Error("deploy/cos-assets.json 里 bucket 还没填（要带 appid，如 duomei-assets-1250000000）。");
  const require = createRequire(path.join(path.resolve(COS_SDK_DIR || ROOT), "noop.js"));
  const COS = require("cos-nodejs-sdk-v5");
  const cos = new COS({ SecretId: COS_TMP_SECRET_ID, SecretKey: COS_TMP_SECRET_KEY, SecurityToken: COS_TMP_TOKEN, Timeout: 120000 });
  const Bucket = config.bucket;
  const Region = config.region;

  // 列出桶里已有的对象（只看本次涉及的前缀），按 ETag（简单上传 = MD5）+ 大小判断要不要重传。
  const remote = new Map();
  const prefixes = [...manifest.dirs.map((d) => `${d.prefix}/`), ...manifest.files.map((f) => f.path)];
  for (const Prefix of prefixes) {
    let Marker = "";
    for (;;) {
      const res = await cos.getBucket({ Bucket, Region, Prefix, Marker, MaxKeys: 1000 });
      for (const o of res.Contents ?? []) remote.set(o.Key, { etag: String(o.ETag).replace(/"/g, ""), size: Number(o.Size) });
      if (res.IsTruncated === "true" || res.IsTruncated === true) Marker = res.NextMarker || res.Contents.at(-1).Key;
      else break;
    }
  }

  const todo = [];
  for (const f of local) {
    const r = remote.get(f.rel);
    if (!force && r && r.size === f.size && r.etag === md5File(f.abs)) continue;
    todo.push(f);
  }
  const todoBytes = todo.reduce((s, f) => s + f.size, 0);
  console.log(`COS 上已有 ${remote.size} 个；要上传 ${todo.length} 个（${fmtMB(todoBytes)} MB），其余未变跳过。`);
  if (dryRun) {
    for (const f of todo.slice(0, 40)) console.log(`  会上传 ${f.rel}（${fmtMB(f.size)} MB）`);
    return;
  }

  let done = 0;
  let failed = 0;
  await pool(todo, 8, async (f) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await cos.putObject({
          Bucket,
          Region,
          Key: f.rel,
          Body: fs.createReadStream(f.abs),
          ContentLength: f.size,
          ContentType: contentTypeOf(f.rel),
          CacheControl: looksHashed(f.rel) ? config.immutableCacheControl : config.cacheControl,
        });
        done += 1;
        if (done % 100 === 0 || done === todo.length) console.log(`  已上传 ${done}/${todo.length}`);
        return;
      } catch (error) {
        if (attempt === 3) {
          failed += 1;
          console.error(`  上传失败 ${f.rel}: ${error?.message ?? error?.error?.Message ?? JSON.stringify(error)}`);
        }
      }
    }
  });
  const localKeys = new Set(local.map((f) => f.rel));
  const orphans = [...remote.keys()].filter((k) => !localKeys.has(k));
  if (orphans.length) console.log(`COS 上有 ${orphans.length} 个本次网站里已不用的旧文件，保留不删（旧部署可能还在引用）。`);
  if (failed) throw new Error(`${failed} 个文件上传失败`);
  console.log("同步完成。");
}

async function cmdCheck() {
  const config = loadConfig();
  const base = String(opt("base", config.base)).replace(/\/+$/, "");
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  const manifest = readManifest() ?? (() => {
    const p = plan(dir, config);
    return { dirs: p.dirs, files: p.files };
  })();
  const origin = String(opt("origin", "https://duomei.site"));
  const local = listMovedFiles(dir, manifest);
  const picks = manifest.samples?.length && !local.length ? manifest.samples : pickSamples(local, manifest);
  let bad = 0;
  // 用带 Range 的 GET（视频拖动、HLS 分片都靠它）：要 206、总长对得上、有跨域头、类型对、.gz 不能带 Content-Encoding。
  await pool(picks, 8, async (f) => {
    const url = `${base}/${encodePath(f.rel)}`;
    try {
      const res = await fetch(url, { headers: { Origin: origin, Range: "bytes=0-15" }, signal: AbortSignal.timeout(30000) });
      await res.arrayBuffer();
      const total = Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? res.headers.get("content-length"));
      const acao = res.headers.get("access-control-allow-origin");
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const encoding = res.headers.get("content-encoding") ?? "";
      const problems = [];
      if (res.status !== 206) problems.push(`状态 ${res.status}（要 206）`);
      if (total !== f.size) problems.push(`大小 ${total}/${f.size}`);
      if (!(acao === "*" || acao === origin)) problems.push(`跨域头 ${acao}`);
      if (type !== contentTypeOf(f.rel).split(";")[0]) problems.push(`类型 ${type}`);
      if (extOf(f.rel) === "gz" && encoding) problems.push(`.gz 带了 Content-Encoding: ${encoding}`);
      if (problems.length) {
        bad += 1;
        console.log(`  ✗ ${problems.join("，")}  ${url}`);
      }
    } catch (error) {
      bad += 1;
      console.log(`  ✗ ${error.message} ${url}`);
    }
  });
  console.log(`抽查 ${picks.length} 个文件，${picks.length - bad} 个正常，${bad} 个有问题。`);
  if (bad) process.exitCode = 1;
}

// 发布前体积闸：EdgeOne 单次部署超过约 1.1GB 会整站 HTTPS 断开（10-16 实测），留在 EdgeOne 的部分超过上限就不发。
async function cmdGuard() {
  const config = loadConfig();
  // 拆到 COS 时留在 EdgeOne 的部分要 < 300MB（目标）；没拆时只防 1.1GB 断站线。
  const dir = path.resolve(ROOT, opt("dir", "dist"));
  const manifest = readManifest();
  const maxMB = manifest ? Number(opt("max-cos-mb", 300)) : Number(opt("max-mb", 1000));
  const total = scan(dir, new Set()).size;
  const moved = manifest ? listMovedFiles(dir, manifest).reduce((s, f) => s + f.size, 0) : 0;
  const remaining = total - moved;
  console.log(`EdgeOne 这次要部署 ${fmtMB(remaining)} MB（整包 ${fmtMB(total)} MB${manifest ? `，${fmtMB(moved)} MB 在 COS` : "，没拆"}），上限 ${maxMB} MB。`);
  if (remaining > maxMB * MB) {
    console.error(`::error::留在 EdgeOne 的部分 ${fmtMB(remaining)} MB 超过 ${maxMB} MB，停止发布（${config.enabled ? "检查 COS 拆分是否生效" : "打开 COS 拆分或先瘦身"}）。`);
    process.exitCode = 1;
  }
}

// 发布后验证：站点上被搬走的路径会 302 到资产域名，跟过去能拿到文件。
async function cmdVerifySite() {
  const site = String(opt("site", "https://duomei.site")).replace(/\/+$/, "");
  const query = opt("query", "");
  const manifest = readManifest();
  if (!manifest) {
    console.log("没有 .cos-split.json：这次没拆，跳过。");
    return;
  }
  const samples = manifest.samples ?? [];
  const picks = [
    ...manifest.dirs.map((d) => samples.find((f) => f.rel.startsWith(`${d.prefix}/`))),
    ...manifest.files.map((f) => samples.find((s) => s.rel === f.path)),
  ].filter(Boolean);
  if (!picks.length) throw new Error(".cos-split.json 里没有样本文件");
  let bad = 0;
  await pool(picks, 6, async (f) => {
    const url = `${site}/${encodePath(f.rel)}${query ? `?${query}` : ""}`;
    try {
      const first = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
      const location = first.headers.get("location") ?? "";
      const final = await fetch(url, { headers: { Origin: site }, signal: AbortSignal.timeout(60000) });
      const body = final.body ? await final.arrayBuffer() : new ArrayBuffer(0);
      const ok = [301, 302, 307, 308].includes(first.status) && location.startsWith(`${manifest.base}/`) && final.status === 200 && body.byteLength === f.size;
      if (!ok) {
        bad += 1;
        console.log(`  ✗ ${first.status} → ${location || "(无跳转)"} → ${final.status} ${body.byteLength}/${f.size}  ${url}`);
      }
    } catch (error) {
      bad += 1;
      console.log(`  ✗ ${error.message} ${url}`);
    }
  });
  console.log(`站点跳转验证：${picks.length} 处，${picks.length - bad} 个正常，${bad} 个有问题。`);
  if (bad) process.exitCode = 1;
}

const commands = { plan: cmdPlan, apply: cmdApply, strip: cmdStrip, sync: cmdSync, check: cmdCheck, guard: cmdGuard, "verify-site": cmdVerifySite };
if (!commands[command]) {
  console.error("用法：node scripts/cos-assets.mjs <plan|apply|strip|sync|check|guard|verify-site> [--dir dist] [--dry-run] [--json]");
  process.exit(2);
}
commands[command]().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
