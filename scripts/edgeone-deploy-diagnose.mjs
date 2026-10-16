// Read-only EdgeOne Makers diagnostics: prints the project's recent deployments
// (status, sizes, any error/log fields the API returns) so a bare
// "Deployment failed with status: Failed" from the CLI can be explained.
// Uses the same API endpoint and Bearer token as the edgeone CLI (global area).
// Secret-looking fields are redacted before printing.
//
//   EDGEONE_API_TOKEN=… EDGEONE_PROJECT_ID=makers-… node scripts/edgeone-deploy-diagnose.mjs [limit]

const API = process.env.EDGEONE_API_BASE || "https://pages-api.edgeone.ai/v1";
const token = process.env.EDGEONE_API_TOKEN;
const projectId = process.env.EDGEONE_PROJECT_ID;
const limit = Number(process.argv[2] || 8);
if (!token || !projectId) {
  console.error("EDGEONE_API_TOKEN and EDGEONE_PROJECT_ID are required.");
  process.exit(1);
}

const SECRET = /token|secret|password|passwd|credential|cookie|authorization|signature|(^|_)key$|apikey|env(var)?s?$/i;
const redact = (value, key = "") => {
  if (key && SECRET.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === "string" && /eo_token=|Bearer\s/i.test(value)) return value.replace(/(eo_token=)[^&\s]+/gi, "$1[redacted]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return value;
};

async function call(action, data) {
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

const deployments = await call("DescribePagesDeployments", {
  ProjectId: projectId, Offset: 0, Limit: limit, OrderBy: "CreatedOn", Order: "Desc",
});
console.log(`## DescribePagesDeployments (HTTP ${deployments.status})`);
console.log(JSON.stringify(redact(deployments.body), null, 2));

// The console shows a per-deployment log; the public docs do not name its API action,
// so probe the likely ones for each failed deployment (unknown actions just return an error).
const failed = (deployments.body?.Data?.Response?.Deployments || [])
  .filter((d) => d.Status !== "Success" && d.Status !== "Process")
  .map((d) => d.DeploymentId)
  .slice(0, 2);
const LOG_ACTIONS = [
  "DescribePagesDeploymentLogs", "DescribePagesDeploymentLog", "DescribePagesBuildLogs",
  "DescribePagesBuildLog", "DescribePagesDeploymentDetail", "DescribePagesDeployment",
  "DescribePagesDeploymentEvents", "DescribePagesLogs",
];
for (const id of failed) {
  for (const action of LOG_ACTIONS) {
    const r = await call(action, { ProjectId: projectId, DeploymentId: id });
    const text = JSON.stringify(redact(r.body));
    console.log(`## ${action} ${id} (HTTP ${r.status}) ${text.length > 6000 ? text.slice(0, 6000) + "…" : text}`);
  }
}

const projects = await call("DescribePagesProjects", {
  Filters: [{ Name: "ProjectId", Values: [projectId] }], Offset: 0, Limit: 1,
});
console.log(`## DescribePagesProjects (HTTP ${projects.status})`);
console.log(JSON.stringify(redact(projects.body), null, 2));
