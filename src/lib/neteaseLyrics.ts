export type NeteaseLyricLine = {
  time: number;
  text: string;
  translation: string | null;
};

export type NeteaseLyricsErrorKind = "network" | "format";

export class NeteaseLyricsError extends Error {
  readonly kind: NeteaseLyricsErrorKind;

  constructor(kind: NeteaseLyricsErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NeteaseLyricsError";
    this.kind = kind;
  }
}

const MAX_LINES = 5_000;
const TIMESTAMP = /\[(?:(\d{1,6}):)?(\d{1,6}):(\d{2})(?:[.:](\d{1,3}))?\]/gu;

type TimedText = { milliseconds: number; text: string };

function readMilliseconds(match: RegExpMatchArray) {
  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = Number((match[4] ?? "").padEnd(3, "0") || 0);

  if (seconds >= 60 || (match[1] !== undefined && minutes >= 60)) return null;
  const milliseconds = ((hours * 60 + minutes) * 60 + seconds) * 1_000 + fraction;
  return Number.isSafeInteger(milliseconds) ? milliseconds : null;
}

function parseTimedText(lyric: string) {
  const lines: TimedText[] = [];
  const seen = new Set<string>();

  for (const rawLine of lyric.split(/\r?\n/u)) {
    const matches = [...rawLine.matchAll(TIMESTAMP)];
    if (matches.length === 0) continue;

    const text = rawLine.replace(TIMESTAMP, "").trim();
    if (!text) continue;

    for (const match of matches) {
      const milliseconds = readMilliseconds(match);
      if (milliseconds === null) continue;

      const key = `${milliseconds}\u0000${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ milliseconds, text });
      if (lines.length === MAX_LINES) return lines.sort((a, b) => a.milliseconds - b.milliseconds);
    }
  }

  return lines.sort((a, b) => a.milliseconds - b.milliseconds);
}

function findTranslation(lines: TimedText[], milliseconds: number) {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].milliseconds < milliseconds) low = middle + 1;
    else high = middle;
  }

  const candidates = [lines[low - 1], lines[low]].filter((line): line is TimedText => Boolean(line));
  const nearest = candidates.sort(
    (a, b) => Math.abs(a.milliseconds - milliseconds) - Math.abs(b.milliseconds - milliseconds),
  )[0];
  return nearest && Math.abs(nearest.milliseconds - milliseconds) <= 50 ? nearest.text : null;
}

export function parseLrc(lyric: string, translatedLyric?: string | null): NeteaseLyricLine[] {
  const translations = translatedLyric ? parseTimedText(translatedLyric) : [];
  return parseTimedText(lyric).map(({ milliseconds, text }) => ({
    time: milliseconds / 1_000,
    text,
    translation: findTranslation(translations, milliseconds),
  }));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function validTrackId(trackId: string) {
  if (!/^[1-9]\d{0,15}$/u.test(trackId)) return false;
  return Number.isSafeInteger(Number(trackId));
}

export async function fetchNeteaseLyrics(
  trackId: string,
  signal?: AbortSignal,
): Promise<NeteaseLyricLine[]> {
  if (!validTrackId(trackId)) {
    throw new NeteaseLyricsError("format", "网易云歌曲 ID 无效");
  }

  let response: Response;
  try {
    response = await fetch(`/api/music-lyric?id=${encodeURIComponent(trackId)}`, {
      signal,
      credentials: "same-origin",
    });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;
    throw new NeteaseLyricsError("network", "网易云歌词暂时无法连接", { cause: error });
  }

  if (!response.ok) {
    throw new NeteaseLyricsError("network", `网易云歌词请求失败（${response.status}）`);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;
    throw new NeteaseLyricsError("format", "网易云歌词返回的不是有效 JSON", { cause: error });
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NeteaseLyricsError("format", "网易云歌词返回格式无效");
  }

  const payload = value as Record<string, unknown>;
  if (
    payload.id !== Number(trackId)
    || typeof payload.lyric !== "string"
    || typeof payload.translatedLyric !== "string"
  ) {
    throw new NeteaseLyricsError("format", "网易云歌词返回格式无效");
  }

  return parseLrc(payload.lyric, payload.translatedLyric);
}
