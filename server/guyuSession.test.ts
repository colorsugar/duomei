import assert from "node:assert/strict";
import test from "node:test";
import {
  createGuyuSessionToken,
  createGuyuMediaSignature,
  guyuAnswerMatches,
  normalizeGuyuAnswer,
  readCookie,
  verifyGuyuSessionToken,
} from "./guyuSession.ts";

const secret = "test-only-secret-that-is-longer-than-thirty-two-characters";

test("normalizes accepted class-answer variants", () => {
  for (const answer of ["726", "726班", " 7 2 6 ", "７ ２ ６ 班"]) {
    assert.equal(normalizeGuyuAnswer(answer), "726");
    assert.equal(guyuAnswerMatches(answer, "726"), true);
  }
  assert.equal(guyuAnswerMatches("725", "726"), false);
  assert.equal(guyuAnswerMatches("726班班", "726"), false);
});

test("signs, expires, and rejects tampered sessions", () => {
  const now = Date.UTC(2026, 8, 1);
  const token = createGuyuSessionToken(secret, now);
  assert.equal(verifyGuyuSessionToken(token, secret, now), true);
  assert.equal(verifyGuyuSessionToken(`${token}x`, secret, now), false);
  assert.equal(verifyGuyuSessionToken(token, `${secret}x`, now), false);
  assert.equal(verifyGuyuSessionToken(token, secret, now + 8 * 24 * 60 * 60 * 1000), false);
});

test("matches the Worker media-signature test vector", () => {
  assert.equal(
    createGuyuMediaSignature("guyu/meiyou-yujian/pages/001.webp", 1800000000, secret),
    "7HSqvwouUf0hIj0B6qt9Xw2CmtLg-kVjHrKZpnFI9Ko",
  );
});

test("reads an encoded session cookie without touching other cookies", () => {
  assert.equal(readCookie("theme=paper; guyu_access=abc.def; edit=0", "guyu_access"), "abc.def");
  assert.equal(readCookie("theme=paper", "guyu_access"), undefined);
});
