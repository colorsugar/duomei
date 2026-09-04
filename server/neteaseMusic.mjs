const NETEASE_ORIGIN = "https://music.163.com";

export const NETEASE_PLAYLIST_ID = 316500315;
export const NETEASE_DETAIL_BATCH_SIZE = 200;
export const NETEASE_MAX_TRACKS = 3000;
export const NETEASE_CACHE_TTL_MS = 5 * 60 * 1000;

const upstreamHeaders = {
  Accept: "application/json",
  Referer: `${NETEASE_ORIGIN}/`,
  "User-Agent": "Mozilla/5.0 (compatible; DUOMEI/1.0; +https://duomei.site)",
};

const baseHeaders = {
  "X-Content-Type-Options": "nosniff",
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function emptyHeadResponse(response) {
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

function normalizePositiveInteger(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function normalizeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function fetchJson(fetchImpl, url) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: upstreamHeaders,
      redirect: "follow",
    });
  } catch {
    throw new Error("NETEASE_UPSTREAM_UNAVAILABLE");
  }

  if (!response?.ok) throw new Error("NETEASE_UPSTREAM_UNAVAILABLE");

  try {
    return await response.json();
  } catch {
    throw new Error("NETEASE_UPSTREAM_INVALID");
  }
}

function readPlaylistIdentity(payload) {
  const playlist = payload?.playlist;
  if (payload?.code !== 200 || !playlist || !Array.isArray(playlist.trackIds)) {
    throw new Error("NETEASE_PLAYLIST_INVALID");
  }

  const trackIds = playlist.trackIds.slice(0, NETEASE_MAX_TRACKS).map((entry) => {
    const id = normalizePositiveInteger(entry?.id);
    if (!id) throw new Error("NETEASE_PLAYLIST_INVALID");
    return id;
  });

  if (trackIds.length === 0) throw new Error("NETEASE_PLAYLIST_EMPTY");

  return {
    name: typeof playlist.name === "string" && playlist.name.trim()
      ? playlist.name.trim()
      : "网易云歌单",
    trackIds,
    trackIdSet: new Set(trackIds),
  };
}

function getArtist(song) {
  const artists = Array.isArray(song?.ar)
    ? song.ar
    : Array.isArray(song?.artists)
      ? song.artists
      : [];
  const names = artists
    .map((artist) => typeof artist?.name === "string" ? artist.name.trim() : "")
    .filter(Boolean);
  return names.join(" / ") || "未知歌手";
}

function getCoverUrl(song) {
  return normalizeHttpsUrl(song?.al?.picUrl ?? song?.album?.picUrl);
}

function getDurationMs(song) {
  const duration = Number(song?.dt ?? song?.duration);
  return Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : 0;
}

function parseSongBatch(payload, songsById, privilegesById) {
  if (payload?.code !== 200 || !Array.isArray(payload?.songs)) {
    throw new Error("NETEASE_TRACKS_INVALID");
  }

  for (const song of payload.songs) {
    const id = normalizePositiveInteger(song?.id);
    if (id) songsById.set(id, song);
  }

  if (Array.isArray(payload?.privileges)) {
    for (const privilege of payload.privileges) {
      const id = normalizePositiveInteger(privilege?.id);
      if (id) privilegesById.set(id, privilege);
    }
  }
}

function songDetailUrl(ids) {
  const query = JSON.stringify(ids.map((id) => ({ id })));
  return `${NETEASE_ORIGIN}/api/v3/song/detail?c=${encodeURIComponent(query)}`;
}

function playerUrl(id) {
  return `${NETEASE_ORIGIN}/api/song/enhance/player/url?ids=${encodeURIComponent(`[${id}]`)}&br=128000`;
}

