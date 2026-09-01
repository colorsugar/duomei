import assert from "node:assert/strict";
import test from "node:test";
import { validateDomainReleaseAuthorization } from "../scripts/domain-release-gate-core.mjs";

const valid = {
  domain: "duomei.site",
  registrationReviewPassed: true,
  clientHoldCleared: true,
  dnsChangeAuthorized: true,
  authorizedAt: "2026-09-01T14:00:00Z",
};

test("domain release gate accepts only the reviewed and explicitly authorized candidate", () => {
  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-09-01T14:05:00Z");
  try {
    assert.equal(validateDomainReleaseAuthorization(valid).domain, "duomei.site");
  } finally {
    Date.now = originalNow;
  }
});

test("domain release gate fails while clientHold or DNS authorization remains pending", () => {
  assert.throws(
    () => validateDomainReleaseAuthorization({ ...valid, clientHoldCleared: false }),
    /clientHold/,
  );
  assert.throws(
    () => validateDomainReleaseAuthorization({ ...valid, dnsChangeAuthorized: false }),
    /授权/,
  );
});

test("domain release gate rejects personal-information fields", () => {
  assert.throws(
    () => validateDomainReleaseAuthorization({ ...valid, ownerName: "not-allowed" }),
    /不允许的字段/,
  );
});
