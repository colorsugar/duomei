import type { NeteasePlaylist, NeteasePlaylistTrack } from "./neteasePlaylist";

// 多美的原创古风纯音乐，两辑十九首。The garden album is the 诗语江南 scene's own soundtrack, already
// served from public/xiaoyuan-scene/audio (byte-identical, so it is not duplicated); the seasons album
// lives in public/audio/originals. Durations were read with ffprobe so the list shows them before playback.
export type OriginalAlbumId = "garden" | "seasons";

export type OriginalTrack = NeteasePlaylistTrack & {
  src: string;
  sub: string;
  albumId: OriginalAlbumId;
};

export type OriginalAlbum = {
  id: OriginalAlbumId;
  title: string;
  short: string;
  note: string;
  cover: string;
  tracks: OriginalTrack[];
};

export const ORIGINAL_PLAYLIST_ID = "duomei-originals";
const AUDIO_ROOT: Record<OriginalAlbumId, string> = {
  garden: "/xiaoyuan-scene/audio/",
  seasons: "/audio/originals/",
};
const COVER_ROOT = "/images/originals/";

type TrackSeed = [file: string, title: string, sub: string, durationMs: number];

function album(id: OriginalAlbumId, title: string, short: string, note: string, seeds: TrackSeed[]): OriginalAlbum {
  const cover = `${COVER_ROOT}${id}.webp`;
  return {
    id,
    title,
    short,
    note,
    cover,
    tracks: seeds.map(([file, name, sub, durationMs]) => ({
      id: `original-${file}`,
      name,
      artist: "多美",
      coverUrl: cover,
      durationMs,
      playable: true,
      src: `${AUDIO_ROOT[id]}${file}.mp3`,
      sub,
      albumId: id,
    })),
  };
}

export const originalAlbums: OriginalAlbum[] = [
  album("garden", "诗语江南 · 园中曲", "园中曲", "古风纯音乐 · 多美 作曲", [
    ["bgm-qingchen", "清晨", "古筝 · 洞箫 · 流水", 167549],
    ["bgm-zhuying", "竹影", "风过修竹", 180820],
    ["bgm-wuhe", "午荷", "琵琶 · 竹笛 · 蝉声", 158459],
    ["bgm-afternoon", "午后", "林下清荫", 177789],
    ["bgm-fuyuan", "浮园", "云上小园", 72542],
    ["bgm-yanyu", "烟雨", "琵琶轮指 · 雨打荷叶", 168124],
    ["bgm", "暮色", "园中黄昏", 179775],
    ["bgm-mulang", "暮廊", "二胡 · 灯笼渐亮", 156186],
    ["bgm-night", "夜泊", "月下回廊", 166034],
    ["bgm-yueye", "月夜", "古琴 · 洞箫 · 细雨", 156134],
    ["bgm-yutie", "玉与铁", "国潮 · 鼓点", 146547],
  ]),
  album("seasons", "诗语江南 · 四季", "四季", "古风纯音乐 · 多美 作曲", [
    ["bgm2-chunyu", "春雨", "古筝 · 洞箫", 150727],
    ["bgm2-xinghua", "杏花", "曲笛 · 琵琶", 150204],
    ["bgm2-xiahe", "夏荷", "古琴泛音 · 竹笛", 153078],
    ["bgm2-zhuliang", "竹凉", "扬琴 · 洞箫", 156552],
    ["bgm2-qiugui", "秋桂", "琵琶轮指 · 古筝", 152842],
    ["bgm2-qiuyue", "秋月", "古琴 · 箫", 149656],
    ["bgm2-dongxue", "冬雪", "古筝泛音 · 笙", 124656],
    ["bgm2-meiying", "梅影", "曲笛 · 古琴", 148898],
  ]),
];

const tracks = originalAlbums.flatMap((item) => item.tracks);

export const originalPlaylist: NeteasePlaylist = {
  playlistId: ORIGINAL_PLAYLIST_ID,
  name: "多美原创",
  total: tracks.length,
  tracks,
};

export function isOriginalTrack(track: NeteasePlaylistTrack | null | undefined): track is OriginalTrack {
  return Boolean(track && "src" in track && typeof (track as OriginalTrack).src === "string");
}

export function albumOf(track: OriginalTrack) {
  return originalAlbums.find((item) => item.id === track.albumId) ?? originalAlbums[0];
}

export function randomOriginalIndex() {
  return Math.floor(Math.random() * tracks.length);
}
