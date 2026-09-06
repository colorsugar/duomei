import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractEditionSummary,
  handleShellRequest,
  injectShareMeta,
  isCrawler,
  resolveShareMeta,
  rewriteShellResponse,
  staticShareMeta,
} from "./shareMeta.mjs";

const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
const sourceHtml = `<!doctype html><html><body><div class="page"><h1>小米今晚发18 Fold，伊萨尔火箭入轨</h1>
<p class="date">2026年9月7日</p><p class="lede">今天重点：小米秋季发布会今晚 &amp; 火箭入轨。</p></div></body></html>`;
const fetchSource = async () => new Response(sourceHtml, { status: 200, headers: { "content-type": "text/html" } });

function metaContent(html, attribute, name) {
  return html.match(new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="([^"]*)"`))?.[1];
}

test("crawler detection covers share bots and skips normal browsers", () => {
  assert.equal(isCrawler("Twitterbot/1.0"), true);
  assert.equal(isCrawler("facebookexternalhit/1.1"), true);
  assert.equal(isCrawler("Mozilla/5.0 (iPhone) Safari/604.1"), false);
  assert.equal(isCrawler(undefined), false);
});

test("static route copy", () => {
  assert.equal(staticShareMeta("/zaobao").title, "今日早报");
  assert.equal(staticShareMeta("/zaobao/archive").title, "往期早报");
  assert.equal(staticShareMeta("/zaobao/2026-09-05").title, "2026-09-05 早报");
  assert.equal(staticShareMeta("/zaobao/2026-09-05").sourceUrl, "https://zaobao-six.vercel.app/2026-09-05/");
  assert.equal(staticShareMeta("/guyu").title, "故语");
  assert.equal(staticShareMeta("/skills").title, "Skill");
  assert.equal(staticShareMeta("/"), null);
  assert.equal(staticShareMeta("/guyu/xinshuo-01"), null);
});

test("edition summary is extracted from the source markup", () => {
  assert.deepEqual(extractEditionSummary(sourceHtml), {
    headline: "小米今晚发18 Fold，伊萨尔火箭入轨",
    lede: "今天重点：小米秋季发布会今晚 & 火箭入轨。",
  });
});

test("crawlers get the edition headline, browsers get the static title without fetching", async () => {
  let fetched = 0;
  const counting = (...args) => { fetched += 1; return fetchSource(...args); };
  const bot = await resolveShareMeta("/zaobao", { crawler: true, fetchImpl: counting });
  assert.equal(bot.title, "小米今晚发18 Fold，伊萨尔火箭入轨 · 今日早报");
  assert.equal(bot.description, "今天重点：小米秋季发布会今晚 & 火箭入轨。");
  const human = await resolveShareMeta("/zaobao", { crawler: false, fetchImpl: counting });
  assert.equal(human.title, "今日早报");
  assert.equal(fetched, 1);
});

test("source failures and timeouts fall back to static copy", async () => {
  const failing = async () => { throw new Error("offline"); };
  assert.equal((await resolveShareMeta("/zaobao", { crawler: true, fetchImpl: failing })).title, "今日早报");
  const slow = () => new Promise(() => {});
  assert.equal((await resolveShareMeta("/zaobao", { crawler: true, fetchImpl: slow, timeoutMs: 20 })).title, "今日早报");
  const notFound = async () => new Response("", { status: 404 });
  assert.equal((await resolveShareMeta("/zaobao/2026-01-01", { crawler: true, fetchImpl: notFound })).title, "2026-01-01 早报");
});

