import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDomainReleaseAuthorization } from "./domain-release-gate-core.mjs";

const authorizationPath = process.argv[2];

try {
  if (!authorizationPath) {
    throw new Error("用法：npm run domain:release-gate -- ./domain-release-authorization.json");
  }
  const value = JSON.parse(await readFile(resolve(authorizationPath), "utf8"));
  process.stdout.write(`${JSON.stringify(validateDomainReleaseAuthorization(value), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Domain Release Gate FAIL: ${error.message}\n`);
  process.exitCode = 1;
}
