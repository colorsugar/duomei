import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  fetchNeteasePlaylist,
  type NeteasePlaylist,
  type NeteasePlaylistTrack,
} from "../lib/neteasePlaylist";
import { fetchNeteaseLyrics, type NeteaseLyricLine } from "../lib/neteaseLyrics";
import { containFloatingWidget, type FloatingWidgetPosition } from "../lib/floatingWidget";
import "../music-player.css";

const NETEASE_PLAYLIST_ID = "316500315";
const PLAYBACK_MODE_KEY = "duomei-music-playback-mode";
const POSITION_KEY = "duomei-music-player-position-v4";
const PANEL_KEY = "duomei-music-player-panel-v2";
const INITIAL_VISIBLE_TRACKS = 80;
const PLAYER_MARGIN = 16;
const COMPACT_WIDTH = 448;
const COMPACT_HEIGHT = 98;
const OPEN_HEIGHT = 550;
const LONG_PRESS_MS = 320;

type PlaybackMode = "sequence" | "shuffle" | "one";
type PanelView = "queue" | "lyrics";
type MusicProgressStyle = CSSProperties & { "--music-progress": string };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  dragging: boolean;
  moved: boolean;
};

function readPlaybackMode(): PlaybackMode {
  if (typeof window === "undefined") return "sequence";
  const value = window.localStorage.getItem(PLAYBACK_MODE_KEY);
  return value === "shuffle" || value === "one" ? value : "sequence";
}

function readPosition(): FloatingWidgetPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Partial<FloatingWidgetPosition> | null;
    return value && typeof value.x === "number" && typeof value.y === "number"
      ? { x: value.x, y: value.y }
      : null;
  } catch {
    return null;
  }
}

function readPanelClosed() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PANEL_KEY) !== "open";
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function findPlayableIndex(
  tracks: NeteasePlaylistTrack[],
  start: number,
  direction: -1 | 1,
  failedIds: ReadonlySet<string>,
) {
  if (!tracks.length) return -1;
  for (let step = 0; step < tracks.length; step += 1) {
    const index = ((start + step * direction) % tracks.length + tracks.length) % tracks.length;
    const track = tracks[index];
    if (track?.playable && !failedIds.has(track.id)) return index;
  }
  return -1;
}

function SkipIcon({ direction }: { direction: "previous" | "next" }) {
  return direction === "previous" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 5v14" />
      <path className="is-filled" d="m18 5-9 7 9 7Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 5v14" />
      <path className="is-filled" d="m6 5 9 7-9 7Z" />
    </svg>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 6.5v11M15.5 6.5v11" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className="is-filled" d="m9 6 9 6-9 6Z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className="is-filled" d="M4.5 9v6h4l5 4V5l-5 4Z" />
      {muted ? <path d="m17 9 4 6m0-6-4 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="5" cy="7" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="17" r="1" />
      <path d="M9 7h10M9 12h10M9 17h10" />
    </svg>
  );
}

function LyricsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v9.2a2.6 2.6 0 1 1-1.5-2.35M8 7l9-2v7.7a2.6 2.6 0 1 1-1.5-2.35V3.8" />
    </svg>
  );
}

function PlaybackModeIcon({ mode }: { mode: PlaybackMode }) {
  if (mode === "shuffle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h3c4.5 0 5.5 10 10 10h3M17 14l3 3-3 3M4 17h3c1.8 0 3-1.6 4-3.5M14 8.5C15 7.5 16 7 17.5 7H20M17 4l3 3-3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 7h11l-2.5-2.5M17 7l-2.5 2.5M18 17H7l2.5-2.5M7 17l2.5 2.5" />
      {mode === "one" ? <text className="is-label" x="12" y="14.5" textAnchor="middle">1</text> : null}
    </svg>
  );
}

