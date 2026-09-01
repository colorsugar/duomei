import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { getHomeSectionHoldLayout } from "./homeSectionHold.ts";

test("keeps short content in place and adds the dwell runway", () => {
  assert.deepEqual(getHomeSectionHoldLayout({ viewportHeight: 1000, contentHeight: 600, innerHeight: 1000 }), {
    viewportHeight: 1000,
    contentHeight: 600,
    innerHeight: 1000,
    dwell: 1300,
    travel: 0,
    trackHeight: 2300,
  });
});

test("uses the stable sticky-stage height when the dynamic viewport differs", () => {
  assert.deepEqual(getHomeSectionHoldLayout({ viewportHeight: 800, contentHeight: 2200, innerHeight: 760 }), {
    viewportHeight: 800,
    contentHeight: 2200,
    innerHeight: 760,
    dwell: 988,
    travel: 1440,
    trackHeight: 3188,
  });
});

test("normalizes zero, negative, and non-finite measurements", () => {
  assert.deepEqual(getHomeSectionHoldLayout({ viewportHeight: -100, contentHeight: Number.NaN, innerHeight: 0 }), {
    viewportHeight: 0,
    contentHeight: 0,
    innerHeight: 0,
    dwell: 0,
    travel: 0,
    trackHeight: 0,
  });
});
