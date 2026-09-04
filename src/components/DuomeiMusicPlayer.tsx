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
import { containFloatingWidget, type FloatingWidgetPosition } from "../lib/floatingWidget";
import "../music-player.css";

const NETEASE_PLAYLIST_ID = "316500315";
const NETEASE_PLAYLIST_PAGE = `https://music.163.com/#/playlist?id=${NETEASE_PLAYLIST_ID}`;
const MODE_KEY = "duomei-music-player-mode";
const POSITION_KEY = "duomei-music-player-position";
const PANEL_KEY = "duomei-music-player-panel-v2";
const INITIAL_VISIBLE_TRACKS = 80;
const PLAYER_MARGIN = 16;
const COMPACT_WIDTH = 448;
const COMPACT_HEIGHT = 98;
const OPEN_HEIGHT = 550;

type PlayerMode = "fixed" | "free";
type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

function readMode(): PlayerMode {
  if (typeof window === "undefined") return "fixed";
  return window.localStorage.getItem(MODE_KEY) === "free" ? "free" : "fixed";
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

export function DuomeiMusicPlayer() {
  const playerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const autoMinimizeTimerRef = useRef<number | null>(null);
  const hoverRevealTimerRef = useRef<number | null>(null);
  const playlistAbortRef = useRef<AbortController | null>(null);
  const playlistPromiseRef = useRef<Promise<NeteasePlaylist> | null>(null);
  const playlistRef = useRef<NeteasePlaylist | null>(null);
  const positionRef = useRef<FloatingWidgetPosition | null>(null);
  const failedTrackIdsRef = useRef(new Set<string>());
  const [mode, setMode] = useState<PlayerMode>(readMode);
  const [position, setPosition] = useState<FloatingWidgetPosition | null>(() => {
    const stored = readPosition();
    positionRef.current = stored;
    return stored;
  });
  const [panelClosed, setPanelClosed] = useState(readPanelClosed);
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
    if (!panelClosed || dragging) return;
    autoMinimizeTimerRef.current = window.setTimeout(() => {
      const player = playerRef.current;
      if (player?.matches(":hover") || player?.contains(document.activeElement)) return;
      setMinimized(true);
    }, delay);
  };

  const constrainFreePosition = (next: FloatingWidgetPosition, width: number, height: number) => {
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

  const keepFreePlayerInsideViewport = (panelOpen: boolean) => {
    if (mode !== "free" || !positionRef.current) return;
    const width = Math.min(COMPACT_WIDTH, Math.max(0, window.innerWidth - PLAYER_MARGIN * 2));
    const height = Math.min(panelOpen ? OPEN_HEIGHT : COMPACT_HEIGHT, Math.max(0, window.innerHeight - PLAYER_MARGIN * 2));
    savePosition(constrainFreePosition(positionRef.current, width, height));
  };

  const revealCompactPlayer = () => {
    clearAutoMinimize();
    clearHoverReveal();
    setMinimized(false);
    keepFreePlayerInsideViewport(!panelClosed);
    void loadPlaylist().catch(() => undefined);
  };

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => void loadPlaylist().catch(() => undefined), 1_200);
    return () => window.clearTimeout(preloadTimer);
  }, [loadPlaylist]);

  useEffect(() => {
    if (!panelClosed || dragging) {
      clearAutoMinimize();
      setMinimized(false);
      return;
    }
    scheduleAutoMinimize();
    return clearAutoMinimize;
  }, [dragging, panelClosed]);

  useEffect(() => {
    if (mode !== "free") return;
    const keepInsideViewport = () => {
      const rect = playerRef.current?.getBoundingClientRect();
      const current = positionRef.current;
      if (!rect || !current) return;
      savePosition(constrainFreePosition(current, rect.width, rect.height));
    };
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, [mode]);

  useEffect(() => () => {
    clearAutoMinimize();
    clearHoverReveal();
    playlistAbortRef.current?.abort();
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
      failedTrackIdsRef.current.add(track.id);
      setIsBuffering(false);
      setPlaybackMessage(`《${track.name}》当前无法播放，请换一首。`);
    }
  };

  const moveTrack = (direction: -1 | 1) => {
    const tracks = playlistRef.current?.tracks ?? [];
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
      keepFreePlayerInsideViewport(true);
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

  const toggleMode = () => {
    if (mode === "fixed") {
      const rect = playerRef.current?.getBoundingClientRect();
      const width = Math.min(COMPACT_WIDTH, window.innerWidth - PLAYER_MARGIN * 2);
      const height = Math.min(panelClosed ? COMPACT_HEIGHT : OPEN_HEIGHT, window.innerHeight - PLAYER_MARGIN * 2);
      savePosition(constrainFreePosition(
        { x: rect?.left ?? PLAYER_MARGIN, y: rect?.top ?? PLAYER_MARGIN },
        width,
        height,
      ));
      setMode("free");
      window.localStorage.setItem(MODE_KEY, "free");
      return;
    }
    setMode("fixed");
    window.localStorage.setItem(MODE_KEY, "fixed");
  };

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (mode !== "free" || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!rect) return;
    clearAutoMinimize();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!drag || !rect || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    savePosition(constrainFreePosition(
      { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
      rect.width,
      rect.height,
    ));
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragRef.current = null;
    setDragging(false);
  };

  const nudgeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (mode !== "free" || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const current = positionRef.current ?? { x: rect.left, y: rect.top };
    const step = event.shiftKey ? 24 : 8;
    savePosition(constrainFreePosition({
      x: current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      y: current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
    }, rect.width, rect.height));
  };

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const rows = (playlist?.tracks ?? []).map((track, index) => ({ track, index }));
    return needle
      ? rows.filter(({ track }) => `${track.name} ${track.artist}`.toLocaleLowerCase().includes(needle))
      : rows;
  }, [playlist, query]);
  const playableCount = useMemo(() => playlist?.tracks.filter((track) => track.playable).length ?? 0, [playlist]);
  const visibleTracks = filteredTracks.slice(0, visibleTrackCount);
  const currentTrack = currentIndex >= 0 ? playlist?.tracks[currentIndex] ?? null : null;
  const playlistTotal = playlist?.total ?? 2_270;
  const nowSubtitle = playbackMessage
    || (isBuffering ? "正在缓冲…" : currentTrack?.artist ?? `${playlistTotal} 首 · 网易云歌单`);
  const playerStyle: CSSProperties = mode === "free" && position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};

  return (
    <aside
      ref={playerRef}
      className={`duomei-music-player is-${mode}${panelClosed ? " is-panel-closed" : " is-panel-open"}${minimized ? " is-minimized" : ""}${dragging ? " is-dragging" : ""}${isPlaying ? " is-playing" : ""}`}
      style={playerStyle}
      aria-label="正在听"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || !minimized) return;
        clearHoverReveal();
        hoverRevealTimerRef.current = window.setTimeout(revealCompactPlayer, 180);
      }}
      onPointerLeave={() => {
        clearHoverReveal();
        scheduleAutoMinimize(900);
      }}
      onFocusCapture={revealCompactPlayer}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleAutoMinimize(900);
      }}
    >
      <button
        className="duomei-music-orb"
        type="button"
        aria-label="展开正在听"
        aria-expanded={!minimized}
        aria-hidden={!minimized}
        tabIndex={minimized ? 0 : -1}
        onClick={(event) => {
          revealCompactPlayer();
          if (event.detail > 0) event.currentTarget.blur();
          scheduleAutoMinimize();
        }}
      >
        {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">♪</span>}
      </button>

      <div className="duomei-music-bar" aria-hidden={minimized} inert={minimized}>
        <button
          className="duomei-music-drag"
          type="button"
          disabled={mode !== "free"}
          aria-label={mode === "free" ? "拖动播放器，方向键也可移动" : "切换到自由摆放后可拖动"}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={nudgeWithKeyboard}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <button className="duomei-music-cover" type="button" aria-label="打开歌单" onClick={(event) => togglePanel(event.detail > 0)}>
          {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">♪</span>}
        </button>
        <button className="duomei-music-now" type="button" onClick={(event) => togglePanel(event.detail > 0)} aria-expanded={!panelClosed}>
          <strong>{currentTrack?.name ?? "Tamidesu 的歌单"}</strong>
          <small>{nowSubtitle}</small>
        </button>
        <button className="duomei-music-skip is-previous" type="button" aria-label="上一首" disabled={!playlist} onClick={() => moveTrack(-1)}>‹</button>
        <button className="duomei-music-play" type="button" aria-label={isPlaying ? "暂停" : "播放"} onClick={() => void togglePlayback()}>
          <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
        </button>
        <button className="duomei-music-skip is-next" type="button" aria-label="下一首" disabled={!playlist} onClick={() => moveTrack(1)}>›</button>
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
          <span aria-hidden="true">{isMuted ? "×" : "♪"}</span>
        </button>
        <button className="duomei-music-queue" type="button" aria-label={panelClosed ? "展开歌单" : "收起歌单"} aria-expanded={!panelClosed} onClick={(event) => togglePanel(event.detail > 0)}>
          <span aria-hidden="true">{panelClosed ? "≡" : "⌄"}</span>
        </button>
        <input
          className="duomei-music-progress"
          type="range"
          aria-label="播放进度"
          min="0"
          max={Math.max(1, duration)}
          step="0.1"
          value={Math.min(currentTime, Math.max(1, duration))}
          disabled={!currentTrack}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current && Number.isFinite(next)) {
              audioRef.current.currentTime = next;
              setCurrentTime(next);
            }
          }}
        />
      </div>

      <section className="duomei-music-panel" aria-label="歌单" aria-hidden={panelClosed} inert={panelClosed}>
        <header>
          <div>
            <small>NETEASE · {playlistTotal} TRACKS</small>
            <strong>{playlist?.name ?? "Tamidesu 喜欢的音乐"}</strong>
          </div>
          <button type="button" onClick={toggleMode}>{mode === "fixed" ? "自由摆放" : "固定左下"}</button>
          <a href={NETEASE_PLAYLIST_PAGE} target="_blank" rel="noreferrer">登录 / 打开网易云 ↗</a>
        </header>

        {playlistStatus === "error" ? (
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
                placeholder={playlistStatus === "loading" ? "正在读取 2270 首歌…" : `搜索 ${playlistTotal} 首歌`}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleTrackCount(INITIAL_VISIBLE_TRACKS);
                }}
              />
              {playlist ? <small>{playableCount} 首当前可播</small> : null}
            </label>
            <div className="duomei-music-track-list" role="list" aria-busy={playlistStatus === "loading"}>
              {visibleTracks.map(({ track, index }) => {
                const row = (
                  <>
                    <span>{String(index + 1).padStart(3, "0")}</span>
                    <span>
                      <strong>{track.name}</strong>
                      <small>{track.artist}</small>
                    </span>
                    <em>{track.playable ? formatTime(track.durationMs / 1_000) : "网易云"}</em>
                  </>
                );
                return track.playable ? (
                  <button
                    className={currentIndex === index ? "is-current" : undefined}
                    type="button"
                    role="listitem"
                    key={track.id}
                    onClick={() => void playTrackAt(index)}
                  >
                    {row}
                  </button>
                ) : (
                  <a
                    className="is-external"
                    href={`https://music.163.com/#/song?id=${track.id}`}
                    target="_blank"
                    rel="noreferrer"
                    role="listitem"
                    aria-label={`${track.name} · 需在网易云播放`}
                    key={track.id}
                  >
                    {row}
                  </a>
                );
              })}
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
        onEnded={() => moveTrack(1)}
        onError={() => {
          const id = audioRef.current?.dataset.trackId;
          if (id) failedTrackIdsRef.current.add(id);
          setIsBuffering(false);
          setIsPlaying(false);
          setPlaybackMessage("这首当前无法播放，请换一首。");
        }}
      />
    </aside>
  );
}
