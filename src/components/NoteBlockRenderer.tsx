import type { CSSProperties } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";

function imageStyle(block: Extract<NoteContentBlock, { type: "image" }>) {
  return {
    "--zoom": `${block.zoom ?? 100}%`,
  } as CSSProperties;
}

export function NoteBlockRenderer({ blocks }: { blocks: NoteContentBlock[] }) {
  return (
    <div className="note-block-renderer">
      {blocks.map((block) => {
        if (block.type === "paragraph") return <p key={block.id}>{block.text}</p>;
        if (block.type === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
        if (block.type === "divider") return <hr key={block.id} />;
        const aspect = block.aspectRatio ?? "original";
        return (
          <figure className={`article-image align-${block.align ?? "center"} aspect-${aspect.replace(":", "-")}`} key={block.id} style={imageStyle(block)}>
            <img src={block.src} alt={block.alt || block.caption || "小记图片"} loading="lazy" />
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}
