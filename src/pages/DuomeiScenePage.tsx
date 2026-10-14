import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSceneNavigation } from "../lib/sceneNavigation";
import { useI18n } from "../i18n/I18nProvider";
import { LangToggle } from "../i18n/LangToggle";
import "../xiaoyuan-page.css";

// 多美的夏日小院 (/xiaoyuan) and 诗语江南 (/jiangnan): one shell for both, so walking between the two scenes never
// unmounts the page. The scene being left is kept (veiled in paper, its GPU released, its music still playing)
// while the next one loads in a second frame behind it; the new frame fades in once it has painted its own
// loading screen, and the old one is dropped when the new scene has taken the music over (it posts
// "duomei-bgm-took"), so the music runs on across the door instead of stopping for the load.
export type SceneId = "xiaoyuan" | "jiangnan";
const SCENE_SRC: Record<SceneId, string> = {
  xiaoyuan: "/xiaoyuan-scene/index.html?embed=1",
  jiangnan: "/xiaoyuan-scene/index.html?embed=1&scene=garden",
};
const LEAVE_TIMEOUT_MS = 90_000; // the old frame never outlives this, music or not

type SceneFrame = { id: number; scene: SceneId; state: "live" | "loading" | "leaving" };

export function DuomeiScenePage({ scene }: { scene: SceneId }) {
  useSceneNavigation();
  const { lang, t } = useI18n();
  const [frames, setFrames] = useState<SceneFrame[]>(() => [{ id: 0, scene, state: "live" }]);
  const frameEls = useRef(new Map<number, HTMLIFrameElement>());
  const nextId = useRef(1);

  // The scene picks up the saved language (localStorage "duomei-lang") on load; switches are
  // posted to it, so toggling never reloads the 3D scene.
  const postLang = (el: HTMLIFrameElement | null | undefined) => el?.contentWindow?.postMessage({ type: "duomei-lang", lang }, window.location.origin);
  useEffect(() => {
    for (const el of frameEls.current.values()) postLang(el);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t(scene === "jiangnan" ? "jiangnan.docTitle" : "xiaoyuan.docTitle");
    return () => {
      document.title = previousTitle;
    };
  }, [scene, t]);

  // The route changed (a door in the scene, or the browser's back / forward): load that scene behind this one.
  useEffect(() => {
    setFrames((list) => {
      const top = list[list.length - 1];
      if (top.scene === scene) return list;
      return [
        ...list.filter((f) => f.state !== "loading").map((f) => ({ ...f, state: "leaving" as const })),
        { id: nextId.current++, scene, state: "loading" as const },
      ];
    });
  }, [scene]);

  // Frames being left are told at once to stop drawing and give their GPU back (their sound runs on until the
  // hand-over). A door inside the scene already does this itself; the browser's back / forward does not.
  const notified = useRef(new Set<number>());
  const timers = useRef<number[]>([]);
  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);
  useEffect(() => {
    for (const f of frames) {
      if (f.state !== "leaving" || notified.current.has(f.id)) continue;
      notified.current.add(f.id);
      frameEls.current.get(f.id)?.contentWindow?.postMessage({ type: "duomei-scene-leave" }, window.location.origin);
    }
  }, [frames]);

  // Drop exactly the frames this switch left (never ones a later switch has just started leaving), once the new
  // scene holds the music, or after the timeout.
  const dropLeaving = (ids: number[]) => {
    for (const id of ids) frameEls.current.get(id)?.contentWindow?.postMessage({ type: "duomei-bgm-fade" }, window.location.origin);
    timers.current.push(window.setTimeout(() => setFrames((list) => list.filter((f) => !ids.includes(f.id))), 1600));
  };
  const leavingKey = frames.filter((f) => f.state === "leaving").map((f) => f.id).join(",");
  useEffect(() => {
    if (!leavingKey) return;
    const ids = leavingKey.split(",").map(Number);
    const incoming = frames[frames.length - 1].id; // the frame this switch opened
    let done = false;
    const drop = () => { if (!done) { done = true; dropLeaving(ids); } };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || (event.data as { type?: unknown } | null)?.type !== "duomei-bgm-took") return;
      if (frameEls.current.get(incoming)?.contentWindow === event.source) drop();
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(drop, LEAVE_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [leavingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new frame shows itself after its loading screen has painted (two frames after load), never a blank frame.
  const onFrameLoad = (frame: SceneFrame) => {
    postLang(frameEls.current.get(frame.id));
    if (frame.state !== "loading") return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setFrames((list) => list.map((f) => (f.id === frame.id && f.state === "loading" ? { ...f, state: "live" } : f)));
      frameEls.current.get(frame.id)?.focus();
    }));
  };

  return (
    <main className="xiaoyuan-page" aria-label={t(scene === "jiangnan" ? "jiangnan.title" : "xiaoyuan.title")}>
      <Link className="xiaoyuan-back" to="/#yunyou" aria-label={t("scene.back")}>
        <span aria-hidden="true">←</span> <span className="xiaoyuan-back__long">{t("scene.back")}</span>
        <span className="xiaoyuan-back__short" aria-hidden="true">{t("scene.backShort")}</span>
      </Link>
      <LangToggle className="xiaoyuan-lang" />
      {frames.map((frame) => (
        <iframe
          key={frame.id}
          ref={(el) => {
            if (el) frameEls.current.set(frame.id, el);
            else frameEls.current.delete(frame.id);
          }}
          className={`xiaoyuan-frame is-${frame.state}`}
          src={SCENE_SRC[frame.scene]}
          onLoad={() => onFrameLoad(frame)}
          title={t(frame.scene === "jiangnan" ? "jiangnan.frameTitle" : "xiaoyuan.frameTitle")}
          aria-hidden={frame.state === "leaving" ? true : undefined}
          tabIndex={frame.state === "leaving" ? -1 : undefined}
          loading="eager"
          allow="fullscreen; autoplay"
          allowFullScreen
        />
      ))}
    </main>
  );
}
