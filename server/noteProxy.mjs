// Same-origin relay for published notes and their pictures. The site is read
// from mainland China, where *.supabase.co and *.workers.dev are blocked, so
// visitors only ever talk to duomei.site and the edge fetches upstream.
// Runs in the V8 edge runtime: Web APIs only, no Node built-ins.

export const NOTE_DATA_PATH = "/note-data";
export const NOTE_MEDIA_PREFIX = "/note-media/";

export const NOTE_SUPABASE_URL = "https://bokvqndvwqgugkcrizwj.supabase.co";
// Publishable key (safe to ship; RLS only lets it read published notes).
export const NOTE_SUPABASE_KEY = "sb_publishable_WONhLBnVl1ea_sroDggFAw_FuTZlZFX";
export const NOTE_MEDIA_ORIGIN = "https://duomei-media-storage.colorsugar.workers.dev";

// Same pattern the media worker accepts for public objects.
const MEDIA_KEY_PATTERN = /^(?:article|covers|notes|poetry)\/[A-Za-z0-9._-]{1,240}\.(?:gif|jpe?g|png|webp)$/i;
const SLUG_PATTERN = /^[A-Za-z0-9一-鿿._~-]{1,160}$/u;
const TEXT_HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function methodNotAllowed() {
  return new Response("Method Not Allowed", { status: 405, headers: { ...TEXT_HEADERS, allow: "GET, HEAD" } });
}

// Picture links stored in the notes point at the media worker; hand them out as same-origin paths.
export function rewriteMediaLinks(text) {
  return text.split(`${NOTE_MEDIA_ORIGIN}/media/`).join(NOTE_MEDIA_PREFIX);
}

// Only two shapes are relayed (the full list, or one note by slug); the
// upstream query is rebuilt here so nothing else can be asked through us.
export function noteDataUpstream(searchParams) {
  const url = new URL(`${NOTE_SUPABASE_URL}/rest/v1/notes`);
  url.searchParams.set("select", "*");
  url.searchParams.set("status", "eq.published");
  url.searchParams.set("deleted_at", "is.null");
  const slug = searchParams.get("slug");
  if (slug !== null) {
    if (!SLUG_PATTERN.test(slug)) return null;
    url.searchParams.set("slug", `eq.${slug}`);
    url.searchParams.set("limit", "1");
  } else {
    url.searchParams.set("order", "date.desc,updated_at.desc");
  }
  return url;
}

export async function handleNoteDataRequest(request, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed();
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== NOTE_DATA_PATH) return new Response("Not Found", { status: 404, headers: TEXT_HEADERS });
  const upstreamUrl = noteDataUpstream(requestUrl.searchParams);
  if (!upstreamUrl) return new Response("Bad Request", { status: 400, headers: TEXT_HEADERS });

  try {
    const upstream = await withTimeout(fetchImpl(upstreamUrl, {
      headers: {
        apikey: NOTE_SUPABASE_KEY,
        Authorization: `Bearer ${NOTE_SUPABASE_KEY}`,
        Accept: "application/json",
      },
    }), timeoutMs);
    if (!upstream.ok) {
      return new Response(`notes upstream ${upstream.status}`, {
        status: 502,
        headers: { ...TEXT_HEADERS, "x-duomei-notes": `upstream ${upstream.status}` },
      });
    }
    const body = rewriteMediaLinks(await upstream.text());
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Short, so a newly published note shows up within a minute.
        "cache-control": "public, max-age=60, stale-while-revalidate=600",
        "x-duomei-notes": "proxy",
      },
    });
  } catch (error) {
    const note = `error ${error instanceof Error ? error.message : String(error)}`.slice(0, 200);
    return new Response("笔记暂时拿不到，请稍后再试。", { status: 502, headers: { ...TEXT_HEADERS, "x-duomei-notes": note } });
  }
}

export function noteMediaKey(pathname) {
  if (!pathname.startsWith(NOTE_MEDIA_PREFIX)) return null;
  let key;
  try {
    key = decodeURIComponent(pathname.slice(NOTE_MEDIA_PREFIX.length));
  } catch {
    return null;
  }
  return MEDIA_KEY_PATTERN.test(key) ? key : null;
}

export async function handleNoteMediaRequest(request, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed();
  const key = noteMediaKey(new URL(request.url).pathname);
  if (!key) return new Response("Not Found", { status: 404, headers: TEXT_HEADERS });

  try {
    const upstream = await withTimeout(
      fetchImpl(`${NOTE_MEDIA_ORIGIN}/media/${key}`, { method: request.method }),
      timeoutMs,
    );
    if (!upstream.ok) {
      return new Response("Not Found", {
        status: upstream.status === 404 ? 404 : 502,
        headers: { ...TEXT_HEADERS, "x-duomei-media": `upstream ${upstream.status}` },
      });
    }
    // Uploaded keys carry a timestamp and random suffix, so a key never changes content.
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        "x-duomei-media": "proxy",
      },
    });
  } catch (error) {
    const note = `error ${error instanceof Error ? error.message : String(error)}`.slice(0, 200);
    return new Response("图片暂时拿不到", { status: 502, headers: { ...TEXT_HEADERS, "x-duomei-media": note } });
  }
}
