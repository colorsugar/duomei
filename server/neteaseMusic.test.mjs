import assert from "node:assert/strict";
import test from "node:test";
import {
  NETEASE_DETAIL_BATCH_SIZE,
  NETEASE_MAX_LYRIC_BYTES,
  NETEASE_MAX_TRACKS,
  NETEASE_PLAYLIST_ID,
  createNeteaseMusicService,
} from "./neteaseMusic.mjs";

function json(body, status = 200) {
  return Response.json(body, { status });
}

function song(id) {
  return {
    id,
    name: `歌曲 ${id}`,
    ar: [{ name: `歌手 ${id}` }, { name: "合唱" }],
    al: { picUrl: `http://img.example.test/${id}.jpg` },
    dt: id * 1000,
  };
}

function createMockFetch({
  trackIds,
  playlistName = "测试歌单",
  detailOrder = (ids) => ids,
  privileges = (ids) => ids.map((id) => ({ id, pl: 128000 })),
  playerResponse = (id) => ({ code: 200, data: [{ id, code: 200, url: `http://audio.example.test/${id}.mp3` }] }),
  lyricResponse = (id) => ({
    code: 200,
    lrc: { lyric: `[00:00.00]歌词 ${id}` },
    tlyric: { lyric: `[00:00.00]Translation ${id}` },
  }),
} = {}) {
  const calls = [];
  const ids = trackIds ?? [11, 22, 33];

  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    calls.push(url);

    if (url.pathname === "/api/v6/playlist/detail") {
      assert.equal(url.searchParams.get("id"), String(NETEASE_PLAYLIST_ID));
      return json({
        code: 200,
        playlist: {
          name: playlistName,
          trackIds: ids.map((id) => ({ id })),
        },
      });
    }

    if (url.pathname === "/api/v3/song/detail") {
      const requested = JSON.parse(url.searchParams.get("c") ?? "[]").map((entry) => entry.id);
      return json({
        code: 200,
        songs: detailOrder(requested).map(song),
        privileges: privileges(requested),
      });
    }

    if (url.pathname === "/api/song/enhance/player/url") {
      const rawIds = url.searchParams.get("ids");
      assert.match(rawIds ?? "", /^\[\d+\]$/u);
      assert.equal(url.searchParams.get("br"), "128000");
      return json(playerResponse(Number(rawIds.slice(1, -1))));
    }

    if (url.pathname === "/api/song/lyric") {
      const id = Number(url.searchParams.get("id"));
      assert.ok(Number.isSafeInteger(id) && id > 0);
      assert.equal(url.searchParams.get("lv"), "-1");
      assert.equal(url.searchParams.get("kv"), "-1");
      assert.equal(url.searchParams.get("tv"), "-1");
      return json(lyricResponse(id));
    }

    return json({ secret: "upstream body must never escape" }, 500);
  };

  return { calls, fetchImpl };
}

test("playlist keeps source order across 200-song batches and maps privileges by id", async () => {
  const trackIds = Array.from({ length: 401 }, (_, index) => 1001 + index);
  const { calls, fetchImpl } = createMockFetch({
    trackIds,
    detailOrder: (ids) => [...ids].reverse(),
    privileges: (ids) => [...ids].reverse().map((id) => ({ id, pl: id === trackIds[0] ? 0 : 128000 })),
  });
  const service = createNeteaseMusicService({ fetchImpl });

  const playlist = await service.getPlaylist();

  assert.equal(playlist.playlistId, NETEASE_PLAYLIST_ID);
  assert.equal(playlist.name, "测试歌单");
  assert.equal(playlist.total, trackIds.length);
  assert.deepEqual(playlist.tracks.map((track) => track.id), trackIds);
  assert.equal(playlist.tracks[0].playable, false, "the first unavailable song stays in the list");
  assert.equal(playlist.tracks[1].playable, true, "later playable songs stay marked for client selection");
  assert.equal(playlist.tracks[0].artist, "歌手 1001 / 合唱");
  assert.equal(playlist.tracks[0].coverUrl, "https://img.example.test/1001.jpg");
  assert.equal(playlist.tracks[0].durationMs, 1001000);

  const detailCalls = calls.filter((call) => call.pathname === "/api/v3/song/detail");
  assert.equal(detailCalls.length, 3);
  assert.deepEqual(
    detailCalls.map((call) => JSON.parse(call.searchParams.get("c")).length),
    [NETEASE_DETAIL_BATCH_SIZE, NETEASE_DETAIL_BATCH_SIZE, 1],
  );
});

