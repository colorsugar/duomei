import { useRef } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";

type ImageBlock = Extract<NoteContentBlock, { type: "image" }>;

type ResizeState = {
  pointerId: number;
  startX: number;
  startZoom: number;
};

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
  const resizeRef = useRef<ResizeState | null>(null);
  const zoom = block.zoom ?? 100;
  const setZoom = (next: number) => onChange({ ...block, zoom: Math.max(40, Math.min(140, Math.round(next))) });

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoom + (event.deltaY > 0 ? -5 : 5));
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startZoom: zoom,
    };
  };

  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.preventDefault();
    const direction = block.align === "right" ? -1 : 1;
    setZoom(resize.startZoom + ((event.clientX - resize.startX) * direction) / 5);
  };

  const stopResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
  };

  return (
    <figure
      className={`editable-image-block align-${block.align ?? "center"}`}
      style={{ "--zoom": `${zoom}%` } as CSSProperties}
      onWheel={handleWheel}
    >
      <div className="editable-image-frame">
        <img src={block.src} alt={block.alt || block.caption || "正文图片"} />
        <button
          type="button"
          className="image-resize-handle"
          aria-label="拖动调整图片大小"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
        />
      </div>
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
        <button type="button" onClick={() => onChange({ ...block, align: "full", zoom: 100 })}>通栏</button>
        <button type="button" onClick={() => setZoom(zoom + 5)}>放大</button>
        <button type="button" onClick={() => setZoom(zoom - 5)}>缩小</button>
        <button type="button" onClick={onDelete}>删除</button>
      </div>
    </figure>
  );
}
