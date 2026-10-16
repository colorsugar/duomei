// EdgeOne Makers diagnostics: prints the project's deployments (status, codes),
// the platform build log of failed deployments (DescribePagesDeploymentLog → LogUrl),
// and probes usage/quota actions, so a bare "Deployment failed with status: Failed"
// from the CLI can be explained. Uses the same API endpoint and Bearer token as the
// edgeone CLI (global area). Secret-looking fields are redacted before printing.
//
//   EDGEONE_API_TOKEN=… EDGEONE_PROJECT_ID=makers-… node scripts/edgeone-deploy-diagnose.mjs [limit]
//
// Optional cleanup (writes!): EDGEONE_PRUNE=1 deletes old deployment records, keeping
// the newest EDGEONE_KEEP (default 3) successful ones plus the one used in production.
// EDGEONE_PRUNE_DRY=1 only prints what would be deleted.

const API = process.env.EDGEONE_API_BASE || "https://pages-api.edgeone.ai/v1";
const token = process.env.EDGEONE_API_TOKEN;
const projectId = process.env.EDGEONE_PROJECT_ID;
const limit = Number(process.argv[2] || 8);
if (!token || !projectId) {
  console.error("EDGEONE_API_TOKEN and EDGEONE_PROJECT_ID are required.");
  process.exit(1);
}

