import { resolve4, resolveCname } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePrototypeEvidence } from "./prototype-gate-core.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  throw new Error(message);
}

async function fetchCheck(url, expectedStatus) {
  const response = await fetch(url, {
    redirect: "error",
    headers: { Accept: "application/json, text/html;q=0.9, */*;q=0.8" },
  });
  if (response.status !== expectedStatus) fail(`${url} 返回 ${response.status}，预期 ${expectedStatus}`);
  return response;
}

try {
  const baseInput = option("--base-url");
  const evidencePath = option("--evidence");
  if (!baseInput || !evidencePath) {
    fail("用法：npm run prototype:gate -- --base-url https://候选域名/ --evidence ./prototype-evidence.json");
  }

  const base = new URL(baseInput);
  if (base.protocol !== "https:") fail("Prototype Gate 只接受 HTTPS");
  base.hash = "";
  base.search = "";

  const home = await fetchCheck(base.href, 200);
  const html = await home.text();
  if (!html.includes("没有遇见 何来艳遇")) fail("首页缺少候选画册标题");

  const authUrl = new URL("/api/guyu-auth", base);
  const auth = await fetchCheck(authUrl.href, 200);
  const authJson = await auth.json();
  if (authJson.authorized !== false) fail("未登录鉴权接口没有返回 authorized:false");

  const pageUrl = new URL("/api/guyu-page?book=meiyou-yujian&page=001", base);
  await fetchCheck(pageUrl.href, 401);

  const evidence = JSON.parse(await readFile(resolve(evidencePath), "utf8"));
  const verifiedEvidence = validatePrototypeEvidence(evidence, base.href);

  const dns = { cname: [], ipv4: [] };
  try { dns.cname = await resolveCname(base.hostname); } catch {}
  try { dns.ipv4 = await resolve4(base.hostname); } catch {}

  const diagnostics = {
    gate: "PASS",
    baseUrl: base.href,
    live: {
      home: home.status,
      auth: auth.status,
      privatePageWithoutSession: 401,
      server: home.headers.get("server"),
      via: home.headers.get("via"),
      edgeRequestId: home.headers.get("eo-log-uuid"),
    },
    dns,
    evidence: verifiedEvidence,
    note: "该结果只证明本次可达性与功能门禁，不证明 ICP 状态或未来 SLA。",
  };
  process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Prototype Gate FAIL: ${error.message}\n`);
  process.exitCode = 1;
}
