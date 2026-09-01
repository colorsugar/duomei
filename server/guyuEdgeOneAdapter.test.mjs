import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { handleEdgeOneRequest } from "../cloud-functions/api/[[default]].js";

const env = {
  GUYU_ANSWER_SALT: Buffer.alloc(16, 1).toString("base64"),
  GUYU_ANSWER_HASH: Buffer.alloc(32, 2).toString("base64"),
  GUYU_SESSION_SECRET: Buffer.alloc(32, 3).toString("base64"),
  GUYU_STORAGE_PREFIX: "private-media/guyu/meiyou-yujian/pages",
};

test("full EdgeOne site exposes the anonymous Guyu auth state", async () => {
  const response = await handleEdgeOneRequest({
    env,
    request: new Request("https://duomei.site/api/guyu-auth"),
  }, {
    downloadFile: async () => assert.fail("storage must not be touched"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: false });
});

test("full EdgeOne site protects Guyu pages before Blob access", async () => {
  const response = await handleEdgeOneRequest({
    env,
    request: new Request("https://duomei.site/api/guyu-page?book=meiyou-yujian&page=001"),
  }, {
    downloadFile: async () => assert.fail("storage must not be touched"),
  });

  assert.equal(response.status, 401);
});

test("full EdgeOne site reads Makers variables from process.env", async () => {
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
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("root EdgeOne config keeps Cloud Functions outside mainland and SPA fallback last", async () => {
  const config = JSON.parse(await readFile(new URL("../edgeone.json", import.meta.url), "utf8"));
  assert.deepEqual(config.cloudFunctions.regions.overseas, ["ap-singapore"]);
  assert.equal("mainland" in config.cloudFunctions.regions, false);
  assert.equal(config.nodeVersion, "22.17.1");
  assert.equal(config.outputDirectory, "dist");
  assert.deepEqual(config.rewrites, [{ source: "/*", destination: "/index.html" }]);
});
