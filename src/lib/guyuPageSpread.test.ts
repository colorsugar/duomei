import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { formatGuyuPhysicalPageNumber, getGuyuPageSpread } from "./guyuPageSpread.ts";

test("atlas chapter jumps decode both leaves of the destination spread", () => {
  // Physical 52 starts 山河相接; 58 starts 烬月传说. Both land on left leaves.
  assert.deepEqual(getGuyuPageSpread(52 - 1, 64), { pageIndex: 51, visiblePages: [51, 52] });
  assert.deepEqual(getGuyuPageSpread(58 - 1, 64), { pageIndex: 57, visiblePages: [57, 58] });
  // A chapter starting on the right must open its companion left page as well.
  assert.deepEqual(getGuyuPageSpread(59 - 1, 64), { pageIndex: 57, visiblePages: [57, 58] });
});

test("front and back covers remain single leaves and inputs stay in the book", () => {
  assert.deepEqual(getGuyuPageSpread(0, 64), { pageIndex: 0, visiblePages: [0] });
  assert.deepEqual(getGuyuPageSpread(63, 64), { pageIndex: 63, visiblePages: [63] });
  assert.deepEqual(getGuyuPageSpread(62, 64), { pageIndex: 61, visiblePages: [61, 62] });
  assert.deepEqual(getGuyuPageSpread(-2, 64), { pageIndex: 0, visiblePages: [0] });
  assert.deepEqual(getGuyuPageSpread(80, 64), { pageIndex: 63, visiblePages: [63] });
  assert.deepEqual(getGuyuPageSpread(Number.NaN, 64), { pageIndex: 0, visiblePages: [0] });
});

test("atlas rail folios match the printed 64-page table of contents", () => {
  assert.equal(formatGuyuPhysicalPageNumber(0, 64), "封面");
  assert.equal(formatGuyuPhysicalPageNumber(1, 64), "2–3 / 64");
  assert.equal(formatGuyuPhysicalPageNumber(51, 64), "52–53 / 64");
  assert.equal(formatGuyuPhysicalPageNumber(57, 64), "58–59 / 64");
  assert.equal(formatGuyuPhysicalPageNumber(61, 64), "62–63 / 64");
  assert.equal(formatGuyuPhysicalPageNumber(63, 64), "封底");
});
