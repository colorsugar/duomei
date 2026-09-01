import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import type { MotionValue, PanInfo } from "framer-motion";
import type { DuomeiNote } from "../lib/noteTypes";
import { compressImageFile } from "../lib/imageTools";
import { defaultPoetryFont, timePoetryWorks } from "../lib/timePoetryContent";
import type { TimePoetryEffect, TimePoetryImage, TimePoetryTextBlock, TimePoetryWork } from "../lib/timePoetryContent";
import { DreamCard } from "./DreamCard";
import { GuyuShelfPreview } from "./GuyuShelfPreview";
import { HomeSkillsSection } from "./SkillsDirectory";
import { HomeSectionHold } from "./HomeSectionHold";
import { StickerPackSection } from "./StickerPackSection";
import { PoetryCanvasEditor } from "./PoetryCanvasEditor";
import "./HomeIntroSection.css";

type HomeIntroSectionProps = {
  canCreate: boolean;
  notes: DuomeiNote[];
  onCreate: () => void;
};

const POETRY_STORAGE_KEY = "duomei-time-poetry-pages";
const POETRY_CONTENT_VERSION_KEY = "duomei-time-poetry-content-version";
const POETRY_CONTENT_VERSION = "3";
const portalTitleColumns = ["来啊", "快活啊", "反正有大把时光"];

const fallbackImage: TimePoetryImage = {
  label: "在路上的日子",
  src: "/images/note-default-covers/duomei-default-cover-01.png",
  position: "50% 50%",
};

function createTextBlocks(work: TimePoetryWork): TimePoetryTextBlock[] {
  const reverse = work.layout === "image-right";
  return [
    {
      id: `${work.id}-title`,
      kind: "title",
      content: work.title,
      x: reverse ? 71 : 4,
      y: 12,
      width: 25,
      height: 22,
      fontSize: Math.max(54, work.fontSize + 18),
      direction: "horizontal",
      zIndex: 3,
      effect: "rise",
    },
    {
      id: `${work.id}-poem`,
      kind: "poem",
      content: work.verticalColumns.join("\n"),
      x: reverse ? 48 : 32,
      y: 14,
      width: 20,
      height: 66,
      fontSize: work.fontSize,
      direction: work.textDirection ?? "vertical",
      zIndex: 4,
      effect: "ink",
    },
    {
      id: `${work.id}-caption`,
      kind: "caption",
      content: [work.citation, ...work.meta.filter((item) => !/[A-Za-z]/.test(item))].filter(Boolean).join("\n"),
      x: reverse ? 72 : 4,
      y: 78,
      width: 24,
      height: 12,
      fontSize: 15,
      direction: "horizontal",
      color: "#77736b",
      zIndex: 3,
      effect: "fade",
    },
  ];
}

function normalizeWork(work: TimePoetryWork): TimePoetryWork {
  const reverse = work.layout === "image-right";
  return {
    ...work,
    textBlocks: work.textBlocks?.length ? work.textBlocks.map((block) => ({ ...block })) : createTextBlocks(work),
    images: (work.images.length ? work.images : [fallbackImage]).map((image, index) => ({
      ...image,
      id: image.id ?? `${work.id}-image-${index}`,
      x: image.x ?? (index === 0 ? (reverse ? 4 : 55) : 8 + index * 6),
      y: image.y ?? (index === 0 ? 9 : 14 + index * 5),
      width: image.width ?? (index === 0 ? 41 : 28),
      height: image.height ?? (index === 0 ? 74 : 34),
      zIndex: image.zIndex ?? 2 + index,
      effect: image.effect ?? "ink",
    })),
  };
}

function cloneWork(work: TimePoetryWork): TimePoetryWork {
  const normalized = normalizeWork(work);
  return {
    ...normalized,
    verticalColumns: [...normalized.verticalColumns],
    body: [...normalized.body],
    meta: [...normalized.meta],
    images: normalized.images.map((image) => ({ ...image })),
    textBlocks: normalized.textBlocks?.map((block) => ({ ...block })),
  };
}

function clonePages(pages: TimePoetryWork[]) {
  return pages.map(cloneWork);
}

