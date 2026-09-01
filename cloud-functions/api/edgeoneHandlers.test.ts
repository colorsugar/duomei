import assert from "node:assert/strict";
import test from "node:test";
import { Buffer } from "node:buffer";
import { build } from "esbuild";

process.env.GUYU_ACCESS_ANSWER = "4242";
process.env.GUYU_SESSION_SECRET = "edgeone-session-secret-for-tests-0123456789";
process.env.GUYU_MEDIA_ORIGIN = "https://media.example.test";
process.env.GUYU_MEDIA_SIGNING_SECRET = "edgeone-media-secret-for-tests-0123456789";

async function importBundledHandler(entryPoint: string) {
  const result = await build({
    bundle: true,
    entryPoints: [entryPoint],
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const { default: authHandler } = await importBundledHandler("cloud-functions/api/guyu-auth.ts");
const { default: pageHandler } = await importBundledHandler("cloud-functions/api/guyu-page.ts");

test("EdgeOne auth handler issues a session cookie", async () => {
  const response = await authHandler({
    request: new Request("https://duomei.site/api/guyu-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "4242班" }),
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: true });
  assert.match(response.headers.get("set-cookie") ?? "", /guyu_access=/u);
});

test("EdgeOne page handler keeps private pages behind the session", async () => {
  const unauthorized = await pageHandler({
    request: new Request("https://duomei.site/api/guyu-page?book=meiyou-yujian&page=001"),
  });
  assert.equal(unauthorized.status, 401);

  const authResponse = await authHandler({
    request: new Request("https://duomei.site/api/guyu-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "4242" }),
    }),
  });
  const cookie = (authResponse.headers.get("set-cookie") ?? "").split(";", 1)[0];
  const authorized = await pageHandler({
    request: new Request("https://duomei.site/api/guyu-page?book=meiyou-yujian&page=001", {
      headers: { Cookie: cookie },
    }),
  });

  assert.equal(authorized.status, 302);
  assert.match(authorized.headers.get("location") ?? "", /^https:\/\/media\.example\.test\/private-media\/guyu\/meiyou-yujian\/pages\/001\.webp\?/u);
});
