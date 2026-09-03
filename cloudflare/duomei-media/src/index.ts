const MAX_OBJECT_BYTES = 15 * 1024 * 1024;
const STORAGE_HARD_LIMIT_BYTES = 1_000_000_000;
const PUBLIC_KEY_PATTERN = /^(?:article|covers|notes|poetry)\/[A-Za-z0-9._-]{1,240}\.(?:gif|jpe?g|png|svg|webp)$/i;
const PRIVATE_KEY_PATTERN = new RegExp(
  "^guyu/(?:"
  + "meiyou-yujian/pages/(?:00[1-9]|0[1-4]\\d|05[0-3])"
  + "|gui-xiang-huan-xiang/pages/(?:00[1-9]|0[1-2]\\d|030)"
  + ")\\.webp$",
  "u",
);
const MAX_SIGNED_URL_SECONDS = 120;
const ALLOWED_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

type SupabaseUser = { email?: string };

function json(status: number, body: unknown, origin?: string): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  if (origin) addCors(headers, origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigin(origin: string): boolean {
  if ([
    "https://color-duomei.vercel.app",
    "https://color-rho-ten.vercel.app",
  ].includes(origin)) return true;

  try {
    const url = new URL(origin);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function addCors(headers: Headers, origin: string): void {
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, HEAD, PUT, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-max-age", "86400");
  headers.append("vary", "Origin");
}

function objectKey(pathname: string, prefix: string, pattern: RegExp): string | null {
  if (!pathname.startsWith(prefix)) return null;
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }
  return pattern.test(key) && !key.includes("//") && !key.split("/").includes("..") ? key : null;
}

function publicMediaKey(pathname: string): string | null {
  return objectKey(pathname, "/media/", PUBLIC_KEY_PATTERN);
}

function privateMediaKey(pathname: string): string | null {
  return objectKey(pathname, "/private-media/", PRIVATE_KEY_PATTERN);
}

async function authorizeAdmin(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;

  const commonHeaders = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    authorization,
  };
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: commonHeaders });
  if (!userResponse.ok) return false;
  const user = await userResponse.json<SupabaseUser>();
  if (!user.email) return false;

  const adminURL = new URL(`${env.SUPABASE_URL}/rest/v1/duomei_admins`);
  adminURL.searchParams.set("select", "email");
  adminURL.searchParams.set("email", `eq.${user.email}`);
  adminURL.searchParams.set("limit", "1");
  const adminResponse = await fetch(adminURL, { headers: commonHeaders });
  if (!adminResponse.ok) return false;
  const admins = await adminResponse.json<Array<{ email?: string }>>();
  return admins.some((admin) => admin.email?.toLowerCase() === user.email?.toLowerCase());
}

async function storedBytes(bucket: R2Bucket): Promise<number> {
  let bytes = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ cursor, limit: 1000 });
    for (const object of page.objects) bytes += object.size;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return bytes;
}

async function publicObject(request: Request, bucket: R2Bucket, key: string): Promise<Response> {
  const object = request.method === "HEAD" ? await bucket.head(key) : await bucket.get(key);
  if (!object) return json(404, { error: "Image not found." });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-length", String(object.size));
  return new Response(request.method === "HEAD" ? null : (object as R2ObjectBody).body, { headers });
}

function decodeBase64URL(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function validPrivateSignature(url: URL, key: string, secret: string): Promise<boolean> {
  const expiresRaw = url.searchParams.get("expires") ?? "";
  const signatureRaw = url.searchParams.get("signature") ?? "";
  if (!/^\d{10}$/u.test(expiresRaw) || !signatureRaw || secret.length < 32) return false;
  const expiresAt = Number(expiresRaw);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt - now > MAX_SIGNED_URL_SECONDS) return false;

  const signingKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    signingKey,
    new TextEncoder().encode(`${key}\n${expiresAt}`),
  ));
  const received = decodeBase64URL(signatureRaw);
  return received !== null
    && received.byteLength === expected.byteLength
    && crypto.subtle.timingSafeEqual(received, expected);
}

export async function createPrivateSignature(key: string, expiresAt: number, secret: string): Promise<string> {
  const signingKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    signingKey,
    new TextEncoder().encode(`${key}\n${expiresAt}`),
  ));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

async function privateObject(request: Request, env: Env, key: string, url: URL): Promise<Response> {
  if (!await validPrivateSignature(url, key, env.GUYU_MEDIA_SIGNING_SECRET)) {
    return json(403, { error: "Private image authorization failed." });
  }
  const object = request.method === "HEAD" ? await env.DUOMEI_PRIVATE.head(key) : await env.DUOMEI_PRIVATE.get(key);
  if (!object) return json(404, { error: "Image not found." });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=60, must-revalidate");
  headers.set("content-length", String(object.size));
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(request.method === "HEAD" ? null : (object as R2ObjectBody).body, { headers });
}

async function upload(request: Request, env: Env, origin: string): Promise<Response> {
  if (!allowedOrigin(origin)) return json(403, { error: "Origin is not allowed." });
  if (!await authorizeAdmin(request, env)) return json(401, { error: "Administrator login required." }, origin);

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!PUBLIC_KEY_PATTERN.test(key) || key.includes("//") || key.split("/").includes("..")) {
    return json(400, { error: "Invalid image key." }, origin);
  }
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  const contentLength = Number(request.headers.get("content-length"));
  if (!ALLOWED_MIME_TYPES.has(contentType)) return json(415, { error: "Unsupported image type." }, origin);
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_OBJECT_BYTES) {
    return json(413, { error: "Image exceeds the 15 MiB limit." }, origin);
  }
  if (await env.DUOMEI_MEDIA.head(key)) return json(409, { error: "Image key already exists." }, origin);
  if (await storedBytes(env.DUOMEI_MEDIA) + contentLength > STORAGE_HARD_LIMIT_BYTES) {
    return json(507, { error: "Color image storage reached its 1 GB hard limit." }, origin);
  }

  const object = await env.DUOMEI_MEDIA.put(key, request.body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
  if (object.size !== contentLength) {
    await env.DUOMEI_MEDIA.delete(key);
    return json(422, { error: "Uploaded image size did not match the request." }, origin);
  }
  return json(201, { url: `${url.origin}/media/${key.split("/").map(encodeURIComponent).join("/")}` }, origin);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "";

    if (request.method === "OPTIONS") {
      if (!allowedOrigin(origin)) return new Response(null, { status: 403 });
      const headers = new Headers();
      addCors(headers, origin);
      return new Response(null, { status: 204, headers });
    }

    const publicKey = publicMediaKey(url.pathname);
    if (publicKey && (request.method === "GET" || request.method === "HEAD")) {
      return publicObject(request, env.DUOMEI_MEDIA, publicKey);
    }

    const privateKey = privateMediaKey(url.pathname);
    if (privateKey && (request.method === "GET" || request.method === "HEAD")) {
      return privateObject(request, env, privateKey, url);
    }

    if (url.pathname === "/v1/upload" && request.method === "PUT") {
      return upload(request, env, origin);
    }
    return json(404, { error: "Not found." });
  },
} satisfies ExportedHandler<Env>;
