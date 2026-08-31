import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GUYU_COOKIE_NAME = "guyu_access";
export const GUYU_SESSION_TTL_SECONDS = 60 * 60 * 12;
export const GUYU_MEDIA_URL_TTL_SECONDS = 60;

export function normalizeGuyuAnswer(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, "")
    .replace(/班$/u, "");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function guyuAnswerMatches(value: unknown, expectedAnswer: string) {
  const actualHash = createHash("sha256").update(normalizeGuyuAnswer(value)).digest();
  const expectedHash = createHash("sha256").update(normalizeGuyuAnswer(expectedAnswer)).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createGuyuMediaSignature(key: string, expiresAt: number, secret: string) {
  return signPayload(`${key}\n${expiresAt}`, secret);
}

export function createGuyuSessionToken(secret: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + GUYU_SESSION_TTL_SECONDS;
  const payload = expiresAt.toString(36);
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyGuyuSessionToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  if (!safeEqual(signature, signPayload(payload, secret))) return false;
  const expiresAt = Number.parseInt(payload, 36);
  return Number.isFinite(expiresAt) && expiresAt > Math.floor(now / 1000);
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const rawValue = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return undefined;
}

export function getGuyuServerConfig() {
  const expectedAnswer = process.env.GUYU_ACCESS_ANSWER?.trim();
  const sessionSecret = process.env.GUYU_SESSION_SECRET?.trim();
  if (!expectedAnswer || !sessionSecret || sessionSecret.length < 32) {
    throw new Error("Guyu access is not configured");
  }
  return { expectedAnswer, sessionSecret };
}

export function getGuyuMediaConfig() {
  const mediaOrigin = process.env.GUYU_MEDIA_ORIGIN?.trim().replace(/\/$/u, "");
  const signingSecret = process.env.GUYU_MEDIA_SIGNING_SECRET?.trim();
  let parsedOrigin: URL | undefined;
  try {
    parsedOrigin = mediaOrigin ? new URL(mediaOrigin) : undefined;
  } catch {
    parsedOrigin = undefined;
  }
  const localHttp = parsedOrigin?.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(parsedOrigin.hostname);
  if (
    !mediaOrigin
    || !parsedOrigin
    || (parsedOrigin.protocol !== "https:" && !localHttp)
    || !signingSecret
    || signingSecret.length < 32
  ) {
    throw new Error("Guyu media is not configured");
  }
  return { mediaOrigin, signingSecret };
}

export function requestHasGuyuSession(request: Request, sessionSecret: string) {
  const token = readCookie(request.headers.get("cookie"), GUYU_COOKIE_NAME);
  return verifyGuyuSessionToken(token, sessionSecret);
}

export function buildGuyuSessionCookie(token: string, secure: boolean) {
  const parts = [
    `${GUYU_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${GUYU_SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildExpiredGuyuCookie(secure: boolean) {
  const parts = [
    `${GUYU_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