function loadPoetryPages(): TimePoetryWork[] {
  if (typeof window === "undefined") return timePoetryWorks.map(cloneWork);
  try {
    const raw = window.localStorage.getItem(POETRY_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(POETRY_CONTENT_VERSION_KEY, POETRY_CONTENT_VERSION);
      return timePoetryWorks.map(cloneWork);
    }
    const stored = JSON.parse(raw) as TimePoetryWork[];
    if (!Array.isArray(stored) || !stored.length) return timePoetryWorks.map(cloneWork);

    if (window.localStorage.getItem(POETRY_CONTENT_VERSION_KEY) !== POETRY_CONTENT_VERSION) {
      const storedIds = new Set(stored.map((page) => page.id));
      const merged = [...stored.map(cloneWork), ...timePoetryWorks.filter((page) => !storedIds.has(page.id)).map(cloneWork)];
      window.localStorage.setItem(POETRY_CONTENT_VERSION_KEY, POETRY_CONTENT_VERSION);
      return merged;
    }

    return stored.map(cloneWork);
  } catch {
    return timePoetryWorks.map(cloneWork);
  }
}

function savePoetryPages(pages: TimePoetryWork[]) {
  try {
    window.localStorage.setItem(POETRY_STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Uploaded images can exceed localStorage; keep the in-memory edit usable.
  }
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function useCompactViewport() {
  const [compact, setCompact] = useState(() => (typeof window === "undefined" ? false : window.innerWidth <= 768));

  useEffect(() => {
    const update = () => setCompact(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return compact;
}

function PortalTitle({ progress }: { progress: ReturnType<typeof useSpring> }) {
  const opacity = useTransform(progress, [0.18, 0.28], [0, 1]);
  const columnOneClip = useTransform(progress, [0.2, 0.34], ["inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  const columnTwoClip = useTransform(progress, [0.28, 0.43], ["inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  const columnThreeClip = useTransform(progress, [0.36, 0.54], ["inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  const columnOneY = useTransform(progress, [0.2, 0.34], [42, 0]);
  const columnTwoY = useTransform(progress, [0.28, 0.43], [52, 0]);
  const columnThreeY = useTransform(progress, [0.36, 0.54], [62, 0]);
  const columnClips = [columnOneClip, columnTwoClip, columnThreeClip];
  const columnYs = [columnOneY, columnTwoY, columnThreeY];

  return (
    <motion.h2
      className="poetry-portal-title"
      style={{ opacity, fontFamily: defaultPoetryFont }}
      aria-label="来啊，快活啊，反正有大把时光"
    >
      {portalTitleColumns.map((column, index) => (
        <motion.span key={column} aria-hidden="true" style={{ clipPath: columnClips[index], y: columnYs[index] }}>
          {column}
        </motion.span>
      ))}
      <span className="poetry-sr-only">来啊，快活啊，反正有大把时光</span>
    </motion.h2>
  );
}

const poetryEase = [0.16, 1, 0.3, 1] as const;
const poetryDeckCompactPeek = 16;
const poetryDeckWidePeek = 52;

function poetryEffectState(effect: TimePoetryEffect, visible: boolean, reverse: boolean, reducedMotion: boolean) {
  if (visible || reducedMotion || effect === "none") {
    return { opacity: 1, x: 0, y: 0, scale: 1, clipPath: "inset(0 0 0% 0)" };
  }

  if (effect === "slide") {
    return { opacity: 0, x: reverse ? -42 : 42, y: 0, scale: 1, clipPath: "inset(0 0 0% 0)" };
  }
  if (effect === "rise") {
    return { opacity: 0, x: 0, y: 34, scale: 1, clipPath: "inset(0 0 0% 0)" };
  }
  if (effect === "zoom") {
    return { opacity: 0, x: 0, y: 0, scale: 0.94, clipPath: "inset(0 0 0% 0)" };
  }
  if (effect === "ink") {
    return { opacity: 1, x: 0, y: 18, scale: 1, clipPath: "inset(0 0 100% 0)" };
  }
  return { opacity: 0, x: 0, y: 0, scale: 1, clipPath: "inset(0 0 0% 0)" };
}

function PoetryRevealColumn({
  visible,
  reducedMotion,
  index,
  children,
}: {
  visible: boolean;
  reducedMotion: boolean;
  index: number;
  children: string;
}) {
  return (
    <motion.span
      aria-hidden="true"
      initial={reducedMotion ? false : poetryEffectState("ink", false, false, false)}
      animate={poetryEffectState("ink", visible, false, reducedMotion)}
      transition={{ duration: reducedMotion ? 0.01 : 0.42, delay: visible && !reducedMotion ? index * 0.06 : 0, ease: poetryEase }}
    >
      {children}
    </motion.span>
  );
}

function PoetryWorkPanel({
  work,
  index,
  active,
  revealed,
  reducedMotion,
}: {
  work: TimePoetryWork;
  index: number;
  active: boolean;
  revealed: boolean;
  reducedMotion: boolean;
}) {
  const isReverse = index % 2 === 1;
  const title = work.title || `诗词作品 ${String(index + 1).padStart(2, "0")}`;
  const textBlocks = work.textBlocks?.length ? work.textBlocks : createTextBlocks(work);
  const images = work.images.length ? work.images : [fallbackImage];
  const transition = { duration: reducedMotion ? 0.01 : 0.46, ease: poetryEase };

  return (
      <div className={`poetry-work-panel poetry-free-panel${isReverse ? " is-reverse" : ""}`} aria-hidden={!active}>
        <span className="poetry-free-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className={`poetry-deck-media-layer is-count-${Math.min(images.length, 4)}`}>
          {images.map((item, imageIndex) => {
            const effect = item.effect ?? "ink";
            return <motion.figure
              className="poetry-free-image"
              key={item.id ?? `${work.id}-image-${imageIndex}`}
              initial={reducedMotion ? false : poetryEffectState(effect, false, isReverse, false)}
              animate={poetryEffectState(effect, revealed, isReverse, reducedMotion)}
              transition={{ ...transition, delay: revealed && !reducedMotion ? imageIndex * 0.05 : 0 }}
              style={{
                left: `${item.x ?? 55}%`,
                top: `${item.y ?? 9}%`,
                width: `${item.width ?? 41}%`,
                height: `${item.height ?? 74}%`,
                zIndex: item.zIndex ?? 2,
              }}
            >
              <img
                src={item.src || fallbackImage.src}
                alt={item.label || title}
                loading={index === 0 && imageIndex === 0 ? "eager" : "lazy"}
                style={{
                  objectPosition: `${50 + (item.cropX ?? 0)}% ${50 + (item.cropY ?? 0)}%`,
                  scale: item.scale ?? 1,
                }}
              />
              {item.label ? <figcaption>{item.label}</figcaption> : null}
            </motion.figure>;
          })}
        </div>

        {textBlocks.map((block) => {
          const blockStyle = {
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: `${block.width}%`,
            height: `${block.height}%`,
            zIndex: block.zIndex,
            color: block.color || "var(--poetry-ink)",
            fontFamily: work.fontFamily || defaultPoetryFont,
            fontSize: `${block.fontSize / 14.4}cqw`,
          };
          if (block.kind === "poem") {
            const effect = block.effect ?? "ink";
            return (
              <motion.div
                className={`poetry-free-text is-poem is-${block.direction}`}
                key={block.id}
                initial={reducedMotion || effect === "ink" ? false : poetryEffectState(effect, false, isReverse, false)}
                animate={effect === "ink" ? undefined : poetryEffectState(effect, revealed, isReverse, reducedMotion)}
                transition={transition}
                style={blockStyle}
                aria-label={splitLines(block.content).join("，")}
              >
                {splitLines(block.content).map((line, lineIndex) => effect === "ink" ? (
                  <PoetryRevealColumn key={`${block.id}-${lineIndex}`} visible={revealed} reducedMotion={reducedMotion} index={lineIndex}>{line}</PoetryRevealColumn>
                ) : <span key={`${block.id}-${lineIndex}`}>{line}</span>)}
              </motion.div>
            );
          }
          return (
            <motion.div
              className={`poetry-free-text is-${block.kind} is-${block.direction}`}
              id={block.kind === "title" ? `poetry-work-${work.id}` : undefined}
              key={block.id}
              initial={reducedMotion ? false : poetryEffectState(block.effect ?? "rise", false, isReverse, false)}
              animate={poetryEffectState(block.effect ?? "rise", revealed, isReverse, reducedMotion)}
              transition={transition}
              style={blockStyle}
            >
              {block.content}
            </motion.div>
          );
        })}
      </div>
  );
}

function PoetryStackDeck({
  pages,
  canCreate,
  onEdit,
}: {
  pages: TimePoetryWork[];
  canCreate: boolean;
  onEdit: (index: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const transitioningRef = useRef(false);
  const activeIndexRef = useRef(0);
  const animationSequenceRef = useRef(0);
  const positionAnimationsRef = useRef<Array<{ stop: () => void }>>([]);
  const currentX = useMotionValue(0);
  const nextX = useMotionValue(0);
  const reducedMotion = Boolean(useReducedMotion());
  const [activePageId, setActivePageId] = useState(() => pages[0]?.id ?? "");
  const [stageWidth, setStageWidth] = useState(0);
  const [previewingNext, setPreviewingNext] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const resolvedActiveIndex = pages.findIndex((page) => page.id === activePageId);
  const activeIndex = resolvedActiveIndex >= 0
    ? resolvedActiveIndex
    : Math.min(activeIndexRef.current, Math.max(0, pages.length - 1));
  const peekSize = stageWidth <= 760 ? poetryDeckCompactPeek : poetryDeckWidePeek;
  const nextRestX = Math.max(0, stageWidth - peekSize);
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < pages.length - 1;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const width = stage.getBoundingClientRect().width;
      setStageWidth(width);
      currentX.set(0);
      nextX.set(Math.max(0, width - (width <= 760 ? poetryDeckCompactPeek : poetryDeckWidePeek)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [currentX, nextX]);

  useEffect(() => {
    if (!pages.length) return;
    if (resolvedActiveIndex >= 0) {
      activeIndexRef.current = resolvedActiveIndex;
      return;
    }
    const fallbackIndex = Math.min(activeIndexRef.current, pages.length - 1);
    activeIndexRef.current = fallbackIndex;
    setActivePageId(pages[fallbackIndex].id);
  }, [activePageId, pages, resolvedActiveIndex]);

  const transition = reducedMotion
    ? { duration: 0.01 }
    : { duration: 0.42, ease: poetryEase };

  const stopPositionAnimations = () => {
    animationSequenceRef.current += 1;
    positionAnimationsRef.current.forEach((animation) => animation.stop());
    positionAnimationsRef.current = [];
  };

  useEffect(() => () => {
    animationSequenceRef.current += 1;
    positionAnimationsRef.current.forEach((animation) => animation.stop());
    positionAnimationsRef.current = [];
  }, []);

  const resetCards = () => {
    currentX.set(0);
    nextX.set(nextRestX);
    positionAnimationsRef.current = [];
    transitioningRef.current = false;
    setPreviewingNext(false);
    setTransitioning(false);
  };

  const showNext = () => {
    if (!hasNext || transitioningRef.current) return;
    const nextPageId = pages[activeIndex + 1]?.id;
    if (!nextPageId) return;
    stopPositionAnimations();
    const sequence = animationSequenceRef.current;
    transitioningRef.current = true;
    setTransitioning(true);
    setPreviewingNext(true);
    const animation = animate(nextX, 0, transition);
    positionAnimationsRef.current = [animation];
    animation.then(() => {
      if (sequence !== animationSequenceRef.current) return;
      activeIndexRef.current = activeIndex + 1;
      setActivePageId(nextPageId);
      resetCards();
    });
  };

  const showPrevious = () => {
    if (!hasPrevious || transitioningRef.current) return;
    const previousPageId = pages[activeIndex - 1]?.id;
    if (!previousPageId) return;
    stopPositionAnimations();
    const sequence = animationSequenceRef.current;
    transitioningRef.current = true;
    setTransitioning(true);
    const animations = [
      animate(currentX, stageWidth + peekSize, transition),
      animate(nextX, stageWidth, transition),
    ];
    positionAnimationsRef.current = animations;
    Promise.all(animations).then(() => {
      if (sequence !== animationSequenceRef.current) return;
      activeIndexRef.current = activeIndex - 1;
      setActivePageId(previousPageId);
      resetCards();
    });
  };

  const settleCards = () => {
    stopPositionAnimations();
    const sequence = animationSequenceRef.current;
    const animations = [
      animate(currentX, 0, transition),
      animate(nextX, nextRestX, transition),
    ];
    positionAnimationsRef.current = animations;
    Promise.all(animations).then(() => {
      if (sequence !== animationSequenceRef.current) return;
      positionAnimationsRef.current = [];
      setPreviewingNext(false);
    });
  };

  const handleDragStart = () => {
    if (!transitioningRef.current) {
      stopPositionAnimations();
      setPreviewingNext(false);
    }
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (transitioningRef.current || !stageWidth) return;
    if (info.offset.x < 0 && hasNext) {
      const nextPosition = Math.max(0, Math.min(nextRestX, nextRestX + info.offset.x));
      nextX.set(nextPosition);
      currentX.set(0);
      if (info.offset.x < -8 && !previewingNext) setPreviewingNext(true);
      return;
    }
    if (info.offset.x > 0 && hasPrevious) {
      currentX.set(Math.min(stageWidth + peekSize, info.offset.x));
      nextX.set(Math.min(stageWidth, nextRestX + info.offset.x));
      return;
    }
    currentX.set(Math.max(0, info.offset.x * 0.12));
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = Math.min(110, stageWidth * 0.18);
    if (hasNext && (info.offset.x < -threshold || info.velocity.x < -560)) {
      showNext();
      return;
    }
    if (hasPrevious && (info.offset.x > threshold || info.velocity.x > 560)) {
      showPrevious();
      return;
    }
    settleCards();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
  };

  if (!pages.length) return null;

  return (
    <HomeSectionHold id="weiyan" className="poetry-index" ariaLabelledBy="poetry-deck-title">
      <header className="poetry-deck-heading">
        <h2 id="poetry-deck-title">微言</h2>
        <p>向左翻到下一页，向右揭开上一页。</p>
      </header>

      <div
        className="poetry-deck-stage"
        ref={stageRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`微言，第 ${activeIndex + 1} 页，共 ${pages.length} 页`}
      >
        {pages.map((work, index) => {
          const isPrevious = index === activeIndex - 1;
          const isCurrent = index === activeIndex;
          const isNext = index === activeIndex + 1;
          if (!isPrevious && !isCurrent && !isNext) return null;
          return (
            <motion.article
              className={`poetry-deck-card${isPrevious ? " is-previous" : ""}${isCurrent ? " is-current" : ""}${isNext ? " is-next" : ""}`}
              key={work.id}
              style={{ x: isCurrent ? currentX : isNext ? nextX : 0, zIndex: isNext ? 3 : isCurrent ? 2 : 1 }}
              animate={{ scale: isPrevious ? 0.985 : 1, opacity: isPrevious ? 0.82 : 1 }}
              transition={transition}
              aria-hidden={!isCurrent}
            >
              <PoetryWorkPanel
                work={work}
                index={index}
                active={isCurrent}
                revealed={index <= activeIndex || (isNext && previewingNext)}
                reducedMotion={reducedMotion}
              />
            </motion.article>
          );
        })}

        {stageWidth ? (
          <motion.div
            className="poetry-deck-drag-surface"
            aria-hidden="true"
            drag="x"
            dragConstraints={{ left: -stageWidth, right: stageWidth }}
            dragDirectionLock
            dragElastic={0.06}
            dragMomentum={false}
            dragSnapToOrigin="x"
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        ) : null}
      </div>

      <div className="poetry-deck-controls">
        <button type="button" onClick={showPrevious} disabled={!hasPrevious || transitioning} aria-label="上一页微言">上一页</button>
        <span aria-live="polite"><b>{String(activeIndex + 1).padStart(2, "0")}</b> / {String(pages.length).padStart(2, "0")}</span>
        {canCreate ? <button type="button" onClick={() => onEdit(activeIndex)}>编辑当前页</button> : null}
        <button type="button" onClick={showNext} disabled={!hasNext || transitioning} aria-label="下一页微言">下一页</button>
      </div>
    </HomeSectionHold>
  );
}

function LegacyPoetryEditor({
  pages,
  activeIndex,
  onClose,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onUpdate,
}: {
  pages: TimePoetryWork[];
  activeIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onUpdate: (updater: (page: TimePoetryWork) => TimePoetryWork) => void;
}) {
  const page = pages[activeIndex];
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<{
    target: "text" | "image";
    mode: "move" | "resize";
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!interaction) return;
    const move = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((event.clientX - interaction.startX) / rect.width) * 100;
      const dy = ((event.clientY - interaction.startY) / rect.height) * 100;
      onUpdate((current) => {
        if (interaction.mode === "move") {
          const x = Math.max(0, Math.min(100 - interaction.width, interaction.x + dx));
          const y = Math.max(0, Math.min(100 - interaction.height, interaction.y + dy));
          return interaction.target === "text" ? { ...current, textX: x, textY: y } : { ...current, imageFrameX: x, imageFrameY: y };
        }
        const width = Math.max(12, Math.min(100 - interaction.x, interaction.width + dx));
        const height = Math.max(12, Math.min(100 - interaction.y, interaction.height + dy));
        return interaction.target === "text"
          ? { ...current, textFrameWidth: width, textFrameHeight: height }
          : { ...current, imageFrameWidth: width, imageFrameHeight: height };
      });
    };
    const stop = () => setInteraction(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [interaction, onUpdate]);

  if (!page) return null;

  const textFrame = {
    x: page.textX ?? 5,
    y: page.textY ?? 8,
    width: page.textFrameWidth ?? 45,
    height: page.textFrameHeight ?? 82,
  };
  const imageFrame = {
    x: page.imageFrameX ?? 54,
    y: page.imageFrameY ?? 3,
    width: page.imageFrameWidth ?? 44,
    height: page.imageFrameHeight ?? 88,
  };

  const beginInteraction = (
    event: ReactPointerEvent,
    target: "text" | "image",
    mode: "move" | "resize",
    frame: { x: number; y: number; width: number; height: number },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setInteraction({ target, mode, startX: event.clientX, startY: event.clientY, ...frame });
  };

  const updateImage = (imageIndex: number, patch: Partial<TimePoetryImage>) => {
    onUpdate((current) => ({
      ...current,
      images: current.images.map((image, index) => (index === imageIndex ? { ...image, ...patch } : image)),
    }));
  };

  const handleUpload = async (imageIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    const src = await compressImageFile(file, 2200, 0.88, 1800);
    updateImage(imageIndex, { src, label: file.name.replace(/\.[^.]+$/, ""), position: "50% 50%" });
  };

  const addImage = () => onUpdate((current) => ({ ...current, images: [...current.images, { ...fallbackImage, label: "新的图片" }] }));
  const removeImage = (imageIndex: number) => onUpdate((current) => ({ ...current, images: current.images.filter((_, index) => index !== imageIndex) }));

  return (
    <div className="poetry-editor-backdrop" role="presentation">
      <section className="poetry-editor" role="dialog" aria-modal="true" aria-label="编辑诗词作品">
        <header>
          <strong>编辑诗词作品</strong>
          <button type="button" onClick={onClose}>完成</button>
        </header>
        <nav className="poetry-editor-slides" aria-label="选择作品">
          {pages.map((item, index) => (
            <button className={index === activeIndex ? "is-active" : ""} key={item.id} type="button" onClick={() => onSelect(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <img src={item.images[0]?.src || fallbackImage.src} alt="" />
              <strong>{item.title || "未命名作品"}</strong>
            </button>
          ))}
          <button className="poetry-editor-add-slide" type="button" onClick={onAdd}>＋ 新增作品</button>
        </nav>
        <div className="poetry-editor-page-actions">
          <button type="button" onClick={() => onMove(-1)} disabled={activeIndex === 0}>前移</button>
          <button type="button" onClick={() => onMove(1)} disabled={activeIndex === pages.length - 1}>后移</button>
          <button type="button" onClick={onDuplicate}>复制页面</button>
          <button type="button" onClick={onDelete} disabled={pages.length <= 1}>删除页面</button>
        </div>
        <div className="poetry-direct-toolbar">
          <span>直接双击画布文字编辑；拖动左上角移动，右下角缩放</span>
          <button type="button" onClick={() => onUpdate((current) => ({ ...current, textDirection: current.textDirection === "horizontal" ? "vertical" : "horizontal" }))}>
            {page.textDirection === "horizontal" ? "改为竖排" : "改为横排"}
          </button>
          <label>字号<input type="number" min="18" max="120" value={page.fontSize} onChange={(event) => onUpdate((current) => ({ ...current, fontSize: Number(event.target.value) }))} /></label>
        </div>
        <div className="poetry-direct-canvas" ref={canvasRef}>
          <div
            className="poetry-direct-image-frame"
            style={{ left: `${imageFrame.x}%`, top: `${imageFrame.y}%`, width: `${imageFrame.width}%`, height: `${imageFrame.height}%` }}
          >
            <img src={page.images[0]?.src || fallbackImage.src} alt={page.images[0]?.label || page.title} style={{ objectPosition: page.images[0]?.position || "50% 50%" }} />
            <button className="poetry-direct-move" type="button" aria-label="移动图片" onPointerDown={(event) => beginInteraction(event, "image", "move", imageFrame)}>✥</button>
            <button className="poetry-direct-resize" type="button" aria-label="缩放图片" onPointerDown={(event) => beginInteraction(event, "image", "resize", imageFrame)} />
          </div>
          <div
            className={`poetry-direct-text-frame${page.textDirection === "horizontal" ? " is-horizontal" : ""}`}
            style={{ left: `${textFrame.x}%`, top: `${textFrame.y}%`, width: `${textFrame.width}%`, height: `${textFrame.height}%`, fontFamily: page.fontFamily || defaultPoetryFont }}
          >
            <span contentEditable suppressContentEditableWarning onBlur={(event) => onUpdate((current) => ({ ...current, eyebrow: event.currentTarget.innerText }))}>{page.eyebrow}</span>
            <strong contentEditable suppressContentEditableWarning onBlur={(event) => onUpdate((current) => ({ ...current, title: event.currentTarget.innerText }))}>{page.title}</strong>
            <div
              className="poetry-direct-lines"
              contentEditable
              suppressContentEditableWarning
              style={{ fontSize: `${page.fontSize}px` }}
              onBlur={(event) => onUpdate((current) => ({ ...current, verticalColumns: splitLines(event.currentTarget.innerText) }))}
            >{page.verticalColumns.join("\n")}</div>
            <small contentEditable suppressContentEditableWarning onBlur={(event) => onUpdate((current) => ({ ...current, citation: event.currentTarget.innerText }))}>{page.citation}</small>
            <small contentEditable suppressContentEditableWarning onBlur={(event) => onUpdate((current) => ({ ...current, meta: splitLines(event.currentTarget.innerText) }))}>{page.meta.join(" · ")}</small>
            <button className="poetry-direct-move" type="button" aria-label="移动文字" onPointerDown={(event) => beginInteraction(event, "text", "move", textFrame)}>✥</button>
            <button className="poetry-direct-resize" type="button" aria-label="缩放文字" onPointerDown={(event) => beginInteraction(event, "text", "resize", textFrame)} />
          </div>
        </div>
        <div className="poetry-editor-fields poetry-editor-fields-compact">
          <section className="poetry-editor-images">
            <header><strong>页面图片</strong><button type="button" onClick={addImage}>＋ 添加图片</button></header>
            {page.images.map((item, imageIndex) => (
              <article key={`${page.id}-edit-image-${imageIndex}`}>
                <img src={item.src || fallbackImage.src} alt="" />
                <label>图片标题<input value={item.label} onChange={(event) => updateImage(imageIndex, { label: event.target.value })} /></label>
                <label>图片地址<input value={item.src} onChange={(event) => updateImage(imageIndex, { src: event.target.value })} /></label>
                <label>裁切位置<input value={item.position} onChange={(event) => updateImage(imageIndex, { position: event.target.value })} /></label>
                <label className="poetry-editor-upload">上传替换<input type="file" accept="image/*" onChange={(event) => handleUpload(imageIndex, event)} /></label>
                <button type="button" onClick={() => removeImage(imageIndex)} disabled={page.images.length <= 1}>删除图片</button>
              </article>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}

export function HomeIntroSection({ canCreate }: HomeIntroSectionProps) {
  const introRef = useRef<HTMLElement | null>(null);
  const compact = useCompactViewport();
  const [pages, setPages] = useState<TimePoetryWork[]>(loadPoetryPages);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const editorSnapshotRef = useRef<TimePoetryWork[] | null>(null);
  const undoStackRef = useRef<TimePoetryWork[][]>([]);
  const redoStackRef = useRef<TimePoetryWork[][]>([]);
  const [historyRevision, setHistoryRevision] = useState(0);

  const { scrollYProgress } = useScroll({
    target: introRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: compact ? 400 : 110,
    damping: compact ? 40 : 32,
    mass: compact ? 0.35 : 0.7,
  });

  const paperX = useTransform(progress, [0.08, 0.42], ["100%", "0%"]);
  const legacyScale = useTransform(progress, [0.08, 0.4], [1, compact ? 0.58 : 0.62]);
  const legacyX = useTransform(progress, [0.08, 0.4], ["0%", compact ? "0%" : "-22%"]);
  const legacyY = useTransform(progress, [0.08, 0.4], ["0%", compact ? "0%" : "3%"]);
  const sceneY = useTransform(progress, compact ? [0.76, 1] : [0.84, 1], compact ? ["0%", "-54%"] : ["0%", "-106%"]);
  const sceneOpacity = useTransform(progress, compact ? [0.9, 1] : [0.965, 1], compact ? [1, 0.22] : [1, 0]);

  useEffect(() => {
    if (editorIndex === null) savePoetryPages(pages);
  }, [editorIndex, pages]);

  const updatePage = (index: number, updater: (page: TimePoetryWork) => TimePoetryWork) => {
    setPages((current) => current.map((page, pageIndex) => (pageIndex === index ? updater(cloneWork(page)) : page)));
  };

  const checkpoint = () => {
    const last = undoStackRef.current.at(-1);
    const serialized = JSON.stringify(pages);
    if (!last || JSON.stringify(last) !== serialized) {
      undoStackRef.current = [...undoStackRef.current.slice(-39), clonePages(pages)];
      redoStackRef.current = [];
      setHistoryRevision((value) => value + 1);
    }
  };

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push(clonePages(pages));
    setPages(clonePages(previous));
    setHistoryRevision((value) => value + 1);
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(clonePages(pages));
    setPages(clonePages(next));
    setHistoryRevision((value) => value + 1);
  };

  const openEditor = (index: number) => {
    editorSnapshotRef.current = clonePages(pages);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryRevision((value) => value + 1);
    setEditorIndex(index);
  };

  const saveAndCloseEditor = () => {
    editorSnapshotRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setEditorIndex(null);
  };

  const cancelEditor = () => {
    if (editorSnapshotRef.current) setPages(clonePages(editorSnapshotRef.current));
    editorSnapshotRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setEditorIndex(null);
  };

  const addPage = () => {
    checkpoint();
    setPages((current) => {
      const source = cloneWork(current[current.length - 1] ?? timePoetryWorks[0]);
      const next = {
        ...source,
        id: `poetry-${Date.now()}`,
        eyebrow: "诗词作品",
        title: "新的诗词作品",
        verticalColumns: ["新的诗句", "从这里写起"],
        textBlocks: undefined,
        images: source.images.map((image, imageIndex) => ({ ...image, id: `image-${Date.now()}-${imageIndex}` })),
      };
      setEditorIndex(current.length);
      return [...current, normalizeWork(next)];
    });
  };

  const duplicatePage = (index: number) => {
    checkpoint();
    setPages((current) => {
      const stamp = Date.now();
      const source = cloneWork(current[index]);
      const duplicate = {
        ...source,
        id: `poetry-${stamp}`,
        title: `${current[index].title} 副本`,
        textBlocks: source.textBlocks?.map((block, blockIndex) => ({ ...block, id: `text-${stamp}-${blockIndex}` })),
        images: source.images.map((image, imageIndex) => ({ ...image, id: `image-${stamp}-${imageIndex}` })),
      };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      setEditorIndex(index + 1);
      return next;
    });
  };

  const deletePage = (index: number) => {
    checkpoint();
    setPages((current) => current.filter((_, pageIndex) => pageIndex !== index));
    setEditorIndex((current) => (current === null ? null : Math.max(0, current - 1)));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    checkpoint();
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      setEditorIndex(target);
      return next;
    });
  };

  return (
    <section className="poetry-portal" aria-label="多美诗词作品">
      <section className="poetry-portal-intro" id="kuaihuo" ref={introRef}>
        <div className="poetry-portal-stage">
          <motion.div className="poetry-portal-paper" style={{ x: paperX }} aria-hidden="true" />
          <motion.div className="poetry-portal-scene" style={{ y: sceneY, opacity: sceneOpacity }}>
            <motion.div className="poetry-legacy-frame" style={{ scale: legacyScale, x: legacyX, y: legacyY }}>
              <DreamCard />
            </motion.div>
            <PortalTitle progress={progress} />
          </motion.div>
        </div>
      </section>

      <GuyuShelfPreview />
      <StickerPackSection />

      <PoetryStackDeck pages={pages} canCreate={canCreate} onEdit={openEditor} />

      <HomeSkillsSection />

      {canCreate && editorIndex !== null ? (
        <PoetryCanvasEditor
          pages={pages}
          activeIndex={editorIndex}
          onSave={saveAndCloseEditor}
          onCancel={cancelEditor}
          onCheckpoint={checkpoint}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyRevision >= 0 && undoStackRef.current.length > 0}
          canRedo={historyRevision >= 0 && redoStackRef.current.length > 0}
          onSelect={setEditorIndex}
          onAdd={addPage}
          onDuplicate={() => duplicatePage(editorIndex)}
          onDelete={() => deletePage(editorIndex)}
          onMove={(direction) => movePage(editorIndex, direction)}
          onUpdate={(updater) => updatePage(editorIndex, updater)}
        />
      ) : null}
    </section>
  );
}
