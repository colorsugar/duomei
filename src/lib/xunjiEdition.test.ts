import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { parseXunjiEdition, xunjiSafeHttpUrl } from "./xunjiEdition.ts";

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

test("falls back to a single lede card when the source is still a shell with no articles", () => {
  const edition = parseXunjiEdition(`<main><h1>寻迹</h1><h2>2026年9月20日</h2><p>每天一束西幻素材。</p></main>`);
  assert.equal(edition?.groups[0].stories[0].title, "寻迹");
  assert.deepEqual(edition?.groups[0].stories[0].paragraphs, ["每天一束西幻素材。"]);
  assert.equal(edition?.groups[0].stories[0].sourceUrl, null);
  assert.equal(parseXunjiEdition("__LOAD__"), null);
});
