import type { CSSProperties, PointerEvent, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";
import { AnimatedImage, AnimatedParagraph } from "../motion";

type ImageBlock = Extract<NoteContentBlock, { type: "image" }>;

function imageStyle(block: ImageBlock) {
  return { "--zoom": `${block.zoom ?? 100}%` } as CSSProperties;
}

function splitRevealLines(text: string) {
  const lines: string[] = [];
  let current = "";
  Array.from(text).forEach((char) => {
    current += char;
    if ((/[，。；、！？,.!?;]/.test(char) && current.length >= 10) || current.length >= 24) {
      lines.push(current);
      current = "";
    }
  });
  if (current) lines.push(current);
  return lines;
}

function renderRevealLines(text: string) {
  return (
    <span className="detail-reveal-lines" aria-hidden="true">
      {splitRevealLines(text).map((line, index) => (
        <span className="detail-reveal-line" key={`${line}-${index}`} style={{ "--detail-line-delay": `${Math.min(index * 180, 720)}ms` } as CSSProperties}>
          {line}
        </span>
      ))}
    </span>
  );
}

function ArticleImageBlock({ block, onOpen }: { block: ImageBlock; onOpen: () => void }) {
  const [portrait, setPortrait] = useState(false);
  const aspect = block.aspectRatio ?? "original";
  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    setPortrait(image.naturalHeight / Math.max(image.naturalWidth, 1) > 1.18);
  };

  return (
    <figure
      className={`article-image align-${block.align ?? "center"} aspect-${aspect.replace(":", "-")}${portrait ? " is-portrait" : ""}`}
      data-motion-key={`article-image-${block.id}`}
      style={imageStyle(block)}
    >
      <span className="article-image-backdrop" style={{ backgroundImage: `url(${JSON.stringify(block.src)})` }} aria-hidden="true" />
      <button className="article-image-open" type="button" onClick={onOpen} aria-label={`放大查看${block.caption || "这张图片"}`}>
        <AnimatedImage className="article-image-media" data-motion-key={`article-image-media-${block.id}`} data-shared-journey-image>
          <img src={block.src} alt={block.alt || block.caption || "小记图片"} loading="lazy" decoding="async" onLoad={handleLoad} />
        </AnimatedImage>
      </button>
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}

export function NoteBlockRenderer({ blocks }: { blocks: NoteContentBlock[] }) {
  const images = blocks.filter((block): block is ImageBlock => block.type === "image");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pointerStartRef = useRef<number | null>(null);
  const activeImage = lightboxIndex === null ? null : images[lightboxIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeImage && !dialog.open) dialog.showModal();
    if (!activeImage && dialog.open) dialog.close();
  }, [activeImage]);

  const moveLightbox = (direction: -1 | 1) => {
    if (lightboxIndex === null || images.length < 2) return;
    setLightboxIndex((lightboxIndex + direction + images.length) % images.length);
  };

  const startSwipe = (event: PointerEvent<HTMLDialogElement>) => {
    pointerStartRef.current = event.clientX;
  };

  const endSwipe = (event: PointerEvent<HTMLDialogElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start === null || Math.abs(event.clientX - start) < 56) return;
    moveLightbox(event.clientX < start ? 1 : -1);
  };

  return (
    <div className="note-block-renderer">
      {blocks.map((block) => {
        if (block.type === "paragraph") {
          return <AnimatedParagraph aria-label={block.text} key={block.id}>{renderRevealLines(block.text)}</AnimatedParagraph>;
        }
        if (block.type === "quote") {
          return <AnimatedParagraph aria-label={block.text} as="blockquote" key={block.id}>{renderRevealLines(block.text)}</AnimatedParagraph>;
        }
        if (block.type === "divider") return <hr key={block.id} />;
        return <ArticleImageBlock block={block} key={block.id} onOpen={() => setLightboxIndex(images.findIndex((image) => image.id === block.id))} />;
      })}
      <dialog
        className="duomei-lightbox"
        ref={dialogRef}
        aria-label="图片预览"
        onClose={() => setLightboxIndex(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
      >
        {activeImage ? (
          <div className="duomei-lightbox-inner">
            <button className="duomei-lightbox-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="关闭图片预览">×</button>
            {images.length > 1 ? <button className="duomei-lightbox-nav is-prev" type="button" onClick={() => moveLightbox(-1)} aria-label="上一张图片">←</button> : null}
            <img src={activeImage.src} alt={activeImage.alt || activeImage.caption || "小记图片"} />
            {images.length > 1 ? <button className="duomei-lightbox-nav is-next" type="button" onClick={() => moveLightbox(1)} aria-label="下一张图片">→</button> : null}
            {activeImage.caption ? <p>{activeImage.caption}</p> : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