test("injection rewrites every share tag in the real shell and escapes content", () => {
  const html = injectShareMeta(shell, { title: 'A "quoted" <title>', description: "desc & more" }, "https://duomei.site/zaobao");
  assert.match(html, /<title>A &quot;quoted&quot; &lt;title&gt; \| DUOMEI 多美小记<\/title>/);
  assert.equal(metaContent(html, "property", "og:title"), "A &quot;quoted&quot; &lt;title&gt;");
  assert.equal(metaContent(html, "name", "twitter:title"), "A &quot;quoted&quot; &lt;title&gt;");
  assert.equal(metaContent(html, "property", "og:description"), "desc &amp; more");
  assert.equal(metaContent(html, "name", "description"), "desc &amp; more");
  assert.equal(metaContent(html, "property", "og:url"), "https://duomei.site/zaobao");
  assert.equal(metaContent(html, "property", "og:image"), "https://duomei.site/og-image.svg");
  assert.equal(metaContent(html, "property", "og:site_name"), "DUOMEI 多美小记");
  assert.match(html, /<div id="root"><\/div>/);
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
});

test("rewriteShellResponse only touches HTML responses on share routes", async () => {
  const shellResponse = () => new Response(shell, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "content-length": "1", "etag": "x" } });
  const bot = new Request("https://duomei.site/zaobao/2026-09-05", { headers: { "user-agent": "Twitterbot/1.0" } });
  const rewritten = await rewriteShellResponse(bot, shellResponse(), { fetchImpl: fetchSource });
  const html = await rewritten.text();
  assert.equal(metaContent(html, "property", "og:title"), "小米今晚发18 Fold，伊萨尔火箭入轨 · 2026-09-05 早报");
  assert.equal(rewritten.headers.get("content-length"), null);
  assert.equal(rewritten.headers.get("etag"), null);

  const home = new Request("https://duomei.site/", { headers: { "user-agent": "Twitterbot/1.0" } });
  const untouched = shellResponse();
  assert.equal(await rewriteShellResponse(home, untouched, { fetchImpl: fetchSource }), untouched);

  const asset = new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  assert.equal(await rewriteShellResponse(bot, asset, { fetchImpl: fetchSource }), asset);

  const notShell = new Response("<p>maintenance</p>", { status: 200, headers: { "content-type": "text/html" } });
  const passed = await rewriteShellResponse(bot, notShell, { fetchImpl: fetchSource });
  assert.equal(passed, notShell);
  assert.equal(await passed.text(), "<p>maintenance</p>");
});

test("handleShellRequest fetches the site's own shell and tags the response", async () => {
  const seen = [];
  const fetchImpl = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    seen.push(url.href);
    if (url.pathname === "/index.html") {
      return new Response(shell, { status: 200, headers: { "content-type": "text/html", "content-length": "9" } });
    }
    return fetchSource();
  };
  const bot = await handleShellRequest(new Request("https://duomei.site/zaobao", { headers: { "user-agent": "Twitterbot/1.0" } }), { fetchImpl });
  assert.equal(seen[0], "https://duomei.site/index.html");
  assert.equal(bot.headers.get("x-duomei-share"), "rewritten");
  assert.equal(bot.headers.get("content-length"), null);
  assert.equal(metaContent(await bot.text(), "property", "og:title"), "小米今晚发18 Fold，伊萨尔火箭入轨 · 今日早报");

  const deep = await handleShellRequest(new Request("https://duomei.site/zaobao/x/y/z"), { fetchImpl });
  assert.equal(metaContent(await deep.text(), "property", "og:title"), "早报");

  const broken = new Response("gone", { status: 503 });
  assert.equal(await handleShellRequest(new Request("https://duomei.site/guyu"), { fetchImpl: async () => broken }), broken);

  let calls = 0;
  const flaky = async (input) => {
    calls += 1;
    if (calls === 1) throw new Error("edge fetch refused");
    return new Response("origin answer", { status: 200, headers: { "content-type": "text/html" } });
  };
  const recovered = await handleShellRequest(new Request("https://duomei.site/guyu"), { fetchImpl: flaky });
  assert.equal(await recovered.text(), "origin answer");
  assert.match(recovered.headers.get("x-duomei-share"), /^error edge fetch refused/);

  const dead = await handleShellRequest(new Request("https://duomei.site/guyu"), { fetchImpl: async () => { throw new Error("down"); } });
  assert.equal(dead.status, 503);
});
