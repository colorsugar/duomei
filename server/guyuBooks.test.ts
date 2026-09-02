import assert from "node:assert/strict";
import test from "node:test";
import { formatGuyuPageNumber, guyuBooks } from "../src/content/guyuBooks.ts";

test("maps mixed single and two-page scans into aligned logical pages", () => {
  const book = guyuBooks[0];
  assert.equal(book.pages.length, 53);
  assert.equal(book.logicalPages.length, 80);
  assert.equal(book.logicalPages[0].sourcePage, 1);
  assert.equal(book.logicalPages.at(-1)?.sourcePage, 53);
  assert.equal(book.logicalPages.filter((page) => page.placement === "blank").length, 5);
  assert.equal(book.previewCoverSrc, "/images/guyu-meiyou-yujian-cover.webp");
  assert.doesNotMatch(book.previewCoverSrc, /private-media|api\/guyu-page/u);

  for (const sourcePage of [10, 16, 21, 23, 24, 25, 26, 27, 30, 34, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]) {
    const indices = book.logicalPages
      .map((page, index) => page.sourcePage === sourcePage ? index : -1)
      .filter((index) => index >= 0);
    assert.deepEqual(indices, [indices[0], indices[0] + 1]);
    assert.equal(indices[0] % 2, 1);
    assert.equal(book.logicalPages[indices[0]].placement, sourcePage === 25 ? "stacked-top" : "spread-left");
    assert.equal(book.logicalPages[indices[1]].placement, sourcePage === 25 ? "stacked-bottom" : "spread-right");
  }

  assert.equal(book.logicalPages.find((page) => page.sourcePage === 15)?.placement, "full");
});

test("formats physical book pages without exposing scan numbers", () => {
  assert.equal(formatGuyuPageNumber(0, 80), "封面");
  assert.equal(formatGuyuPageNumber(1, 80), "1–2 / 78");
  assert.equal(formatGuyuPageNumber(9, 80), "9–10 / 78");
  assert.equal(formatGuyuPageNumber(77, 80), "77–78 / 78");
  assert.equal(formatGuyuPageNumber(79, 80), "封底");
});

test("maps zhi-shang-feiyan as a full-page new-book", () => {
  const book = guyuBooks.find((candidate) => candidate.id === "zhi-shang-feiyan");
  assert.ok(book);
  assert.equal(book.chapter, "新说");
  assert.equal(book.kind, "新说");
  assert.equal(book.pages.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.coverSrc, "/api/guyu-page?book=zhi-shang-feiyan&page=001");
  assert.equal(book.previewCoverSrc, "/images/guyu-zhi-shang-feiyan-cover.webp");
  assert.ok(book.logicalPages.every((page) => page.placement === "full"));
  assert.deepEqual(
    book.logicalPages.map((page) => page.src),
    book.pages,
  );
  assert.equal(book.logicalPages[0].description, "单角飞檐、朱红流苏、一朵山茶，下半纸留白给书名");
  assert.equal(book.logicalPages.at(-1)?.description, "极简飞檐剪影与一小朵山茶，无长文");
  assert.match(book.logicalPages.at(-1)?.src ?? "", /page=030$/u);
});