export function createNeteaseMusicService({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  cacheTtlMs = NETEASE_CACHE_TTL_MS,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  let identityCache;
  let playlistCache;

  function cached(load, readCache, writeCache, clearCache) {
    const current = readCache();
    const currentTime = now();
    if (current && current.expiresAt > currentTime) return current.promise;

    const promise = Promise.resolve().then(load);
    writeCache({ expiresAt: currentTime + cacheTtlMs, promise });
    promise.catch(() => {
      const latest = readCache();
      if (latest?.promise === promise) clearCache();
    });
    return promise;
  }

  function getPlaylistIdentity() {
    return cached(
      async () => {
        const payload = await fetchJson(
          fetchImpl,
          `${NETEASE_ORIGIN}/api/v6/playlist/detail?id=${NETEASE_PLAYLIST_ID}`,
        );
        return readPlaylistIdentity(payload);
      },
      () => identityCache,
      (value) => { identityCache = value; },
      () => { identityCache = undefined; },
    );
  }

  function getPlaylist() {
    return cached(
      async () => {
        const identity = await getPlaylistIdentity();
        const batches = [];
        for (let index = 0; index < identity.trackIds.length; index += NETEASE_DETAIL_BATCH_SIZE) {
          batches.push(identity.trackIds.slice(index, index + NETEASE_DETAIL_BATCH_SIZE));
        }

        const payloads = await Promise.all(
          batches.map((ids) => fetchJson(fetchImpl, songDetailUrl(ids))),
        );
        const songsById = new Map();
        const privilegesById = new Map();
        for (const payload of payloads) parseSongBatch(payload, songsById, privilegesById);

        const tracks = identity.trackIds.map((id) => {
          const song = songsById.get(id);
          const privilege = privilegesById.get(id);
          return {
            id,
            name: typeof song?.name === "string" && song.name.trim() ? song.name.trim() : "歌曲暂不可用",
            artist: song ? getArtist(song) : "网易云音乐",
            coverUrl: song ? getCoverUrl(song) : "",
            durationMs: song ? getDurationMs(song) : 0,
            playable: Number(privilege?.pl) > 0,
          };
        });

        return {
          playlistId: NETEASE_PLAYLIST_ID,
          name: identity.name,
          total: tracks.length,
          tracks,
        };
      },
      () => playlistCache,
      (value) => { playlistCache = value; },
      () => { playlistCache = undefined; },
    );
  }

  async function handlePlaylistRequest(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(
        { error: "METHOD_NOT_ALLOWED" },
        405,
        { Allow: "GET, HEAD", "Cache-Control": "no-store" },
      );
    }

    try {
      const response = jsonResponse(await getPlaylist(), 200, {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      });
      return request.method === "HEAD" ? emptyHeadResponse(response) : response;
    } catch {
      return jsonResponse(
        { error: "PLAYLIST_UNAVAILABLE" },
        502,
        { "Cache-Control": "no-store" },
      );
    }
  }

  async function handleStreamRequest(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(
        { error: "METHOD_NOT_ALLOWED" },
        405,
        { Allow: "GET, HEAD", "Cache-Control": "no-store" },
      );
    }

    const rawId = new URL(request.url).searchParams.get("id");
    if (!rawId || !/^\d+$/u.test(rawId)) {
      return jsonResponse(
        { error: "INVALID_TRACK_ID" },
        400,
        { "Cache-Control": "no-store" },
      );
    }

    const id = normalizePositiveInteger(rawId);
    if (!id) {
      return jsonResponse(
        { error: "INVALID_TRACK_ID" },
        400,
        { "Cache-Control": "no-store" },
      );
    }

    try {
      const identity = await getPlaylistIdentity();
      if (!identity.trackIdSet.has(id)) {
        return jsonResponse(
          { error: "TRACK_NOT_IN_PLAYLIST" },
          404,
          { "Cache-Control": "public, max-age=300" },
        );
      }

      const payload = await fetchJson(fetchImpl, playerUrl(id));
      const track = Array.isArray(payload?.data)
        ? payload.data.find((item) => normalizePositiveInteger(item?.id) === id)
        : undefined;
      const location = payload?.code === 200 && track?.code === 200
        ? normalizeHttpsUrl(track.url)
        : "";
      if (!location) {
        return jsonResponse(
          { error: "TRACK_UNPLAYABLE" },
          404,
          { "Cache-Control": "public, max-age=60" },
        );
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...baseHeaders,
          "Cache-Control": "private, max-age=60",
          Location: location,
        },
      });
    } catch {
      return jsonResponse(
        { error: "STREAM_UNAVAILABLE" },
        502,
        { "Cache-Control": "no-store" },
      );
    }
  }

  return {
    getPlaylist,
    handlePlaylistRequest,
    handleStreamRequest,
  };
}

const defaultService = createNeteaseMusicService();

export function handleMusicPlaylistRequest(request) {
  return defaultService.handlePlaylistRequest(request);
}

export function handleMusicStreamRequest(request) {
  return defaultService.handleStreamRequest(request);
}
