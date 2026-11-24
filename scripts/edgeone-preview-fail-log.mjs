// Read-only: look up an EdgeOne Makers project by name and print the newest
// failed deployment's platform build log. Never deletes, never targets prod
// unless that name is passed in (callers must pass a preview project name).
const API = process.env.EDGEONE_API_BASE || "https://pages-api.edgeone.ai/v1";
const token = process.env.EDGEONE_API_TOKEN;
const name = process.argv[2];
const wantId = process.argv[3] || "";
if (!token || !name) {
  console.error("usage: EDGEONE_API_TOKEN=… node scripts/edgeone-preview-fail-log.mjs <project-name> [deployment-id]");
  process.exit(1);
}
const scrub = (s) => String(s)
  .replace(/(eo_token=)[^&\s"]+/gi, "$1[redacted]")
  .replace(/Bearer\s+[^\s"]+/gi, "Bearer [redacted]")
  .replace(/([?&](?:q-signature|q-ak|x-cos-security-token|sign|signature|token)=)[^&\s"]+/gi, "$1[redacted]");
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
const projects = [];
for (let offset = 0; offset < 200; offset += 50) {
  const r = await call("DescribePagesProjects", { Offset: offset, Limit: 50 });
  const list = r.body?.Data?.Response?.Projects || [];
  projects.push(...list);
  const total = r.body?.Data?.Response?.TotalCount ?? projects.length;
  if (!list.length || projects.length >= total) break;
}
const hit = projects.find((p) => p.Name === name || p.ProjectId === name);
console.log(`## projects listed=${projects.length}; match for ${name}: ${hit ? `${hit.ProjectId} area=${hit.Area} status=${hit.Status}` : "(none)"}`);
if (!hit) process.exit(0);
const r = await call("DescribePagesDeployments", {
  ProjectId: hit.ProjectId, Offset: 0, Limit: 10, OrderBy: "CreatedOn", Order: "Desc",
});
const deps = r.body?.Data?.Response?.Deployments || [];
for (const d of deps) {
  console.log(`  ${d.DeploymentId} ${d.CreatedOn} ${d.Status} code=${d.Code} prod=${d.UsedInProd} cost=${d.BuildCost}ms`);
}
const target = (wantId && deps.find((d) => d.DeploymentId === wantId))
  || deps.find((d) => d.Status !== "Success" && d.Status !== "Process")
  || deps[0];
if (!target) process.exit(0);
const lg = await call("DescribePagesDeploymentLog", { ProjectId: hit.ProjectId, DeploymentId: target.DeploymentId });
const url = lg.body?.Data?.Response?.LogUrl;
console.log(`## log ${target.DeploymentId} (${target.Status} code=${target.Code}) ${url ? "LogUrl present" : JSON.stringify(lg.body).slice(0, 1500)}`);
if (!url) process.exit(0);
const log = scrub(await (await fetch(url)).text());
const lines = log.split(/\r?\n/);
const interesting = lines.filter((l) => /fail|error|limit|exceed|quota|storage|size|capacity|too|超|限|失败|错误|容量|空间|code/i.test(l));
console.log(`  log lines=${lines.length}`);
console.log("  --- matching lines ---");
interesting.slice(-80).forEach((l) => console.log("  " + l.slice(0, 400)));
console.log("  --- last 80 lines ---");
lines.slice(-80).forEach((l) => console.log("  " + l.slice(0, 400)));
