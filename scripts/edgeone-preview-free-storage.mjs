// Delete failed/invalid deployments on PREVIEW EdgeOne projects only, to free
// the account "Build artifacts size" quota. Never touches production
// (duomei-guyu / duomei-assets-overseas).
const API = process.env.EDGEONE_API_BASE || "https://pages-api.edgeone.ai/v1";
const token = process.env.EDGEONE_API_TOKEN;
if (!token) { console.error("EDGEONE_API_TOKEN required"); process.exit(1); }

const PROTECTED_NAMES = new Set(["duomei-guyu", "duomei-assets-overseas"]);
const PROTECTED_IDS = new Set(["makers-brifmhu31vjf", "makers-zui6b5ikmwdt"]);
const PREVIEW_NAME = /preview|duomei-slim|duomei-new|duomei-home/i;
const DELETE_ACTIONS = [
  "DeletePagesDeployment",
  "DeletePagesDeployments",
  "RemovePagesDeployment",
  "DeletePagesProjectDeployment",
];

const scrub = (s) => String(s)
  .replace(/(eo_token=)[^&\s"]+/gi, "$1[redacted]")
  .replace(/Bearer\s+[^\s"]+/gi, "Bearer [redacted]");
const short = (r, n = 500) => {
  const t = JSON.stringify(r.body);
  return scrub(t.length > n ? t.slice(0, n) + "…" : t);
};
async function call(action, data = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ Action: action, ...data }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 2000) }; }
  return { status: res.status, body };
}
const ok = (r) => r.body?.Code === 0 && !r.body?.Data?.Response?.Error;

const projects = [];
for (let offset = 0; offset < 200; offset += 50) {
  const r = await call("DescribePagesProjects", { Offset: offset, Limit: 50 });
  const list = r.body?.Data?.Response?.Projects || [];
  projects.push(...list);
  const total = r.body?.Data?.Response?.TotalCount ?? projects.length;
  if (!list.length || projects.length >= total) break;
}
console.log(`## projects=${projects.length}`);
for (const p of projects) {
  console.log(`  ${p.ProjectId} ${p.Name} area=${p.Area} status=${p.Status}`);
}

let deleteAction = null;
let deleted = 0, failed = 0, skipped = 0;

for (const p of projects) {
  const name = p.Name || "";
  const id = p.ProjectId || "";
  if (PROTECTED_NAMES.has(name) || PROTECTED_IDS.has(id)) {
    console.log(`## skip production project ${id} ${name}`);
    skipped += 1;
    continue;
  }
  if (!PREVIEW_NAME.test(name)) {
    console.log(`## skip non-preview project ${id} ${name}`);
    skipped += 1;
    continue;
  }
  const depR = await call("DescribePagesDeployments", {
    ProjectId: id, Offset: 0, Limit: 100, OrderBy: "CreatedOn", Order: "Desc",
  });
  const deps = depR.body?.Data?.Response?.Deployments || [];
  const victims = deps.filter((d) => d.Status === "Failed" || d.Status === "Invalid");
  const kept = deps.filter((d) => !victims.includes(d)).map((d) => `${d.DeploymentId}:${d.Status}`);
  console.log(`## ${name} ${id}: deps=${deps.length} delete-failed/invalid=${victims.length} keep=${kept.join(",") || "(none)"}`);
  for (const d of victims) {
    if (!deleteAction) {
      for (const action of DELETE_ACTIONS) {
        const r = await call(action, { ProjectId: id, DeploymentId: d.DeploymentId, DeploymentIds: [d.DeploymentId] });
        console.log(`  try ${action} on ${d.DeploymentId}: HTTP ${r.status} ${short(r, 400)}`);
        if (ok(r)) { deleteAction = action; deleted += 1; break; }
      }
      if (!deleteAction) {
        console.log("## no delete action accepted; stopping.");
        process.exit(1);
      }
      continue;
    }
    const r = await call(deleteAction, { ProjectId: id, DeploymentId: d.DeploymentId, DeploymentIds: [d.DeploymentId] });
    if (ok(r)) {
      deleted += 1;
      console.log(`  deleted ${d.DeploymentId}`);
    } else {
      failed += 1;
      console.log(`  delete ${d.DeploymentId} failed: ${short(r, 400)}`);
    }
  }
}
console.log(`## preview free-storage done action=${deleteAction || "none"} deleted=${deleted} failed=${failed} skipped-projects=${skipped}`);
if (!deleteAction && deleted === 0) {
  console.log("## nothing deleted (no failed preview deployments, or delete API unavailable)");
}