test("playlist caps upstream track ids at 3000", async () => {
  const trackIds = Array.from({ length: NETEASE_MAX_TRACKS + 5 }, (_, index) => index + 1);
  const { calls, fetchImpl } = createMockFetch({ trackIds });
  const playlist = await createNeteaseMusicService({ fetchImpl }).getPlaylist();

  assert.equal(playlist.total, NETEASE_MAX_TRACKS);
  assert.equal(playlist.tracks.at(-1).id, NETEASE_MAX_TRACKS);
  const detailCalls = calls.filter((call) => call.pathname === "/api/v3/song/detail");
  assert.equal(detailCalls.length, NETEASE_MAX_TRACKS / NETEASE_DETAIL_BATCH_SIZE);
});

test("missing privilege data leaves tracks visible but unplayable", async () => {
  const { fetchImpl } = createMockFetch({
    trackIds: [41, 42],
    privileges: () => [{ id: 42, pl: 128000 }],
  });
  const playlist = await createNeteaseMusicService({ fetchImpl }).getPlaylist();

  assert.deepEqual(playlist.tracks.map(({ id, playable }) => ({ id, playable })), [
    { id: 41, playable: false },
    { id: 42, playable: true },
  ]);
});

test("missing song detail becomes a placeholder while playable still follows privilege.pl", async () => {
  const { fetchImpl } = createMockFetch({
    trackIds: [51, 52, 53],
    detailOrder: (ids) => ids.filter((id) => id !== 52),
  });
  const playlist = await createNeteaseMusicService({ fetchImpl }).getPlaylist();

  assert.equal(playlist.total, 3);
  assert.deepEqual(playlist.tracks.map((track) => track.id), [51, 52, 53]);
  assert.deepEqual(playlist.tracks[1], {
    id: 52,
    name: "歌曲暂不可用",
    artist: "网易云音乐",
    coverUrl: "",
    durationMs: 0,
    playable: true,
  });
});

test("TTL promise cache coalesces concurrent playlist loads", async () => {
  const { calls, fetchImpl } = createMockFetch({ trackIds: [1, 2] });
  const service = createNeteaseMusicService({ fetchImpl });

  const [first, second] = await Promise.all([service.getPlaylist(), service.getPlaylist()]);

  assert.strictEqual(first, second);
  assert.equal(calls.filter((call) => call.pathname === "/api/v6/playlist/detail").length, 1);
  assert.equal(calls.filter((call) => call.pathname === "/api/v3/song/detail").length, 1);
});

test("a rejected cache entry is cleared before retry", async () => {
  let identityAttempts = 0;
  const { fetchImpl: successFetch } = createMockFetch({ trackIds: [7] });
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v6/playlist/detail" && identityAttempts++ === 0) {
      return json({ private: "must not escape" }, 503);
    }
    return successFetch(input, init);
  };
  const service = createNeteaseMusicService({ fetchImpl });

  const first = await service.handlePlaylistRequest(new Request("https://duomei.site/api/music-playlist"));
  const second = await service.handlePlaylistRequest(new Request("https://duomei.site/api/music-playlist"));

  assert.equal(first.status, 502);
  const firstBody = await first.text();
  assert.deepEqual(JSON.parse(firstBody), { error: "PLAYLIST_UNAVAILABLE" });
  assert.doesNotMatch(firstBody, /private/u);
  assert.equal(second.status, 200);
  assert.equal(identityAttempts, 2);
});

test("stream accepts only decimal ids from the fixed playlist", async () => {
  const { calls, fetchImpl } = createMockFetch({ trackIds: [101, 202] });
  const service = createNeteaseMusicService({ fetchImpl });

  const invalid = await service.handleStreamRequest(
    new Request("https://duomei.site/api/music-stream?id=1e2"),
  );
  const outside = await service.handleStreamRequest(
    new Request("https://duomei.site/api/music-stream?id=303"),
  );

  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "INVALID_TRACK_ID" });
  assert.equal(outside.status, 404);
  assert.deepEqual(await outside.json(), { error: "TRACK_NOT_IN_PLAYLIST" });
  assert.equal(calls.filter((call) => call.pathname === "/api/song/enhance/player/url").length, 0);
});

