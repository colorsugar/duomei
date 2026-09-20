import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import {
  parseXunjiEdition,
  xunjiBareHttpUrl,
  xunjiParagraphClass,
  xunjiSafeHttpUrl,
  xunjiSourceLabel,
  xunjiStoryBody,
  xunjiTextParts,
} from "./xunjiEdition.ts";

test("keeps only http(s) source hrefs", () => {
  assert.equal(xunjiSafeHttpUrl("https://x.com/foo/status/1"), "https://x.com/foo/status/1");
  assert.equal(xunjiSafeHttpUrl("http://example.com/post"), "http://example.com/post");
  assert.equal(xunjiSafeHttpUrl("  https://example.com/a?q=1  "), "https://example.com/a?q=1");
  assert.equal(xunjiSafeHttpUrl("/local"), null);
  assert.equal(xunjiSafeHttpUrl("//x.com/foo"), null);
  assert.equal(xunjiSafeHttpUrl("javascript:alert(1)"), null);
  assert.equal(xunjiSafeHttpUrl("data:text/html,hi"), null);
  assert.equal(xunjiSafeHttpUrl(""), null);
});

test("reads articles from main > section#x-anecdotes without requiring a section heading", () => {
  const edition = parseXunjiEdition(`
    <main>
      <h1>寻迹</h1>
      <h2>2026年9月20日</h2>
      <p>从琐事里抽出可开写的骨架。</p>
      <section id="x-anecdotes">
        <article>
          <h3>雨夜里的驿站</h3>
          <p>一位信使把湿透的斗篷挂在门钩上。</p>
          <p><a href="https://x.com/someone/status/123">原帖</a></p>
        </article>
        <article>
          <h3>没有外链的条目</h3>
          <p>只有正文。</p>
          <a href="/inside">站内</a>
        </article>
      </section>
    </main>
  `);
  assert.ok(edition);
  assert.equal(edition.headline, "寻迹");
  assert.equal(edition.date, "2026年9月20日");
  assert.equal(edition.lede, "从琐事里抽出可开写的骨架。");
  assert.equal(edition.groups.length, 1);
  assert.equal(edition.groups[0].id, "xunji-group-x-anecdotes");
  assert.equal(edition.groups[0].name, "X琐事");
  assert.equal(edition.groups[0].stories.length, 2);
  assert.deepEqual(edition.groups[0].stories[0], {
    id: "1-1",
    title: "雨夜里的驿站",
    paragraphs: ["一位信使把湿透的斗篷挂在门钩上。", "原帖"],
    sourceUrl: "https://x.com/someone/status/123",
    sourceLabel: "@someone",
  });
  assert.equal(edition.groups[0].stories[1].sourceUrl, null);
  assert.equal(edition.groups[0].stories[1].sourceLabel, null);
});

test("still reads loose articles when the page has no section wrapper", () => {
  const edition = parseXunjiEdition(`
    <main>
      <h1>寻迹</h1>
      <article>
        <h3>散落条目</h3>
        <p>正文</p>
        <a href="http://example.com/post">打开</a>
      </article>
    </main>
  `);
  assert.equal(edition?.groups[0].stories[0].sourceUrl, "http://example.com/post");
  assert.equal(edition?.groups[0].stories[0].title, "散落条目");
});

test("keeps the old section[id] + h2 column name and ignores javascript hrefs", () => {
  const edition = parseXunjiEdition(`
    <div class="page">
      <h1>寻迹</h1>
      <p class="date">2026年9月19日</p>
      <section id="col-1">
        <h2>见闻</h2>
        <article data-id="a1">
          <h3>旧栏目标题</h3>
          <p>一段见闻。</p>
          <a href="javascript:alert(1)">坏链</a>
          <a href="https://example.com/ok">好链</a>
        </article>
      </section>
    </div>
  `);
  assert.equal(edition?.groups[0].name, "见闻");
  assert.equal(edition?.groups[0].stories[0].id, "a1");
  assert.equal(edition?.groups[0].stories[0].sourceUrl, "https://example.com/ok");
});

test("maps known section ids when the heading is missing", () => {
  const edition = parseXunjiEdition(`
    <main>
      <h1>寻迹</h1>
      <section id="f-anecdotes">
        <article><h3>影视一条</h3><p>背景：一场夜戏。</p></article>
      </section>
      <section id="s-anecdotes">
        <article><h3>学院一条</h3><p>背景：学期末。</p></article>
      </section>
    </main>
  `);
  assert.deepEqual(edition?.groups.map((group) => group.name), ["影视日常", "学院校园"]);
});

test("keeps a lone http(s) paragraph as a safe href and linkifies inline URLs", () => {
  assert.equal(xunjiBareHttpUrl("https://x.com/lb1800/status/2093852864561242426"), "https://x.com/lb1800/status/2093852864561242426");
  assert.equal(xunjiBareHttpUrl("  http://example.com/post  "), "http://example.com/post");
  assert.equal(xunjiBareHttpUrl("背景：https://x.com/foo"), null);
  assert.equal(xunjiBareHttpUrl("javascript:alert(1)"), null);
  assert.deepEqual(xunjiTextParts("https://x.com/foo/status/1"), [
    { text: "https://x.com/foo/status/1", href: "https://x.com/foo/status/1" },
  ]);
  assert.deepEqual(xunjiTextParts("见 https://x.com/foo 与后文"), [
    { text: "见 " },
    { text: "https://x.com/foo", href: "https://x.com/foo" },
    { text: " 与后文" },
  ]);
});

