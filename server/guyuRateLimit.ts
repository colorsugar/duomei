export const GUYU_RATE_LIMIT_MAX_FAILURES = 5;
export const GUYU_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const GUYU_RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;

type AttemptRecord = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

export type GuyuRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_TRACKED_CLIENTS = 2048;
// Per-instance defense in depth only. Production brute-force protection must be
// enforced by the Vercel Firewall because serverless instances do not share memory.
const attempts = new Map<string, AttemptRecord>();

function pruneAttempts(now: number) {
  for (const [key, record] of attempts) {
    const windowExpired = record.windowStartedAt + GUYU_RATE_LIMIT_WINDOW_MS <= now;
    if (record.blockedUntil <= now && windowExpired) attempts.delete(key);
  }

  while (attempts.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = attempts.keys().next().value as string | undefined;
    if (!oldestKey) break;
    attempts.delete(oldestKey);
  }
}

export function getGuyuRateLimitKey(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for");
  const address = forwarded?.split(",", 1)[0]?.trim().slice(0, 96);
  return address || "unknown-client";
}

export function inspectGuyuRateLimit(key: string, now = Date.now()): GuyuRateLimitResult {
  const record = attempts.get(key);
  if (!record || record.blockedUntil <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - now) / 1000)),
  };
}

export function registerGuyuFailure(key: string, now = Date.now()): GuyuRateLimitResult {
  pruneAttempts(now);
  const current = attempts.get(key);
  const record = !current || current.windowStartedAt + GUYU_RATE_LIMIT_WINDOW_MS <= now
    ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
    : current;

  record.failures += 1;
  if (record.failures >= GUYU_RATE_LIMIT_MAX_FAILURES) {
    record.blockedUntil = now + GUYU_RATE_LIMIT_BLOCK_MS;
  }
  attempts.set(key, record);
  return inspectGuyuRateLimit(key, now);
}

export function clearGuyuFailures(key: string) {
  attempts.delete(key);
}

export function resetGuyuRateLimitsForTests() {
  attempts.clear();
}
