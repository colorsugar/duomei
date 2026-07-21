import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";

const heroScenes = [
  {
    label: "日落余温",
    shortLabel: "日落",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4",
  },
  {
    label: "静水回声",
    shortLabel: "静水",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4",
  },
  {
    label: "深林微光",
    shortLabel: "深林",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4",
  },
  {
    label: "清晨未醒",
    shortLabel: "清晨",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4",
  },
] as const;

const overlayImage = "https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png";

export function DuomeiLiquidHero({ note, noteCount }: { note?: DuomeiNote; noteCount: number }) {
  const [activeVideo, setActiveVideo] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const transitionTimerRef = useRef<number | null>(null);
  const darkCopy = activeVideo === 2;

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeVideo) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeVideo]);

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const changeScene = (index: number) => {
    if (index === activeVideo || isTransitioning) return;
    setIsTransitioning(true);
    setActiveVideo(index);
    transitionTimerRef.current = window.setTimeout(() => setIsTransitioning(false), 1000);
  };

  return (
    <section className={`dm4-hero${darkCopy ? " is-dark-copy" : ""}`} aria-labelledby="dm4-hero-title">
      <div className="dm4-hero-videos" aria-hidden="true">
        {heroScenes.map((scene, index) => (
          <video
            className={index === activeVideo ? "is-active" : ""}
            key={scene.src}
            ref={(node) => { videoRefs.current[index] = node; }}
            src={scene.src}
            muted
            loop
            playsInline
            preload={index === 0 ? "auto" : "metadata"}
          />
        ))}
        <div className="dm4-hero-film" />
      </div>

      <img className="dm4-hero-overlay" src={overlayImage} alt="" aria-hidden="true" />

      <div className="dm4-hero-content">
        <div className="dm4-hero-center">
          <p className="dm4-glass dm4-hero-badge">
            <Sparkles size={14} aria-hidden="true" />
            {noteCount > 0 ? `${noteCount} 篇光景，正在被安静留下` : "把偶然的光，慢慢留下"}
          </p>

          <h1 id="dm4-hero-title">
            <span>把世界的喧闹</span>
            <em>留在光之外</em>
          </h1>

          <p className="dm4-hero-lede">
            这里不追赶时间。旅行、生活和偶然抵达的心绪，都会在影像与文字之间，重新长出呼吸。
          </p>

          <div className="dm4-glass dm4-hero-cta">
            <a href="#notes">
              开始阅读
              <ArrowDown size={17} aria-hidden="true" />
            </a>
            {note ? (
              <Link to={`/note/${note.slug}`}>
                打开今日小记
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="dm4-scene-switcher" role="group" aria-label="选择首屏氛围">
            {heroScenes.map((scene, index) => (
              <button
                className={index === activeVideo ? "is-active" : ""}
                type="button"
                key={scene.label}
                aria-pressed={index === activeVideo}
                disabled={isTransitioning && index !== activeVideo}
                onClick={() => changeScene(index)}
              >
                <span className="dm4-scene-long">{scene.label}</span>
                <span className="dm4-scene-short">{scene.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dm4-hero-stats" aria-label="多美小记的记录方式">
          <span>完整影像</span><i aria-hidden="true" />
          <span>安静阅读</span><i aria-hidden="true" />
          <span>自由书写</span><i aria-hidden="true" />
          <span>慢慢发生</span>
        </div>
      </div>

      <p className="dm4-scene-live" aria-live="polite">当前画面：{heroScenes[activeVideo].label}</p>
    </section>
  );
}
