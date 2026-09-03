const REQUIRED_NETWORKS = {
  mainland: 90,
  telecom: 30,
  unicom: 30,
  mobile: 29,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeTarget(value) {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}

export function validatePrototypeEvidence(evidence, expectedTarget, now = Date.now()) {
  assert(evidence?.provider === "tance.cc", "拨测提供方必须记录为 tance.cc");
  assert(Number.isInteger(evidence.taskId) && evidence.taskId > 0, "缺少有效的 tance.cc taskId");
  assert(
    evidence.resultsUrl === `https://www.tance.cc/api-proxy/v1/tasks/${evidence.taskId}/results`,
    "结果 JSON URL 与 taskId 不一致",
  );
  const taskPage = new URL(evidence.pageUrl);
  assert(taskPage.protocol === "https:" && taskPage.hostname === "www.tance.cc", "任务页面必须是 tance.cc HTTPS URL");
  assert(normalizeTarget(evidence.targetUrl) === normalizeTarget(expectedTarget), "拨测 URL 与候选精确 URL 不一致");

  const completedAt = Date.parse(evidence.completedAt);
  assert(Number.isFinite(completedAt), "拨测完成时间无效");
  assert(completedAt <= now + 5 * 60 * 1000, "拨测完成时间不能位于未来");
  assert(now - completedAt <= 48 * 60 * 60 * 1000, "拨测证据超过 48 小时，必须重新执行");

  const total = evidence.nodes?.total;
  assert(total?.tested >= 100, "总拨测节点不足 100");
  assert(total.http200 === total.tested && total.timeouts === 0, "总节点必须全部 HTTP 200 且零超时");

  for (const [name, minimum] of Object.entries(REQUIRED_NETWORKS)) {
    const result = evidence.nodes?.[name];
    assert(result?.tested >= minimum, `${name} 节点不足 ${minimum}`);
    assert(result.http200 === result.tested, `${name} 节点不是全部 HTTP 200`);
    assert(result.timeouts === 0, `${name} 节点存在超时`);
    assert(Number.isFinite(result.averageMs) && result.averageMs > 0 && result.averageMs <= 1500, `${name} 平均延迟无效或超过 1500ms`);
  }

  const manual = evidence.manual;
  for (const key of [
    "mainlandRealDevice",
    "passwordGate",
    "firstPrivatePage",
    "touchFlip",
    "verticalScroll",
    "preloadBeforeTurn",
    "failureRetry",
  ]) {
    assert(manual?.[key] === true, `真机门禁未通过：${key}`);
  }

  return {
    taskId: evidence.taskId,
    targetUrl: normalizeTarget(evidence.targetUrl),
    completedAt: new Date(completedAt).toISOString(),
    mainlandNodes: evidence.nodes.mainland.tested,
  };
}
