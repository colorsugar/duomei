import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner needs the explicit source extension.
import * as playlist from "./neteasePlaylist.ts";

const {
  NETEASE_PLAYLIST_MAX_TRACKS,
  NeteasePlaylistError,
  fetchNeteasePlaylist,
  parseNeteasePlaylist,
} = playlist;

function track(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Track ${id}`,
    artist: "Artist",
    coverUrl: `https://p1.music.126.net/${id}.jpg`,
    durationMs: 213_000,
    playable: true,
    ...overrides,
  };
}

function payload(tracks: unknown[]) {
  return {
    playlistId: "316500315",
    name: "Tamidesu喜欢的音乐",
    total: tracks.length,
    tracks,
  };
}

test("parses every valid track instead of stopping at six visible rows", () => {
  const parsed = parseNeteasePlaylist(payload(Array.from({ length: 7 }, (_, index) => track(String(index + 1)))));
  assert.equal(parsed.tracks.length, 7);
  assert.deepEqual(parsed.tracks.at(-1), {
    id: "7",
    name: "Track 7",
    artist: "Artist",
    coverUrl: "https://p1.music.126.net/7.jpg",
    durationMs: 213_000,
    playable: true,
  });
});

test("normalizes numeric IDs emitted by the same-origin server", () => {
  const parsed = parseNeteasePlaylist({
    ...payload([track("22704409", { id: 22_704_409 })]),
    playlistId: 316_500_315,
  });
  assert.equal(parsed.playlistId, "316500315");
  assert.equal(parsed.tracks[0]?.id, "22704409");
});

test("keeps a track but clears malformed, non-HTTPS, or credentialed covers", () => {
  const parsed = parseNeteasePlaylist(payload([
    track("1", { coverUrl: null }),
    track("2", { coverUrl: "not a url" }),
    track("3", { coverUrl: "http://p1.music.126.net/3.jpg" }),
    track("4", { coverUrl: "https://user:secret@p1.music.126.net/4.jpg" }),
  ]));
  assert.deepEqual(parsed.tracks.map(({ coverUrl }) => coverUrl), [null, null, null, null]);
});

test("drops tracks with invalid required fields", () => {
  const parsed = parseNeteasePlaylist(payload([
    track("not-an-id"),
    track("2", { name: 42 }),
    track("3", { artist: "   " }),
    track("4", { durationMs: -1 }),
    track("5", { durationMs: Number.NaN }),
    track("6", { playable: "yes" }),
  ]));
  assert.deepEqual(parsed.tracks, []);
});

test("returns at most three thousand valid tracks", () => {
  const tracks = Array.from({ length: NETEASE_PLAYLIST_MAX_TRACKS + 25 }, (_, index) => track(String(index + 1)));
  const parsed = parseNeteasePlaylist(payload(tracks));
  assert.equal(parsed.tracks.length, NETEASE_PLAYLIST_MAX_TRACKS);
  assert.equal(parsed.tracks.at(-1)?.id, "3000");
  assert.equal(parsed.total, NETEASE_PLAYLIST_MAX_TRACKS + 25);
});

test("marks an invalid envelope as a format error", () => {
  assert.throws(
    () => parseNeteasePlaylist({ playlistId: "316500315", tracks: [] }),
    (error: unknown) => error instanceof NeteasePlaylistError && error.kind === "format",
  );
});

test("uses the same-origin endpoint and distinguishes transport failures", async () => {
  const originalFetch = globalThis.fetch;
  let requested: Parameters<typeof fetch> | undefined;
  globalThis.fetch = async (...args) => {
    requested = args;
    throw new TypeError("offline");
  };
  try {
    await assert.rejects(
      fetchNeteasePlaylist(),
      (error: unknown) => error instanceof NeteasePlaylistError && error.kind === "network",
    );
    assert.equal(requested?.[0], "/api/music-playlist");
    assert.equal((requested?.[1] as RequestInit | undefined)?.credentials, "same-origin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
