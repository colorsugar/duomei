const ALLOWED_KEYS = new Set([
  "domain",
  "registrationReviewPassed",
  "clientHoldCleared",
  "dnsChangeAuthorized",
  "authorizedAt",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateDomainReleaseAuthorization(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "发布授权文件格式无效");
  for (const key of Object.keys(value)) {
    assert(ALLOWED_KEYS.has(key), `发布授权文件包含不允许的字段：${key}`);
  }

  assert(value.domain === "duomei.site", "发布域名必须严格为 duomei.site");
  assert(value.registrationReviewPassed === true, "域名个人实名认证/过户审核尚未确认通过");
  assert(value.clientHoldCleared === true, "RDAP clientHold 尚未确认解除");
  assert(value.dnsChangeAuthorized === true, "用户尚未明确授权修改 duomei.site DNS");

  const authorizedAt = Date.parse(value.authorizedAt);
  assert(Number.isFinite(authorizedAt), "缺少有效的 DNS 授权时间");
  assert(authorizedAt <= Date.now() + 5 * 60 * 1000, "DNS 授权时间不能位于未来");

  return {
    gate: "PASS",
    domain: value.domain,
    authorizedAt: new Date(authorizedAt).toISOString(),
    note: "该门禁只确认允许进入人工 DNS/EdgeOne Makers 绑定步骤，本脚本不会修改任何外部资源。",
  };
}