export function DuomeiMusicPlayer({ compactContext = false }: { compactContext?: boolean }) {
  const playerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const lyricListRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const autoMinimizeTimerRef = useRef<number | null>(null);
  const hoverRevealTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressOrbClickRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const pointerFocusGuardRef = useRef(false);
  const playlistAbortRef = useRef<AbortController | null>(null);
  const lyricAbortRef = useRef<AbortController | null>(null);
  const lyricCacheRef = useRef(new Map<string, NeteaseLyricLine[]>());
  const playlistPromiseRef = useRef<Promise<NeteasePlaylist> | null>(null);
  const playlistRef = useRef<NeteasePlaylist | null>(null);
  const positionRef = useRef<FloatingWidgetPosition | null>(null);
  const failedTrackIdsRef = useRef(new Set<string>());
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(readPlaybackMode);
  const [position, setPosition] = useState<FloatingWidgetPosition | null>(() => {
    const stored = readPosition();
    positionRef.current = stored;
    return stored;
  });
  const [panelClosed, setPanelClosed] = useState(readPanelClosed);
  const [panelView, setPanelView] = useState<PanelView>("queue");
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [playlist, setPlaylist] = useState<NeteasePlaylist | null>(null);
  const [playlistStatus, setPlaylistStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [playlistMessage, setPlaylistMessage] = useState("");
  const [playbackMessage, setPlaybackMessage] = useState("");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [query, setQuery] = useState("");
  const [visibleTrackCount, setVisibleTrackCount] = useState(INITIAL_VISIBLE_TRACKS);
  const [failedTrackVersion, setFailedTrackVersion] = useState(0);
  const [lyrics, setLyrics] = useState<NeteaseLyricLine[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lyricsMessage, setLyricsMessage] = useState("");
  const currentTrack = currentIndex >= 0 ? playlist?.tracks[currentIndex] ?? null : null;

  const markTrackFailed = (id: string) => {
    if (failedTrackIdsRef.current.has(id)) return;
    failedTrackIdsRef.current.add(id);
    setFailedTrackVersion((value) => value + 1);
  };

  const loadPlaylist = useCallback(() => {
    if (playlistRef.current) return Promise.resolve(playlistRef.current);
    if (playlistPromiseRef.current) return playlistPromiseRef.current;
    playlistAbortRef.current?.abort();
    const controller = new AbortController();
    playlistAbortRef.current = controller;
    setPlaylistStatus("loading");
    setPlaylistMessage("");
    const request = fetchNeteasePlaylist(controller.signal)
      .then((next) => {
        playlistRef.current = next;
        setPlaylist(next);
        setPlaylistStatus("ready");
        const first = findPlayableIndex(next.tracks, 0, 1, failedTrackIdsRef.current);
        setCurrentIndex((value) => value >= 0 ? value : first);
        return next;
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPlaylistStatus("error");
          setPlaylistMessage(error instanceof Error ? error.message : "歌单暂时无法连接");
        }
        throw error;
      })
      .finally(() => {
        playlistPromiseRef.current = null;
      });
    playlistPromiseRef.current = request;
    return request;
  }, []);

  const clearAutoMinimize = () => {
    if (autoMinimizeTimerRef.current !== null) window.clearTimeout(autoMinimizeTimerRef.current);
    autoMinimizeTimerRef.current = null;
  };

  const clearHoverReveal = () => {
    if (hoverRevealTimerRef.current !== null) window.clearTimeout(hoverRevealTimerRef.current);
    hoverRevealTimerRef.current = null;
  };

  const scheduleAutoMinimize = (delay = 2_600) => {
    clearAutoMinimize();
    if (dragging) return;
    autoMinimizeTimerRef.current = window.setTimeout(() => {
      setPanelClosed(true);
      window.localStorage.setItem(PANEL_KEY, "closed");
      setMinimized(true);
    }, delay);
  };

  const constrainPlayerPosition = (next: FloatingWidgetPosition, width: number, height: number) => {
    const contained = containFloatingWidget(next, width, height, window.innerWidth, window.innerHeight, PLAYER_MARGIN);
    const header = document.querySelector<HTMLElement>(".duomei-header");
    const headerBottom = Math.max(PLAYER_MARGIN, (header?.getBoundingClientRect().bottom ?? 0) + 8);
    const maxY = Math.max(PLAYER_MARGIN, window.innerHeight - height - PLAYER_MARGIN);
    return { ...contained, y: Math.min(maxY, Math.max(contained.y, Math.min(headerBottom, maxY))) };
  };

  const savePosition = (next: FloatingWidgetPosition) => {
    positionRef.current = next;
    setPosition(next);
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
  };

  const keepPlacedPlayerInsideViewport = (panelOpen: boolean) => {
    if (!positionRef.current) return;
    const width = Math.min(COMPACT_WIDTH, Math.max(0, window.innerWidth - PLAYER_MARGIN * 2));
    const height = Math.min(panelOpen ? OPEN_HEIGHT : COMPACT_HEIGHT, Math.max(0, window.innerHeight - PLAYER_MARGIN * 2));
    savePosition(constrainPlayerPosition(positionRef.current, width, height));
  };

  const revealCompactPlayer = () => {
    if (dragRef.current || pointerFocusGuardRef.current) return;
    clearAutoMinimize();
    clearHoverReveal();
    setMinimized(false);
    keepPlacedPlayerInsideViewport(!panelClosed);
    void loadPlaylist().catch(() => undefined);
  };

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => void loadPlaylist().catch(() => undefined), 1_200);
    return () => window.clearTimeout(preloadTimer);
  }, [loadPlaylist]);

  useEffect(() => {
    if (dragging) {
      clearAutoMinimize();
      setMinimized(false);
      return;
    }
    if (!panelClosed) setMinimized(false);
    scheduleAutoMinimize(panelClosed ? 2_600 : 8_000);
    return clearAutoMinimize;
  }, [dragging, panelClosed]);

  useEffect(() => {
    if (!compactContext) return;
    clearAutoMinimize();
    clearHoverReveal();
    setPanelClosed(true);
    setMinimized(true);
  }, [compactContext]);

  useEffect(() => {
    if (panelClosed || panelView !== "lyrics" || !currentTrack) return;
    const cached = lyricCacheRef.current.get(currentTrack.id);
    if (cached) {
      setLyrics(cached);
      setLyricsStatus("ready");
      setLyricsMessage("");
      return;
    }

    lyricAbortRef.current?.abort();
    const controller = new AbortController();
    lyricAbortRef.current = controller;
    setLyrics([]);
    setLyricsStatus("loading");
    setLyricsMessage("");
    void fetchNeteaseLyrics(currentTrack.id, controller.signal)
      .then((next) => {
        lyricCacheRef.current.set(currentTrack.id, next);
        setLyrics(next);
        setLyricsStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLyricsStatus("error");
        setLyricsMessage(error instanceof Error ? error.message : "歌词暂时无法连接");
      });
    return () => controller.abort();
  }, [currentTrack, panelClosed, panelView]);

  useEffect(() => {
    const keepInsideViewport = () => {
      const rect = playerRef.current?.getBoundingClientRect();
      const current = positionRef.current;
      if (!rect || !current) return;
      savePosition(constrainPlayerPosition(current, rect.width, rect.height));
    };
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, []);

  useEffect(() => {
    const list = panelView === "lyrics" ? lyricListRef.current : trackListRef.current;
    if (!list) return;
    const containWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 18
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? list.clientHeight
          : 1;
      list.scrollTop += event.deltaY * unit;
    };
    list.addEventListener("wheel", containWheel, { passive: false });
    return () => list.removeEventListener("wheel", containWheel);
  }, [panelView, playlistStatus]);

  useEffect(() => () => {
    clearAutoMinimize();
    clearHoverReveal();
    clearLongPress();
    playlistAbortRef.current?.abort();
    lyricAbortRef.current?.abort();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }, []);

  const playTrackAt = async (index: number) => {
    const list = playlistRef.current;
    const audio = audioRef.current;
    const track = list?.tracks[index];
    if (!list || !audio || !track?.playable || failedTrackIdsRef.current.has(track.id)) return;
    setCurrentIndex(index);
    setPlaybackMessage("");
    setCurrentTime(0);
    setDuration(track.durationMs / 1_000);
    if (audio.dataset.trackId !== track.id) {
      audio.dataset.trackId = track.id;
      audio.src = `/api/music-stream?id=${encodeURIComponent(track.id)}`;
      audio.load();
    }
    setIsBuffering(true);
    try {
      await audio.play();
    } catch {
      setIsBuffering(false);
      setPlaybackMessage(`《${track.name}》当前无法播放，请换一首。`);
    }
  };

  const moveTrack = (direction: -1 | 1) => {
    const tracks = playlistRef.current?.tracks ?? [];
    if (playbackMode === "shuffle") {
      const choices = tracks
        .map((track, index) => ({ track, index }))
        .filter(({ track, index }) => track.playable && index !== currentIndex && !failedTrackIdsRef.current.has(track.id));
      const random = choices[Math.floor(Math.random() * choices.length)];
      if (random) void playTrackAt(random.index);
      return;
    }
    const start = currentIndex < 0 ? (direction > 0 ? 0 : tracks.length - 1) : currentIndex + direction;
    const next = findPlayableIndex(tracks, start, direction, failedTrackIdsRef.current);
    if (next >= 0) void playTrackAt(next);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    let list = playlistRef.current;
    if (!list) {
      try {
        list = await loadPlaylist();
      } catch {
        return;
      }
    }
    const target = currentIndex >= 0 && list.tracks[currentIndex]?.playable
      ? currentIndex
      : findPlayableIndex(list.tracks, 0, 1, failedTrackIdsRef.current);
    if (target >= 0) void playTrackAt(target);
  };

  const togglePanel = (blurAfterClose = false) => {
    const nextClosed = !panelClosed;
    clearAutoMinimize();
    setMinimized(false);
    if (!nextClosed) {
      keepPlacedPlayerInsideViewport(true);
      void loadPlaylist().catch(() => undefined);
    }
    setPanelClosed(nextClosed);
    window.localStorage.setItem(PANEL_KEY, nextClosed ? "closed" : "open");
    if (nextClosed && blurAfterClose) {
      window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && playerRef.current?.contains(active)) active.blur();
      });
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const togglePanelView = (nextView: PanelView, blurAfterClose = false) => {
    const nextClosed = !panelClosed && panelView === nextView;
    clearAutoMinimize();
    setMinimized(false);
    setPanelView(nextView);
    setPanelClosed(nextClosed);
    window.localStorage.setItem(PANEL_KEY, nextClosed ? "closed" : "open");
    if (!nextClosed) {
      keepPlacedPlayerInsideViewport(true);
      void loadPlaylist().catch(() => undefined);
    } else if (blurAfterClose) {
      window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && playerRef.current?.contains(active)) active.blur();
      });
    }
  };

  const cyclePlaybackMode = () => {
    const next = playbackMode === "sequence" ? "shuffle" : playbackMode === "shuffle" ? "one" : "sequence";
    setPlaybackMode(next);
    window.localStorage.setItem(PLAYBACK_MODE_KEY, next);
  };

  const beginOrbLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!rect) return;
    clearAutoMinimize();
    clearHoverReveal();
    clearLongPress();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      dragging: false,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional when the press remains over the orb.
    }
    longPressTimerRef.current = window.setTimeout(() => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.dragging = true;
      suppressOrbClickRef.current = true;
      setDragging(true);
      savePosition(constrainPlayerPosition(
        { x: drag.latestX - drag.offsetX, y: drag.latestY - drag.offsetY },
        drag.width,
        drag.height,
      ));
    }, LONG_PRESS_MS);
  };

  const moveOrbLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.latestX = event.clientX;
    drag.latestY = event.clientY;
    if (!drag.dragging) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) {
        drag.moved = true;
      }
      return;
    }
    event.preventDefault();
    savePosition(constrainPlayerPosition(
      { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
      drag.width,
      drag.height,
    ));
  };

  const seekFromPointer = (event: PointerEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const next = ratio * duration;
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const endOrbLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    clearLongPress();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragRef.current = null;
    setDragging(false);
    window.requestAnimationFrame(() => {
      pointerFocusGuardRef.current = false;
    });
    if (drag.dragging || drag.moved) {
      suppressOrbClickRef.current = true;
      clearHoverReveal();
      if (drag.dragging) {
        setMinimized(true);
        window.requestAnimationFrame(() => setMinimized(true));
      }
      window.setTimeout(() => {
        suppressOrbClickRef.current = false;
      }, 400);
    }
  };

  const nudgeOrbWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const current = positionRef.current ?? { x: rect.left, y: rect.top };
    const step = event.shiftKey ? 24 : 8;
    savePosition(constrainPlayerPosition({
      x: current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      y: current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
    }, rect.width, rect.height));
  };

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const rows = (playlist?.tracks ?? []).reduce<Array<{ track: NeteasePlaylistTrack; index: number; playableNumber: number }>>(
      (result, track, index) => {
        if (track.playable && !failedTrackIdsRef.current.has(track.id)) {
          result.push({ track, index, playableNumber: result.length + 1 });
        }
        return result;
      },
      [],
    );
    return needle
      ? rows.filter(({ track }) => `${track.name} ${track.artist}`.toLocaleLowerCase().includes(needle))
      : rows;
  }, [failedTrackVersion, playlist, query]);
  const playableCount = useMemo(
    () => playlist?.tracks.filter((track) => track.playable && !failedTrackIdsRef.current.has(track.id)).length ?? 0,
    [failedTrackVersion, playlist],
  );
  const visibleTracks = filteredTracks.slice(0, visibleTrackCount);
  const activeLyricIndex = useMemo(() => {
    let active = -1;
    for (let index = 0; index < lyrics.length; index += 1) {
      if (lyrics[index].time > currentTime + 0.08) break;
      active = index;
    }
    return active;
  }, [currentTime, lyrics]);
  useEffect(() => {
    if (panelClosed || panelView !== "lyrics" || activeLyricIndex < 0) return;
    const list = lyricListRef.current;
    const line = list?.querySelector<HTMLElement>(`[data-lyric-index="${activeLyricIndex}"]`);
    if (!list || !line) return;
    list.scrollTop = Math.max(0, line.offsetTop - (list.clientHeight - line.offsetHeight) / 2);
  }, [activeLyricIndex, panelClosed, panelView]);
  const nowSubtitle = playbackMessage
    || (isBuffering
      ? "正在缓冲…"
      : currentTrack?.artist ?? (playlistStatus === "loading" ? "正在整理可播放歌曲…" : "网易云歌单"));
  const playbackModeLabel = playbackMode === "shuffle" ? "随机播放" : playbackMode === "one" ? "单曲循环" : "顺序播放";
  const progressStyle = {
    "--music-progress": `${duration > 0 ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0}%`,
  } as MusicProgressStyle;
  const playerStyle: CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};

  return (
    <aside
      ref={playerRef}
      className={`duomei-music-player${position ? " is-placed" : ""}${compactContext ? " is-immersive" : ""}${panelClosed ? " is-panel-closed" : " is-panel-open"}${minimized ? " is-minimized" : ""}${dragging ? " is-dragging" : ""}${isPlaying ? " is-playing" : ""}`}
      style={playerStyle}
      aria-label="正在听"
      onPointerEnter={(event) => {
        pointerInsideRef.current = true;
        clearAutoMinimize();
        if (event.pointerType !== "mouse" || !minimized) return;
        clearHoverReveal();
        hoverRevealTimerRef.current = window.setTimeout(revealCompactPlayer, 180);
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        clearHoverReveal();
        scheduleAutoMinimize(900);
      }}
      onPointerDownCapture={() => {
        pointerFocusGuardRef.current = true;
        clearAutoMinimize();
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "touch") return;
        const control = (event.target as Element).closest?.("button, input");
        window.requestAnimationFrame(() => {
          pointerFocusGuardRef.current = false;
          if (control instanceof HTMLElement) control.blur();
        });
      }}
      onBlurCapture={(event) => {
        if (!pointerInsideRef.current && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleAutoMinimize(900);
        }
      }}
    >
      <button
        className="duomei-music-orb"
        type="button"
        aria-label="展开正在听；长按可移动"
        aria-expanded={!minimized}
        aria-hidden={!minimized}
        tabIndex={minimized ? 0 : -1}
        onPointerDown={beginOrbLongPress}
        onPointerMove={moveOrbLongPress}
        onPointerUp={endOrbLongPress}
        onPointerCancel={endOrbLongPress}
        onKeyDown={nudgeOrbWithKeyboard}
        onClick={(event) => {
          if (suppressOrbClickRef.current) {
            suppressOrbClickRef.current = false;
            pointerFocusGuardRef.current = false;
            event.preventDefault();
            return;
          }
          pointerFocusGuardRef.current = false;
          revealCompactPlayer();
          if (event.detail > 0) event.currentTarget.blur();
          scheduleAutoMinimize();
        }}
      >
        {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">♪</span>}
      </button>

      <div className="duomei-music-bar" aria-hidden={minimized} inert={minimized}>
        <button
          className="duomei-music-cover"
          type="button"
          aria-label="打开歌单；长按移动播放器"
          onPointerDown={beginOrbLongPress}
          onPointerMove={moveOrbLongPress}
          onPointerUp={endOrbLongPress}
          onPointerCancel={endOrbLongPress}
          onClick={(event) => {
            if (suppressOrbClickRef.current) {
              suppressOrbClickRef.current = false;
              pointerFocusGuardRef.current = false;
              event.preventDefault();
              return;
            }
            pointerFocusGuardRef.current = false;
            togglePanel(event.detail > 0);
          }}
        >
          {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">♪</span>}
        </button>
        <button className="duomei-music-now" type="button" onClick={(event) => togglePanel(event.detail > 0)} aria-expanded={!panelClosed}>
          <strong>{currentTrack?.name ?? "Tamidesu 的歌单"}</strong>
          <small>{nowSubtitle}</small>
        </button>
        <button className="duomei-music-skip is-previous" type="button" title="上一首" aria-label="上一首" disabled={!playlist} onClick={() => moveTrack(-1)}><SkipIcon direction="previous" /></button>
        <button className="duomei-music-play" type="button" aria-label={isPlaying ? "暂停" : "播放"} onClick={() => void togglePlayback()}>
          <PlayIcon playing={isPlaying} />
        </button>
        <button className="duomei-music-skip is-next" type="button" title="下一首" aria-label="下一首" disabled={!playlist} onClick={() => moveTrack(1)}><SkipIcon direction="next" /></button>
        <button
          className="duomei-music-mode"
          type="button"
          title={playbackModeLabel}
          aria-label={`播放模式：${playbackModeLabel}`}
          onClick={cyclePlaybackMode}
        >
          <PlaybackModeIcon mode={playbackMode} />
        </button>
        <button
          className="duomei-music-lyrics-toggle"
          type="button"
          disabled={!currentTrack}
          title="歌词"
          aria-label={panelView === "lyrics" && !panelClosed ? "收起歌词" : "显示歌词"}
          aria-pressed={panelView === "lyrics" && !panelClosed}
          onClick={(event) => togglePanelView("lyrics", event.detail > 0)}
        >
          <LyricsIcon />
        </button>
        <button
          className="duomei-music-mute"
          type="button"
          aria-label={isMuted ? "取消静音" : "静音"}
          aria-pressed={isMuted}
          onClick={() => {
            if (audioRef.current) audioRef.current.muted = !isMuted;
            setIsMuted((value) => !value);
          }}
        >
          <VolumeIcon muted={isMuted} />
        </button>
        <button
          className="duomei-music-queue"
          type="button"
          aria-label={panelView === "queue" && !panelClosed ? "收起歌单" : "展开歌单"}
          aria-pressed={panelView === "queue" && !panelClosed}
          onClick={(event) => togglePanelView("queue", event.detail > 0)}
        >
          <QueueIcon />
        </button>
        <input
          className="duomei-music-progress"
          type="range"
          aria-label="播放进度"
          min="0"
          max={Math.max(1, duration)}
          step="0.1"
          style={progressStyle}
          value={Math.min(currentTime, Math.max(1, duration))}
          disabled={!currentTrack}
          onPointerDown={seekFromPointer}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current && Number.isFinite(next)) {
              audioRef.current.currentTime = next;
              setCurrentTime(next);
            }
          }}
        />
      </div>

      <section className="duomei-music-panel" aria-label={panelView === "lyrics" ? "歌词" : "歌单"} aria-hidden={panelClosed} inert={panelClosed}>
        {panelView === "lyrics" ? (
          <div ref={lyricListRef} className="duomei-music-lyrics" aria-live="off">
            {lyricsStatus === "loading" ? <p className="duomei-music-loading">歌词缓缓展开中…</p> : null}
            {lyricsStatus === "error" ? <p className="duomei-music-loading">{lyricsMessage || "这首歌暂时没有歌词。"}</p> : null}
            {lyricsStatus === "ready" && lyrics.length === 0 ? <p className="duomei-music-loading">这首歌没有可显示的歌词。</p> : null}
            {lyrics.map((line, index) => (
              <p
                className={index === activeLyricIndex ? "is-active" : undefined}
                data-lyric-index={index}
                key={`${line.time}-${line.text}`}
              >
                <span>{line.text}</span>
                {line.translation ? <small>{line.translation}</small> : null}
              </p>
            ))}
          </div>
        ) : playlistStatus === "error" ? (
          <div className="duomei-music-empty" role="status">
            <p>{playlistMessage || "歌单暂时无法连接。"}</p>
            <button type="button" onClick={() => void loadPlaylist().catch(() => undefined)}>重新连接</button>
          </div>
        ) : (
          <>
            <label className="duomei-music-search">
              <span className="duomei-music-sr-only">搜索歌单</span>
              <input
                type="search"
                value={query}
                placeholder={playlistStatus === "loading" ? "正在筛选可播放歌曲…" : `搜索 ${playableCount} 首可播放歌曲`}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleTrackCount(INITIAL_VISIBLE_TRACKS);
                }}
              />
              {playlist ? <small>{playableCount} 首当前可播</small> : null}
            </label>
            <div ref={trackListRef} className="duomei-music-track-list" role="list" aria-busy={playlistStatus === "loading"}>
              {visibleTracks.map(({ track, index, playableNumber }) => (
                <button
                  className={currentIndex === index ? "is-current" : undefined}
                  type="button"
                  role="listitem"
                  key={track.id}
                  onClick={() => void playTrackAt(index)}
                >
                  <span>{String(playableNumber).padStart(3, "0")}</span>
                  <span>
                    <strong>{track.name}</strong>
                    <small>{track.artist}</small>
                  </span>
                  <em>{formatTime(track.durationMs / 1_000)}</em>
                </button>
              ))}
              {playlistStatus === "loading" ? <p className="duomei-music-loading">正在把完整歌单排好…</p> : null}
              {playlistStatus === "ready" && !visibleTracks.length ? <p className="duomei-music-loading">没有找到这首歌。</p> : null}
            </div>
            {visibleTrackCount < filteredTracks.length ? (
              <button
                className="duomei-music-more"
                type="button"
                onClick={() => setVisibleTrackCount((value) => value + INITIAL_VISIBLE_TRACKS)}
              >
                再显示 {Math.min(INITIAL_VISIBLE_TRACKS, filteredTracks.length - visibleTrackCount)} 首
              </button>
            ) : null}
          </>
        )}
      </section>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onEnded={(event) => {
          if (playbackMode === "one") {
            event.currentTarget.currentTime = 0;
            void event.currentTarget.play();
          } else {
            moveTrack(1);
          }
        }}
        onError={() => {
          const id = audioRef.current?.dataset.trackId;
          if (id) markTrackFailed(id);
          setIsBuffering(false);
          setIsPlaying(false);
          setPlaybackMessage("这首当前无法播放，请换一首。");
          window.setTimeout(() => {
            if (id && audioRef.current?.dataset.trackId === id) moveTrack(1);
          }, 250);
        }}
      />
    </aside>
  );
}