test("reads packed xihuan articles as a full story body, not a two-line teaser", () => {
  const edition = parseXunjiEdition(`<!doctype html><html lang="zh-CN"><body><header><h1>寻迹</h1></header><main class="wrap page"><h2>今日 · 2026-09-20</h2><p>从 X 琐事里，摘出骨架。</p><section id="x-anecdotes"><h2 class="sec">X琐事</h2><article data-id="x-001" id="x-001"><h3>表白换手机（职场/约会）</h3><p>来源：<a href="https://x.com/lb1800/status/2093852864561242426" target="_blank" rel="noreferrer noopener">X @lb1800（约 2026-08-30）</a></p><p><a href="https://x.com/lb1800/status/2093852864561242426">https://x.com/lb1800/status/2093852864561242426</a></p><p>背景：医院同事 38 岁仍单身。</p><p>原帖要点：男表白，女要手机。</p><p>西幻骨架：</p><p>· 人物：骑士学徒</p><p>· 触发：比武会后表白</p><ul><li>· 冲突：索要护符</li></ul></article><article data-id="x-002" id="x-002"><h3>想当姐夫（校园兄弟线）</h3><p>来源：<a href="https://x.com/lourou7292/status/2097684069756895486">X @lourou7292</a></p><p>背景：同学喜欢兄弟的姐姐。</p></article></section></main></body></html>`);
  assert.equal(edition?.groups[0].stories.length, 2);
  assert.equal(edition?.groups[0].name, "X琐事");
  assert.equal(edition?.groups[0].stories[0].id, "x-001");
  assert.equal(edition?.groups[0].stories[0].sourceUrl, "https://x.com/lb1800/status/2093852864561242426");
  assert.equal(edition?.groups[0].stories[0].sourceLabel, "X @lb1800（约 2026-08-30）");
  assert.equal(edition?.groups[0].stories[1].sourceUrl, "https://x.com/lourou7292/status/2097684069756895486");
  assert.deepEqual(xunjiStoryBody(edition?.groups[0].stories[0].paragraphs ?? []), [
    "https://x.com/lb1800/status/2093852864561242426",
    "背景：医院同事 38 岁仍单身。",
    "原帖要点：男表白，女要手机。",
    "西幻骨架：",
    "· 人物：骑士学徒",
    "· 触发：比武会后表白",
    "· 冲突：索要护符",
  ]);
  assert.equal(xunjiParagraphClass("西幻骨架："), "xunji-p is-skeleton");
  assert.equal(xunjiParagraphClass("· 人物：骑士学徒"), "xunji-p is-item");
  assert.equal(xunjiParagraphClass("背景：医院同事 38 岁仍单身。"), "xunji-p is-label");
  assert.equal(
    xunjiBareHttpUrl(xunjiStoryBody(edition?.groups[0].stories[0].paragraphs ?? [])[0] ?? ""),
    "https://x.com/lb1800/status/2093852864561242426",
  );
});

test("reads 16 xihuan-like articles with source links and refuses an empty shell", () => {
  const articles = Array.from({ length: 16 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    const url = `https://x.com/someone/status/${2093852864561242426n + BigInt(index)}`;
    return `<article data-id="x-${id}" id="x-${id}"><h3>条目${id}</h3><p>来源：<a href="${url}">X @someone</a></p><p><a href="${url}">${url}</a></p><p>背景：第${id}则。</p><p>西幻骨架：</p><p>· 人物：学徒</p></article>`;
  }).join("");
  const edition = parseXunjiEdition(`<!doctype html><html lang="zh-CN"><body><header><h1>寻迹</h1></header><main class="wrap page"><h2>今日 · 2026-09-20</h2><p>从 X 琐事里，摘出骨架。</p><section id="x-anecdotes"><h2 class="sec">X琐事</h2>${articles}</section></main></body></html>`);
  assert.equal(edition?.groups[0].stories.length, 16);
  for (const [index, story] of (edition?.groups[0].stories ?? []).entries()) {
    const url = `https://x.com/someone/status/${2093852864561242426n + BigInt(index)}`;
    assert.equal(story.sourceUrl, url);
    assert.equal(story.sourceLabel, "X @someone");
    assert.deepEqual(xunjiStoryBody(story.paragraphs), [url, `背景：第${String(index + 1).padStart(3, "0")}则。`, "西幻骨架：", "· 人物：学徒"]);
    assert.equal(xunjiBareHttpUrl(story.paragraphs.find((text) => xunjiBareHttpUrl(text)) ?? ""), url);
  }
  assert.equal(xunjiSourceLabel(["背景：无来源行"], "https://x.com/lb1800/status/1"), "@lb1800");
  assert.equal(parseXunjiEdition(`<main><h1>寻迹</h1><h2>2026年9月20日</h2><p>每天一束西幻素材。</p></main>`), null);
  assert.equal(parseXunjiEdition("__LOAD__"), null);
});
