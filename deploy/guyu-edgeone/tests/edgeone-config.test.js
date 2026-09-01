import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = JSON.parse(await readFile(new URL("../edgeone.json", import.meta.url), "utf8"));

test("EdgeOne config deploys only overseas Cloud Functions in Singapore", () => {
  assert.deepEqual(config.cloudFunctions.overseasRegions, ["ap-singapore"]);
  assert.equal("mainlandRegions" in config.cloudFunctions, false);
  assert.equal(config.outputDirectory, "dist");
});

test("EdgeOne config keeps API functions ahead of the SPA fallback", () => {
  assert.deepEqual(config.rewrites, [{ source: "/*", destination: "/index.html" }]);
});
