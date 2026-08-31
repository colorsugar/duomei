import assert from "node:assert/strict";
import test from "node:test";
import {
  GUYU_RATE_LIMIT_BLOCK_MS,
  clearGuyuFailures,
  getGuyuRateLimitKey,
  inspectGuyuRateLimit,
  registerGuyuFailure,
  resetGuyuRateLimitsForTests,
} from "./guyuRateLimit.ts";

test("blocks the fifth failed answer for ten minutes", () => {
  resetGuyuRateLimitsForTests();
  const now = Date.UTC(2026, 8, 1);
  for (let attempt = 1; attempt < 5; attempt += 1) {
    assert.equal(registerGuyuFailure("client", now + attempt).allowed, true);
  }
  const blocked = registerGuyuFailure("client", now + 5);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 600);
  assert.equal(inspectGuyuRateLimit("client", now + 6).allowed, false);
  assert.equal(inspectGuyuRateLimit("client", now + 5 + GUYU_RATE_LIMIT_BLOCK_MS).allowed, true);
});

test("clears failures after a correct answer", () => {
  resetGuyuRateLimitsForTests();
  registerGuyuFailure("client", 1);
  clearGuyuFailures("client");
  assert.equal(inspectGuyuRateLimit("client", 2).allowed, true);
});

test("prefers the Vercel forwarding header and keeps only the first address", () => {
  const request = new Request("https://example.test/api/guyu-auth", {
    headers: {
      "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-forwarded-for": "198.51.100.3",
    },
  });
  assert.equal(getGuyuRateLimitKey(request), "203.0.113.10");
});
