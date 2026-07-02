import { PointerEvent, WheelEvent, useRef, useState } from "react";
import { createBlockId } from "../lib/noteStore";
import type { NoteContentBlock } from "../lib/noteTypes";

type AspectMode = "original" | "1:1" | "4:3" | "3:2" | "16:9" | "9:16";
type AlignMode = "left" | "center" | "right" | "full";

type PendingImage = {
  id: string;
  fileName: string;
  sourceDataUrl: string;
  caption: string;
  align: AlignMode;
  zoom: number;
  cropScale: number;
  rotate: number;
  offsetX: number;
  offsetY: number;
  aspectRatio: AspectMode;
  beforeBytes: number;
  originalWidth: number;
  originalHeight: number;
};

type ImageUploadPanelProps = {
  onInsert: (blocks: NoteContentBlock[], message?: string) => void;
  onSetCover?: (src: string) => void;
  compact?: boolean;
  coverOnly?: boolean;
  onClose?: () => void;
};

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type TouchPoint = {
  x: number;
  y: number;
};

type GestureState = {
  id: string;
  startDistance: number;
  startAngle: number;
  originScale: number;
  originRotate: number;
};

const aspectLabels: Record<AspectMode, string> = {
  original: "原始比例",
  "1:1": "1:1",
  "4:3": "4:3",
  "3:2": "3:2",
  "16:9": "16:9",
  "9:16": "9:16",
};

function formatKb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function aspectValue(item: PendingImage) {
  if (item.aspectRatio === "original") return item.originalWidth / item.originalHeight;
  const [width, height] = item.aspectRatio.split(":").map(Number);
  return width / height;
}

function outputSize(item: PendingImage) {
  const ratio = aspectValue(item);
  const maxWidth = 2400;
  const maxHeight = 1800;
  let width = Math.min(item.originalWidth, maxWidth);
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

function clampScale(value: number) {
  return Math.max(0.45, Math.min(3, value));
}

function distance(a: TouchPoint, b: TouchPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: TouchPoint, b: TouchPoint) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

async function renderEditedImage(item: PendingImage) {
  const image = await loadImage(item.sourceDataUrl);
  const { width, height } = outputSize(item);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器无法处理这张图片。");

  ctx.fillStyle = "#f8f5ef";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2 + item.offsetX * (width / 520), height / 2 + item.offsetY * (height / 360));
  ctx.rotate((item.rotate * Math.PI) / 180);
  const scale = Math.max(width / image.width, height / image.height) * item.cropScale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (-image.width * scale) / 2, (-image.height * scale) / 2, image.width * scale, image.height * scale);
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/webp", 0.9);
  const bytes = Math.round((dataUrl.length * 3) / 4);
  return { dataUrl, bytes };
}

