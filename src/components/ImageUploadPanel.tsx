import { useState } from "react";
import { compressImage } from "../lib/imageTools";
import type { CompressedImage } from "../lib/imageTools";
import type { NoteContentBlock } from "../lib/noteTypes";
import { createBlockId } from "../lib/noteStore";

type PendingImage = CompressedImage & {
  id: string;
  caption: string;
  align: "center" | "full";
  zoom: 60 | 80 | 100;
};

export function ImageUploadPanel({
  onInsert,
  onSetCover,
}: {
  onInsert: (blocks: NoteContentBlock[], message?: string) => void;
  onSetCover?: (src: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [message, setMessage] = useState("");
  const [hasWarnedStorage, setHasWarnedStorage] = useState(false);

  const warnStorageOnce = () => {
    if (hasWarnedStorage) return;
    setHasWarnedStorage(true);
    setMessage("当前版本使用浏览器本地存储，图片过多可能导致保存失败。建议重要内容发布前备份小记到文件。");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const results = await Promise.all(Array.from(files).map((file) => compressImage(file, "article")));
    const images = results.map<PendingImage>((result) => ({
      ...result,
      id: createBlockId("pending-image"),
      caption: "",
      align: "center",
      zoom: 100,
    }));
    setPending((items) => [...items, ...images]);
    warnStorageOnce();
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
    onInsert(toBlocks(pending), `已插入 ${pending.length} 张图片：${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
    setPending([]);
  };

  const insertUrl = () => {
    const src = url.trim();
    if (!src) return;
    onInsert([{ id: createBlockId("image"), type: "image", src, align: "center", zoom: 100 }]);
    setUrl("");
  };

  return (
    <div className="image-upload-panel">
      <label>
        批量上传图片
        <input type="file" accept="image/*" multiple onChange={(event) => upload(event.target.files)} />
      </label>
      <label>
        图片 URL
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
      </label>
      <button type="button" onClick={insertUrl}>插入图片 URL</button>
      {message ? <p>{message}</p> : null}

      {pending.length ? (
        <div className="image-confirm-panel">
          <div className="image-confirm-head">
            <strong>确认正文图片</strong>
            <span>插入位置：正文末尾</span>
          </div>
          {pending.map((item, index) => (
            <article className="pending-image-card" key={item.id}>
              <img src={item.dataUrl} alt={`待插入图片 ${index + 1}`} />
              <div>
                <p>原始 {Math.round(item.beforeBytes / 1024)}KB / 压缩后 {Math.round(item.afterBytes / 1024)}KB</p>
                <input value={item.caption} onChange={(event) => updatePending(item.id, { caption: event.target.value })} placeholder="图片说明 caption" />
                <div className="pending-image-options">
                  <button type="button" onClick={() => updatePending(item.id, { align: "center" })}>居中</button>
                  <button type="button" onClick={() => updatePending(item.id, { align: "full" })}>通栏</button>
                  <button type="button" onClick={() => updatePending(item.id, { zoom: 100 })}>100%</button>
                  <button type="button" onClick={() => updatePending(item.id, { zoom: 80 })}>80%</button>
                  <button type="button" onClick={() => updatePending(item.id, { zoom: 60 })}>60%</button>
                  <button type="button" onClick={() => movePending(index, -1)}>上移</button>
                  <button type="button" onClick={() => movePending(index, 1)}>下移</button>
                  <button type="button" onClick={() => setPending((items) => items.filter((image) => image.id !== item.id))}>删除</button>
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
