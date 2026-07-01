import { useRef, useState } from "react";
import { compressImage } from "../lib/imageTools";
import type { CompressedImage } from "../lib/imageTools";
import { createBlockId } from "../lib/noteStore";
import { uploadNoteImage } from "../lib/supabaseNotes";
import type { NoteContentBlock } from "../lib/noteTypes";

type PendingImage = CompressedImage & {
  id: string;
  caption: string;
  align: "center" | "full";
  zoom: 60 | 80 | 100;
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
          try {
            const publicUrl = await uploadNoteImage(file, "article");
            return { ...compressed, dataUrl: publicUrl, afterBytes: file.size };
          } catch {
            return compressed;
          }
        }),
      );
      const images = results.map<PendingImage>((result) => ({
        ...result,
        id: createBlockId("pending-image"),
        caption: "",
        align: "center",
        zoom: 100,
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

  const movePending = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pending.length) return;
    const next = [...pending];
    [next[index], next[target]] = [next[target], next[index]];
    setPending(next);
  };

  const toBlocks = (items: PendingImage[]) =>
    items.map<NoteContentBlock>((item) => ({
      id: createBlockId("image"),
      type: "image",
      src: item.dataUrl,
      caption: item.caption,
      align: item.align,
      zoom: item.zoom,
    }));

  const insertAll = (setFirstAsCover = false) => {
    if (!pending.length) return;
    if (setFirstAsCover) onSetCover?.(pending[0].dataUrl);
    const before = pending.reduce((sum, item) => sum + item.beforeBytes, 0);
    const after = pending.reduce((sum, item) => sum + item.afterBytes, 0);
    onInsert(toBlocks(pending), `已插入 ${pending.length} 张图片：${formatKb(before)} -> ${formatKb(after)}`);
    setPending([]);
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
              <img src={item.dataUrl} alt={`待插入图片 ${index + 1}`} />
              <div>
                <p>原始 {formatKb(item.beforeBytes)} / 压缩后 {formatKb(item.afterBytes)}</p>
                <input
                  value={item.caption}
                  onChange={(event) => updatePending(item.id, { caption: event.target.value })}
                  placeholder="图片说明 caption"
                />
                <div className="pending-image-options">
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
