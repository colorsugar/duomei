import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import type { DuomeiNote } from "../lib/noteTypes";
import { compressImageFile } from "../lib/imageTools";
import { defaultPoetryFont, timePoetryWorks } from "../lib/timePoetryContent";
import type { TimePoetryImage, TimePoetryWork } from "../lib/timePoetryContent";
import { DreamCard } from "./DreamCard";
import { PoetryCanvasPage } from "./PoetryCanvasPage";
import "./HomeIntroSection.css";

type HomeIntroSectionProps = {
  canCreate: boolean;
  notes: DuomeiNote[];
  onCreate: () => void;
};

const POETRY_STORAGE_KEY = "duomei-time-poetry-pages";
const POETRY_CONTENT_VERSION_KEY = "duomei-time-poetry-content-version";
const POETRY_CONTENT_VERSION = "2";
const portalTitleColumns = ["来啊", "快活啊", "反正有大把时光"];

const fallbackImage: TimePoetryImage = {
  label: "在路上的日子",
  src: "/images/note-default-covers/duomei-default-cover-01.png",
  position: "50% 50%",
};

function cloneWork(work: TimePoetryWork): TimePoetryWork {
  return {
    ...work,
    verticalColumns: [...work.verticalColumns],
    body: [...work.body],
    meta: [...work.meta],
    images: work.images.map((image) => ({ ...image })),
    canvas: work.canvas ? { ...work.canvas, elements: work.canvas.elements.map((element) => ({ ...element })) } : undefined,
  };
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
  const [compact, setCompact] = useState(() => (typeof window === "undefined" ? false : window.innerWidth <= 760));

  useEffect(() => {
    const update = () => setCompact(window.innerWidth <= 760);
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

function PoetryRevealColumn({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: string;
}) {
  const start = 0.025 + index * 0.07;
  const end = start + 0.18;
  const opacity = useTransform(progress, [start, start + 0.055, end], [0, 0.72, 1]);
  const clipPath = useTransform(
    progress,
    [start, end],
    ["inset(0 0 100% 0 round 45% 45% 0 0)", "inset(0 0 0% 0 round 0% 0% 0 0)"],
  );
  const y = useTransform(progress, [start, end], [46 + index * 7, 0]);
  const filter = useTransform(progress, [start, end], ["blur(2.4px)", "blur(0px)"]);

  return (
    <motion.span aria-hidden="true" style={{ opacity, clipPath, y, filter }}>
      {children}
    </motion.span>
  );
}

function PoetryWorkPanel({
  work,
  index,
  canCreate,
  onEdit,
  editing,
  onDone,
  onChange,
}: {
  work: TimePoetryWork;
  index: number;
  canCreate: boolean;
  onEdit: () => void;
  editing: boolean;
  onDone: () => void;
  onChange: (work: TimePoetryWork) => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const images = work.images.length ? work.images : [fallbackImage];
  const image = images[0];
  const isReverse = index % 2 === 1;
  const isNotebookPoem = work.id.startsWith("notebook-");
  const title = work.title || `诗词作品 ${String(index + 1).padStart(2, "0")}`;
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start 20%", "end end"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  const mediaScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.02, 1.08]);
  const maskScaleX = useTransform(scrollYProgress, [0, 0.34], [1, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.18], [0, 1]);
  const copyY = useTransform(scrollYProgress, [0, 0.18], [42, 0]);
  const mediaX = useTransform(scrollYProgress, [0, 0.25], [isReverse ? -58 : 58, 0]);
  const copyX = useTransform(scrollYProgress, [0, 0.2], [isReverse ? 34 : -34, 0]);

  if (editing) {
    return <PoetryCanvasPage work={work} pageIndex={index} editing={editing} canEdit={canCreate} onEdit={onEdit} onDone={onDone} onChange={onChange} />;
  }

  return (
    <article ref={panelRef} className="poetry-work-track" aria-labelledby={`poetry-work-${work.id}`}>
      <div className={`poetry-work-panel${isReverse ? " is-reverse" : ""}`}>
      <motion.header className="poetry-work-heading" style={{ opacity: copyOpacity, x: copyX, y: copyY }}>
        <span>诗词作品</span>
        <strong>{String(index + 1).padStart(2, "0")}</strong>
        <h3 id={`poetry-work-${work.id}`}>{title}</h3>
      </motion.header>

      <motion.div
        className="poetry-work-vertical"
        style={{ fontFamily: work.fontFamily || defaultPoetryFont, x: copyX }}
        aria-label={work.verticalColumns.join("，")}
      >
        {work.verticalColumns.map((column, columnIndex) => (
          <PoetryRevealColumn key={`${work.id}-${columnIndex}`} progress={scrollYProgress} index={columnIndex}>
            {column}
          </PoetryRevealColumn>
        ))}
      </motion.div>

      <motion.figure className="poetry-work-media" style={{ x: mediaX }}>
        <div className={`poetry-work-media-grid is-count-${Math.min(images.length, 4)}`}>
          {images.slice(0, 4).map((item, imageIndex) => (
            <div className="poetry-work-media-cell" key={`${work.id}-${item.src}-${imageIndex}`}>
              <motion.img
                src={item.src || fallbackImage.src}
                alt={item.label || title}
                loading={index === 0 && imageIndex === 0 ? "eager" : "lazy"}
                style={{ objectPosition: item.position || "50% 50%", y: mediaY, scale: mediaScale }}
              />
            </div>
          ))}
        </div>
        <motion.span className="poetry-work-media-mask" style={{ scaleX: maskScaleX }} aria-hidden="true" />
        <figcaption>{image.label || title}</figcaption>
      </motion.figure>

      <motion.div className="poetry-work-excerpt" style={{ opacity: copyOpacity, x: copyX, y: copyY }}>
        {(isNotebookPoem ? [] : work.body.slice(0, 2)).map((line, lineIndex) => (
          <p key={`${work.id}-body-${lineIndex}`}>{line}</p>
        ))}
        {work.citation ? <small>{work.citation}</small> : null}
        {work.meta.length ? <small>{work.meta.join("  ·  ")}</small> : null}
        {canCreate ? (
          <button type="button" onClick={onEdit}>
            编辑作品
          </button>
        ) : null}
      </motion.div>
      </div>
    </article>
  );
}

function PoetryEditor({
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
  if (!page) return null;

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
        <div className="poetry-editor-fields">
          <label>标题<input value={page.title} onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>引用来源<input value={page.citation ?? ""} onChange={(event) => onUpdate((current) => ({ ...current, citation: event.target.value }))} /></label>
          <label className="is-wide">竖排诗句<textarea value={page.verticalColumns.join("\n")} onChange={(event) => onUpdate((current) => ({ ...current, verticalColumns: splitLines(event.target.value) }))} /></label>
          <label className="is-wide">简介<textarea value={page.body.join("\n")} onChange={(event) => onUpdate((current) => ({ ...current, body: splitLines(event.target.value) }))} /></label>
          <label className="is-wide">页脚信息<textarea value={page.meta.join("\n")} onChange={(event) => onUpdate((current) => ({ ...current, meta: splitLines(event.target.value) }))} /></label>
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

  const { scrollYProgress } = useScroll({
    target: introRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 32, mass: 0.7 });

  const paperX = useTransform(progress, [0.08, 0.42], ["100%", "0%"]);
  const legacyScale = useTransform(progress, [0.08, 0.4], [1, compact ? 0.58 : 0.62]);
  const legacyX = useTransform(progress, [0.08, 0.4], ["0%", compact ? "0%" : "-22%"]);
  const legacyY = useTransform(progress, [0.08, 0.4], ["0%", compact ? "0%" : "3%"]);
  const sceneY = useTransform(progress, [0.84, 1], ["0%", "-106%"]);
  const sceneOpacity = useTransform(progress, [0.965, 1], [1, 0]);
  const progressOpacity = useTransform(progress, [0.93, 0.995], [1, 0]);
  const progressScale = useTransform(progress, [0, 1], [0, 1]);

  useEffect(() => {
    savePoetryPages(pages);
  }, [pages]);

  const updatePage = (index: number, updater: (page: TimePoetryWork) => TimePoetryWork) => {
    setPages((current) => current.map((page, pageIndex) => (pageIndex === index ? updater(cloneWork(page)) : page)));
  };

  const addPage = () => {
    setPages((current) => {
      const source = cloneWork(current[current.length - 1] ?? timePoetryWorks[0]);
      const next = {
        ...source,
        id: `poetry-${Date.now()}`,
        eyebrow: "诗词作品",
        title: "新的诗词作品",
        verticalColumns: ["新的诗句", "从这里写起"],
      };
      setEditorIndex(current.length);
      return [...current, next];
    });
  };

  const duplicatePage = (index: number) => {
    setPages((current) => {
      const duplicate = { ...cloneWork(current[index]), id: `poetry-${Date.now()}`, title: `${current[index].title} 副本` };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      setEditorIndex(index + 1);
      return next;
    });
  };

  const deletePage = (index: number) => {
    setPages((current) => current.filter((_, pageIndex) => pageIndex !== index));
    setEditorIndex((current) => (current === null ? null : Math.max(0, current - 1)));
  };

  const movePage = (index: number, direction: -1 | 1) => {
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
      <section className="poetry-portal-intro" ref={introRef}>
        <div className="poetry-portal-stage">
          <motion.div className="poetry-portal-paper" style={{ x: paperX }} aria-hidden="true" />
          <motion.div className="poetry-portal-scene" style={{ y: sceneY, opacity: sceneOpacity }}>
            <motion.div className="poetry-legacy-frame" style={{ scale: legacyScale, x: legacyX, y: legacyY }}>
              <DreamCard />
            </motion.div>
            <PortalTitle progress={progress} />
          </motion.div>
          <motion.div className="poetry-scroll-progress" style={{ opacity: progressOpacity }} aria-hidden="true">
            <span>进入</span>
            <i><motion.b style={{ scaleX: progressScale }} /></i>
            <span>诗词</span>
          </motion.div>
        </div>
      </section>

      <section className="poetry-index" aria-label="诗词作品列表">
        {canCreate ? (
          <div className="poetry-page-management">
            <button type="button" onClick={addPage}>+ 新增作品</button>
            {editorIndex !== null ? (
              <>
                <button type="button" onClick={() => movePage(editorIndex, -1)} disabled={editorIndex === 0}>前移</button>
                <button type="button" onClick={() => movePage(editorIndex, 1)} disabled={editorIndex === pages.length - 1}>后移</button>
                <button type="button" onClick={() => duplicatePage(editorIndex)}>复制页面</button>
                <button type="button" onClick={() => deletePage(editorIndex)} disabled={pages.length <= 1}>删除页面</button>
              </>
            ) : null}
          </div>
        ) : null}
        {pages.map((work, index) => (
          <PoetryWorkPanel
            key={work.id}
            work={work}
            index={index}
            canCreate={canCreate}
            editing={editorIndex === index}
            onEdit={() => setEditorIndex(index)}
            onDone={() => setEditorIndex(null)}
            onChange={(nextWork) => updatePage(index, () => nextWork)}
          />
        ))}
      </section>
    </section>
  );
}
