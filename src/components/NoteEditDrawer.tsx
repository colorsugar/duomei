import { FormEvent, WheelEvent, useEffect, useState } from "react";
import type { DuomeiNote } from "../lib/noteTypes";
import { defaultCovers } from "../lib/defaultCovers";
import { compressImageFile } from "../lib/imageTools";
import { uploadNoteImage } from "../lib/supabaseNotes";

export function NoteEditDrawer({
  note,
  onClose,
  onSave,
}: {
  note: DuomeiNote | null;
  onClose: () => void;
  onSave: (note: DuomeiNote) => void;
}) {
  const [draft, setDraft] = useState<DuomeiNote | null>(note);
  const [aiMessage, setAiMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(note);
    setAiMessage("");
    document.body.classList.toggle("drawer-open", !!note);
    return () => document.body.classList.remove("drawer-open");
  }, [note]);

  if (!draft) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  const handleDrawerWheel = (event: WheelEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const isTextarea = target?.tagName === "TEXTAREA";
    if (isTextarea && target && target.scrollHeight > target.clientHeight) {
      const atTop = target.scrollTop <= 0;
      const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
      if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
        event.stopPropagation();
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.scrollTop += event.deltaY;
  };

  const uploadCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    try {
      const url = await uploadNoteImage(file, "covers");
      setDraft({ ...draft, coverImageUrl: url });
    } catch {
      const dataUrl = await compressImageFile(file, 1600, 0.84);
      setDraft({ ...draft, coverImageUrl: dataUrl });
    }
    setUploading(false);
  };

  const uploadBodyImages = async (files: FileList | null) => {
    if (!files || !draft) return;
    setUploading(true);
    const images = await Promise.all(
      Array.from(files).map(async (file) => {
        try {
          return await uploadNoteImage(file, "article");
        } catch {
          return compressImageFile(file, 1800, 0.88);
        }
      }),
    );
    setDraft({ ...draft, bodyImages: [...(draft.bodyImages ?? []), ...images] });
    setUploading(false);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const images = [...(draft.bodyImages ?? [])];
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    setDraft({ ...draft, bodyImages: images });
  };

  return (
    <div className="note-drawer-layer" onWheel={(event) => event.preventDefault()}>
      <button
        className="note-drawer-backdrop"
        type="button"
        onClick={onClose}
        aria-label="关闭编辑器"
        onWheel={(event) => event.preventDefault()}
      />
      <aside className="note-edit-drawer" onWheelCapture={handleDrawerWheel}>
        <div className="note-drawer-head">
          <div>
            <p>小记编辑</p>
            <h2>{draft.title || "新增小记"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            标题
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label>
            Slug
            <input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
          </label>
          <label>
            日期
            <input value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </label>
          <label>
            地点
            <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
          </label>
          <label>
            分类
            <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          </label>
          <label>
            标签
            <input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",") })} />
          </label>
          <label>
            摘要
            <textarea value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} />
          </label>
          <label>
            正文
            <textarea rows={7} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </label>
          <label>
            封面图地址
            <input value={draft.coverImageUrl} onChange={(event) => setDraft({ ...draft, coverImageUrl: event.target.value })} />
          </label>
          <div className="system-cover-picker" aria-label="系统默认封面">
            <div>
              <strong>系统默认封面</strong>
              <span>选择一张，或留空让小记自动随机显示。</span>
            </div>
            <div className="system-cover-grid">
              {defaultCovers.map((cover) => (
                <button
                  className={draft.coverImageUrl === cover.src ? "is-selected" : ""}
                  type="button"
                  key={cover.id}
                  onClick={() => setDraft({ ...draft, coverImageUrl: cover.src })}
                  aria-label={`选择${cover.label}`}
                >
                  <img src={cover.src} alt="" loading="lazy" />
                  <span>{cover.label}</span>
                </button>
              ))}
            </div>
            {draft.coverImageUrl ? (
              <button className="system-cover-clear" type="button" onClick={() => setDraft({ ...draft, coverImageUrl: "" })}>
                使用随机默认封面
              </button>
            ) : null}
          </div>
          <label>
            上传封面图
            <input type="file" accept="image/*" onChange={(event) => uploadCover(event.target.files)} />
          </label>
          <label>
            正文图片
            <input type="file" accept="image/*" multiple onChange={(event) => uploadBodyImages(event.target.files)} />
          </label>
          {(draft.bodyImages ?? []).length ? (
            <div className="body-image-manager">
              {(draft.bodyImages ?? []).map((image, index) => (
                <figure key={`${image.slice(0, 24)}-${index}`}>
                  <img src={image} alt={`正文图片 ${index + 1}`} />
                  <figcaption>
                    <button type="button" onClick={() => moveImage(index, -1)}>上移</button>
                    <button type="button" onClick={() => moveImage(index, 1)}>下移</button>
                    <button type="button" onClick={() => setDraft({ ...draft, bodyImages: draft.bodyImages.filter((_, itemIndex) => itemIndex !== index) })}>删除</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          <label>
            AI 封面提示词
            <textarea value={draft.stylePrompt} onChange={(event) => setDraft({ ...draft, stylePrompt: event.target.value })} />
          </label>
          <button
            className="ai-cover-button"
            type="button"
            onClick={() => setAiMessage("已预留 AI 生成封面接口，后续可接 OpenAI Images API。")}
          >
            生成封面（暂未接入）
          </button>
          {aiMessage ? <p className="ai-cover-message">{aiMessage}</p> : null}
          {uploading ? <p className="ai-cover-message">图片处理中...</p> : null}
          <label>
            状态
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as DuomeiNote["status"] })}>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </label>
          <div className="note-drawer-actions">
            <button type="submit">保存</button>
            <button type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
