import type { NoteContentBlock } from "../lib/noteTypes";
import type { CSSProperties } from "react";

export function NoteBlockRenderer({ blocks }: { blocks: NoteContentBlock[] }) {
  return (
    <div className="note-block-renderer">
      {blocks.map((block) => {
        if (block.type === "paragraph") return <p key={block.id}>{block.text}</p>;
        if (block.type === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
        if (block.type === "divider") return <hr key={block.id} />;
        return (
          <figure className={`article-image align-${block.align ?? "center"}`} key={block.id} style={{ "--zoom": `${block.zoom ?? 100}%` } as CSSProperties}>
            <img src={block.src} alt={block.alt || block.caption || "小记图片"} loading="lazy" />
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}