const SECRET = /token|secret|password|passwd|credential|cookie|authorization|signature|(^|_)key$|apikey|env(var)?s?$/i;
const scrub = (s) => s
  .replace(/(eo_token=)[^&\s"]+/gi, "$1[redacted]")
  .replace(/Bearer\s+[^\s"]+/gi, "Bearer [redacted]")
  .replace(/([?&](?:q-signature|q-ak|x-cos-security-token|sign|signature|token)=)[^&\s"]+/gi, "$1[redacted]");
const redact = (value, key = "") => {
  if (key && SECRET.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === "string") return scrub(value);
  return value;
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
const short = (r, n = 1500) => {
  const t = JSON.stringify(redact(r.body));
  return t.length > n ? t.slice(0, n) + "…" : t;
};

// 1. All deployments (compact table).
const all = [];
let total = 0;
for (let offset = 0; offset < 1000; offset += 100) {
  const r = await call("DescribePagesDeployments", {
    ProjectId: projectId, Offset: offset, Limit: 100, OrderBy: "CreatedOn", Order: "Desc",
  });
  const resp = r.body?.Data?.Response;
  if (!resp) { console.log(`DescribePagesDeployments failed: ${short(r)}`); break; }
  total = resp.TotalCount ?? total;
  all.push(...(resp.Deployments || []));
  if (!resp.Deployments?.length || all.length >= total) break;
}
const byStatus = {};
for (const d of all) byStatus[`${d.Status}/${d.Code}`] = (byStatus[`${d.Status}/${d.Code}`] || 0) + 1;
console.log(`## Deployments: TotalCount=${total}, fetched=${all.length}, by Status/Code=${JSON.stringify(byStatus)}`);
for (const d of all.slice(0, Math.max(limit, 20))) {
  console.log(`  ${d.DeploymentId} ${d.CreatedOn} ${String(d.Status).padEnd(8)} code=${d.Code} prod=${d.UsedInProd} cost=${d.BuildCost}ms`);
}
console.log("## First deployment record:");
console.log(JSON.stringify(redact({ ...all[0], MetaData: all[0]?.MetaData ? "[omitted]" : all[0]?.MetaData }), null, 2));

// 2. Platform build log for the newest failed deployments.
const failed = all.filter((d) => d.Status !== "Success" && d.Status !== "Process").slice(0, 3);
for (const d of failed) {
  const r = await call("DescribePagesDeploymentLog", { ProjectId: projectId, DeploymentId: d.DeploymentId });
  const url = r.body?.Data?.Response?.LogUrl;
  console.log(`## DescribePagesDeploymentLog ${d.DeploymentId} (${d.Status}, ${d.CreatedOn}) HTTP ${r.status} ${url ? "LogUrl present" : short(r)}`);
  if (url) {
    try {
      const log = await (await fetch(url)).text();
      const lines = scrub(log).split(/\r?\n/);
      console.log(`  log lines=${lines.length}`);
      const interesting = lines.filter((l) => /fail|error|limit|exceed|quota|storage|size|capacity|too|超|限|失败|错误|容量|空间/i.test(l));
      console.log("  --- matching lines ---");
      interesting.slice(-80).forEach((l) => console.log(`  ${l.slice(0, 400)}`));
      console.log("  --- last 60 lines ---");
      lines.slice(-60).forEach((l) => console.log(`  ${l.slice(0, 400)}`));
    } catch (e) {
      console.log(`  fetch log failed: ${e.message}`);
    }
  }
}
// Also the newest success, to compare with a passing log.
const okOne = all.find((d) => d.Status === "Success");
if (okOne) {
  const r = await call("DescribePagesDeploymentLog", { ProjectId: projectId, DeploymentId: okOne.DeploymentId });
  const url = r.body?.Data?.Response?.LogUrl;
  if (url) {
    const lines = scrub(await (await fetch(url)).text()).split(/\r?\n/);
    console.log(`## Success log ${okOne.DeploymentId}: last 40 of ${lines.length} lines`);
    lines.slice(-40).forEach((l) => console.log(`  ${l.slice(0, 400)}`));
  }
}

// 3. Project record and usage/quota probes (unknown actions just return an error).
const projects = await call("DescribePagesProjects", {
  Filters: [{ Name: "ProjectId", Values: [projectId] }], Offset: 0, Limit: 1,
});
const proj = projects.body?.Data?.Response?.Projects?.[0];
console.log(`## DescribePagesProjects keys: ${proj ? Object.keys(proj).join(",") : short(projects)}`);
const allProjects = await call("DescribePagesProjects", { Offset: 0, Limit: 50 });
for (const p of allProjects.body?.Data?.Response?.Projects || []) {
  console.log(`  project ${p.ProjectId} ${p.Name} area=${p.Area} status=${p.Status} zone=${p.ZoneId}`);
}
const PROBES = [
  "DescribePagesUsage", "DescribePagesProjectUsage", "DescribePagesQuota", "DescribePagesQuotas",
  "DescribePagesStorage", "DescribePagesStorageUsage", "DescribePagesResourceUsage", "DescribePagesPlan",
  "DescribePagesUserPlan", "DescribePagesLimits", "DescribePagesPackage", "DescribePagesUserInfo",
  "DescribePagesAccount", "DescribePagesOverview", "DescribePagesStatistics", "DescribePagesCapacity",
];
for (const action of PROBES) {
  const r = await call(action, { ProjectId: projectId });
  console.log(`## probe ${action} HTTP ${r.status} ${short(r, 800)}`);
}

// 4. Optional prune of old deployment records.
if (process.env.EDGEONE_PRUNE === "1") {
  const keep = Number(process.env.EDGEONE_KEEP || 3);
  const dry = process.env.EDGEONE_PRUNE_DRY === "1";
  const successes = all.filter((d) => d.Status === "Success");
  const keepIds = new Set(successes.slice(0, keep).map((d) => d.DeploymentId));
  for (const d of all) if (d.UsedInProd) keepIds.add(d.DeploymentId);
  const victims = all.filter((d) => !keepIds.has(d.DeploymentId) && d.Status !== "Process");
  console.log(`## Prune: keep ${[...keepIds].join(",")}; delete ${victims.length} records (dry=${dry})`);
  // The delete action name is not in the public CLI; find the one the API accepts on the oldest record.
  const CANDIDATES = ["DeletePagesDeployment", "DeletePagesDeployments", "RemovePagesDeployment", "DeletePagesProjectDeployment"];
  let deleteAction = null;
  if (victims.length && !dry) {
    const probe = victims[victims.length - 1];
    for (const action of CANDIDATES) {
      const r = await call(action, { ProjectId: projectId, DeploymentId: probe.DeploymentId, DeploymentIds: [probe.DeploymentId] });
      console.log(`  try ${action} on ${probe.DeploymentId}: HTTP ${r.status} ${short(r, 600)}`);
      if (r.body?.Code === 0 && !r.body?.Data?.Response?.Error) { deleteAction = action; break; }
    }
  }
  if (deleteAction) {
    let ok = 1, bad = 0;
    for (const d of victims.slice(0, -1)) {
      const r = await call(deleteAction, { ProjectId: projectId, DeploymentId: d.DeploymentId, DeploymentIds: [d.DeploymentId] });
      if (r.body?.Code === 0 && !r.body?.Data?.Response?.Error) ok += 1;
      else { bad += 1; if (bad <= 5) console.log(`  delete ${d.DeploymentId} failed: ${short(r, 400)}`); }
    }
    console.log(`## Prune done with ${deleteAction}: deleted=${ok} failed=${bad}`);
  } else if (!dry) {
    console.log("## Prune: no delete action accepted by the API.");
  }
}
