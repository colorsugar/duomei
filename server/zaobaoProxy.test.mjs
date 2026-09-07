import assert from "node:assert/strict";
import test from "node:test";
import { ZAOBAO_PROXY_PREFIX, handleZaobaoProxyRequest, upstreamPath } from "./zaobaoProxy.mjs";

test("only today, dated editions and the manifest map upstream", () => {
  assert.deepEqual(upstreamPath("/zaobao-src"), { path: "/", maxAge: 300 });
  assert.deepEqual(upstreamPath("/zaobao-src/"), { path: "/", maxAge: 300 });
  assert.equal(upstreamPath("/zaobao-src/2026-09-05").path, "/2026-09-05/");
  assert.equal(upstreamPath("/zaobao-src/2026-09-05/").path, "/2026-09-05/");
  assert.equal(upstreamPath("/zaobao-src/archive/manifest.json").path, "/archive/manifest.json");
  assert.equal(upstreamPath("/zaobao-src/archive/"), null);
  assert.equal(upstreamPath("/zaobao-src/2026-9-5/"), null);
  assert.equal(upstreamPath("/zaobao-src/../index.html"), null);
  assert.equal(upstreamPath("/zaobao-src/2026-09-05/extra"), null);
  assert.equal(upstreamPath("/zaobao-srcx"), null);
  assert.equal(upstreamPath("/zaobao"), null);
  assert.equal(ZAOBAO_PROXY_PREFIX, "/zaobao-src");
});

test("relays the upstream body with same-origin cache headers", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push([url, init.method]);
    return new Response("<h1>今日</h1>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "content-encoding": "br", etag: "x", "access-control-allow-origin": "*" },
    });
  };
  const response = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src/2026-09-05"), { fetchImpl });
  assert.deepEqual(seen, [["https://zaobao-six.vercel.app/2026-09-05/", "GET"]]);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>今日</h1>");
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600, stale-while-revalidate=86400");
  assert.equal(response.headers.get("x-duomei-zaobao"), "proxy /2026-09-05/");
  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(response.headers.get("etag"), null);

  const manifest = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src/archive/manifest.json"), {
    fetchImpl: async () => new Response("[]", { headers: { "content-type": "application/json; charset=utf-8" } }),
  });
  assert.equal(manifest.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(manifest.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
});

test("rejects unknown paths and methods without touching upstream", async () => {
  let fetched = 0;
  const fetchImpl = async () => { fetched += 1; return new Response("nope"); };
  assert.equal((await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src/archive/"), { fetchImpl })).status, 404);
  assert.equal((await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src", { method: "POST" }), { fetchImpl })).status, 405);
  assert.equal(fetched, 0);
});

test("upstream failures become uncached errors", async () => {
  const missing = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src/2020-01-01"), {
    fetchImpl: async () => new Response("", { status: 404 }),
  });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  assert.equal(missing.headers.get("x-duomei-zaobao"), "upstream 404");

  const broken = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src"), {
    fetchImpl: async () => new Response("", { status: 500 }),
  });
  assert.equal(broken.status, 502);

  const offline = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src"), {
    fetchImpl: async () => { throw new Error("refused"); },
  });
  assert.equal(offline.status, 502);
  assert.equal(offline.headers.get("x-duomei-zaobao"), "error refused");
  assert.equal(await offline.text(), "早报暂时拿不到，请稍后再试。");

  const slow = await handleZaobaoProxyRequest(new Request("https://duomei.site/zaobao-src"), {
    fetchImpl: () => new Promise(() => {}),
    timeoutMs: 20,
  });
  assert.equal(slow.status, 502);
  assert.equal(slow.headers.get("x-duomei-zaobao"), "error timeout");
});
