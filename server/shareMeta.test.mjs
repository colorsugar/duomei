import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractEditionSummary,
  extractStorySummary,
  handleShellRequest,
  injectShareMeta,
  isCrawler,
  resolveShareMeta,
  rewriteShellResponse,
  staticShareMeta,
} from "./shareMeta.mjs";

const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
const sourceHtml = `<!doctype html><html><body><div class="page"><h1>小米今晚发18 Fold，伊萨尔火箭入轨</h1>
<p class="date">2026年9月7日</p><p class="lede">今天重点：小米秋季发布会今晚 &amp; 火箭入轨。</p>
<img src="/brand.svg" alt=""><img src="http://insecure.example/a.png" alt=""><img src="https://cdn.example/a.webp" alt="">
<img class="hero" src="https://img.example/2026/9/first.png?w=1200&amp;h=630" alt="hero"><img src="https://img.example/second.jpg" alt=""></div></body></html>`;
const FIRST_IMAGE = "https://img.example/2026/9/first.png?w=1200&h=630";
const STORY_IMAGE = "https://img.ithome.example/2026/9/astra.jpg";
const storyHtml = `<!doctype html><html><body><div class="page"><h1>18 Fold开售，塞尔达今晚直面会</h1>
<p class="date">2026年9月8日 星期二</p><p class="lede">今天重点：折叠屏 &amp; 直面会。</p>
<section id="guoji"><h2 class="sec">国际</h2><article data-id="iran-hormuz-0907" data-title="伊朗拟划限制区"><h2>伊朗拟划限制区</h2><p>伊朗段落。</p></article></section>
<section id="ai"><h2 class="sec">AI</h2><article data-id="gpt6-astra-portal-clear-0907" data-title="OpenAI GPT-6 Astra 自主通关《传送门》：约 24 小时、成本 571 美元"><figure><img src="${STORY_IMAGE}" alt="x" loading="lazy"><figcaption>IT之家</figcaption></figure><h2>OpenAI GPT-6 Astra 自主通关《传送门》</h2><p>爱好者用 MCP 让 GPT-6 Astra 控制《传送门》，耗时约 24 小时。</p><p>第二段。</p><p class="source"><a href="https://x.example">来源：IT之家</a></p></article>
<article data-id="no-figure-0907"><h2>没有图的一条</h2><p class="source"><a href="https://x.example">来源</a></p><p>只有来源后的正文。</p></article></section></div></body></html>`;
const htmlResponse = (html) => new Response(html, { status: 200, headers: { "content-type": "text/html" } });
const imageResponse = () => new Response("", { status: 200, headers: { "content-type": "image/jpeg" } });
const urlOf = (input) => (typeof input === "string" ? input : input.url);
// Edition HTML for the source, a real image for every image URL.
const fetchSource = async (input) => (/\.(?:png|jpe?g)(?:[?#]|$)/i.test(urlOf(input)) ? imageResponse() : htmlResponse(sourceHtml));
const fetchStorySource = async (input) => (/\.(?:png|jpe?g)(?:[?#]|$)/i.test(urlOf(input)) ? imageResponse() : htmlResponse(storyHtml));

function metaContent(html, attribute, name) {
  return html.match(new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="([^"]*)"`))?.[1];
}

test("crawler detection covers share bots and skips normal browsers", () => {
  assert.equal(isCrawler("Twitterbot/1.0"), true);
  assert.equal(isCrawler("facebookexternalhit/1.1"), true);
  assert.equal(isCrawler("Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36 MicroMessenger/8.0.50"), true);
  assert.equal(isCrawler("Mozilla/5.0 (Windows NT 10.0) WeChat/3.9"), true);
  assert.equal(isCrawler("Mozilla/5.0 (iPhone) Safari/604.1"), false);
  assert.equal(isCrawler(undefined), false);
});

test("static route copy", () => {
  assert.equal(staticShareMeta("/zaobao").title, "今日早报");
  assert.equal(staticShareMeta("/zaobao/archive").title, "往期早报");
  assert.equal(staticShareMeta("/zaobao/2026-09-05").title, "2026-09-05 早报");
  assert.equal(staticShareMeta("/zaobao/2026-09-05").sourceUrl, "https://zaobao-six.vercel.app/2026-09-05/");
  assert.equal(staticShareMeta("/zaobao").image, "/og-zaobao.png");
  assert.equal(staticShareMeta("/zaobao/archive").image, "/og-zaobao.png");
  assert.equal(staticShareMeta("/zaobao/2026-09-05").image, "/og-zaobao.png");
  assert.equal(staticShareMeta("/guyu").image, "/og-image.png");
  assert.equal(staticShareMeta("/guyu").title, "故语");
  assert.equal(staticShareMeta("/skills").title, "Skill");
  assert.equal(staticShareMeta("/"), null);
  assert.equal(staticShareMeta("/guyu/xinshuo-01"), null);
});

test("edition summary is extracted from the source markup", () => {
  assert.deepEqual(extractEditionSummary(sourceHtml), {
    headline: "小米今晚发18 Fold，伊萨尔火箭入轨",
    lede: "今天重点：小米秋季发布会今晚 & 火箭入轨。",
    image: FIRST_IMAGE,
  });
  assert.equal(extractEditionSummary('<img src="/only.svg"><img src="https://x.example/a.gif">').image, "");
});

test("crawlers get the edition headline, browsers get the static title without fetching", async () => {
  let fetched = 0;
  const counting = (...args) => { fetched += 1; return fetchSource(...args); };
  const bot = await resolveShareMeta("/zaobao", { crawler: true, fetchImpl: counting });
  assert.equal(bot.title, "小米今晚发18 Fold，伊萨尔火箭入轨 · 今日早报");
  assert.equal(bot.description, "今天重点：小米秋季发布会今晚 & 火箭入轨。");
  assert.equal(bot.image, FIRST_IMAGE);
  const human = await resolveShareMeta("/zaobao", { crawler: false, fetchImpl: counting });
  assert.equal(human.title, "今日早报");
  assert.equal(human.image, "/og-zaobao.png");
  // One fetch for the edition, one probe for its cover; the browser path fetches nothing.
  assert.equal(fetched, 2);
});

test("story routes resolve to the article's own title, first paragraph and figure", async () => {
  assert.equal(staticShareMeta("/zaobao/i/gpt6-astra-portal-clear-0907").storyId, "gpt6-astra-portal-clear-0907");
  assert.equal(staticShareMeta("/zaobao/i/gpt6-astra-portal-clear-0907").sourceUrl, "https://zaobao-six.vercel.app/");
  assert.equal(staticShareMeta("/zaobao/2026-09-08/i/gpt6-astra-portal-clear-0907").sourceUrl, "https://zaobao-six.vercel.app/2026-09-08/");
  assert.equal(staticShareMeta("/zaobao/2026-09-08/i/gpt6-astra-portal-clear-0907").title, "2026-09-08 早报");
  assert.equal(staticShareMeta("/zaobao/i/").title, "早报");
  assert.equal(staticShareMeta("/zaobao/i/bad id").storyId, undefined);
  assert.equal(staticShareMeta("/zaobao/2026-09-08/i/a/b").storyId, undefined);

  const story = await resolveShareMeta("/zaobao/2026-09-08/i/gpt6-astra-portal-clear-0907", { crawler: true, fetchImpl: fetchStorySource });
  assert.equal(story.title, "OpenAI GPT-6 Astra 自主通关《传送门》：约 24 小时、成本 571 美元 · 2026-09-08 早报");
  assert.equal(story.description, "爱好者用 MCP 让 GPT-6 Astra 控制《传送门》，耗时约 24 小时。");
  assert.equal(story.image, STORY_IMAGE);

  const human = await resolveShareMeta("/zaobao/2026-09-08/i/gpt6-astra-portal-clear-0907", { crawler: false, fetchImpl: fetchStorySource });
  assert.deepEqual(human, { title: "2026-09-08 早报", description: "国际、国内、日本、科技、AI、新品、兴趣、日常，八个栏目的每日早报。", image: "/og-zaobao.png" });

  // No data-title and no figure: h2 fills the title, `.source` is skipped for the lede, the site cover stays.
  const bare = await resolveShareMeta("/zaobao/i/no-figure-0907", { crawler: true, fetchImpl: fetchStorySource });
  assert.equal(bare.title, "没有图的一条 · 今日早报");
  assert.equal(bare.description, "只有来源后的正文。");
  assert.equal(bare.image, "/og-zaobao.png");

  // An id the edition no longer contains degrades to the edition card instead of a blank one.
  const gone = await resolveShareMeta("/zaobao/i/vanished-0901", { crawler: true, fetchImpl: fetchStorySource });
  assert.equal(gone.title, "18 Fold开售，塞尔达今晚直面会 · 今日早报");
  assert.equal(gone.image, STORY_IMAGE);
  assert.equal(extractStorySummary(storyHtml, "vanished-0901"), null);
});

test("a cover the CDN refuses to serve falls back to the fixed zaobao PNG", async () => {
  const forbidden = async (input) =>
    /\.jpg$/.test(urlOf(input)) ? new Response("denied", { status: 403, headers: { "content-type": "text/html" } }) : htmlResponse(storyHtml);
  const meta = await resolveShareMeta("/zaobao/i/gpt6-astra-portal-clear-0907", { crawler: true, fetchImpl: forbidden });
  assert.equal(meta.title, "OpenAI GPT-6 Astra 自主通关《传送门》：约 24 小时、成本 571 美元 · 今日早报");
  assert.equal(meta.image, "/og-zaobao.png");

  const htmlInstead = async (input) => (/\.jpg$/.test(urlOf(input)) ? htmlResponse("<p>login</p>") : htmlResponse(storyHtml));
  assert.equal((await resolveShareMeta("/zaobao/i/gpt6-astra-portal-clear-0907", { crawler: true, fetchImpl: htmlInstead })).image, "/og-zaobao.png");

  // A slow or unreachable probe is not evidence against the cover.
  const slowImage = (input) => (/\.jpg$/.test(urlOf(input)) ? new Promise(() => {}) : htmlResponse(storyHtml));
  assert.equal((await resolveShareMeta("/zaobao/i/gpt6-astra-portal-clear-0907", { crawler: true, fetchImpl: slowImage, timeoutMs: 20 })).image, STORY_IMAGE);
});

test("editions without a usable image keep the fixed zaobao cover", async () => {
  const noImage = async () => new Response("<h1>Headline</h1><img src=\"https://cdn.example/a.webp\">", { status: 200 });
  const meta = await resolveShareMeta("/zaobao/2026-09-05", { crawler: true, fetchImpl: noImage });
  assert.equal(meta.title, "Headline · 2026-09-05 早报");
  assert.equal(meta.image, "/og-zaobao.png");
  assert.equal((await resolveShareMeta("/zaobao/archive", { crawler: true, fetchImpl: noImage })).image, "/og-zaobao.png");
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
  assert.equal(metaContent(html, "property", "og:image"), "https://duomei.site/og-image.png");
  assert.equal(metaContent(html, "name", "twitter:image"), "https://duomei.site/og-image.png");
  const cover = injectShareMeta(shell, { title: "x", image: "/og-zaobao.png" }, "https://duomei.site/zaobao");
  assert.equal(metaContent(cover, "property", "og:image"), "https://duomei.site/og-zaobao.png");
  const remote = injectShareMeta(shell, { title: "x", image: FIRST_IMAGE }, "https://duomei.site/zaobao");
  assert.equal(metaContent(remote, "property", "og:image"), "https://img.example/2026/9/first.png?w=1200&amp;h=630");
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
  assert.equal(metaContent(html, "property", "og:image"), "https://img.example/2026/9/first.png?w=1200&amp;h=630");
  assert.equal(rewritten.headers.get("content-length"), null);
  assert.equal(rewritten.headers.get("etag"), null);

  const wechat = new Request("https://duomei.site/zaobao", { headers: { "user-agent": "Mozilla/5.0 (iPhone) MicroMessenger/8.0.50" } });
  const wechatHtml = await (await rewriteShellResponse(wechat, shellResponse(), { fetchImpl: fetchSource })).text();
  assert.equal(metaContent(wechatHtml, "property", "og:title"), "小米今晚发18 Fold，伊萨尔火箭入轨 · 今日早报");
  assert.match(metaContent(wechatHtml, "property", "og:image"), /^https:\/\/.+\.png/);

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
    return fetchSource(input);
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
