import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatGuyuPageNumber, guyuBooks } from "../src/content/guyuBooks.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

test("maps mixed single and two-page scans into aligned logical pages", () => {
  const book = guyuBooks[0];
  assert.equal(book.pages.length, 53);
  assert.equal(book.logicalPages.length, 80);
  assert.equal(book.logicalPages[0].sourcePage, 1);
  assert.equal(book.logicalPages.at(-1)?.sourcePage, 53);
  assert.equal(book.logicalPages.filter((page) => page.placement === "blank").length, 5);
  assert.equal(book.access, "class-gated");
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
  assert.equal(book.kind, "画本");
  assert.equal(book.access, "public");
  assert.equal(book.pages.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.coverSrc, "/images/guyu/zhi-shang-feiyan/pages/001.webp");
  assert.equal(book.previewCoverSrc, "/images/guyu-zhi-shang-feiyan-cover.webp");
  assert.ok(book.logicalPages.every((page) => page.placement === "full"));
  assert.deepEqual(
    book.logicalPages.map((page) => page.src),
    book.pages,
  );
  assert.equal(book.logicalPages[0].description, "单角飞檐、朱红流苏、一朵山茶，下半纸留白给书名");
  assert.equal(book.logicalPages.at(-1)?.description, "极简飞檐剪影与一小朵山茶，无长文");
  assert.match(book.logicalPages.at(-1)?.src ?? "", /\/030\.webp$/u);
});

test("maps the existing xinshuo-01 artwork as a public full-page book", () => {
  const book = guyuBooks.find((candidate) => candidate.id === "xinshuo-01");
  assert.ok(book);
  assert.equal(book.title, "想象画本");
  assert.equal(book.chapter, "新说");
  assert.equal(book.kind, "画本");
  assert.equal(book.access, "public");
  assert.equal(book.pages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.ok(book.pages.every((page) => page.startsWith("/images/guyu/xinshuo-01/pages/")));
  assert.ok(book.logicalPages.every((page) => page.placement === "full"));
  assert.equal(book.logicalPages[0].description, "纸上初醒");
  assert.equal(book.logicalPages.at(-1)?.description, "未完的蓝圈与新芽");
});

test("keeps every public new-book page present, ordered, and byte-stable", () => {
  const expectedHashes = {
    "zhi-shang-feiyan": "3500dbe09effcf7f8cc6d14616caad110a8c8c3d59d1520be8962149bece2c20",
    "xinshuo-01": "39621cb2ce866b65f64fd2d305e73d5e4035c264cf302a8993909576542cfba8",
  } as const;
  const expectedNames = Array.from({ length: 30 }, (_, index) => `${String(index + 1).padStart(3, "0")}.webp`);

  for (const [bookId, expectedHash] of Object.entries(expectedHashes)) {
    const pageDirectory = path.join(projectRoot, "public", "images", "guyu", bookId, "pages");
    const names = readdirSync(pageDirectory).sort();
    assert.deepEqual(names, expectedNames, `${bookId} page sequence changed`);

    const hash = createHash("sha256");
    for (const name of names) {
      const bytes = readFileSync(path.join(pageDirectory, name));
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${bookId}/${name} is not WebP`);
      assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${bookId}/${name} is not WebP`);
      hash.update(bytes);
    }
    assert.equal(hash.digest("hex"), expectedHash, `${bookId} artwork bytes changed`);
  }
});
