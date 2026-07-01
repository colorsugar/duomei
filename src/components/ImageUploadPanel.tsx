import { useRef, useState } from "react";
import { compressImage, transformImageDataUrl } from "../lib/imageTools";
import type { CompressedImage } from "../lib/imageTools";
import { createBlockId } from "../lib/noteStore";
import { uploadNoteImage } from "../lib/supabaseNotes";
import type { NoteContentBlock } from "../lib/noteTypes";

type PendingImage = CompressedImage & {
  id: string;
  caption: string;
  rawDataUrl: string;
  align: "center" | "full";
  zoom: 60 | 80 | 100;
  cropZoom: number;
  rotation: number;
  aspect: "original" | "16:10" | "4:3" | "1:1";
  sourceFile?: File;
};

type ImageUploadPanelProps = {
  onInsert: (blocks: NoteContentBlock[], message?: string) => void;
  onSetCover?: (src: string) => void;
  compact?: boolean;
  onClose?: () => void;
};

function formatKb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export function ImageUploadPanel({ onInsert, onSetCover, compact = false, onClose }: ImageUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const touchRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ id: string; distance: number; angle: number; zoom: number; rotation: number } | null>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasWarnedStorage, setHasWarnedStorage] = useState(false);

  const warnStorageOnce = () => {
    if (hasWarnedStorage) return;
    setHasWarnedStorage(true);
    setMessage("图片会优先上传到 Supabase Storage；云端不可用时才会临时保存到本机草稿。");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    try {
      const results = await Promise.all(
        Array.from(files).map(async (file) => {
          const compressed = await compressImage(file, "article");
          return { ...compressed, sourceFile: file };
        }),
      );
      const images = results.map<PendingImage>((result) => ({
        ...result,
        id: createBlockId("pending-image"),
        rawDataUrl: result.dataUrl,
        caption: "",
        align: "center",
        zoom: 100,
        cropZoom: 100,
        rotation: 0,
        aspect: "original",
      }));
      setPending((items) => [...items, ...images]);
      warnStorageOnce();
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updatePending = (id: string, patch: Partial<PendingImage>) => {
    setPending((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const renderPending = async (item: PendingImage, patch: Partial<PendingImage>) => {
    const next = { ...item, ...patch };
    updatePending(item.id, next);
    const transformed = await transformImageDataUrl(next.rawDataUrl, {
      zoom: next.cropZoom,
      rotation: next.rotation,
      aspect: next.aspect,
      quality: 0.9,
    });
    updatePending(item.id, {
      ...next,
      dataUrl: transformed.dataUrl,
      afterBytes: transformed.afterBytes,
    });
  };

  const movePending = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pending.length) return;
    const next = [...pending];
    [next[index], next[target]] = [next[target], next[index]];
    setPending(next);
  };

  const getPinchDistance = () => {
    const points = Array.from(touchRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const getPinchAngle = () => {
    const points = Array.from(touchRef.current.values());
    if (points.length < 2) return 0;
    return (Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * 180) / Math.PI;
  };

  const updatePointer = (pointerId: number, x: number, y: number) => {
    touchRef.current.set(pointerId, { x, y });
  };

  const uploadFinalImage = async (item: PendingImage) => {
    try {
      const blob = await (await fetch(item.dataUrl)).blob();
      const file = new File([blob], `${item.id}.webp`, { type: blob.type || "image/webp" });
      return await uploadNoteImage(file, "article");
    } catch {
      return item.dataUrl;
    }
  };

  const toBlocks = async (items: PendingImage[]) => {
    const urls = await Promise.all(items.map(uploadFinalImage));
    return items.map<NoteContentBlock>((item, index) => ({
      id: createBlockId("image"),
      type: "image",
      src: urls[index],
      caption: item.caption,
      align: item.align,
      zoom: item.zoom,
    }));
  };

  const insertAll = async (setFirstAsCover = false) => {
    if (!pending.length) return;
    setIsProcessing(true);
    const blocks = await toBlocks(pending);
    if (setFirstAsCover) onSetCover?.(blocks[0]?.type === "image" ? blocks[0].src : pending[0].dataUrl);
    const before = pending.reduce((sum, item) => sum + item.beforeBytes, 0);
    const after = pending.reduce((sum, item) => sum + item.afterBytes, 0);
    onInsert(blocks, `已插入 ${pending.length} 张图片：${formatKb(before)} -> ${formatKb(after)}`);
    setPending([]);
    setIsProcessing(false);
    onClose?.();
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
          <span>选择后先确认、排序、填写说明，再插入正文。</span>
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

      {isProcessing ? <p className="image-upload-message">图片处理中...</p> : null}
      {message ? <p className="image-upload-message">{message}</p> : null}

      {pending.length ? (
        <div className="image-confirm-panel">
          <div className="image-confirm-head">
            <strong>确认图片</strong>
            <span>插入位置：正文末尾</span>
          </div>
          {pending.map((item, index) => (
            <article className="pending-image-card" key={item.id}>
              <div
                className="pending-image-preview"
                onWheel={(event) => {
                  event.preventDefault();
                  const delta = event.deltaY < 0 ? 8 : -8;
                  void renderPending(item, { cropZoom: Math.max(60, Math.min(220, item.cropZoom + delta)) });
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  updatePointer(event.pointerId, event.clientX, event.clientY);
                  if (touchRef.current.size === 2) {
                    pinchRef.current = {
                      id: item.id,
                      distance: getPinchDistance(),
                      angle: getPinchAngle(),
                      zoom: item.cropZoom,
                      rotation: item.rotation,
                    };
                  }
                }}
                onPointerMove={(event) => {
                  if (!touchRef.current.has(event.pointerId)) return;
                  updatePointer(event.pointerId, event.clientX, event.clientY);
                  const pinch = pinchRef.current;
                  const distance = getPinchDistance();
                  if (!pinch || pinch.id !== item.id || distance <= 0 || pinch.distance <= 0) return;
                  const nextZoom = Math.max(60, Math.min(220, Math.round(pinch.zoom * (distance / pinch.distance))));
                  const nextRotation = Math.round(pinch.rotation + getPinchAngle() - pinch.angle);
                  void renderPending(item, { cropZoom: nextZoom, rotation: nextRotation });
                }}
                onPointerUp={(event) => {
                  touchRef.current.delete(event.pointerId);
                  if (touchRef.current.size < 2) pinchRef.current = null;
                }}
                onPointerCancel={(event) => {
                  touchRef.current.delete(event.pointerId);
                  if (touchRef.current.size < 2) pinchRef.current = null;
                }}
              >
                <img src={item.dataUrl} alt={`待插入图片 ${index + 1}`} />
              </div>
              <div>
                <p>原始 {formatKb(item.beforeBytes)} / 压缩后 {formatKb(item.afterBytes)}</p>
                <input
                  value={item.caption}
                  onChange={(event) => updatePending(item.id, { caption: event.target.value })}
                  placeholder="图片说明 caption"
                />
                <div className="pending-image-options">
                  <button type="button" onClick={() => renderPending(item, { cropZoom: Math.max(60, item.cropZoom - 10) })}>缩小</button>
                  <button type="button" onClick={() => renderPending(item, { cropZoom: Math.min(220, item.cropZoom + 10) })}>放大</button>
                  <button type="button" onClick={() => renderPending(item, { rotation: item.rotation - 90 })}>左转</button>
                  <button type="button" onClick={() => renderPending(item, { rotation: item.rotation + 90 })}>右转</button>
                  <button type="button" className={item.aspect === "original" ? "is-active" : ""} onClick={() => renderPending(item, { aspect: "original" })}>原始比例</button>
                  <button type="button" className={item.aspect === "16:10" ? "is-active" : ""} onClick={() => renderPending(item, { aspect: "16:10" })}>16:10</button>
                  <button type="button" className={item.aspect === "4:3" ? "is-active" : ""} onClick={() => renderPending(item, { aspect: "4:3" })}>4:3</button>
                  <button type="button" className={item.align === "center" ? "is-active" : ""} onClick={() => updatePending(item.id, { align: "center" })}>居中</button>
                  <button type="button" className={item.align === "full" ? "is-active" : ""} onClick={() => updatePending(item.id, { align: "full" })}>通栏</button>
                  <button type="button" className={item.zoom === 100 ? "is-active" : ""} onClick={() => updatePending(item.id, { zoom: 100 })}>100%</button>
                  <button type="button" className={item.zoom === 80 ? "is-active" : ""} onClick={() => updatePending(item.id, { zoom: 80 })}>80%</button>
                  <button type="button" className={item.zoom === 60 ? "is-active" : ""} onClick={() => updatePending(item.id, { zoom: 60 })}>60%</button>
                  <button type="button" onClick={() => movePending(index, -1)}>上移</button>
                  <button type="button" onClick={() => movePending(index, 1)}>下移</button>
                  <button type="button" onClick={() => setPending((items) => items.filter((image) => image.id !== item.id))}>移除</button>
                </div>
              </div>
            </article>
          ))}
          <div className="image-confirm-actions">
            <button type="button" onClick={() => insertAll(false)}>全部插入正文</button>
            <button type="button" onClick={() => insertAll(true)}>设为封面并插入</button>
            <button type="button" onClick={() => setPending([])}>取消</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
