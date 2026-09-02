import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { updateGuyuTouchSequence } from "./guyuTouchSequence.ts";

test("latches multi-touch until every finger is released", () => {
  const firstFinger = updateGuyuTouchSequence(false, 1);
  assert.equal(firstFinger.blocksTurn, false);

  const secondFinger = updateGuyuTouchSequence(firstFinger.multiTouch, 2);
  assert.equal(secondFinger.blocksTurn, true);

  const oneFingerRemaining = updateGuyuTouchSequence(secondFinger.multiTouch, 1);
  assert.equal(oneFingerRemaining.blocksTurn, true);

  const allReleased = updateGuyuTouchSequence(oneFingerRemaining.multiTouch, 0);
  assert.equal(allReleased.blocksTurn, true);
  assert.equal(allReleased.multiTouch, false);
});

test("allows the next single-touch sequence after a completed pinch", () => {
  const pinched = updateGuyuTouchSequence(true, 0);
  const nextTouch = updateGuyuTouchSequence(pinched.multiTouch, 1);
  assert.equal(nextTouch.blocksTurn, false);
});

test("the reader captures touch before StPageFlip and blocks compatibility mouse events", () => {
  const source = readFileSync(new URL("../components/GuyuFlipbook.tsx", import.meta.url), "utf8");
  assert.match(source, /onTouchStartCapture=\{onBookTouchStart\}/);
  assert.match(source, /onTouchMoveCapture=\{onBookTouchMove\}/);
  assert.match(source, /onTouchEndCapture=\{onBookTouchEnd\}/);
  assert.match(source, /onTouchCancelCapture=\{onBookTouchCancel\}/);
  assert.match(source, /onMouseDownCapture=\{blockCompatibilityMouse\}/);
  assert.match(source, /onMouseUpCapture=\{blockCompatibilityMouse\}/);
  assert.match(source, /onClickCapture=\{blockCompatibilityMouse\}/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(source, /if \(!nativeTouchReady\) void requestTurn/);
});
