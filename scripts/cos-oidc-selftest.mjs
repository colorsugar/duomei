#!/usr/bin/env node
// OIDC 临时凭证自测（.github/workflows/cos-oidc-test.yml 手动跑）：
// 用 cos_oidc_assume 换来的临时凭证，往资产桶写 oidc-test/<时间戳>.txt，再 HeadObject + GetObject 读回比对，
// 顺带 GetBucket 列一下 oidc-test/ 前缀（正式同步要用到列目录权限）。不打印任何凭证。
// 要 COS_TMP_SECRET_ID / COS_TMP_SECRET_KEY / COS_TMP_TOKEN 和 COS_SDK_DIR（装了 cos-nodejs-sdk-v5 的目录）。
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "deploy", "cos-assets.json"), "utf8"));
const Bucket = process.env.COS_BUCKET || config.bucket;
const Region = process.env.COS_REGION || config.region;
const { COS_TMP_SECRET_ID, COS_TMP_SECRET_KEY, COS_TMP_TOKEN, COS_SDK_DIR } = process.env;
if (!COS_TMP_SECRET_ID || !COS_TMP_SECRET_KEY || !COS_TMP_TOKEN) {
  console.error("缺 COS 临时凭证（先 source scripts/cos-oidc-credentials.sh && cos_oidc_assume）。");
  process.exit(1);
}
const require = createRequire(path.join(path.resolve(COS_SDK_DIR || "."), "noop.js"));
const COS = require("cos-nodejs-sdk-v5");
const cos = new COS({ SecretId: COS_TMP_SECRET_ID, SecretKey: COS_TMP_SECRET_KEY, SecurityToken: COS_TMP_TOKEN, Timeout: 60000 });

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const Key = `oidc-test/${stamp}.txt`;
const body = `duomei OIDC test\nrun=${process.env.GITHUB_RUN_ID ?? "local"} sha=${process.env.GITHUB_SHA ?? ""}\nref=${process.env.GITHUB_REF ?? ""}\ntime=${new Date().toISOString()}\n`;
const errMsg = (e) => `${e?.code ?? e?.error?.Code ?? ""} ${e?.message ?? e?.error?.Message ?? JSON.stringify(e)}`.trim();

let ok = true;
const step = async (name, fn) => {
  try {
    const out = await fn();
    console.log(`通过 ${name}${out ? `：${out}` : ""}`);
  } catch (e) {
    ok = false;
    console.log(`失败 ${name}：${errMsg(e)}`);
  }
};

console.log(`桶 ${Bucket}（${Region}），测试对象 ${Key}`);
await step("PutObject", async () => {
  const r = await cos.putObject({ Bucket, Region, Key, Body: Buffer.from(body), ContentType: "text/plain; charset=utf-8" });
  return `HTTP ${r.statusCode} ETag ${r.ETag}`;
});
await step("HeadObject", async () => {
  const r = await cos.headObject({ Bucket, Region, Key });
  const len = Number(r.headers?.["content-length"]);
  if (len !== Buffer.byteLength(body)) throw new Error(`大小不对：${len} ≠ ${Buffer.byteLength(body)}`);
  return `HTTP ${r.statusCode} 大小 ${len} 字节`;
});
await step("GetObject", async () => {
  const r = await cos.getObject({ Bucket, Region, Key });
  const got = Buffer.from(r.Body).toString("utf8");
  if (got !== body) throw new Error("读回内容与写入不一致");
  return `HTTP ${r.statusCode} 内容一致（${got.split("\n")[1]}）`;
});
await step("GetBucket oidc-test/", async () => {
  const r = await cos.getBucket({ Bucket, Region, Prefix: "oidc-test/", MaxKeys: 1000 });
  const keys = (r.Contents ?? []).map((o) => o.Key);
  if (!keys.includes(Key)) throw new Error("列目录里没有刚写的对象");
  return `oidc-test/ 下共 ${keys.length} 个对象，含本次`;
});

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## COS OIDC 自测\n\n- 桶：${Bucket}（${Region}）\n- 对象：\`${Key}\`\n- 结果：${ok ? "写入、HeadObject、GetObject、GetBucket 全部通过" : "有失败，见日志"}\n`);
}
process.exit(ok ? 0 : 1);
