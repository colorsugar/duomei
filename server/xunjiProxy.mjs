// Same-origin relay for the 寻迹 source. Visitors must not talk to
// xihuan.vercel.app from the browser (unreachable from mainland China);
// the edge fetches it instead.
// Runs in the V8 edge runtime: Web APIs only, no Node built-ins.

import { XUNJI_SOURCE } from "./shareMeta.mjs";

export const XUNJI_PROXY_PREFIX = "/xunji-src";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

// Only the documents the reader needs are relayed; the upstream path is
// rebuilt from the parsed pieces so nothing else can be reached through us.
export function upstreamPath(pathname) {
  if (pathname !== XUNJI_PROXY_PREFIX && !pathname.startsWith(`${XUNJI_PROXY_PREFIX}/`)) return null;
  const segments = pathname.slice(XUNJI_PROXY_PREFIX.length).split("/").filter(Boolean);
  if (segments.length === 0) return { path: "/", maxAge: 300 };
  if (segments.length === 1 && DATE_PATTERN.test(segments[0])) return { path: `/${segments[0]}/`, maxAge: 3600 };
  if (segments.length === 1 && segments[0] === "archive") return { path: "/archive/", maxAge: 300 };
  if (segments.length === 2 && segments[0] === "archive" && segments[1] === "manifest.json") {
    return { path: "/archive/manifest.json", maxAge: 300 };
  }
  return null;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function handleXunjiProxyRequest(request, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { ...TEXT_HEADERS, allow: "GET, HEAD" } });
  }
  const target = upstreamPath(new URL(request.url).pathname);
  if (!target) return new Response("Not Found", { status: 404, headers: TEXT_HEADERS });

  try {
    const upstream = await withTimeout(
      fetchImpl(`${XUNJI_SOURCE}${target.path}`, { method: request.method, headers: { accept: "text/html, application/json" } }),
      timeoutMs,
    );
    if (!upstream.ok) {
      return new Response(`寻迹源站返回 ${upstream.status}`, {
        status: upstream.status === 404 ? 404 : 502,
        headers: { ...TEXT_HEADERS, "x-duomei-xunji": `upstream ${upstream.status}` },
      });
    }
    // fetch() hands back a decoded body, so only the content type is worth carrying over.
    // Empty upstream shells (__LOAD__) must not sit in CDN cache for a day.
    const body = await upstream.text();
    const cacheable = body.trim().length > 0 && !/^\s*__LOAD__\s*$/.test(body);
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
        "cache-control": cacheable
          ? `public, max-age=${target.maxAge}, stale-while-revalidate=86400`
          : "no-store",
        "x-duomei-xunji": `proxy ${target.path}`,
      },
    });
  } catch (error) {
    const note = `error ${error instanceof Error ? error.message : String(error)}`.slice(0, 200);
    return new Response("寻迹暂时拿不到，请稍后再试。", { status: 502, headers: { ...TEXT_HEADERS, "x-duomei-xunji": note } });
  }
}
