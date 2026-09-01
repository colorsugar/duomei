import assert from "node:assert/strict";
import test from "node:test";
import { validatePrototypeEvidence } from "../scripts/prototype-gate-core.mjs";

const now = Date.parse("2026-09-01T13:30:00Z");
const valid = {
  provider: "tance.cc",
  taskId: 123,
  targetUrl: "https://candidate.example/",
  resultsUrl: "https://www.tance.cc/api-proxy/v1/tasks/123/results",
  pageUrl: "https://www.tance.cc/http/https%3A%2F%2Fcandidate.example%2F",
  completedAt: "2026-09-01T13:00:00Z",
  nodes: {
    total: { tested: 100, http200: 100, timeouts: 0, averageMs: 280 },
    mainland: { tested: 91, http200: 91, timeouts: 0, averageMs: 270 },
    telecom: { tested: 30, http200: 30, timeouts: 0, averageMs: 260 },
    unicom: { tested: 30, http200: 30, timeouts: 0, averageMs: 290 },
    mobile: { tested: 29, http200: 29, timeouts: 0, averageMs: 275 },
  },
  manual: {
    mainlandRealDevice: true,
    passwordGate: true,
    firstPrivatePage: true,
    touchFlip: true,
    verticalScroll: true,
    preloadBeforeTurn: true,
    failureRetry: true,
  },
};

test("Prototype Gate accepts exact fresh 100-node, three-network and real-device evidence", () => {
  const result = validatePrototypeEvidence(valid, "https://candidate.example/", now);
  assert.equal(result.mainlandNodes, 91);
});

test("Prototype Gate rejects evidence collected for another URL", () => {
  assert.throws(() => validatePrototypeEvidence(valid, "https://other.example/", now), /URL/);
});

test("Prototype Gate rejects any timeout or incomplete manual interaction", () => {
  const evidence = structuredClone(valid);
  evidence.nodes.mobile.timeouts = 1;
  evidence.manual.touchFlip = false;
  assert.throws(() => validatePrototypeEvidence(evidence, valid.targetUrl, now), /超时|touchFlip/);
});

test("Prototype Gate rejects stale evidence", () => {
  assert.throws(() => validatePrototypeEvidence(valid, valid.targetUrl, now + 49 * 60 * 60 * 1000), /48 小时/);
});
