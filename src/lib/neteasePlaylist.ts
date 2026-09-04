export const NETEASE_PLAYLIST_ID = "316500315";
export const NETEASE_PLAYLIST_MAX_TRACKS = 3_000;
export const NETEASE_PLAYLIST_URL = "/api/music-playlist";

export type NeteasePlaylistTrack = {
  id: string;
  name: string;
  artist: string;
  coverUrl: string | null;
  durationMs: number;
  playable: boolean;
};

export type NeteasePlaylist = {
  playlistId: string;
  name: string;
  total: number;
  tracks: NeteasePlaylistTrack[];
};

export type NeteasePlaylistErrorKind = "network" | "format";

export class NeteasePlaylistError extends Error {
  readonly kind: NeteasePlaylistErrorKind;

  constructor(kind: NeteasePlaylistErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NeteasePlaylistError";
    this.kind = kind;
  }
}

function readText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= 512 ? text : null;
}

function readId(value: unknown) {
  if (Number.isSafeInteger(value) && Number(value) > 0) return String(value);
  const id = readText(value);
  return id && /^\d{1,20}$/.test(id) ? id : null;
}

function readCoverUrl(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function parseTrack(value: unknown): NeteasePlaylistTrack | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const item = value as Record<string, unknown>;
  const id = readId(item.id);
  const name = readText(item.name);
  const artist = readText(item.artist);
  const durationMs = item.durationMs;
  const playable = item.playable;

  if (
    !id ||
    !name ||
    !artist ||
    !Number.isSafeInteger(durationMs) ||
    Number(durationMs) < 0 ||
    typeof playable !== "boolean"
  ) return null;

  return {
    id,
    name,
    artist,
    coverUrl: readCoverUrl(item.coverUrl),
    durationMs: Number(durationMs),
    playable,
  };
}

export function parseNeteasePlaylist(value: unknown): NeteasePlaylist {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NeteasePlaylistError("format", "网易云歌单返回格式无效");
  }

  const payload = value as Record<string, unknown>;
  const playlistId = readId(payload.playlistId);
  const name = readText(payload.name);
  const total = payload.total;
  if (!playlistId || !name || !Number.isSafeInteger(total) || Number(total) < 0 || !Array.isArray(payload.tracks)) {
    throw new NeteasePlaylistError("format", "网易云歌单返回格式无效");
  }

  const tracks: NeteasePlaylistTrack[] = [];
  for (const item of payload.tracks) {
    const track = parseTrack(item);
    if (track) tracks.push(track);
    if (tracks.length === NETEASE_PLAYLIST_MAX_TRACKS) break;
  }

  return { playlistId, name, total: Number(total), tracks };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function fetchNeteasePlaylist(signal?: AbortSignal): Promise<NeteasePlaylist> {
  let response: Response;
  try {
    response = await fetch(NETEASE_PLAYLIST_URL, { signal, credentials: "same-origin" });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;
    throw new NeteasePlaylistError("network", "网易云歌单暂时无法连接", { cause: error });
  }

  if (!response.ok) {
    throw new NeteasePlaylistError("network", `网易云歌单请求失败（${response.status}）`);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;
    throw new NeteasePlaylistError("format", "网易云歌单返回的不是有效 JSON", { cause: error });
  }

  return parseNeteasePlaylist(value);
}
