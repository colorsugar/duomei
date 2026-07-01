import type { CSSProperties } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";
import { AnimatedImage, AnimatedParagraph } from "../motion";

function imageStyle(block: Extract<NoteContentBlock, { type: "image" }>) {
  return {
    "--zoom": `${block.zoom ?? 100}%`,
  } as CSSProperties;
}

export function NoteBlockRenderer({ blocks }: { blocks: NoteContentBlock[] }) {
  return (
    <div className="note-block-renderer">
      {blocks.map((block) => {
        if (block.type === "paragraph") return <AnimatedParagraph key={block.id}>{block.text}</AnimatedParagraph>;
        if (block.type === "quote") return <AnimatedParagraph as="blockquote" key={block.id}>{block.text}</AnimatedParagraph>;
        if (block.type === "divider") return <hr key={block.id} />;
        const aspect = block.aspectRatio ?? "original";
        return (
          <figure
            className={`article-image align-${block.align ?? "center"} aspect-${aspect.replace(":", "-")}`}
            data-motion-key={`article-image-${block.id}`}
            key={block.id}
            style={imageStyle(block)}
          >
            <AnimatedImage data-motion-key={`article-image-media-${block.id}`} data-shared-journey-image>
              <img src={block.src} alt={block.alt || block.caption || "小记图片"} loading="lazy" decoding="async" />
            </AnimatedImage>
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}
