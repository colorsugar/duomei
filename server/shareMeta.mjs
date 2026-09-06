// Route-aware share metadata for the SPA shell. EdgeOne serves the same
// index.html for every path, so crawlers must be handed a rewritten copy.
// Runs in the V8 edge runtime: Web APIs only, no Node built-ins.

export const SITE_NAME = "DUOMEI 多美小记";
export const ZAOBAO_SOURCE = "https://zaobao-six.vercel.app";

const DEFAULT_DESCRIPTION = "记录旅途中的风景、生活片段、旅行照片和心情文字。";
const ZAOBAO_DESCRIPTION = "国际、国内、日本、科技、AI、新品、兴趣、日常，八个栏目的每日早报。";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CRAWLER_PATTERN =
  /bot|spider|crawl|slurp|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|embedly|pinterest|applebot|bytespider|baiduspider|sogou|yisou|360spider|skypeuripreview|iframely|mastodon|bluesky|dingtalk|feishu|lark|preview/i;

export function isCrawler(userAgent) {
  return CRAWLER_PATTERN.test(userAgent ?? "");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeText(fragment) {
  return fragment
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEditionSummary(html) {
  const headline = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const lede = html.match(/class="lede"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return {
    headline: headline ? decodeText(headline) : "",
    lede: lede ? decodeText(lede) : "",
  };
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

// Static per-route copy. `date` is only set for /zaobao/:date.
export function staticShareMeta(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "zaobao") {
    if (segments.length === 1) return { title: "今日早报", description: ZAOBAO_DESCRIPTION, sourceUrl: `${ZAOBAO_SOURCE}/` };
    if (segments[1] === "archive" && segments.length === 2) return { title: "往期早报", description: "翻看过去每一天的早报。" };
    if (segments.length === 2 && DATE_PATTERN.test(segments[1])) {
      return { title: `${segments[1]} 早报`, description: ZAOBAO_DESCRIPTION, sourceUrl: `${ZAOBAO_SOURCE}/${segments[1]}/` };
    }
    return { title: "早报", description: ZAOBAO_DESCRIPTION };
  }
  if (segments[0] === "guyu" && segments.length === 1) {
    return { title: "故语", description: "一架旧书与新说：纸上飞檐、想象画本、月亮下的童梦、桂巷还香。" };
  }
  if (segments[0] === "skills" && segments.length === 1) {
    return { title: "Skill", description: "多美整理的 AI Agent Skill 目录，公开在 colorsugar/agent-skills。" };
  }
  return null;
}

export async function resolveShareMeta(pathname, { crawler = false, fetchImpl = fetch, timeoutMs = 1500 } = {}) {
  const meta = staticShareMeta(pathname);
  if (!meta) return null;
  const { sourceUrl, ...rest } = meta;
  if (!crawler || !sourceUrl) return rest;
  try {
    const response = await withTimeout(fetchImpl(sourceUrl, { headers: { accept: "text/html" } }), timeoutMs);
    if (!response.ok) return rest;
    const { headline, lede } = extractEditionSummary(await response.text());
    return {
      title: headline ? `${headline} · ${rest.title}` : rest.title,
      description: lede || rest.description,
    };
  } catch {
    return rest;
  }
}

function replaceMeta(html, attribute, name, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="[^"]*"\\s*/?>`, "i");
  const tag = `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

export function injectShareMeta(html, meta, pageUrl) {
  const fullTitle = `${meta.title} | ${SITE_NAME}`;
  const origin = new URL(pageUrl).origin;
  let output = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  output = replaceMeta(output, "name", "description", meta.description ?? DEFAULT_DESCRIPTION);
  output = replaceMeta(output, "property", "og:title", meta.title);
  output = replaceMeta(output, "property", "og:description", meta.description ?? DEFAULT_DESCRIPTION);
  output = replaceMeta(output, "property", "og:image", `${origin}/og-image.svg`);
  output = replaceMeta(output, "property", "og:url", pageUrl);
  output = replaceMeta(output, "name", "twitter:title", meta.title);
  output = replaceMeta(output, "name", "twitter:description", meta.description ?? DEFAULT_DESCRIPTION);
  output = replaceMeta(output, "name", "twitter:image", `${origin}/og-image.svg`);
  return output;
}

// fetch() hands back a decoded body, so byte-level headers no longer describe it.
function stripByteHeaders(source) {
  const headers = new Headers(source);
  for (const name of ["content-length", "content-encoding", "etag"]) headers.delete(name);
  return headers;
}

export async function rewriteShellResponse(request, response, options = {}) {
  const url = new URL(request.url);
  const meta = await resolveShareMeta(url.pathname, {
    crawler: isCrawler(request.headers.get("user-agent")),
    ...options,
  });
  if (!meta || !response.ok || !/text\/html/i.test(response.headers.get("content-type") ?? "")) return response;
  // Read a clone so an opaque or unexpected body can still be passed through untouched.
  const source = await response.clone().text();
  if (!/<\/head>/i.test(source) || !/<div id="root">/.test(source)) return response;
  const html = injectShareMeta(source, meta, `${url.origin}${url.pathname}`);
  const headers = stripByteHeaders(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-duomei-share", "rewritten");
  return new Response(html, { status: response.status, headers });
}

// Edge Function entry shared by every share-aware route. The SPA shell is
// fetched from the site's own static origin; if that fails the origin's
// answer is returned untouched so the route degrades to plain static serving.
export async function handleShellRequest(request, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const shellUrl = new URL("/index.html", request.url);
    const shell = await fetchImpl(shellUrl.href, { headers: { accept: "text/html" } });
    if (!shell.ok) return shell;
    const rewritten = await rewriteShellResponse(request, shell, options);
    if (rewritten !== shell) return rewritten;
    const headers = stripByteHeaders(shell.headers);
    headers.set("x-duomei-share", `pass ${new URL(request.url).pathname}`);
    return new Response(shell.body, { status: shell.status, headers });
  } catch (error) {
    // Last resort: let the platform answer the original URL (SPA fallback) rather than failing the route.
    const note = `error ${error instanceof Error ? error.message : String(error)}`.slice(0, 200);
    try {
      const origin = await fetchImpl(request.url, { headers: { accept: "text/html" } });
      const headers = stripByteHeaders(origin.headers);
      headers.set("x-duomei-share", note);
      return new Response(origin.body, { status: origin.status, headers });
    } catch {
      return new Response("早报暂时打不开，请稍后再试。", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-duomei-share": note },
      });
    }
  }
}
