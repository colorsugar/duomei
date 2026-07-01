import { PointerEvent, WheelEvent, useRef, useState } from "react";
import { createBlockId } from "../lib/noteStore";
import { uploadNoteImage } from "../lib/supabaseNotes";
import type { NoteContentBlock } from "../lib/noteTypes";

type AspectMode = "original" | "1:1" | "4:3" | "3:2" | "16:9" | "9:16";

type PendingImage = {
  id: string;
  fileName: string;
  sourceDataUrl: string;
  caption: string;
  align: "center" | "full";
  zoom: 60 | 80 | 100;
  cropScale: number;
  rotate: number;
  offsetX: number;
  offsetY: number;
  aspect: AspectMode;
  beforeBytes: number;
  originalWidth: number;
  originalHeight: number;
};

type ImageUploadPanelProps = {
  onInsert: (blocks: NoteContentBlock[], message?: string) => void;
  onSetCover?: (src: string) => void;
  compact?: boolean;
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

type PinchState = {
  id: string;
  distance: number;
  angle: number;
  scale: number;
  rotate: number;
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForFileReady(file: File) {
  for (let index = 0; index < 20; index += 1) {
    if (file.size > 0) {
      try {
        await file.slice(0, 16).arrayBuffer();
        return file;
      } catch {
        // iCloud-backed photos can need a moment before bytes are readable.
      }
    }
    await delay(220);
  }
  throw new Error("照片还没有准备好，请确认 iCloud 照片下载完成后重试。");
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
  if (item.aspect === "original") return item.originalWidth / item.originalHeight;
  const [width, height] = item.aspect.split(":").map(Number);
  return width / height;
}

function outputSize(item: PendingImage) {
  const ratio = aspectValue(item);
  const maxWidth = 2400;
  const maxHeight = 1800;
  let width = maxWidth;
  let height = Math.round(width / ratio);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * ratio);
  }
  return { width, height };
}

async function renderEditedImage(item: PendingImage) {
  const image = await loadImage(item.sourceDataUrl);
  const { width, height } = outputSize(item);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法创建图片画布。");

  context.fillStyle = "#f8f5ef";
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2 + item.offsetX * 3, height / 2 + item.offsetY * 3);
  context.rotate((item.rotate * Math.PI) / 180);
  const baseScale = Math.max(width / image.width, height / image.height);
  const scale = baseScale * item.cropScale;
  context.drawImage(image, (-image.width * scale) / 2, (-image.height * scale) / 2, image.width * scale, image.height * scale);
  context.restore();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("图片压缩失败。");
  const dataUrl = canvas.toDataURL("image/webp", 0.9);
  return { blob, dataUrl, width, height };
}

