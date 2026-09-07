// Same-origin relay for the zaobao source. The reader used to fetch
// zaobao-six.vercel.app straight from the visitor's browser, which is
// unreachable from mainland China; the edge fetches it instead.
// Runs in the V8 edge runtime: Web APIs only, no Node built-ins.

import { ZAOBAO_SOURCE } from "./shareMeta.mjs";

export const ZAOBAO_PROXY_PREFIX = "/zaobao-src";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

// Only the three documents the reader needs are relayed; the upstream path is
// rebuilt from the parsed pieces so nothing else can be reached through us.
export function upstreamPath(pathname) {
  if (pathname !== ZAOBAO_PROXY_PREFIX && !pathname.startsWith(`${ZAOBAO_PROXY_PREFIX}/`)) return null;
  const segments = pathname.slice(ZAOBAO_PROXY_PREFIX.length).split("/").filter(Boolean);
  if (segments.length === 0) return { path: "/", maxAge: 300 };
  if (segments.length === 1 && DATE_PATTERN.test(segments[0])) return { path: `/${segments[0]}/`, maxAge: 3600 };
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

export async function handleZaobaoProxyRequest(request, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { ...TEXT_HEADERS, allow: "GET, HEAD" } });
  }
  const target = upstreamPath(new URL(request.url).pathname);
  if (!target) return new Response("Not Found", { status: 404, headers: TEXT_HEADERS });

  try {
    const upstream = await withTimeout(
      fetchImpl(`${ZAOBAO_SOURCE}${target.path}`, { method: request.method, headers: { accept: "text/html, application/json" } }),
      timeoutMs,
    );
    if (!upstream.ok) {
      return new Response(`早报源站返回 ${upstream.status}`, {
        status: upstream.status === 404 ? 404 : 502,
        headers: { ...TEXT_HEADERS, "x-duomei-zaobao": `upstream ${upstream.status}` },
      });
    }
    // fetch() hands back a decoded body, so only the content type is worth carrying over.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
        "cache-control": `public, max-age=${target.maxAge}, stale-while-revalidate=86400`,
        "x-duomei-zaobao": `proxy ${target.path}`,
      },
    });
  } catch (error) {
    const note = `error ${error instanceof Error ? error.message : String(error)}`.slice(0, 200);
    return new Response("早报暂时拿不到，请稍后再试。", { status: 502, headers: { ...TEXT_HEADERS, "x-duomei-zaobao": note } });
  }
}
