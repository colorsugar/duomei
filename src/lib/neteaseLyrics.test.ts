import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as lyrics from "./neteaseLyrics.ts";

const { NeteaseLyricsError, fetchNeteaseLyrics, parseLrc } = lyrics;

test("parses multiple timestamps, hours, metadata, and sorted lines", () => {
  assert.deepEqual(
    parseLrc("[ar:Artist]\n[01:02.30][00:03.004]Again\n[01:02:03]Hours\n[00:01.2] First "),
    [
      { time: 1.2, text: "First", translation: null },
      { time: 3.004, text: "Again", translation: null },
      { time: 62.3, text: "Again", translation: null },
      { time: 3_723, text: "Hours", translation: null },
    ],
  );
});

test("merges the nearest translation within fifty milliseconds", () => {
  assert.deepEqual(
    parseLrc(
      "[00:01.00]One\n[00:02.00]Two\n[00:03.00]Three",
      "[00:00.95]一\n[00:02.051]太远\n[00:03.040]三",
    ),
    [
      { time: 1, text: "One", translation: "一" },
      { time: 2, text: "Two", translation: null },
      { time: 3, text: "Three", translation: "三" },
    ],
  );
});

test("removes exact duplicates while preserving different simultaneous lyrics", () => {
  assert.deepEqual(parseLrc("[00:01]A\n[00:01]A\n[00:01]B"), [
    { time: 1, text: "A", translation: null },
    { time: 1, text: "B", translation: null },
  ]);
});

test("ignores malformed timestamps and empty lyric rows", () => {
  assert.deepEqual(parseLrc("[00:60]No\n[01:60:00]No\n[00:01]\n[offset:-100]\nplain"), []);
});

test("caps parsed output at five thousand lines", () => {
  const source = Array.from({ length: 5_010 }, (_, index) => `[${Math.floor(index / 60)}:${String(index % 60).padStart(2, "0")}]Line ${index}`).join("\n");
  const parsed = parseLrc(source);
  assert.equal(parsed.length, 5_000);
  assert.equal(parsed[0].text, "Line 0");
  assert.equal(parsed.at(-1)?.text, "Line 4999");
});

test("requests the same-origin endpoint and parses strict JSON", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(JSON.stringify({
      id: 22_704_409,
      lyric: "[00:01]Hello",
      translatedLyric: "[00:01.03]你好",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    assert.deepEqual(await fetchNeteaseLyrics("22704409"), [
      { time: 1, text: "Hello", translation: "你好" },
    ]);
    assert.equal(requestedUrl, "/api/music-lyric?id=22704409");
    assert.equal(requestedInit?.credentials, "same-origin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid IDs and mismatched payloads as format errors", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({ id: 2, lyric: "", translatedLyric: "" });
  }) as typeof fetch;

  try {
    await assert.rejects(fetchNeteaseLyrics(" 1"), (error: unknown) => {
      assert.ok(error instanceof NeteaseLyricsError);
      return error.kind === "format";
    });
    assert.equal(calls, 0);

    await assert.rejects(fetchNeteaseLyrics("1"), (error: unknown) => {
      assert.ok(error instanceof NeteaseLyricsError);
      return error.kind === "format";
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("distinguishes network and malformed JSON failures", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
    await assert.rejects(fetchNeteaseLyrics("1"), (error: unknown) => {
      assert.ok(error instanceof NeteaseLyricsError);
      return error.kind === "network";
    });

    globalThis.fetch = (async () => new Response("not json")) as typeof fetch;
    await assert.rejects(fetchNeteaseLyrics("1"), (error: unknown) => {
      assert.ok(error instanceof NeteaseLyricsError);
      return error.kind === "format";
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