export function ImageUploadPanel({ onInsert, onSetCover, compact = false, onClose }: ImageUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, TouchPoint>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const active = pending[activeIndex];

  const updatePending = (id: string, patch: Partial<PendingImage>) => {
    setPending((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    setMessage("正在读取照片...");
    try {
      const nextImages: PendingImage[] = [];
      for (const file of Array.from(files)) {
        const readyFile = await waitForFileReady(file);
        const dataUrl = await readFileAsDataUrl(readyFile);
        const image = await loadImage(dataUrl);
        nextImages.push({
          id: createBlockId("pending-image"),
          fileName: readyFile.name,
          sourceDataUrl: dataUrl,
          caption: "",
          align: "center",
          zoom: 100,
          cropScale: 1,
          rotate: 0,
          offsetX: 0,
          offsetY: 0,
          aspect: "original",
          beforeBytes: readyFile.size,
          originalWidth: image.width,
          originalHeight: image.height,
        });
      }
      setPending((items) => {
        const merged = [...items, ...nextImages];
        setActiveIndex(items.length);
        return merged;
      });
      setMessage("照片已读取，请先调整裁剪和说明，再插入正文。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "照片读取失败，请重新选择。");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const movePending = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pending.length) return;
    const next = [...pending];
    [next[index], next[target]] = [next[target], next[index]];
    setPending(next);
    setActiveIndex(target);
  };

  const resetActive = () => {
    if (!active) return;
    updatePending(active.id, { cropScale: 1, rotate: 0, offsetX: 0, offsetY: 0, aspect: "original" });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!active) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    updatePending(active.id, { cropScale: Math.min(2.5, Math.max(0.55, active.cropScale + delta)) });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()].slice(0, 2);
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      pinchRef.current = {
        id: active.id,
        distance: Math.max(1, Math.hypot(dx, dy)),
        angle: Math.atan2(dy, dx),
        scale: active.cropScale,
        rotate: active.rotate,
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = {
      id: active.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: active.offsetX,
      originY: active.offsetY,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pinch = pinchRef.current;
    if (pinch && active && pinch.id === active.id && pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()].slice(0, 2);
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      updatePending(active.id, {
        cropScale: Math.min(2.5, Math.max(0.55, pinch.scale * (distance / pinch.distance))),
        rotate: pinch.rotate + ((angle - pinch.angle) * 180) / Math.PI,
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || !active || drag.id !== active.id) return;
    updatePending(active.id, {
      offsetX: drag.originX + event.clientX - drag.startX,
      offsetY: drag.originY + event.clientY - drag.startY,
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const insertAll = async (setFirstAsCover = false) => {
    if (!pending.length) return;
    setIsProcessing(true);
    setMessage("正在处理并上传图片...");
    try {
      const blocks: NoteContentBlock[] = [];
      let coverSrc = "";
      let before = 0;
      let after = 0;

      for (const item of pending) {
        const result = await renderEditedImage(item);
        before += item.beforeBytes;
        after += result.blob.size;
        let src = result.dataUrl;
        try {
          const file = new File([result.blob], `${item.id}.webp`, { type: "image/webp" });
          src = await uploadNoteImage(file, "article");
        } catch {
          // Keep a local preview if cloud upload is temporarily unavailable.
        }
        if (!coverSrc) coverSrc = src;
        blocks.push({
          id: createBlockId("image"),
          type: "image",
          src,
          caption: item.caption,
          align: item.align,
          zoom: item.zoom,
        });
      }

      if (setFirstAsCover && coverSrc) onSetCover?.(coverSrc);
      onInsert(blocks, `已插入 ${pending.length} 张图片：${formatKb(before)} -> ${formatKb(after)}`);
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
    onInsert([{ id: createBlockId("image"), type: "image", src, caption: "", align: "center", zoom: 100 }], "已插入图片 URL");
    setUrl("");
    onClose?.();
  };

  return (
    <div className={`image-upload-panel${compact ? " image-upload-panel-compact" : ""}`}>
      <div className="image-upload-head">
        <div>
          <strong>添加正文图片</strong>
          <span>选择照片后先裁剪、缩放、旋转和填写说明，再插入正文。</span>
        </div>
        {onClose ? <button type="button" onClick={onClose}>关闭</button> : null}
      </div>

      <div className="image-upload-actions">
        <label>
          <span>选择图片</span>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={(event) => upload(event.target.files)} />
        </label>
        <label>
          <span>图片 URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
        </label>
        <button type="button" onClick={insertUrl}>插入 URL</button>
      </div>

      {message ? <p className="image-upload-message">{message}</p> : null}

      {active ? (
        <div className="image-crop-panel">
          <div className="image-crop-top">
            <div>
              <strong>裁剪照片</strong>
              <span>
                {active.fileName} / 原始 {formatKb(active.beforeBytes)} / {active.originalWidth}x{active.originalHeight}
              </span>
            </div>
            <span>{activeIndex + 1} / {pending.length}</span>
          </div>

          <div
            className={`image-crop-stage aspect-${active.aspect.replace(":", "-")}`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={resetActive}
          >
            <img
              src={active.sourceDataUrl}
              alt="裁剪预览"
              style={{
                transform: `translate3d(${active.offsetX}px, ${active.offsetY}px, 0) rotate(${active.rotate}deg) scale(${active.cropScale})`,
              }}
              draggable={false}
            />
          </div>

          <div className="image-crop-controls">
            <label>
              <span>裁剪比例</span>
              <select value={active.aspect} onChange={(event) => updatePending(active.id, { aspect: event.target.value as AspectMode })}>
                {Object.entries(aspectLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>缩放</span>
              <input
                type="range"
                min="0.55"
                max="2.5"
                step="0.01"
                value={active.cropScale}
                onChange={(event) => updatePending(active.id, { cropScale: Number(event.target.value) })}
              />
            </label>
            <button type="button" onClick={() => updatePending(active.id, { rotate: active.rotate - 90 })}>左转</button>
            <button type="button" onClick={() => updatePending(active.id, { rotate: active.rotate + 90 })}>右转</button>
            <button type="button" onClick={resetActive}>重置</button>
          </div>

          <div className="image-crop-meta">
            <input value={active.caption} onChange={(event) => updatePending(active.id, { caption: event.target.value })} placeholder="图片说明 caption" />
            <div>
              <button type="button" className={active.align === "center" ? "is-active" : ""} onClick={() => updatePending(active.id, { align: "center" })}>居中</button>
              <button type="button" className={active.align === "full" ? "is-active" : ""} onClick={() => updatePending(active.id, { align: "full" })}>通栏</button>
              <button type="button" className={active.zoom === 100 ? "is-active" : ""} onClick={() => updatePending(active.id, { zoom: 100 })}>100%</button>
              <button type="button" className={active.zoom === 80 ? "is-active" : ""} onClick={() => updatePending(active.id, { zoom: 80 })}>80%</button>
              <button type="button" className={active.zoom === 60 ? "is-active" : ""} onClick={() => updatePending(active.id, { zoom: 60 })}>60%</button>
            </div>
          </div>

          <div className="image-crop-strip">
            {pending.map((item, index) => (
              <button
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                key={item.id}
                onClick={() => setActiveIndex(index)}
              >
                <img src={item.sourceDataUrl} alt={`待处理图片 ${index + 1}`} />
              </button>
            ))}
          </div>

          <div className="image-confirm-actions">
            <button type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>上一张</button>
            <button type="button" disabled={activeIndex >= pending.length - 1} onClick={() => setActiveIndex((index) => Math.min(pending.length - 1, index + 1))}>下一张</button>
            <button type="button" onClick={() => movePending(activeIndex, -1)}>上移</button>
            <button type="button" onClick={() => movePending(activeIndex, 1)}>下移</button>
            <button type="button" onClick={() => setPending((items) => items.filter((image) => image.id !== active.id))}>移除</button>
            <button type="button" onClick={() => insertAll(false)} disabled={isProcessing}>全部插入正文</button>
            <button type="button" onClick={() => insertAll(true)} disabled={isProcessing}>设为封面并插入</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