export function ImageUploadPanel({ onInsert, onSetCover, compact = false, coverOnly = false, onClose }: ImageUploadPanelProps) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, TouchPoint>>(new Map());
  const gestureRef = useRef<GestureState | null>(null);
  const active = pending[activeIndex];

  const updatePending = (id: string, patch: Partial<PendingImage>) => {
    setPending((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    setMessage("正在读取照片...");
    try {
      const next: PendingImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const sourceDataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(sourceDataUrl);
        next.push({
          id: createBlockId("pending-image"),
          fileName: file.name,
          sourceDataUrl,
          caption: "",
          align: "center",
          zoom: 100,
          cropScale: 1,
          rotate: 0,
          offsetX: 0,
          offsetY: 0,
          aspectRatio: "original",
          beforeBytes: file.size,
          originalWidth: image.naturalWidth,
          originalHeight: image.naturalHeight,
        });
      }
      setPending((items) => {
        const merged = [...items, ...next];
        if (!items.length) setActiveIndex(0);
        return merged;
      });
      setMessage(coverOnly ? "照片已读取。先调整画面，再保存为封面。" : "照片已读取。先裁剪、缩放、排序和填写说明，再插入正文。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "照片读取失败，请重新选择。");
    } finally {
      setIsProcessing(false);
    }
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragRef.current = { id: active.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: active.offsetX, originY: active.offsetY };
    if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values()).slice(0, 2);
      gestureRef.current = {
        id: active.id,
        startDistance: distance(first, second),
        startAngle: angle(first, second),
        originScale: active.cropScale,
        originRotate: active.rotate,
      };
      dragRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    event.preventDefault();
    event.stopPropagation();
    const gesture = gestureRef.current;
    if (gesture && pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values()).slice(0, 2);
      const nextDistance = distance(first, second);
      const nextAngle = angle(first, second);
      updatePending(gesture.id, {
        cropScale: clampScale(gesture.originScale * (nextDistance / Math.max(1, gesture.startDistance))),
        rotate: gesture.originRotate + nextAngle - gesture.startAngle,
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updatePending(drag.id, { offsetX: drag.originX + event.clientX - drag.startX, offsetY: drag.originY + event.clientY - drag.startY });
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleCropWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
    const nextScale = active.cropScale + (event.deltaY > 0 ? -0.04 : 0.04);
    updatePending(active.id, { cropScale: clampScale(nextScale) });
  };

  const movePending = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= pending.length) return;
    setPending((items) => {
      const next = [...items];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setActiveIndex(to);
  };

  const removePending = (id: string) => {
    setPending((items) => {
      const next = items.filter((item) => item.id !== id);
      setActiveIndex((index) => Math.max(0, Math.min(index, next.length - 1)));
      return next;
    });
  };

  const insertAll = async (setFirstAsCover = false) => {
    if (!pending.length) return;
    setIsProcessing(true);
    setMessage("正在处理图片...");
    try {
      const sourceItems = coverOnly && active ? [active] : pending;
      const blocks: NoteContentBlock[] = [];
      let coverSrc = "";
      let before = 0;
      let after = 0;
      for (const item of sourceItems) {
        const result = await renderEditedImage(item);
        before += item.beforeBytes;
        after += result.bytes;
        if (!coverSrc) coverSrc = result.dataUrl;
        blocks.push({
          id: createBlockId("image"),
          type: "image",
          src: result.dataUrl,
          alt: item.caption,
          caption: item.caption,
          align: item.align,
          zoom: item.zoom,
          aspectRatio: item.aspectRatio,
          objectFit: item.aspectRatio === "original" ? "contain" : "cover",
          crop: { x: item.offsetX, y: item.offsetY, scale: item.cropScale, rotate: item.rotate },
        });
      }
      if (coverOnly) {
        if (coverSrc) onSetCover?.(coverSrc);
        setMessage("封面已设置。保存或发布时会上传云端。");
      } else {
        if (setFirstAsCover && coverSrc) onSetCover?.(coverSrc);
        onInsert(blocks, `已插入 ${sourceItems.length} 张图片：${formatKb(before)} -> ${formatKb(after)}。保存或发布时会上传云端。`);
      }
      setPending([]);
      setActiveIndex(0);
      onClose?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片处理失败。");
    } finally {
      setIsProcessing(false);
    }
  };

  const insertUrl = () => {
    const src = url.trim();
    if (!src) return;
    if (coverOnly) {
      onSetCover?.(src);
      setMessage("封面地址已设置。");
      setUrl("");
      onClose?.();
      return;
    }
    onInsert([{ id: createBlockId("image"), type: "image", src, caption: "", align: "center", zoom: 100, aspectRatio: "original", objectFit: "contain" }], "图片地址已插入正文。");
    setUrl("");
    onClose?.();
  };

  return (
    <section
      className={`image-upload-panel${compact ? " compact" : ""}`}
      onWheelCapture={(event) => event.stopPropagation()}
      onTouchStartCapture={(event) => event.stopPropagation()}
      onTouchMoveCapture={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="image-upload-heading">
        <div>
          <strong>{coverOnly ? "添加封面" : "添加正文图片"}</strong>
          <span>{coverOnly ? "选择照片后先裁剪、缩放和旋转，再保存为封面。" : "选择照片后先裁剪、缩放、排序和填写说明，再插入正文。"}</span>
        </div>
        {onClose ? <button type="button" onClick={onClose}>关闭</button> : null}
      </div>

      <div className="image-upload-row">
        <label><span>选择图片</span><input type="file" accept="image/*" multiple={!coverOnly} onChange={(event) => handleFiles(event.target.files)} /></label>
        <label><span>图片 URL</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label>
        <button type="button" onClick={insertUrl}>插入 URL</button>
      </div>

      {message ? <p className="image-upload-message">{message}</p> : null}

      {active ? (
        <div className="image-crop-card">
          <div className="image-crop-top">
            <div><strong>裁剪照片</strong><span>{active.fileName} / 原始 {formatKb(active.beforeBytes)} / {active.originalWidth}x{active.originalHeight}</span></div>
            <span>{activeIndex + 1} / {pending.length}</span>
          </div>
          <div className={`image-crop-stage aspect-${active.aspectRatio.replace(":", "-")}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onWheel={handleCropWheel}>
            <img src={active.sourceDataUrl} alt="裁剪预览" style={{ transform: `translate3d(${active.offsetX}px, ${active.offsetY}px, 0) rotate(${active.rotate}deg) scale(${active.cropScale})` }} />
          </div>
          <div className="image-crop-controls">
            <label><span>裁剪比例</span><select value={active.aspectRatio} onChange={(event) => updatePending(active.id, { aspectRatio: event.target.value as AspectMode })}>{Object.entries(aspectLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>缩放</span><input type="range" min="45" max="300" value={Math.round(active.cropScale * 100)} onChange={(event) => updatePending(active.id, { cropScale: Number(event.target.value) / 100 })} /></label>
            <button type="button" onClick={() => updatePending(active.id, { rotate: active.rotate - 90 })}>左转</button>
            <button type="button" onClick={() => updatePending(active.id, { rotate: active.rotate + 90 })}>右转</button>
            <button type="button" onClick={() => updatePending(active.id, { cropScale: 1, rotate: 0, offsetX: 0, offsetY: 0 })}>重置</button>
            {!coverOnly ? (
              <>
                <input value={active.caption} onChange={(event) => updatePending(active.id, { caption: event.target.value })} placeholder="图片说明 caption" />
                {(["left", "center", "right", "full"] as const).map((align) => <button key={align} type="button" className={active.align === align ? "is-active" : ""} onClick={() => updatePending(active.id, { align })}>{align === "left" ? "居左" : align === "center" ? "居中" : align === "right" ? "居右" : "通栏"}</button>)}
                {[25, 50, 75, 100].map((zoom) => <button key={zoom} type="button" className={active.zoom === zoom ? "is-active" : ""} onClick={() => updatePending(active.id, { zoom })}>{zoom}%</button>)}
              </>
            ) : null}
            <button type="button" onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}>上一张</button>
            <button type="button" onClick={() => setActiveIndex(Math.min(pending.length - 1, activeIndex + 1))}>下一张</button>
            <button type="button" onClick={() => movePending(activeIndex, -1)}>上移</button>
            <button type="button" onClick={() => movePending(activeIndex, 1)}>下移</button>
            <button type="button" onClick={() => removePending(active.id)}>移除</button>
            {coverOnly ? <button type="button" onClick={() => insertAll(false)} disabled={isProcessing}>保存为封面</button> : <><button type="button" onClick={() => insertAll(false)} disabled={isProcessing}>全部插入正文</button><button type="button" onClick={() => insertAll(true)} disabled={isProcessing}>设为封面并插入</button></>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
