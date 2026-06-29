import { ChangeEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ImageUploadPanel } from "../components/ImageUploadPanel";
import { NoteBlockRenderer } from "../components/NoteBlockRenderer";
import { NoteCover } from "../components/NoteCover";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import { bodyToBlocks, createBlockId, deleteNote, getNoteBySlug, upsertNote } from "../lib/noteStore";
import { compressImage } from "../lib/imageTools";
import type { DuomeiNote, NoteContentBlock } from "../lib/noteTypes";

function blocksToBody(blocks: NoteContentBlock[]) {
  return blocks
    .filter((block) => block.type === "paragraph" || block.type === "quote")
    .map((block) => ("text" in block ? block.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

function blocksToImages(blocks: NoteContentBlock[]) {
  return blocks.filter((block): block is Extract<NoteContentBlock, { type: "image" }> => block.type === "image").map((block) => block.src);
}

export function DuomeiNoteDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { editMode, isLoggedIn, refreshKey } = useDuomeiEdit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const note = getNoteBySlug(slug, isLoggedIn);
  const shouldEdit = isLoggedIn && (editMode || searchParams.get("edit") === "1");
  const [draft, setDraft] = useState<DuomeiNote | undefined>(note);
  void refreshKey;

  useEffect(() => {
    if (note) setDraft(note);
  }, [note?.id]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3600);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!note) {
    return (
      <main className="duomei-detail">
        <h1>没有找到这条小记</h1>
        <Link to="/">回到首页</Link>
      </main>
    );
  }

  const activeNote = shouldEdit && draft ? draft : note;
  const blocks = activeNote.contentBlocks?.length
    ? activeNote.contentBlocks
    : bodyToBlocks(activeNote.body, activeNote.bodyImages);

  const updateDraft = (patch: Partial<DuomeiNote>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateBlock = (id: string, patch: Partial<NoteContentBlock>) => {
    updateDraft({
      contentBlocks: blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as NoteContentBlock) : block)),
    });
  };

  const insertBlock = (block: NoteContentBlock) => {
    updateDraft({ contentBlocks: [...blocks, block] });
  };

  const insertBlocks = (nextBlocks: NoteContentBlock[], nextMessage?: string) => {
    updateDraft({ contentBlocks: [...blocks, ...nextBlocks] });
    if (nextMessage) setMessage(nextMessage);
  };

  const removeBlock = (id: string) => {
    const nextBlocks = blocks.filter((block) => block.id !== id);
    updateDraft({
      contentBlocks: nextBlocks.length
        ? nextBlocks
        : [{ id: createBlockId("paragraph"), type: "paragraph", text: "" }],
    });
  };

  const persistNote = (status?: DuomeiNote["status"]) => {
    if (!draft) return;
    const nextBlocks = draft.contentBlocks?.length ? draft.contentBlocks : bodyToBlocks(draft.body, draft.bodyImages);
    const nextNote: DuomeiNote = {
      ...draft,
      status: status ?? draft.status,
      body: blocksToBody(nextBlocks),
      bodyImages: blocksToImages(nextBlocks),
      updatedAt: new Date().toISOString(),
    };
    upsertNote(nextNote);
    setDraft(nextNote);
    setMessage(status === "published" ? "已发布。线上同步仍需要后台生成发布数据并提交到 GitHub。" : "已保存修改。");
  };

  const setDraftStatus = (status: DuomeiNote["status"]) => {
    const target = draft ?? note;
    const nextNote: DuomeiNote = {
      ...target,
      status,
      updatedAt: new Date().toISOString(),
    };
    upsertNote(nextNote);
    setDraft(nextNote);
    setMessage(status === "published" ? "已发布到当前浏览器。" : "已转为草稿。");
  };

  const deleteCurrent = () => {
    deleteNote(note.id);
    navigate("/");
  };

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await compressImage(file, "cover");
    updateDraft({ coverImageUrl: result.dataUrl });
    setMessage(`封面已更新：${Math.round(result.beforeBytes / 1024)}KB -> ${Math.round(result.afterBytes / 1024)}KB`);
  };

  const updateTag = (index: number, value: string) => {
    updateDraft({ tags: activeNote.tags.map((tag, itemIndex) => (itemIndex === index ? value : tag)) });
  };

  const removeTag = (index: number) => {
    updateDraft({ tags: activeNote.tags.filter((_, itemIndex) => itemIndex !== index) });
  };

  const addTag = () => {
    updateDraft({ tags: [...activeNote.tags, "新标签"] });
  };

  const isPublished = activeNote.status === "published";

  return (
    <main className={`duomei-detail${shouldEdit ? " detail-edit-page inline-detail-editing" : ""}`}>
      <Link className="detail-back" to="/#notes">
        ← 返回小记
      </Link>

      {isLoggedIn && editMode && !shouldEdit ? (
        <div className="detail-edit-actions">
          <button type="button" onClick={() => setSearchParams({ edit: "1" })}>
            编辑这篇小记
          </button>
          {note.status === "draft" ? (
            <button className="detail-publish-button" type="button" onClick={() => setDraftStatus("published")}>
              发布
            </button>
          ) : (
            <button className="detail-status-button" type="button" onClick={() => setDraftStatus("draft")}>
              转为草稿
            </button>
          )}
          <button className="detail-danger-button" type="button" onClick={() => setConfirmDelete(true)}>
            删除这篇小记
          </button>
        </div>
      ) : null}

      {shouldEdit ? (
        <>
          <div className="detail-inline-toolbar" role="toolbar" aria-label="小记编辑工具栏">
            <button type="button" onClick={() => persistNote()}>保存修改</button>
            {isPublished ? (
              <button type="button" className="is-muted" disabled>已发布</button>
            ) : (
              <button type="button" className="is-primary" onClick={() => persistNote("published")}>发布</button>
            )}
            {isPublished ? <button type="button" onClick={() => persistNote("draft")}>转为草稿</button> : null}
            <button type="button" onClick={() => setSearchParams({})}>预览</button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("paragraph"), type: "paragraph", text: "" })}>
              插入段落
            </button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("quote"), type: "quote", text: "" })}>
              插入引用
            </button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("divider"), type: "divider" })}>
              分割线
            </button>
            <label className="detail-toolbar-upload">
              添加封面
              <input type="file" accept="image/*" onChange={uploadCover} />
            </label>
            <button type="button" onClick={() => setImagePanelOpen((value) => !value)}>添加图片</button>
            <button className="detail-danger-button" type="button" onClick={() => setConfirmDelete(true)}>删除</button>
            <button type="button" onClick={() => navigate("/")}>返回首页</button>
          </div>
          {imagePanelOpen ? (
            <div className="detail-image-panel">
              <ImageUploadPanel
                compact
                onInsert={insertBlocks}
                onSetCover={(coverImageUrl) => updateDraft({ coverImageUrl })}
                onClose={() => setImagePanelOpen(false)}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {message ? (
        <div className="detail-save-message">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")}>关闭</button>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="detail-delete-confirm">
          <span>确定删除这条小记吗？</span>
          <button type="button" onClick={deleteCurrent}>确认删除</button>
          <button type="button" onClick={() => setConfirmDelete(false)}>取消</button>
        </div>
      ) : null}

      <article>
        <div className="detail-cover-wrap">
          <NoteCover note={activeNote} detail />
        </div>
        {shouldEdit ? (
          <>
            <input
              className="detail-category detail-inline-input category-input"
              value={activeNote.category}
              onChange={(event) => updateDraft({ category: event.target.value })}
              aria-label="分类"
            />
            <textarea
              className="detail-title-editor"
              value={activeNote.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              aria-label="标题"
            />
            <div className="detail-meta editable-meta">
              <input value={activeNote.date} onChange={(event) => updateDraft({ date: event.target.value })} aria-label="日期" />
              <input value={activeNote.location} onChange={(event) => updateDraft({ location: event.target.value })} aria-label="地点" />
            </div>
            <div className="detail-tags editable-tags">
              {activeNote.tags.map((tag, index) => (
                <span className="editable-tag" key={`${tag}-${index}`}>
                  <input value={tag} onChange={(event) => updateTag(index, event.target.value)} aria-label={`标签 ${index + 1}`} />
                  <button type="button" onClick={() => removeTag(index)} aria-label="删除标签">×</button>
                </span>
              ))}
              <button className="tag-add-button" type="button" onClick={addTag}>+</button>
            </div>
            <textarea
              className="detail-excerpt-editor"
              value={activeNote.excerpt}
              onChange={(event) => updateDraft({ excerpt: event.target.value })}
              placeholder="摘要"
              aria-label="摘要"
            />
            <div className="inline-block-editor">
              {blocks.map((block) => {
                if (block.type === "divider") {
                  return (
                    <div className="editable-block-row" key={block.id}>
                      <hr />
                      <button type="button" onClick={() => removeBlock(block.id)}>删除</button>
                    </div>
                  );
                }
                if (block.type === "image") {
                  return (
                    <figure className="editable-image-block" key={block.id}>
                      <img src={block.src} alt={block.caption || "小记图片"} />
                      <input
                        value={block.caption ?? ""}
                        onChange={(event) => updateBlock(block.id, { caption: event.target.value })}
                        placeholder="图片说明"
                      />
                      <div className="image-block-tools">
                        <button type="button" onClick={() => updateDraft({ coverImageUrl: block.src })}>设为封面</button>
                        <button type="button" onClick={() => updateBlock(block.id, { align: "center" })}>居中</button>
                        <button type="button" onClick={() => updateBlock(block.id, { align: "full" })}>通栏</button>
                        <button type="button" onClick={() => updateBlock(block.id, { zoom: 100 })}>100%</button>
                        <button type="button" onClick={() => updateBlock(block.id, { zoom: 80 })}>80%</button>
                        <button type="button" onClick={() => updateBlock(block.id, { zoom: 60 })}>60%</button>
                        <button type="button" onClick={() => removeBlock(block.id)}>删除图片</button>
                      </div>
                    </figure>
                  );
                }
                return (
                  <div className={`editable-text-block ${block.type === "quote" ? "is-quote" : ""}`} key={block.id}>
                    <textarea
                      value={block.text}
                      onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                      placeholder={block.type === "quote" ? "引用文字" : "正文"}
                    />
                    <button type="button" onClick={() => removeBlock(block.id)}>删除</button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="detail-category">{note.category}</p>
            <h1>{note.title}</h1>
            <div className="detail-meta">
              <span>{note.date}</span>
              <span>{note.location}</span>
            </div>
            <div className="detail-tags">
              {note.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <NoteBlockRenderer blocks={blocks} />
          </>
        )}
      </article>
    </main>
  );
}
