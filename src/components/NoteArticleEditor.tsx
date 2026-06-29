import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { CoverImagePicker } from "./CoverImagePicker";
import { EditableImageBlock } from "./EditableImageBlock";
import { ImageUploadPanel } from "./ImageUploadPanel";
import { compressImage } from "../lib/imageTools";
import type { DuomeiNote, NoteContentBlock } from "../lib/noteTypes";
import { bodyToBlocks, createBlockId } from "../lib/noteStore";

export function NoteArticleEditor({
  note,
  onSave,
  onDelete,
}: {
  note: DuomeiNote;
  onSave: (note: DuomeiNote) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<DuomeiNote>(() => ({
    ...note,
    contentBlocks: note.contentBlocks?.length ? note.contentBlocks : bodyToBlocks(note.body, note.bodyImages),
  }));
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft({ ...note, contentBlocks: note.contentBlocks?.length ? note.contentBlocks : bodyToBlocks(note.body, note.bodyImages) });
  }, [note]);

  const updateBlock = (index: number, block: NoteContentBlock) => {
    const blocks = [...draft.contentBlocks];
    blocks[index] = block;
    setDraft({ ...draft, contentBlocks: blocks });
  };

  const removeBlock = (index: number) => {
    setDraft({ ...draft, contentBlocks: draft.contentBlocks.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.contentBlocks.length) return;
    const blocks = [...draft.contentBlocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    setDraft({ ...draft, contentBlocks: blocks });
  };

  const insertBlocks = (blocks: NoteContentBlock[], nextMessage?: string) => {
    setDraft({ ...draft, contentBlocks: [...draft.contentBlocks, ...blocks] });
    if (nextMessage) setMessage(nextMessage);
  };

  const insertImageFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const results = await Promise.all(imageFiles.map((file) => compressImage(file, "article")));
    insertBlocks(
      results.map((result) => ({
        id: createBlockId("image"),
        type: "image",
        src: result.dataUrl,
        align: "center",
        zoom: 100,
      })),
      `已插入 ${results.length} 张图片`,
    );
  };

  const save = () => {
    const body = draft.contentBlocks
      .filter((block) => block.type === "paragraph" || block.type === "quote")
      .map((block) => ("text" in block ? block.text : ""))
      .join("\n");
    const bodyImages = draft.contentBlocks.filter((block) => block.type === "image").map((block) => block.src);
    onSave({ ...draft, body, bodyImages, updatedAt: new Date().toISOString() });
    setMessage("已保存");
  };

  return (
    <div className="note-article-editor">
      <div className="article-editor-toolbar">
        <button type="button" onClick={save}>保存</button>
        <button type="button" onClick={() => setDraft({ ...draft, status: draft.status === "published" ? "draft" : "published" })}>
          {draft.status === "published" ? "设为草稿" : "发布"}
        </button>
        <button type="button" onClick={() => setPreview((value) => !value)}>{preview ? "继续编辑" : "预览"}</button>
        <button type="button" onClick={() => setDraft({ ...draft, contentBlocks: [...draft.contentBlocks, { id: createBlockId("paragraph"), type: "paragraph", text: "" }] })}>
          插入段落
        </button>
        <button type="button" onClick={() => setDraft({ ...draft, contentBlocks: [...draft.contentBlocks, { id: createBlockId("quote"), type: "quote", text: "" }] })}>
          插入引用
        </button>
        <button type="button" onClick={() => setDraft({ ...draft, contentBlocks: [...draft.contentBlocks, { id: createBlockId("divider"), type: "divider" }] })}>
          分割线
        </button>
        <button type="button" onClick={onDelete}>删除</button>
        <a href="/">返回首页</a>
      </div>

      <div className="article-editor-meta">
        <label>标题<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>日期<input value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        <label>地点<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
        <label>分类<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
        <label>标签<input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
        <label>摘要<textarea value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} /></label>
        <CoverImagePicker value={draft.coverImageUrl} onChange={(coverImageUrl, nextMessage) => { setDraft({ ...draft, coverImageUrl }); if (nextMessage) setMessage(nextMessage); }} />
        <ImageUploadPanel onInsert={insertBlocks} onSetCover={(coverImageUrl) => setDraft({ ...draft, coverImageUrl })} />
      </div>

      {message ? <p className="editor-message">{message}</p> : null}

      {!preview ? (
        <div
          className="article-block-editor"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void insertImageFiles(Array.from(event.dataTransfer.files));
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files);
            if (files.some((file) => file.type.startsWith("image/"))) {
              event.preventDefault();
              void insertImageFiles(files);
            }
          }}
        >
          {draft.contentBlocks.map((block, index) => {
            if (block.type === "image") {
              return (
                <EditableImageBlock
                  key={block.id}
                  block={block}
                  onChange={(next) => updateBlock(index, next)}
                  onDelete={() => removeBlock(index)}
                  onMove={(direction) => moveBlock(index, direction)}
                  onSetCover={() => setDraft({ ...draft, coverImageUrl: block.src })}
                />
              );
            }
            if (block.type === "divider") {
              return (
                <div className="editable-divider" key={block.id}>
                  <hr />
                  <button type="button" onClick={() => removeBlock(index)}>删除分割线</button>
                </div>
              );
            }
            return (
              <textarea
                className={block.type === "quote" ? "editable-quote" : "editable-paragraph"}
                key={block.id}
                value={block.text}
                placeholder={block.type === "quote" ? "引用文字" : "写下这一段小记..."}
                onChange={(event) => updateBlock(index, { ...block, text: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const blocks = [...draft.contentBlocks];
                    blocks.splice(index + 1, 0, { id: createBlockId("paragraph"), type: "paragraph", text: "" });
                    setDraft({ ...draft, contentBlocks: blocks });
                  }
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="article-preview">
          {draft.contentBlocks.map((block) => {
            if (block.type === "paragraph") return <p key={block.id}>{block.text}</p>;
            if (block.type === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
            if (block.type === "divider") return <hr key={block.id} />;
            return (
              <figure className={`article-image align-${block.align ?? "center"}`} key={block.id} style={{ "--zoom": `${block.zoom ?? 100}%` } as CSSProperties}>
                <img src={block.src} alt={block.alt || block.caption || "正文图片"} />
                {block.caption ? <figcaption>{block.caption}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
