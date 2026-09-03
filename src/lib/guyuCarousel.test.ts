import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as carousel from "./guyuCarousel.ts";

const {
  GUYU_ASSEMBLE_FALLBACK_MS,
  GUYU_CAROUSEL_DWELL_MS,
  GUYU_FRAGMENT_ASSEMBLE_MS,
  GUYU_FRAGMENT_HOLD_MS,
  GUYU_FRAGMENT_MAX_DELAY_MS,
  GUYU_FRAGMENT_SCATTER_MS,
  GUYU_FRAGMENT_VISUAL_MS,
  GUYU_SCATTER_FALLBACK_MS,
  GUYU_SETTLE_FALLBACK_MS,
  getGuyuSwipeDirection,
  wrapGuyuCarouselIndex,
} = carousel;

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

test("keeps the fragment transition deliberate and fallbacks safely after CSS", () => {
  assert.equal(GUYU_FRAGMENT_SCATTER_MS, 340);
  assert.equal(GUYU_FRAGMENT_MAX_DELAY_MS, 72);
  assert.equal(GUYU_FRAGMENT_HOLD_MS, 110);
  assert.equal(GUYU_FRAGMENT_ASSEMBLE_MS, 500);
  assert.ok(GUYU_FRAGMENT_VISUAL_MS >= 1_050 && GUYU_FRAGMENT_VISUAL_MS <= 1_150);
  assert.ok(GUYU_SCATTER_FALLBACK_MS > GUYU_FRAGMENT_SCATTER_MS + GUYU_FRAGMENT_MAX_DELAY_MS);
  assert.ok(GUYU_ASSEMBLE_FALLBACK_MS > GUYU_FRAGMENT_ASSEMBLE_MS + GUYU_FRAGMENT_MAX_DELAY_MS);
  assert.equal(GUYU_SETTLE_FALLBACK_MS, 1_200);
});
