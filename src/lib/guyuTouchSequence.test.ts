import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import { isGuyuViewportZoomed, updateGuyuTouchSequence } from "./guyuTouchSequence.ts";

test("latches multi-touch until every finger is released", () => {
  const firstFinger = updateGuyuTouchSequence(false, false, 1);
  assert.equal(firstFinger.blocksTurn, false);

  const secondFinger = updateGuyuTouchSequence(firstFinger.multiTouch, firstFinger.zoomedTouch, 2);
  assert.equal(secondFinger.blocksTurn, true);

  const oneFingerRemaining = updateGuyuTouchSequence(secondFinger.multiTouch, secondFinger.zoomedTouch, 1);
  assert.equal(oneFingerRemaining.blocksTurn, true);

  const allReleased = updateGuyuTouchSequence(oneFingerRemaining.multiTouch, oneFingerRemaining.zoomedTouch, 0);
  assert.equal(allReleased.blocksTurn, true);
  assert.equal(allReleased.multiTouch, false);
});

test("allows the next single-touch sequence after a completed pinch", () => {
  const pinched = updateGuyuTouchSequence(true, false, 0);
  const nextTouch = updateGuyuTouchSequence(pinched.multiTouch, pinched.zoomedTouch, 1);
  assert.equal(nextTouch.blocksTurn, false);
});

test("keeps a zoomed touch sequence out of the page-turn path until release", () => {
  assert.equal(isGuyuViewportZoomed(1.01), false);
  assert.equal(isGuyuViewportZoomed(1.011), true);

  const zoomed = updateGuyuTouchSequence(false, false, 1, 1.4);
  assert.equal(zoomed.blocksTurn, true);
  assert.equal(zoomed.zoomedTouch, true);

  const returnedToOne = updateGuyuTouchSequence(false, zoomed.zoomedTouch, 1, 1);
  assert.equal(returnedToOne.blocksTurn, true);

  const released = updateGuyuTouchSequence(false, returnedToOne.zoomedTouch, 0, 1);
  assert.equal(released.blocksTurn, true);
  assert.equal(released.zoomedTouch, false);

  const freshTouch = updateGuyuTouchSequence(false, released.zoomedTouch, 1, 1);
  assert.equal(freshTouch.blocksTurn, false);
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
  assert.match(source, /window\.visualViewport\?\.scale/);
  assert.match(source, /const isTurnBlocked/);
  assert.match(source, /await ensurePages\(required\)[\s\S]{0,220}if \(isTurnBlocked\(\)\)/);
  assert.match(source, /window\.addEventListener\("pageshow", syncViewportZoom\)/);
  assert.match(source, /duration >= TAP_MAX_DURATION/);
  assert.doesNotMatch(source, /onBookTouch(?:Start|Move|End|Cancel)[\s\S]{0,500}event\.preventDefault\(\)/);
  assert.doesNotMatch(source, /if \(!nativeTouchReady\) void requestTurn/);
});

test("the reader keeps zoomed panning native and exposes return, close, and wrapping shelf titles", () => {
  const flipbook = readFileSync(new URL("../components/GuyuFlipbook.tsx", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../pages/DuomeiGuyuReaderPage.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../guyu.css", import.meta.url), "utf8");

  assert.match(reader, /className="guyu-reader-back"/);
  assert.match(reader, /aria-hidden=\{isBookOpen\}/);
  assert.match(reader, /<span>返回故语<\/span>/);
  assert.match(flipbook, /className="guyu-reader-close"[\s\S]*?jumpToPage\(0\)[\s\S]*?合上/);
  assert.match(flipbook, /visualViewport[\s\S]*?addEventListener\("resize"/);
  assert.match(flipbook, /is-viewport-zoomed/);
  assert.match(styles, /\.guyu-pageflip-shell\.is-viewport-zoomed[\s\S]*?touch-action: pan-x pan-y pinch-zoom/);
  assert.match(styles, /\.guyu-flip-page[\s\S]*?-webkit-touch-callout: none/);
  assert.match(styles, /\.guyu-book-meta \.guyu-title-phrases > span[\s\S]*?overflow-wrap: anywhere[\s\S]*?white-space: normal/);
});

test("the reader reveals decoded covers softly and uses a deliberate page turn", () => {
  const flipbook = readFileSync(new URL("../components/GuyuFlipbook.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../guyu.css", import.meta.url), "utf8");

  assert.match(flipbook, /const FLIP_TIME = 1_400/);
  assert.match(flipbook, /coverReady \? " is-visual-ready"/);
  assert.match(flipbook, /data-phase=\{phase\}/);
  assert.match(flipbook, /className="guyu-reader-reveal"/);
  assert.match(flipbook, /maxShadowOpacity=\{0\.62\}/);
  assert.match(styles, /\.guyu-reader-reveal[\s\S]*?pointer-events: none/);
  assert.match(styles, /\.guyu-pageflip-shell\.is-visual-ready[\s\S]*?filter: blur\(0\) saturate\(1\)/);
  assert.match(styles, /guyuReaderShadowBreath 1400ms/);
  assert.match(styles, /transition: transform 900ms/);
  assert.doesNotMatch(styles, /--dur-normal/);
  assert.match(styles, /prefers-reduced-motion[\s\S]*?\.guyu-reader-reveal[\s\S]*?display: none/);
});
