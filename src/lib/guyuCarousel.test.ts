import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { GUYU_CAROUSEL_DWELL_MS, getGuyuSwipeDirection, wrapGuyuCarouselIndex } from "./guyuCarousel.ts";

test("loops the Guyu carousel in both directions", () => {
  assert.equal(wrapGuyuCarouselIndex(3, 3), 0);
  assert.equal(wrapGuyuCarouselIndex(-1, 3), 2);
  assert.equal(wrapGuyuCarouselIndex(7, 3), 1);
});

test("switches only for a deliberate horizontal swipe", () => {
  assert.equal(getGuyuSwipeDirection({ deltaX: -60, deltaY: 8, velocityX: -0.1 }), 1);
  assert.equal(getGuyuSwipeDirection({ deltaX: 54, deltaY: 10, velocityX: 0.1 }), -1);
  assert.equal(getGuyuSwipeDirection({ deltaX: -18, deltaY: 4, velocityX: -0.8 }), 1);
  assert.equal(getGuyuSwipeDirection({ deltaX: 10, deltaY: 48, velocityX: 1 }), 0);
  assert.equal(getGuyuSwipeDirection({ deltaX: 20, deltaY: 8, velocityX: 0.2 }), 0);
});

test("uses the faster automatic dwell", () => {
  assert.equal(GUYU_CAROUSEL_DWELL_MS, 1_600);
});
