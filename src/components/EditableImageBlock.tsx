import type { WheelEvent } from "react";
import type { CSSProperties } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";

type ImageBlock = Extract<NoteContentBlock, { type: "image" }>;

export function EditableImageBlock({
  block,
  onChange,
  onDelete,
  onMove,
  onSetCover,
}: {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onSetCover: () => void;
}) {
  const zoom = block.zoom ?? 100;
  const setZoom = (next: number) => onChange({ ...block, zoom: Math.max(50, Math.min(140, next)) });

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoom + (event.deltaY > 0 ? -5 : 5));
  };

  return (
    <figure className={`editable-image-block align-${block.align ?? "center"}`} style={{ "--zoom": `${zoom}%` } as CSSProperties} onWheel={handleWheel}>
      <img src={block.src} alt={block.alt || block.caption || "正文图片"} />
      <figcaption>
        <input
          value={block.caption ?? ""}
          onChange={(event) => onChange({ ...block, caption: event.target.value })}
          placeholder="图片说明"
        />
      </figcaption>
      <div className="image-block-tools">
        <button type="button" onClick={onSetCover}>设为封面</button>
        <button type="button" onClick={() => onMove(-1)}>上移</button>
        <button type="button" onClick={() => onMove(1)}>下移</button>
        <button type="button" onClick={() => onChange({ ...block, align: "left" })}>左</button>
        <button type="button" onClick={() => onChange({ ...block, align: "center" })}>中</button>
        <button type="button" onClick={() => onChange({ ...block, align: "right" })}>右</button>
        <button type="button" onClick={() => onChange({ ...block, align: "full" })}>通栏</button>
        <button type="button" onClick={() => setZoom(zoom + 5)}>放大</button>
        <button type="button" onClick={() => setZoom(zoom - 5)}>缩小</button>
        <button type="button" onClick={onDelete}>删除</button>
      </div>
    </figure>
  );
}
