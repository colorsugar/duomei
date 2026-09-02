import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pbkdf2Sync } from "node:crypto";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createHandler, PBKDF2_ITERATIONS } = require("../server/guyu-core.cjs");

const answer = "test-only-answer";
const salt = Buffer.alloc(16, 7);
const env = {
  GUYU_ANSWER_SALT: salt.toString("base64"),
  GUYU_ANSWER_HASH: pbkdf2Sync(answer, salt, PBKDF2_ITERATIONS, 32, "sha256").toString("base64"),
  GUYU_SESSION_SECRET: Buffer.alloc(32, 9).toString("base64"),
  GUYU_STORAGE_PREFIX: "private-media/guyu/meiyou-yujian/pages",
};
const now = () => 1_800_000_000_000;

function event(path, method = "GET", extra = {}) {
  return { path, httpMethod: method, headers: {}, ...extra };
}

test("fails closed when secrets or the fixed storage prefix are absent", async () => {
  const handler = createHandler({ downloadFile: async () => Buffer.alloc(1), env: {}, now });
  const response = await handler(event("/api/guyu-auth"));
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /ANSWER|SESSION|cloud:\/\//);
});

test("wrong answer is rejected without setting a cookie", async () => {
  const handler = createHandler({ downloadFile: async () => Buffer.alloc(1), env, now });
  const response = await handler(event("/api/guyu-auth", "POST", {
    body: JSON.stringify({ answer: "wrong" }),
  }));
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["Set-Cookie"], undefined);
  assert.doesNotMatch(response.body, /test-only-answer/);
});

test("correct answer creates an HttpOnly strict session", async () => {
  const handler = createHandler({
    downloadFile: async () => Buffer.alloc(1),
    env,
    now,
    nonce: () => "fixed_nonce_for_unit_test",
  });
  const response = await handler(event("/api/guyu-auth", "POST", {
    body: JSON.stringify({ answer }),
  }));
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["Set-Cookie"], /^guyu_session=/);
  assert.match(response.headers["Set-Cookie"], /HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(response.body, /test-only-answer/);
});

test("private page requires a valid session before storage is touched", async () => {
  let calls = 0;
  const handler = createHandler({ downloadFile: async () => { calls += 1; return Buffer.from("page"); }, env, now });
  const response = await handler(event("/api/guyu-page", "GET", {
    queryStringParameters: { book: "meiyou-yujian", page: "001" },
  }));
  assert.equal(response.statusCode, 401);
  assert.equal(calls, 0);
});

test("authorized page reads only the fixed private file ID and returns same-origin bytes", async () => {
  let requestedFileID;
  const handler = createHandler({
    downloadFile: async (fileID) => { requestedFileID = fileID; return { fileContent: Buffer.from("private-webp") }; },
    env,
    now,
    nonce: () => "fixed_nonce_for_unit_test",
  });
  const login = await handler(event("/api/guyu-auth", "POST", { body: JSON.stringify({ answer }) }));
  const cookie = login.headers["Set-Cookie"].split(";", 1)[0];
  const response = await handler(event("/api/guyu-page", "GET", {
    headers: { cookie },
    queryStringParameters: { book: "meiyou-yujian", page: "053" },
  }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.isBase64Encoded, true);
  assert.equal(Buffer.from(response.body, "base64").toString(), "private-webp");
  assert.equal(requestedFileID, "private-media/guyu/meiyou-yujian/pages/053.webp");
  assert.equal(response.headers.Location, undefined);
});

test("page traversal and out-of-range pages never reach storage", async () => {
  let calls = 0;
  const handler = createHandler({
    downloadFile: async () => { calls += 1; return Buffer.from("page"); },
    env,
    now,
    nonce: () => "fixed_nonce_for_unit_test",
  });
  const login = await handler(event("/api/guyu-auth", "POST", { body: JSON.stringify({ answer }) }));
  const cookie = login.headers["Set-Cookie"].split(";", 1)[0];
  for (const page of ["000", "054", "../1", "1", "001.webp"]) {
    const response = await handler(event("/api/guyu-page", "GET", {
      headers: { cookie },
      queryStringParameters: { book: "meiyou-yujian", page },
    }));
    assert.equal(response.statusCode, 400);
  }
  assert.equal(calls, 0);
});

test("normalized class-answer variants are accepted", async () => {
  const classEnv = {
    ...env,
    GUYU_ANSWER_HASH: pbkdf2Sync("fixture314", salt, PBKDF2_ITERATIONS, 32, "sha256").toString("base64"),
  };
  for (const [index, variant] of ["fixture314班", " ｆｉｘｔｕｒｅ ３１４ 班 "].entries()) {
    const handler = createHandler({ downloadFile: async () => Buffer.alloc(1), env: classEnv, now, nonce: () => `nonce-variant-${index}` });
    const result = await handler(event("/api/guyu-auth", "POST", {
      headers: { "x-forwarded-for": `198.51.100.${index + 10}` },
      body: JSON.stringify({ answer: variant }),
    }));
    assert.equal(result.statusCode, 200);
  }
});

test("the fifth failed answer blocks that client for ten minutes", async () => {
  const handler = createHandler({ downloadFile: async () => Buffer.alloc(1), env, now });
  let result;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    result = await handler(event("/api/guyu-auth", "POST", {
      headers: { "x-forwarded-for": "203.0.113.77" },
      body: JSON.stringify({ answer: "wrong" }),
    }));
  }
  assert.equal(result.statusCode, 429);
  assert.equal(result.headers["Retry-After"], "600");
});
