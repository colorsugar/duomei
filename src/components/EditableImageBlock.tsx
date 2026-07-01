import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { NoteContentBlock } from "../lib/noteTypes";

type ImageBlock = Extract<NoteContentBlock, { type: "image" }>;

type ResizeState = {
  pointerId: number;
  startX: number;
  startWidth: number;
};

const widths = [25, 50, 75, 100];
const aspectOptions: Array<NonNullable<ImageBlock["aspectRatio"]>> = ["original", "1:1", "4:3", "3:2", "16:9", "9:16"];

const alignLabels: Record<NonNullable<ImageBlock["align"]>, string> = {
  left: "左",
  center: "中",
  right: "右",
  full: "通栏",
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
  const [selected, setSelected] = useState(false);
  const zoom = block.zoom ?? 100;

  const commit = (patch: Partial<ImageBlock>) => onChange({ ...block, ...patch });
  const setZoom = (next: number) => commit({ zoom: Math.max(25, Math.min(100, Math.round(next))) });

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: zoom };
  };

  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.preventDefault();
    const direction = block.align === "right" ? -1 : 1;
    const next = resize.startWidth + ((event.clientX - resize.startX) * direction) / 7;
    setZoom(next);
  };

  const stopResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
  };

  const aspectRatio = block.aspectRatio ?? "original";

  return (
    <figure
      className={`editable-image-block align-${block.align ?? "center"}${selected ? " is-selected" : ""}`}
      style={{ "--zoom": `${zoom}%` } as CSSProperties}
      onClick={(event) => {
        event.stopPropagation();
        setSelected(true);
      }}
    >
      {selected ? (
        <div className="editable-image-floating-tools">
          {widths.map((width) => (
            <button key={width} type="button" className={zoom === width ? "is-active" : ""} onClick={() => setZoom(width)}>{width}%</button>
          ))}
          {(["left", "center", "right", "full"] as const).map((align) => (
            <button key={align} type="button" className={(block.align ?? "center") === align ? "is-active" : ""} onClick={() => commit({ align, zoom: align === "full" ? 100 : zoom })}>
              {alignLabels[align]}
            </button>
          ))}
          <select value={aspectRatio} onChange={(event) => commit({ aspectRatio: event.target.value as ImageBlock["aspectRatio"], objectFit: event.target.value === "original" ? "contain" : "cover" })}>
            {aspectOptions.map((option) => <option key={option} value={option}>{option === "original" ? "原图" : option}</option>)}
          </select>
          <button type="button" onClick={onSetCover}>封面</button>
          <button type="button" onClick={() => onMove(-1)}>上移</button>
          <button type="button" onClick={() => onMove(1)}>下移</button>
          <button type="button" className="is-danger" onClick={onDelete}>删除</button>
        </div>
      ) : null}
      <div className={`editable-image-frame aspect-${aspectRatio.replace(":", "-")}`}>
        <img src={block.src} alt={block.alt || block.caption || "正文图片"} />
        {selected ? (
          <>
            <button className="image-resize-handle handle-nw" type="button" aria-label="拖动调整图片大小" onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} />
            <button className="image-resize-handle handle-ne" type="button" aria-label="拖动调整图片大小" onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} />
            <button className="image-resize-handle handle-sw" type="button" aria-label="拖动调整图片大小" onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} />
            <button className="image-resize-handle handle-se" type="button" aria-label="拖动调整图片大小" onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} />
          </>
        ) : null}
      </div>
      <figcaption>
        <input
          value={block.caption ?? ""}
          onChange={(event) => commit({ caption: event.target.value, alt: event.target.value })}
          placeholder="图片说明"
          onFocus={() => setSelected(true)}
        />
      </figcaption>
    </figure>
  );
}
