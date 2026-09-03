import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = JSON.parse(await readFile(new URL("../edgeone.json", import.meta.url), "utf8"));

test("EdgeOne config deploys only overseas Cloud Functions in Singapore", () => {
  assert.deepEqual(config.cloudFunctions.regions.overseas, ["ap-singapore"]);
  assert.equal("mainland" in config.cloudFunctions.regions, false);
  assert.equal(config.cloudFunctions.maxDuration, 30);
  assert.equal(config.nodeVersion, "22.17.1");
  assert.equal(config.outputDirectory, "dist");
});

test("EdgeOne config keeps API functions ahead of the SPA fallback", () => {
  assert.deepEqual(config.rewrites, [{ source: "/*", destination: "/index.html" }]);
});
