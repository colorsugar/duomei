"use strict";

const {
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} = require("node:crypto");

const BOOK_ID = "meiyou-yujian";
const PAGE_COUNT = 53;
const COOKIE_NAME = "guyu_session";
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_BODY_BYTES = 4096;
const MAX_IMAGE_BYTES = 5_500_000;
const PBKDF2_ITERATIONS = 210_000;
const STORAGE_NAMESPACE = "guyu-private";
const FIXED_STORAGE_PREFIX = "private-media/guyu/meiyou-yujian/pages";
const RATE_LIMIT_MAX_FAILURES = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 2048;
const attempts = new Map();

function json(statusCode, value, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      Vary: "Cookie",
      ...extraHeaders,
    },
    body: JSON.stringify(value),
  };
}

function readConfig(env) {
  const answerSalt = decodeBase64(env.GUYU_ANSWER_SALT, "GUYU_ANSWER_SALT", 16);
  const answerHash = decodeBase64(env.GUYU_ANSWER_HASH, "GUYU_ANSWER_HASH", 32);
  const sessionSecret = decodeBase64(env.GUYU_SESSION_SECRET, "GUYU_SESSION_SECRET", 32);
  const storagePrefix = String(env.GUYU_STORAGE_PREFIX || "").replace(/^\/+|\/+$/g, "");

  if (storagePrefix !== FIXED_STORAGE_PREFIX) {
    throw new Error("GUYU_STORAGE_PREFIX is missing or outside the fixed private page path");
  }

  return { answerSalt, answerHash, sessionSecret, storagePrefix };
}

function decodeBase64(value, name, minimumLength) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error(`${name} is not configured`);
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length < minimumLength) throw new Error(`${name} is too short`);
  return decoded;
}

function requestPath(event) {
  const raw = event.path || event.rawPath || event.requestContext?.path || "/";
  return String(raw).split("?", 1)[0].replace(/\/+$/, "") || "/";
}

function requestMethod(event) {
  return String(event.httpMethod || event.requestContext?.httpMethod || "GET").toUpperCase();
}

function requestHeader(event, name) {
  const headers = event.headers || {};
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function requestBody(event) {
  if (event.body == null || event.body === "") return Buffer.alloc(0);
  const body = Buffer.from(String(event.body), event.isBase64Encoded ? "base64" : "utf8");
  if (body.length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return body;
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return cookies;
}

function signSession(config, nowMs, nonce = randomBytes(16).toString("base64url")) {
  const expires = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  const unsigned = `v1.${expires}.${nonce}`;
  const signature = createHmac("sha256", config.sessionSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifySession(token, config, nowMs) {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || !/^\d{10}$/.test(parts[1])) return false;
  if (Number(parts[1]) <= Math.floor(nowMs / 1000)) return false;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(parts[2]) || !/^[A-Za-z0-9_-]{32,64}$/.test(parts[3])) return false;

  const unsigned = parts.slice(0, 3).join(".");
  const expected = createHmac("sha256", config.sessionSecret).update(unsigned).digest();
  let actual;
  try {
    actual = Buffer.from(parts[3], "base64url");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeAnswer(value) {
  if (typeof value !== "string" || value.length > 64) return "";
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, "")
    .replace(/班$/u, "");
}

function verifyAnswer(answer, config) {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  const derived = pbkdf2Sync(normalized, config.answerSalt, PBKDF2_ITERATIONS, 32, "sha256");
  return timingSafeEqual(derived, config.answerHash);
}

function rateLimitKey(event) {
  const forwarded = requestHeader(event, "x-forwarded-for")
    || requestHeader(event, "x-real-ip")
    || "unknown-client";
  return String(forwarded).split(",", 1)[0].trim().slice(0, 96) || "unknown-client";
}

function pruneAttempts(nowMs) {
  for (const [key, record] of attempts) {
    const windowExpired = record.windowStartedAt + RATE_LIMIT_WINDOW_MS <= nowMs;
    if (record.blockedUntil <= nowMs && windowExpired) attempts.delete(key);
  }
  while (attempts.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = attempts.keys().next().value;
    if (!oldestKey) break;
    attempts.delete(oldestKey);
  }
}

function inspectRateLimit(key, nowMs) {
  const record = attempts.get(key);
  if (!record || record.blockedUntil <= nowMs) return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - nowMs) / 1000)),
  };
}