test("stream upgrades an official playable URL to https and returns 302", async () => {
  const { fetchImpl } = createMockFetch({ trackIds: [202] });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleStreamRequest(
    new Request("https://duomei.site/api/music-stream?id=202"),
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://audio.example.test/202.mp3");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("stream returns a generic 404 when NetEase reports an unplayable track", async () => {
  const { fetchImpl } = createMockFetch({
    trackIds: [202],
    playerResponse: (id) => ({
      code: 200,
      data: [{ id, code: 404, url: "http://private-upstream.invalid/secret" }],
    }),
  });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleStreamRequest(
    new Request("https://duomei.site/api/music-stream?id=202"),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "TRACK_UNPLAYABLE" });
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("playlist route emits cache and nosniff headers without upstream details", async () => {
  const { fetchImpl } = createMockFetch({ trackIds: [9] });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handlePlaylistRequest(
    new Request("https://duomei.site/api/music-playlist"),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /max-age=300/u);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("lyric accepts only decimal ids from the fixed playlist", async () => {
  const { calls, fetchImpl } = createMockFetch({ trackIds: [101, 202] });
  const service = createNeteaseMusicService({ fetchImpl });

  const invalid = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=1e2"),
  );
  const outside = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=303"),
  );

  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "INVALID_TRACK_ID" });
  assert.equal(outside.status, 404);
  assert.deepEqual(await outside.json(), { error: "TRACK_NOT_IN_PLAYLIST" });
  assert.equal(calls.filter((call) => call.pathname === "/api/song/lyric").length, 0);
});

test("lyric returns original and translated text with public cache headers", async () => {
  const { calls, fetchImpl } = createMockFetch({ trackIds: [202] });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: 202,
    lyric: "[00:00.00]歌词 202",
    translatedLyric: "[00:00.00]Translation 202",
  });
  assert.match(response.headers.get("cache-control") ?? "", /max-age=300/u);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(calls.filter((call) => call.pathname === "/api/song/lyric").length, 1);
});

test("lyric represents a song without lyric data as empty strings", async () => {
  const { fetchImpl } = createMockFetch({
    trackIds: [202],
    lyricResponse: () => ({ code: 200, nolyric: true }),
  });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 202, lyric: "", translatedLyric: "" });
});

test("lyric rejects an upstream string larger than 200KB without exposing it", async () => {
  const oversized = "x".repeat(NETEASE_MAX_LYRIC_BYTES + 1);
  const { fetchImpl } = createMockFetch({
    trackIds: [202],
    lyricResponse: () => ({ code: 200, lrc: { lyric: oversized } }),
  });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202"),
  );
  const body = await response.text();

  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(body), { error: "LYRIC_UNAVAILABLE" });
  assert.ok(body.length < 100);
});

test("lyric returns a generic error when the official upstream fails", async () => {
  const { fetchImpl: successFetch } = createMockFetch({ trackIds: [202] });
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/song/lyric") {
      return json({ private: "must not escape" }, 503);
    }
    return successFetch(input, init);
  };
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202"),
  );
  const body = await response.text();

  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(body), { error: "LYRIC_UNAVAILABLE" });
  assert.doesNotMatch(body, /private/u);
});

test("lyric HEAD has the same metadata and no body", async () => {
  const { calls, fetchImpl } = createMockFetch({ trackIds: [202] });
  const service = createNeteaseMusicService({ fetchImpl });

  const response = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202", { method: "HEAD" }),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.match(response.headers.get("cache-control") ?? "", /max-age=300/u);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(calls.filter((call) => call.pathname === "/api/song/lyric").length, 1);
});

test("lyric HEAD suppresses error bodies too", async () => {
  const { fetchImpl: successFetch } = createMockFetch({ trackIds: [202] });
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/song/lyric") return json({ private: "secret" }, 503);
    return successFetch(input, init);
  };
  const service = createNeteaseMusicService({ fetchImpl });

  const invalid = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=abc", { method: "HEAD" }),
  );
  const outside = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=303", { method: "HEAD" }),
  );
  const upstreamFailure = await service.handleLyricRequest(
    new Request("https://duomei.site/api/music-lyric?id=202", { method: "HEAD" }),
  );

  assert.deepEqual(
    await Promise.all([invalid, outside, upstreamFailure].map((response) => response.text())),
    ["", "", ""],
  );
  assert.deepEqual(
    [invalid.status, outside.status, upstreamFailure.status],
    [400, 404, 502],
  );
});
