import type { CSSProperties } from "react";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";
import { AnimatedImage, AnimatedParagraph } from "../motion";

function imageStyle(block: Extract<NoteContentBlock, { type: "image" }>) {
  return {
    "--zoom": `${block.zoom ?? 100}%`,
  } as CSSProperties;
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
        <span
          className="detail-reveal-line"
          key={`${line}-${index}`}
          style={{ "--detail-line-delay": `${Math.min(index * 180, 720)}ms` } as CSSProperties}
        >
          {line}
        </span>
      ))}
    </span>
  );
}

function ArticleImageBlock({ block }: { block: Extract<NoteContentBlock, { type: "image" }> }) {
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
      <AnimatedImage className="article-image-media" data-motion-key={`article-image-media-${block.id}`} data-shared-journey-image>
        <img src={block.src} alt={block.alt || block.caption || "小记图片"} loading="lazy" decoding="async" onLoad={handleLoad} />
      </AnimatedImage>
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}

export function NoteBlockRenderer({ blocks }: { blocks: NoteContentBlock[] }) {
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
        return <ArticleImageBlock block={block} key={block.id} />;
      })}
    </div>
  );
}
