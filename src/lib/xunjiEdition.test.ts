import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { parseXunjiEdition, xunjiBareHttpUrl, xunjiSafeHttpUrl, xunjiStoryTeaser } from "./xunjiEdition.ts";

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
  assert.equal(edition.groups[0].name, "寻迹");
  assert.equal(edition.groups[0].stories.length, 2);
  assert.deepEqual(edition.groups[0].stories[0], {
    id: "1-1",
    title: "雨夜里的驿站",
    paragraphs: ["一位信使把湿透的斗篷挂在门钩上。", "原帖"],
    sourceUrl: "https://x.com/someone/status/123",
  });
  assert.equal(edition.groups[0].stories[1].sourceUrl, null);
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

test("keeps a lone http(s) paragraph as a safe href for the reader", () => {
  assert.equal(xunjiBareHttpUrl("https://x.com/lb1800/status/2093852864561242426"), "https://x.com/lb1800/status/2093852864561242426");
  assert.equal(xunjiBareHttpUrl("  http://example.com/post  "), "http://example.com/post");
  assert.equal(xunjiBareHttpUrl("背景：https://x.com/foo"), null);
  assert.equal(xunjiBareHttpUrl("javascript:alert(1)"), null);
});

test("reads packed one-line xihuan articles and keeps the body URL in the teaser", () => {
  const edition = parseXunjiEdition(`<!doctype html><html lang="zh-CN"><body><header><h1>寻迹</h1></header><main class="wrap page"><h2>今日 · 2026-09-20</h2><p>从 X 琐事里，摘出骨架。</p><section id="x-anecdotes"><h2 class="sec">X琐事</h2><article data-id="x-001" id="x-001"><h3>表白换手机（职场/约会）</h3><p>来源：<a href="https://x.com/lb1800/status/2093852864561242426" target="_blank" rel="noreferrer noopener">X @lb1800</a></p><p><a href="https://x.com/lb1800/status/2093852864561242426">https://x.com/lb1800/status/2093852864561242426</a></p><p>背景：医院同事 38 岁仍单身。</p><p>西幻骨架：</p></article><article data-id="x-002" id="x-002"><h3>想当姐夫（校园兄弟线）</h3><p>来源：<a href="https://x.com/lourou7292/status/2097684069756895486">X @lourou7292</a></p><p>背景：同学喜欢兄弟的姐姐。</p></article></section></main></body></html>`);
  assert.equal(edition?.groups[0].stories.length, 2);
  assert.equal(edition?.groups[0].name, "X琐事");
  assert.equal(edition?.groups[0].stories[0].id, "x-001");
  assert.equal(edition?.groups[0].stories[0].sourceUrl, "https://x.com/lb1800/status/2093852864561242426");
  assert.equal(edition?.groups[0].stories[1].sourceUrl, "https://x.com/lourou7292/status/2097684069756895486");
  assert.deepEqual(xunjiStoryTeaser(edition?.groups[0].stories[0].paragraphs ?? []), [
    "https://x.com/lb1800/status/2093852864561242426",
    "背景：医院同事 38 岁仍单身。",
  ]);
  assert.equal(
    xunjiBareHttpUrl(xunjiStoryTeaser(edition?.groups[0].stories[0].paragraphs ?? [])[0] ?? ""),
    "https://x.com/lb1800/status/2093852864561242426",
  );
});

test("reads 16 xihuan-like articles with source links and refuses an empty shell", () => {
  const articles = Array.from({ length: 16 }, (_, index) => {
    const id = String(index + 1).padStart(3, "0");
    const url = `https://x.com/someone/status/${2093852864561242426n + BigInt(index)}`;
    return `<article data-id="x-${id}" id="x-${id}"><h3>条目${id}</h3><p>来源：<a href="${url}">X @someone</a></p><p><a href="${url}">${url}</a></p><p>背景：第${id}则。</p></article>`;
  }).join("");
  const edition = parseXunjiEdition(`<!doctype html><html lang="zh-CN"><body><header><h1>寻迹</h1></header><main class="wrap page"><h2>今日 · 2026-09-20</h2><p>从 X 琐事里，摘出骨架。</p><section id="x-anecdotes"><h2 class="sec">X琐事</h2>${articles}</section></main></body></html>`);
  assert.equal(edition?.groups[0].stories.length, 16);
  for (const [index, story] of (edition?.groups[0].stories ?? []).entries()) {
    const url = `https://x.com/someone/status/${2093852864561242426n + BigInt(index)}`;
    assert.equal(story.sourceUrl, url);
    assert.equal(xunjiStoryTeaser(story.paragraphs)[0], url);
    assert.equal(xunjiBareHttpUrl(story.paragraphs.find((text) => xunjiBareHttpUrl(text)) ?? ""), url);
  }
  assert.equal(parseXunjiEdition(`<main><h1>寻迹</h1><h2>2026年9月20日</h2><p>每天一束西幻素材。</p></main>`), null);
  assert.equal(parseXunjiEdition("__LOAD__"), null);
});
