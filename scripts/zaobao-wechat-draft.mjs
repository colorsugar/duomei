#!/usr/bin/env node
/**
 * 多美早报 → 微信公众号草稿
 *
 * 默认 dry-run：拉今日早报、打成公众号 HTML，写到 artifacts/zaobao-wechat/，不调微信。
 * 有 WECHAT_APP_ID + WECHAT_APP_SECRET 时：
 *   node scripts/zaobao-wechat-draft.mjs --draft
 * 才真正新建草稿（默认不 freepublish；要发布再加 --publish）。
 *
 * 微信侧前提：公众平台开开发者、配 IP 白名单（跑脚本的出口 IP）。
 * 凭证只放环境变量 / GitHub Secrets，禁止写进仓库。
 *
 * 用法：
 *   node scripts/zaobao-wechat-draft.mjs
 *   node scripts/zaobao-wechat-draft.mjs --date 2026-09-08
 *   node scripts/zaobao-wechat-draft.mjs --draft
 *   node scripts/zaobao-wechat-draft.mjs --self-check
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ZAOBAO_SOURCE = "https://zaobao-six.vercel.app";
export const SITE_ZAOBAO = "https://duomei.site/zaobao";
const WECHAT_TOKEN = "https://api.weixin.qq.com/cgi-bin/token";
const WECHAT_DRAFT_ADD = "https://api.weixin.qq.com/cgi-bin/draft/add";
const WECHAT_UPLOAD_IMG = "https://api.weixin.qq.com/cgi-bin/media/uploadimg";
const WECHAT_ADD_MATERIAL = "https://api.weixin.qq.com/cgi-bin/material/add_material";
const WECHAT_FREEPUBLISH = "https://api.weixin.qq.com/cgi-bin/freepublish/submit";
const MAX_TITLE = 32;
const MAX_DIGEST = 120;
const MAX_CONTENT_CHARS = 20000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "artifacts", "zaobao-wechat");

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  return m ? decodeEntities(m[2] ?? m[3] ?? "") : null;
}

function safeHttpsUrl(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function clip(text, max) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Mirror of src/pages/DuomeiZaobaoPage.tsx parseEdition, Node-safe (no DOMParser). */
export function parseEdition(html, base = ZAOBAO_SOURCE) {
  // Prefer the main .page block when present; fall back to full document.
  // Avoid non-greedy first-</div> cuts — editions nest <div class="group"> inside .page.
  let page = html;
  const pageOpen = html.search(/<div\s+class=["']page["'][^>]*>/i);
  if (pageOpen >= 0) {
    const afterOpen = html.indexOf(">", pageOpen) + 1;
    let depth = 1;
    let i = afterOpen;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
      } else {
        depth -= 1;
        if (depth === 0) {
          page = html.slice(afterOpen, nextClose);
          break;
        }
        i = nextClose + 6;
      }
    }
  }

  const headline = stripTags((page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  if (!headline) return null;

  const date = stripTags((page.match(/<p\s+class=["']date["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
  const lede = stripTags((page.match(/<p\s+class=["']lede["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");

  const groups = [];
  let groupIndex = 0;

  // Current editions: <section id="…">; older: <div class="group" id="…">.
  const blockRe = /<(section|div)\b([^>]*\bid=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/\1>/gi;
  let blockMatch;
  while ((blockMatch = blockRe.exec(page))) {
    const tag = blockMatch[1].toLowerCase();
    const openAttrs = blockMatch[2];
    const sectionId = blockMatch[3];
    const body = blockMatch[4];
    if (tag === "div" && !/\bclass=["'][^"']*\bgroup\b/i.test(openAttrs)) continue;

    const name = stripTags(
      (body.match(/<h2[^>]*class=["']sec["'][^>]*>([\s\S]*?)<\/h2>/i) ||
        body.match(/<(?:p|div)[^>]*class=["']group-name["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i) ||
        body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
        [])[1] || "",
    );
    if (!name || name.length > 20) continue;

    const stories = [];
    const articleRe = /<article\b([^>]*)>([\s\S]*?)<\/article>/gi;
    let articleMatch;
    let storyIndex = 0;
    while ((articleMatch = articleRe.exec(body))) {
      const articleAttrs = articleMatch[1];
      const article = articleMatch[2];
      const title = stripTags((article.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || "");
      if (!title) continue;
      const dataId = attr(`<x ${articleAttrs}>`, "data-id");
      const imgTag = (article.match(/<img\b[^>]*>/i) || [])[0] || "";
      const src = attr(imgTag, "src");
      const alt = attr(imgTag, "alt");
      const caption = stripTags((article.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1] || "");
      const sourceA = article.match(/<p\s+class=["']source["'][^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>/i);
      const sourceHref = sourceA?.[1] ? attr(`<a ${sourceA[1]}>`, "href") : null;
      const sourceLabel = sourceA?.[2] ? stripTags(sourceA[2]).replace(/^来源[：:]\s*/, "") : null;
      const paragraphs = [];
      const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRe.exec(article))) {
        const pAttrs = pMatch[1] || "";
        if (/\bclass=["'][^"']*\b(source|fb|kicker|date|orig-link)\b/i.test(pAttrs)) continue;
        const text = stripTags(pMatch[2]);
        if (text) paragraphs.push(text);
      }
      stories.push({
        id: dataId || `${groupIndex + 1}-${storyIndex + 1}`,
        title,
        paragraphs,
        image: safeHttpsUrl(src, base),
        imageAlt: (alt || title).trim(),
        imageSource: caption || null,
        sourceLabel,
        sourceUrl: safeHttpsUrl(sourceHref, base),
      });
      storyIndex += 1;
    }
    if (stories.length) {
      groups.push({ id: `zaobao-group-${sectionId || groupIndex + 1}`, name, stories });
      groupIndex += 1;
    }
  }

  if (!groups.length) return null;

  const bodies = new Map();
  const tplRe = /<template\b[^>]*\bid=["']tpl-([^"']+)["'][^>]*>([\s\S]*?)<\/template>/gi;
  let tplMatch;
  while ((tplMatch = tplRe.exec(html))) {
    const paragraphs = [];
    const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRe.exec(tplMatch[2]))) {
      if (/\bclass=["'][^"']*\b(source|fb|kicker|date|orig-link)\b/i.test(pMatch[1] || "")) continue;
      const text = stripTags(pMatch[2]);
      if (text) paragraphs.push(text);
    }
    if (tplMatch[1] && paragraphs.length) bodies.set(tplMatch[1], paragraphs);
  }
  for (const group of groups) {
    for (const story of group.stories) {
      story.body = bodies.get(story.id) ?? story.paragraphs;
    }
  }

  return { headline, date, lede, groups };
}

export function editionSourceUrl(dateIso) {
  return dateIso ? `${ZAOBAO_SOURCE}/${dateIso}/` : `${ZAOBAO_SOURCE}/`;
}

export function siteEditionUrl(dateIso) {
  return dateIso ? `${SITE_ZAOBAO}/${dateIso}` : SITE_ZAOBAO;
}

export function isoDateFromLabel(label) {
  const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : undefined;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build WeChat news HTML. External image URLs are omitted unless imageMap remaps them
 * to WeChat-hosted uploadimg URLs (WeChat strips foreign image hosts).
 */
export function buildWechatArticle(edition, { dateIso, imageMap = new Map() } = {}) {
  const sourceUrl = siteEditionUrl(dateIso || isoDateFromLabel(edition.date));
  const parts = [];
  parts.push(`<p style="color:#6b6458;font-size:14px;">${escapeHtml(edition.date || "")}</p>`);
  if (edition.lede) parts.push(`<p>${escapeHtml(edition.lede)}</p>`);
  parts.push(`<p style="color:#8a3b24;">DUOMEI · 早报</p><hr/>`);

  for (const group of edition.groups) {
    parts.push(`<h2 style="color:#8a3b24;font-size:16px;">${escapeHtml(group.name)}</h2>`);
    for (const story of group.stories) {
      parts.push(`<p><strong>${escapeHtml(story.title)}</strong></p>`);
      if (story.image && imageMap.has(story.image)) {
        parts.push(`<p><img src="${escapeHtml(imageMap.get(story.image))}" alt="${escapeHtml(story.imageAlt)}"/></p>`);
      }
      for (const para of story.body ?? story.paragraphs) parts.push(`<p>${escapeHtml(para)}</p>`);
      if (story.sourceUrl) {
        const label = story.sourceLabel || "来源";
        parts.push(`<p><a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(label)}</a></p>`);
      }
    }
  }

  parts.push(`<hr/><p>完整阅读：<a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>`);

  let content = parts.join("");
  if (content.length > MAX_CONTENT_CHARS) {
    content = `${content.slice(0, MAX_CONTENT_CHARS - 40)}</p><p>……全文见 ${escapeHtml(sourceUrl)}</p>`;
  }

  return {
    title: clip(edition.headline, MAX_TITLE),
    author: "多美",
    digest: clip(edition.lede || edition.headline, MAX_DIGEST),
    content,
    content_source_url: sourceUrl,
  };
}

export async function fetchEditionHtml(dateIso, fetchImpl = fetch) {
  const url = editionSourceUrl(dateIso);
  const res = await fetchImpl(url, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`早报源站 ${url} → ${res.status}`);
  return { html: await res.text(), url };
}

async function getAccessToken(appId, appSecret, fetchImpl = fetch) {
  const url = `${WECHAT_TOKEN}?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const res = await fetchImpl(url);
  const data = await res.json();
  if (!data.access_token) throw new Error(`微信 token 失败: ${data.errcode || res.status} ${data.errmsg || ""}`.trim());
  return data.access_token;
}

async function uploadContentImage(token, imageUrl, fetchImpl = fetch) {
  const imgRes = await fetchImpl(imageUrl);
  if (!imgRes.ok) throw new Error(`拉图失败 ${imageUrl} → ${imgRes.status}`);
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  const name = imageUrl.split("/").pop()?.split("?")[0] || "cover.jpg";
  const form = new FormData();
  form.append("media", new Blob([bytes]), name);
  const res = await fetchImpl(`${WECHAT_UPLOAD_IMG}?access_token=${encodeURIComponent(token)}`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.url) throw new Error(`uploadimg 失败: ${data.errcode} ${data.errmsg || ""}`.trim());
  return data.url;
}

async function uploadThumb(token, imageUrl, fetchImpl = fetch) {
  const imgRes = await fetchImpl(imageUrl);
  if (!imgRes.ok) throw new Error(`封面拉图失败 ${imageUrl} → ${imgRes.status}`);
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  const name = imageUrl.split("/").pop()?.split("?")[0] || "thumb.jpg";
  const form = new FormData();
  form.append("media", new Blob([bytes]), name);
  const res = await fetchImpl(`${WECHAT_ADD_MATERIAL}?access_token=${encodeURIComponent(token)}&type=thumb`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!data.media_id) throw new Error(`thumb 上传失败: ${data.errcode} ${data.errmsg || ""}`.trim());
  return data.media_id;
}

async function addDraft(token, article, fetchImpl = fetch) {
  const body = JSON.stringify({ articles: [article] });
  const res = await fetchImpl(`${WECHAT_DRAFT_ADD}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: Buffer.from(body, "utf8"),
  });
  const data = await res.json();
  if (!data.media_id) throw new Error(`draft/add 失败: ${data.errcode} ${data.errmsg || ""}`.trim());
  return data.media_id;
}

async function freepublish(token, mediaId, fetchImpl = fetch) {
  const res = await fetchImpl(`${WECHAT_FREEPUBLISH}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ media_id: mediaId }),
  });
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`freepublish 失败: ${data.errcode} ${data.errmsg || ""}`.trim());
  }
  return data;
}

function parseArgs(argv) {
  const args = { date: undefined, draft: false, publish: false, uploadImages: false, selfCheck: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--date") args.date = argv[++i];
    else if (a === "--draft") args.draft = true;
    else if (a === "--publish") args.publish = true;
    else if (a === "--upload-images") args.uploadImages = true;
    else if (a === "--self-check") args.selfCheck = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const FIXTURE = `<!DOCTYPE html><html><body><div class="page">
<h1>测标题：折叠屏与直面会</h1>
<p class="date">2026年9月8日 星期二</p>
<p class="lede">昨夜发布会落地，今晚直面会。</p>
<section id="guoji"><h2 class="sec">国际</h2>
<article data-id="story-a" data-title="A">
<figure><img src="https://example.com/a.png" alt="图A"><figcaption>图注</figcaption></figure>
<h2>第一条新闻</h2>
<p>正文一段。</p>
<p class="source"><a href="https://example.com/src">来源：Example</a></p>
<p class="fb">反馈</p>
</article>
</section>
<div class="group" id="keji"><p class="group-name">科技</p>
<article data-id="story-b">
<h2>第二条</h2>
<p>科技正文。</p>
</article>
</div>
<template id="tpl-story-a"><div class="sheet-article"><p class="kicker">国际</p><p>长文一段。</p><p class="source">来源</p></div></template>
</div></body></html>`;

export function selfCheck() {
  const edition = parseEdition(FIXTURE);
  if (!edition) throw new Error("parseEdition returned null");
  if (edition.headline !== "测标题：折叠屏与直面会") throw new Error(`headline=${edition.headline}`);
  if (edition.groups.length !== 2) throw new Error(`groups=${edition.groups.length}`);
  if (edition.groups[0].name !== "国际" || edition.groups[1].name !== "科技") {
    throw new Error(`names=${edition.groups.map((g) => g.name)}`);
  }
  if (edition.groups[0].stories[0].id !== "story-a") throw new Error("story id");
  if (edition.groups[0].stories[0].paragraphs.join("|") !== "正文一段。") throw new Error("paragraphs leaked source/fb");
  if (edition.groups[0].stories[0].body.join("|") !== "长文一段。") throw new Error("body should come from template");
  if (edition.groups[1].stories[0].body.join("|") !== "科技正文。") throw new Error("body should fall back to card text");
  const article = buildWechatArticle(edition, { dateIso: "2026-09-08" });
  if (article.title.length > MAX_TITLE) throw new Error("title too long");
  if (!article.content.includes("第一条新闻") || !article.content.includes("DUOMEI")) throw new Error("content missing");
  if (article.content.includes("https://example.com/a.png")) throw new Error("external image should be omitted without map");
  if (article.content_source_url !== "https://duomei.site/zaobao/2026-09-08") throw new Error("source url");
  return { ok: true, groups: edition.groups.length, title: article.title };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/zaobao-wechat-draft.mjs [--date YYYY-MM-DD] [--draft] [--publish] [--upload-images] [--self-check]`);
    return;
  }
  if (args.selfCheck) {
    console.log(JSON.stringify(selfCheck()));
    return;
  }

  const { html, url } = await fetchEditionHtml(args.date);
  const edition = parseEdition(html, url);
  if (!edition) throw new Error("无法解析早报 HTML");
  const dateIso = args.date || isoDateFromLabel(edition.date);

  const appId = process.env.WECHAT_APP_ID || "";
  const appSecret = process.env.WECHAT_APP_SECRET || "";
  let token = null;
  const imageMap = new Map();
  let thumbMediaId = process.env.WECHAT_THUMB_MEDIA_ID || "";

  if (args.draft || args.publish) {
    if (!appId || !appSecret) {
      throw new Error("缺 WECHAT_APP_ID / WECHAT_APP_SECRET。先 dry-run，或把凭证放进环境变量（别提交进 Git）。");
    }
    token = await getAccessToken(appId, appSecret);
  }

  if (token && args.uploadImages) {
    const urls = [];
    for (const g of edition.groups) for (const s of g.stories) if (s.image) urls.push(s.image);
    const unique = [...new Set(urls)].slice(0, 20);
    for (const imageUrl of unique) {
      try {
        imageMap.set(imageUrl, await uploadContentImage(token, imageUrl));
      } catch (err) {
        console.warn(`跳过图片 ${imageUrl}: ${err.message}`);
      }
    }
    if (!thumbMediaId && unique[0]) {
      thumbMediaId = await uploadThumb(token, unique[0]);
    }
  }

  const article = buildWechatArticle(edition, { dateIso, imageMap });
  if ((args.draft || args.publish) && !thumbMediaId) {
    throw new Error("草稿需要封面 thumb_media_id。设 WECHAT_THUMB_MEDIA_ID，或加 --upload-images 自动上传首图。");
  }

  const payload = {
    ...article,
    thumb_media_id: thumbMediaId || undefined,
    need_open_comment: 0,
    only_fans_can_comment: 0,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const stamp = dateIso || "today";
  const htmlPath = join(OUT_DIR, `${stamp}.html`);
  const jsonPath = join(OUT_DIR, `${stamp}.json`);
  await writeFile(htmlPath, article.content, "utf8");
  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        title: article.title,
        author: article.author,
        digest: article.digest,
        content_source_url: article.content_source_url,
        storyCount: edition.groups.reduce((n, g) => n + g.stories.length, 0),
        groups: edition.groups.map((g) => ({ name: g.name, count: g.stories.length })),
        draft: Boolean(args.draft),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`早报：${edition.headline}`);
  console.log(`日期：${edition.date} (${dateIso || "—"})`);
  console.log(`栏目：${edition.groups.map((g) => `${g.name}×${g.stories.length}`).join(" · ")}`);
  console.log(`标题(≤32)：${article.title}`);
  console.log(`写出：${htmlPath}`);
  console.log(`写出：${jsonPath}`);

  if (!args.draft && !args.publish) {
    console.log("dry-run 完成。要进草稿箱：配好凭证后加 --draft；再发到已发布加 --publish。");
    return;
  }

  const mediaId = await addDraft(token, payload);
  console.log(`草稿 media_id=${mediaId}`);
  if (args.publish) {
    const pub = await freepublish(token, mediaId);
    console.log(`已提交发布 publish_id=${pub.publish_id ?? "?"}`);
  } else {
    console.log("已进草稿箱，未自动发布。公众号后台审一眼再发，或下次加 --publish。");
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
