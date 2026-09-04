import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as adminSiteInventory from "./adminSiteInventory.ts";

const {
  ADMIN_DEPLOYMENT,
  ADMIN_SITE_SECTIONS,
  channelLabel,
  computeAdminHealthScore,
  shortCommit,
  summarizeGuyuShelf,
} = adminSiteInventory;

const root = dirname(fileURLToPath(import.meta.url));
const adminSource = readFileSync(join(root, "../pages/DuomeiAdmin.tsx"), "utf8");

test("admin inventory matches the live homepage section set", () => {
  assert.equal(ADMIN_SITE_SECTIONS.length, 8);
  assert.deepEqual(
    ADMIN_SITE_SECTIONS.map((section) => section.id),
    ["zaobao", "notes", "kuaihuo", "guyu", "yunyou", "color", "weiyan", "skills"],
  );
  assert.equal(ADMIN_SITE_SECTIONS.filter((section) => section.editableInAdmin).length, 1);
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "notes")?.channel, "supabase");
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "weiyan")?.href, "/#weiyan");
  assert.equal(ADMIN_SITE_SECTIONS.find((section) => section.id === "kuaihuo")?.href, "/#kuaihuo");
});

test("deployment facts point at EdgeOne production, not Vercel", () => {
  assert.equal(ADMIN_DEPLOYMENT.platformLabel, "EdgeOne Makers");
  assert.equal(ADMIN_DEPLOYMENT.productionHost, "https://duomei.site");
  assert.match(ADMIN_DEPLOYMENT.buildMarkerPath, /duomei-build\.json$/);
  assert.doesNotMatch(ADMIN_DEPLOYMENT.platformLabel, /Vercel/i);
  assert.equal(channelLabel("git-edgeone"), "Git → EdgeOne");
});

test("health score reacts to drafts and cloud readiness", () => {
  assert.equal(computeAdminHealthScore({ draftCount: 0, imageCount: 4, cloudReady: true }), 98);
  assert.ok(computeAdminHealthScore({ draftCount: 0, imageCount: 0, cloudReady: false }) < 90);
  assert.equal(shortCommit("abcdef1234567890"), "abcdef1");
  assert.equal(shortCommit(""), "");
});

test("guyu shelf summary keeps one class-gated book", () => {
  const summary = summarizeGuyuShelf([
    { access: "class-gated" },
    { access: "public" },
    { access: "public" },
    { access: "public" },
    { access: "public" },
  ]);
  assert.equal(summary.total, 5);
  assert.equal(summary.gatedCount, 1);
  assert.equal(summary.publicCount, 4);
});

test("DuomeiAdmin source no longer advertises Vercel or the old three-entry map", () => {
  assert.doesNotMatch(adminSource, /Vercel/);
  assert.doesNotMatch(adminSource, /3 个内容入口/);
  assert.match(adminSource, /EdgeOne/);
  assert.match(adminSource, /\/#weiyan/);
  assert.match(adminSource, /adminSiteInventory/);
  assert.match(adminSource, /ADMIN_DEPLOYMENT/);
  assert.match(adminSource, /buildMarkerPath/);
});
