import assert from "node:assert/strict";
import test from "node:test";
import { XUNJI_PROXY_PREFIX, handleXunjiProxyRequest, upstreamPath } from "./xunjiProxy.mjs";

test("only today, dated editions, archive and the manifest map upstream", () => {
  assert.deepEqual(upstreamPath("/xunji-src"), { path: "/", maxAge: 300 });
  assert.deepEqual(upstreamPath("/xunji-src/"), { path: "/", maxAge: 300 });
  assert.equal(upstreamPath("/xunji-src/2026-09-20").path, "/2026-09-20/");
  assert.equal(upstreamPath("/xunji-src/2026-09-20/").path, "/2026-09-20/");
  assert.deepEqual(upstreamPath("/xunji-src/archive"), { path: "/archive/", maxAge: 300 });
  assert.deepEqual(upstreamPath("/xunji-src/archive/"), { path: "/archive/", maxAge: 300 });
  assert.equal(upstreamPath("/xunji-src/archive/manifest.json").path, "/archive/manifest.json");
  assert.equal(upstreamPath("/xunji-src/2026-9-20/"), null);
  assert.equal(upstreamPath("/xunji-src/../index.html"), null);
  assert.equal(upstreamPath("/xunji-src/2026-09-20/extra"), null);
  assert.equal(upstreamPath("/xunji-srcx"), null);
  assert.equal(upstreamPath("/xunji"), null);
  assert.equal(upstreamPath("/zaobao-src"), null);
  assert.equal(XUNJI_PROXY_PREFIX, "/xunji-src");
});

test("relays the upstream body with same-origin cache headers", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push([url, init.method]);
    return new Response("<h1>寻迹</h1>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "content-encoding": "br", etag: "x", "access-control-allow-origin": "*" },
    });
  };
  const response = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src/2026-09-20"), { fetchImpl });
  assert.deepEqual(seen, [["https://xihuan.vercel.app/2026-09-20/", "GET"]]);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>寻迹</h1>");
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600, stale-while-revalidate=86400");
  assert.equal(response.headers.get("x-duomei-xunji"), "proxy /2026-09-20/");
  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(response.headers.get("etag"), null);

  const archive = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src/archive/"), {
    fetchImpl: async () => new Response("<h1>往期</h1>", { headers: { "content-type": "text/html; charset=utf-8" } }),
  });
  assert.equal(archive.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(archive.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
  assert.equal(archive.headers.get("x-duomei-xunji"), "proxy /archive/");

  const manifest = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src/archive/manifest.json"), {
    fetchImpl: async () => new Response("[]", { headers: { "content-type": "application/json; charset=utf-8" } }),
  });
  assert.equal(manifest.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(manifest.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
});

test("rejects unknown paths and methods without touching upstream", async () => {
  let fetched = 0;
  const fetchImpl = async () => { fetched += 1; return new Response("nope"); };
  assert.equal((await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src/secret"), { fetchImpl })).status, 404);
  assert.equal((await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src", { method: "POST" }), { fetchImpl })).status, 405);
  assert.equal(fetched, 0);
});

test("upstream failures become uncached errors", async () => {
  const missing = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src/2020-01-01"), {
    fetchImpl: async () => new Response("", { status: 404 }),
  });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  assert.equal(missing.headers.get("x-duomei-xunji"), "upstream 404");

  const broken = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src"), {
    fetchImpl: async () => new Response("", { status: 500 }),
  });
  assert.equal(broken.status, 502);

  const offline = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src"), {
    fetchImpl: async () => { throw new Error("refused"); },
  });
  assert.equal(offline.status, 502);
  assert.equal(offline.headers.get("x-duomei-xunji"), "error refused");
  assert.equal(await offline.text(), "寻迹暂时拿不到，请稍后再试。");

  const slow = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src"), {
    fetchImpl: () => new Promise(() => {}),
    timeoutMs: 20,
  });
  assert.equal(slow.status, 502);
  assert.equal(slow.headers.get("x-duomei-xunji"), "error timeout");
});

test("does not cache empty upstream shells", async () => {
  const empty = await handleXunjiProxyRequest(new Request("https://duomei.site/xunji-src"), {
    fetchImpl: async () => new Response("__LOAD__", { headers: { "content-type": "text/html; charset=utf-8" } }),
  });
  assert.equal(empty.status, 200);
  assert.equal(await empty.text(), "__LOAD__");
  assert.equal(empty.headers.get("cache-control"), "no-store");
});
