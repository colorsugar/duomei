import assert from "node:assert/strict";
import test from "node:test";
import { formatGuyuPageNumber, guyuBooks } from "../src/content/guyuBooks.ts";

test("53 physical scans map to the reviewed 80 logical leaves", () => {
  const book = guyuBooks[0];
  assert.equal(book.pages.length, 53);
  assert.equal(book.logicalPages.length, 80);
  assert.equal(book.logicalPages.filter((page) => page.placement === "blank").length, 5);
  assert.equal(book.logicalPages[0].sourcePage, 1);
  assert.equal(book.logicalPages.at(-1).sourcePage, 53);
});

test("reviewed spread and stacked scans stay consecutive", () => {
  const book = guyuBooks[0];
  for (const sourcePage of [10, 16, 21, 23, 24, 25, 26, 27, 30, 34, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]) {
    const leaves = book.logicalPages.filter((page) => page.sourcePage === sourcePage);
    assert.equal(leaves.length, 2);
    assert.deepEqual(
      leaves.map((page) => page.placement),
      sourcePage === 25 ? ["stacked-top", "stacked-bottom"] : ["spread-left", "spread-right"],
    );
  }
  assert.equal(book.logicalPages.find((page) => page.sourcePage === 15).placement, "full");
});

test("reader chrome exposes logical page numbers, not scan filenames", () => {
  assert.equal(formatGuyuPageNumber(0, 80), "封面");
  assert.equal(formatGuyuPageNumber(1, 80), "1–2 / 78");
  assert.equal(formatGuyuPageNumber(79, 80), "封底");
});
