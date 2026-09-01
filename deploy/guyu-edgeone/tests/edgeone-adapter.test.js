import assert from "node:assert/strict";
import test from "node:test";
import { handleEdgeOneRequest } from "../cloud-functions/api/[[default]].js";

const env = {
  GUYU_ANSWER_SALT: Buffer.alloc(16, 1).toString("base64"),
  GUYU_ANSWER_HASH: Buffer.alloc(32, 2).toString("base64"),
  GUYU_SESSION_SECRET: Buffer.alloc(32, 3).toString("base64"),
  GUYU_STORAGE_PREFIX: "private-media/guyu/meiyou-yujian/pages",
};

test("EdgeOne adapter exposes the same-origin anonymous auth state", async () => {
  const response = await handleEdgeOneRequest({
    env,
    request: new Request("https://duomei.site/api/guyu-auth"),
  }, {
    downloadFile: async () => assert.fail("storage must not be touched"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("EdgeOne adapter protects private pages before Blob access", async () => {
  const response = await handleEdgeOneRequest({
    env,
    request: new Request("https://duomei.site/api/guyu-page?book=meiyou-yujian&page=001"),
  }, {
    downloadFile: async () => assert.fail("storage must not be touched"),
  });

  assert.equal(response.status, 401);
});

test("EdgeOne adapter fails closed when secrets are absent", async () => {
  const response = await handleEdgeOneRequest({
    env: {},
    request: new Request("https://duomei.site/api/guyu-auth"),
  });

  assert.equal(response.status, 503);
});

test("EdgeOne adapter reads Makers environment variables from process.env", async () => {
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    const response = await handleEdgeOneRequest({
      env: {},
      request: new Request("https://duomei.site/api/guyu-auth"),
    }, {
      downloadFile: async () => assert.fail("storage must not be touched"),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authorized: false });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