function registerFailure(key, nowMs) {
  pruneAttempts(nowMs);
  const current = attempts.get(key);
  const record = !current || current.windowStartedAt + RATE_LIMIT_WINDOW_MS <= nowMs
    ? { failures: 0, windowStartedAt: nowMs, blockedUntil: 0 }
    : current;
  record.failures += 1;
  if (record.failures >= RATE_LIMIT_MAX_FAILURES) record.blockedUntil = nowMs + RATE_LIMIT_BLOCK_MS;
  attempts.set(key, record);
  return inspectRateLimit(key, nowMs);
}

function authorized(event, config, nowMs) {
  const token = parseCookies(requestHeader(event, "cookie"))[COOKIE_NAME];
  return verifySession(token, config, nowMs);
}

function pageNumber(event) {
  const query = event.queryStringParameters || {};
  const book = Array.isArray(query.book) ? query.book[0] : query.book;
  const page = Array.isArray(query.page) ? query.page[0] : query.page;
  if (book !== BOOK_ID || !/^\d{3}$/.test(String(page || ""))) return null;
  const numeric = Number(page);
  return numeric >= 1 && numeric <= PAGE_COUNT ? String(page) : null;
}

function createHandler({ downloadFile, env = process.env, now = () => Date.now(), nonce } = {}) {
  if (typeof downloadFile !== "function") throw new TypeError("downloadFile is required");

  return async function handler(event = {}) {
    let config;
    try {
      config = readConfig(env);
    } catch {
      return json(503, { error: "候选环境尚未完成安全配置。" });
    }

    const path = requestPath(event);
    const method = requestMethod(event);
    const nowMs = now();

    if (path === "/api/guyu-auth" && method === "GET") {
      return json(200, { authorized: authorized(event, config, nowMs) });
    }

    if (path === "/api/guyu-auth" && method === "POST") {
      const clientKey = rateLimitKey(event);
      const currentLimit = inspectRateLimit(clientKey, nowMs);
      if (!currentLimit.allowed) {
        return json(429, { error: "尝试次数较多，请稍后再试。" }, {
          "Retry-After": String(currentLimit.retryAfterSeconds),
        });
      }

      let answer;
      try {
        answer = JSON.parse(requestBody(event).toString("utf8")).answer;
      } catch {
        return json(400, { error: "请求格式不正确。" });
      }
      if (!verifyAnswer(answer, config)) {
        const nextLimit = registerFailure(clientKey, nowMs);
        if (!nextLimit.allowed) {
          return json(429, { error: "尝试次数较多，请稍后再试。" }, {
            "Retry-After": String(nextLimit.retryAfterSeconds),
          });
        }
        return json(401, { error: "答案不正确。" });
      }

      attempts.delete(clientKey);
      const token = signSession(config, nowMs, nonce?.());
      return json(200, { authorized: true }, {
        "Set-Cookie": `${COOKIE_NAME}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      });
    }

    if (path === "/api/guyu-page" && method === "GET") {
      if (!authorized(event, config, nowMs)) return json(401, { error: "请先回答访问问题。" });
      const page = pageNumber(event);
      if (!page) return json(400, { error: "页面参数不正确。" });

      const objectKey = `${config.storagePrefix}/${page}.webp`;
      try {
        const result = await downloadFile(objectKey);
        const content = Buffer.isBuffer(result) ? result : result?.fileContent;
        if (!Buffer.isBuffer(content) || content.length === 0 || content.length > MAX_IMAGE_BYTES) {
          throw new Error("INVALID_IMAGE");
        }
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "image/webp",
            "Content-Length": String(content.length),
            "Content-Disposition": `inline; filename=\"page-${page}.webp\"`,
            "Cache-Control": "private, no-store",
            "CDN-Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            Vary: "Cookie",
          },
          isBase64Encoded: true,
          body: content.toString("base64"),
        };
      } catch {
        return json(404, { error: "这一页暂时无法读取，请稍后重试。" });
      }
    }

    return json(404, { error: "未找到接口。" });
  };
}

module.exports = {
  BOOK_ID,
  PAGE_COUNT,
  PBKDF2_ITERATIONS,
  STORAGE_NAMESPACE,
  FIXED_STORAGE_PREFIX,
  createHandler,
};
