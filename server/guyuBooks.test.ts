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
  assert.match(book.previewAccent, /^var\(--color-guyu-cover-/u);
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
  assert.equal(book.kind, "画册");
  assert.equal(book.access, "public");
  assert.equal(book.pages.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.coverSrc, "/images/guyu/zhi-shang-feiyan/pages/001.webp");
  assert.equal(book.previewCoverSrc, "/images/guyu-zhi-shang-feiyan-cover.webp");
  assert.match(book.previewAccent, /^var\(--color-guyu-cover-/u);
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
  assert.equal(book.kind, "画册");
  assert.equal(book.access, "public");
  assert.equal(book.pages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.ok(book.pages.every((page) => page.startsWith("/images/guyu/xinshuo-01/pages/")));
  assert.ok(book.logicalPages.every((page) => page.placement === "full"));
  assert.equal(book.logicalPages[0].description, "纸上初醒");
  assert.equal(book.logicalPages.at(-1)?.description, "未完的蓝圈与新芽");
  assert.match(book.previewAccent, /^var\(--color-guyu-cover-/u);
});

test("maps watercolor xinshuo-02 with an independent cover and 30 full body pages", () => {
  const book = guyuBooks.find((candidate) => candidate.id === "xinshuo-02");
  assert.ok(book);
  assert.equal(book.title, "月亮下的童梦");
  assert.equal(book.author, "多美");
  assert.equal(book.chapter, "新说");
  assert.equal(book.kind, "画册");
  assert.equal(book.access, "public");
  assert.equal(book.pages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.logicalPages.length, 32);
  assert.ok(book.pages.every((page) => page.startsWith("/images/guyu/xinshuo-02/pages/")));
  assert.equal(book.coverSrc, "/images/guyu-xinshuo-02-cover.webp");
  assert.equal(book.logicalPages[0].src, book.previewCoverSrc);
  assert.equal(book.logicalPages[0].sourcePage, null);
  assert.ok(book.logicalPages.slice(1, -1).every((page) => page.placement === "full"));
  assert.deepEqual(book.logicalPages.slice(1, -1).map((page) => page.src), book.pages);
  assert.equal(book.logicalPages.at(-1)?.placement, "blank");
  assert.equal(formatGuyuPageNumber(1, book.logicalPages.length), "1–2 / 30");
  assert.equal(formatGuyuPageNumber(29, book.logicalPages.length), "29–30 / 30");
  assert.equal(formatGuyuPageNumber(31, book.logicalPages.length), "封底");
  assert.equal(
    book.logicalPages[1].description,
    "安静的教室里，黄色书包忽然浮离地面。学生抱着课本，惊讶地看着浮起的黄色书包。",
  );
  assert.equal(
    book.logicalPages.at(-2)?.description,
    "清晨回到画纸，梦里的故事有了最后一笔。学生在晨光中为画册画橘猫，真猫用爪碰触页面。",
  );
  assert.match(book.previewAccent, /^var\(--color-guyu-cover-/u);
});

test("maps gui-xiang-huan-xiang as a public full-page Guilin album", () => {
  const book = guyuBooks.find((candidate) => candidate.id === "gui-xiang-huan-xiang");
  assert.ok(book);
  assert.equal(book.title, "桂巷还香");
  assert.equal(book.chapter, "新说");
  assert.equal(book.kind, "画册");
  assert.equal(book.access, "public");
  assert.equal(book.pageCount, 30);
  assert.equal(book.pages.length, 30);
  assert.equal(book.pageDescriptions.length, 30);
  assert.equal(book.logicalPages.length, 30);
  assert.equal(book.coverSrc, "/images/guyu/gui-xiang-huan-xiang/pages/001.webp");
  assert.equal(book.previewCoverSrc, "/images/guyu-gui-xiang-huan-xiang-cover.webp");
  assert.match(book.previewAccent, /^var\(--color-guyu-cover-/u);
  assert.doesNotMatch(book.pages.join("\n"), /api\/guyu-page|private-media|workers\.dev|r2\./u);
  assert.ok(book.logicalPages.every((page) => page.placement === "full"));
  assert.deepEqual(
    book.pages,
    Array.from({ length: 30 }, (_, index) =>
      `/images/guyu/gui-xiang-huan-xiang/pages/${String(index + 1).padStart(3, "0")}.webp`),
  );
  assert.deepEqual(book.logicalPages.map((page) => page.src), book.pages);
  assert.deepEqual(book.logicalPages.map((page) => page.sourcePage), book.pages.map((_, index) => index + 1));
  assert.equal(book.logicalPages[0].description, "象鼻山远影与一角花桥，下半纸留白给书名");
  assert.equal(book.logicalPages[27]?.description, "一碗桂林米粉热气，摊只露出桌沿");
  assert.equal(book.logicalPages.at(-1)?.description, "一角青砖与一小簇桂花，大片纸空");
});

test("keeps every public new-book page present, ordered, and byte-stable", () => {
  const expectedHashes = {
    "zhi-shang-feiyan": "3500dbe09effcf7f8cc6d14616caad110a8c8c3d59d1520be8962149bece2c20",
    "xinshuo-01": "39621cb2ce866b65f64fd2d305e73d5e4035c264cf302a8993909576542cfba8",
    "xinshuo-02": "98f439c37b83abbb52da41334d531c7df9fc30f07a9805535d3bb96be8c6fab2",
    "gui-xiang-huan-xiang": "7f69bdcf24ee701365908cdc412f3cec137951639ccc1087e5339a99f74c40ad",
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
