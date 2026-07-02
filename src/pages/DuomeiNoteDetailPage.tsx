import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CSSProperties, MouseEvent } from "react";
import { EditableImageBlock } from "../components/EditableImageBlock";
import { ImageUploadPanel } from "../components/ImageUploadPanel";
import { NoteBlockRenderer } from "../components/NoteBlockRenderer";
import { NoteCover } from "../components/NoteCover";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import { bodyToBlocks, createBlockId, deleteNote, getAllNotes, getNoteBySlug, getPublishedNotes, upsertNote } from "../lib/noteStore";
import {
  deleteCloudNote,
  fetchAllCloudNotes,
  fetchCloudNoteBySlug,
  fetchPublishedNotes,
  saveCloudNote,
  uploadNoteDataUrl,
} from "../lib/supabaseNotes";
import type { DuomeiNote, NoteContentBlock } from "../lib/noteTypes";
import { runSharedJourneyTransition, sharedJourneyNames } from "../motion";

type ImageBlock = Extract<NoteContentBlock, { type: "image" }>;
type SharedJourneyStyle = CSSProperties & { viewTransitionName?: string };
type SyncStep = "idle" | "draft" | "images" | "upload" | "database" | "done" | "error";

function blocksToBody(blocks: NoteContentBlock[]) {
  return blocks
    .filter((block) => block.type === "paragraph" || block.type === "quote")
    .map((block) => ("text" in block ? block.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

function blocksToImages(blocks: NoteContentBlock[]) {
  return blocks.filter((block): block is ImageBlock => block.type === "image").map((block) => block.src);
}

function ensureBlocks(note: DuomeiNote) {
  return note.contentBlocks?.length ? note.contentBlocks : bodyToBlocks(note.body, note.bodyImages);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

export function DuomeiNoteDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { editMode, isLoggedIn, refreshKey } = useDuomeiEdit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imagePanelMode, setImagePanelMode] = useState<"article" | "cover" | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [syncStep, setSyncStep] = useState<SyncStep>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [previewNote, setPreviewNote] = useState<DuomeiNote | undefined>();
  const [cloudNote, setCloudNote] = useState<DuomeiNote | undefined>();
  const [navigationNotes, setNavigationNotes] = useState<DuomeiNote[]>(() => (isLoggedIn ? getAllNotes() : getPublishedNotes()));
  const undoStackRef = useRef<DuomeiNote[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const storedNote = cloudNote ?? getNoteBySlug(slug, isLoggedIn);
  const isPreview = searchParams.get("preview") === "1" && !!previewNote;
  const note = previewNote ?? storedNote;
  const shouldEdit = isLoggedIn && !isPreview && (editMode || searchParams.get("edit") === "1");
  const [draft, setDraft] = useState<DuomeiNote | undefined>(note);
  void refreshKey;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!slug) return;
      try {
        const [nextNote, nextNavigation] = await Promise.all([
          fetchCloudNoteBySlug(slug, isLoggedIn),
          isLoggedIn ? fetchAllCloudNotes() : fetchPublishedNotes(),
        ]);
        if (!active) return;
        setCloudNote(nextNote);
        setNavigationNotes(nextNavigation);
      } catch {
        if (!active) return;
        setCloudNote(undefined);
        setNavigationNotes(isLoggedIn ? getAllNotes() : getPublishedNotes());
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug, isLoggedIn, refreshKey]);

  useEffect(() => {
    if (note) {
      setDraft(note);
      undoStackRef.current = [];
      setUndoCount(0);
    }
  }, [note?.id]);

  useEffect(() => {
    if (!message || isSaving) return;
    const timer = window.setTimeout(() => setMessage(""), syncStep === "error" ? 7000 : 4200);
    return () => window.clearTimeout(timer);
  }, [isSaving, message, syncStep]);

  useEffect(() => {
    if (!imagePanelMode) return;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalRootOverflow = root.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalRight = document.body.style.right;
    const originalWidth = document.body.style.width;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    root.classList.add("duomei-modal-open");
    document.body.classList.add("duomei-modal-open");
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const keepScrollInsidePanel = (event: WheelEvent | TouchEvent) => {
      const panel = document.querySelector(".detail-image-panel");
      if (!panel) return;
      if (panel.contains(event.target as Node)) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("wheel", keepScrollInsidePanel, { passive: false, capture: true });
    window.addEventListener("touchmove", keepScrollInsidePanel, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", keepScrollInsidePanel, { capture: true });
      window.removeEventListener("touchmove", keepScrollInsidePanel, { capture: true });
      root.classList.remove("duomei-modal-open");
      document.body.classList.remove("duomei-modal-open");
      root.style.overflow = originalRootOverflow;
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
      document.body.style.right = originalRight;
      document.body.style.width = originalWidth;
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    };
  }, [imagePanelMode]);

  const activeNote = shouldEdit && draft ? draft : note;
  const blocks = activeNote ? ensureBlocks(activeNote) : [];

  const updateDraft = (patch: Partial<DuomeiNote>) => {
    setDraft((current) => {
      if (!current) return current;
      undoStackRef.current = [...undoStackRef.current.slice(-39), current];
      setUndoCount(undoStackRef.current.length);
      return { ...current, ...patch };
    });
  };

  const undoDraft = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    setDraft(previous);
    setUndoCount(undoStackRef.current.length);
  };

  useEffect(() => {
    if (!shouldEdit) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
      event.preventDefault();
      undoDraft();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldEdit]);

  const updateBlock = (id: string, patch: Partial<NoteContentBlock>) => {
    updateDraft({
      contentBlocks: blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as NoteContentBlock) : block)),
    });
  };

  const replaceBlock = (nextBlock: NoteContentBlock) => {
    updateDraft({ contentBlocks: blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)) });
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex((block) => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const nextBlocks = [...blocks];
    const [item] = nextBlocks.splice(index, 1);
    nextBlocks.splice(target, 0, item);
    updateDraft({ contentBlocks: nextBlocks });
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
      contentBlocks: nextBlocks.length ? nextBlocks : [{ id: createBlockId("paragraph"), type: "paragraph", text: "" }],
    });
  };

  const setSyncMessage = (step: SyncStep, text: string) => {
    setSyncStep(step);
    setMessage(text);
  };

  const uploadEmbeddedImages = async (nextBlocks: NoteContentBlock[], onProgress?: (done: number, total: number) => void) => {
    const pendingImages = nextBlocks.filter((block): block is ImageBlock => block.type === "image" && block.src.startsWith("data:image/"));
    let uploadedCount = 0;
    const uploadedBlocks: NoteContentBlock[] = [];
    for (const block of nextBlocks) {
      if (block.type === "image" && block.src.startsWith("data:image/")) {
        const src = await withTimeout(uploadNoteDataUrl(block.src, "article"), 60000, "图片上传超时，请重新选择较小图片。");
        uploadedCount += 1;
        onProgress?.(uploadedCount, pendingImages.length);
        uploadedBlocks.push({ ...block, src });
      } else {
        uploadedBlocks.push(block);
      }
    }
    return uploadedBlocks;
  };

  const uploadCoverIfNeeded = async (coverImageUrl: string) => {
    if (!coverImageUrl?.startsWith("data:image/")) return coverImageUrl;
    return withTimeout(uploadNoteDataUrl(coverImageUrl, "covers"), 60000, "封面上传超时，请重新选择较小图片。");
  };

  const persistNote = async (status?: DuomeiNote["status"]) => {
    if (!draft || isSaving) return;
    setIsSaving(true);
    const sourceBlocks = draft.contentBlocks?.length ? draft.contentBlocks : bodyToBlocks(draft.body, draft.bodyImages);
    const targetStatus = status ?? draft.status;
    const localNote: DuomeiNote = {
      ...draft,
      status: targetStatus,
      contentBlocks: sourceBlocks,
      body: blocksToBody(sourceBlocks),
      bodyImages: blocksToImages(sourceBlocks),
      updatedAt: new Date().toISOString(),
    };
    try {
      setSyncMessage("draft", "本地草稿已保存。");
      upsertNote(localNote);
      setDraft(localNote);

      setSyncMessage("images", "正在准备图片...");
      const nextBlocks = await uploadEmbeddedImages(sourceBlocks, (done, total) => {
        setSyncMessage("upload", `正在上传图片 ${done}/${total}...`);
      });
      setSyncMessage("upload", "正在准备封面...");
      const coverImageUrl = await uploadCoverIfNeeded(localNote.coverImageUrl || "");
      const nextNote: DuomeiNote = {
        ...localNote,
        coverImageUrl,
        contentBlocks: nextBlocks,
        body: blocksToBody(nextBlocks),
        bodyImages: blocksToImages(nextBlocks),
        updatedAt: new Date().toISOString(),
      };
      upsertNote(nextNote);
      setDraft(nextNote);
      setSyncMessage("database", "正在同步数据库...");
      const saved = await withTimeout(saveCloudNote(nextNote), 45000, "数据库同步超时，请检查登录状态或网络。");
      upsertNote(saved);
      setCloudNote(saved);
      setDraft(saved);
      setPreviewNote(undefined);
      setSyncMessage(targetStatus === "published" ? "done" : "done", targetStatus === "published" ? "同步完成：已发布到线上。" : "同步完成：修改已保存到云端。");
    } catch (error) {
      const localNote: DuomeiNote = {
        ...draft,
        status: targetStatus,
        body: blocksToBody(sourceBlocks),
        bodyImages: blocksToImages(sourceBlocks),
        updatedAt: new Date().toISOString(),
      };
      upsertNote(localNote);
      setDraft(localNote);
      setSyncMessage("error", error instanceof Error ? `云端保存失败：${error.message}` : "云端保存失败，已先保存为本机草稿。");
    } finally {
      setIsSaving(false);
    }
  };

  const previewCurrentDraft = () => {
    if (!draft) return;
    const sourceBlocks = draft.contentBlocks?.length ? draft.contentBlocks : bodyToBlocks(draft.body, draft.bodyImages);
    const nextPreview: DuomeiNote = {
      ...draft,
      contentBlocks: sourceBlocks,
      body: blocksToBody(sourceBlocks),
      bodyImages: blocksToImages(sourceBlocks),
      updatedAt: new Date().toISOString(),
    };
    upsertNote(nextPreview);
    setPreviewNote(nextPreview);
    setSearchParams({ preview: "1" });
    setSyncMessage("draft", "正在预览当前编辑内容，尚未同步云端。");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const setDraftStatus = async (status: DuomeiNote["status"]) => {
    await persistNote(status);
  };

  const deleteCurrent = async () => {
    if (!note) return;
    try {
      await deleteCloudNote(note.id);
      deleteNote(note.id);
      navigate("/");
    } catch (error) {
      setMessage(error instanceof Error ? `删除失败：${error.message}` : "云端删除失败，请稍后重试。");
    }
  };

  const updateTag = (index: number, value: string) => {
    if (!activeNote) return;
    updateDraft({ tags: activeNote.tags.map((tag, itemIndex) => (itemIndex === index ? value : tag)) });
  };

  const removeTag = (index: number) => {
    if (!activeNote) return;
    updateDraft({ tags: activeNote.tags.filter((_, itemIndex) => itemIndex !== index) });
  };

  const addTag = () => {
    if (!activeNote) return;
    updateDraft({ tags: [...activeNote.tags, "新标签"] });
  };

  if (!note || !activeNote) {
    return (
      <main className="duomei-detail">
        <p className="detail-category">NOT FOUND</p>
        <h1>旅行中……页面不存在</h1>
        <Link to="/">返回首页</Link>
      </main>
    );
  }

  const isPublished = activeNote.status === "published";
  const currentIndex = navigationNotes.findIndex((item) => item.id === note.id);
  const previousNote = currentIndex > 0 ? navigationNotes[currentIndex - 1] : null;
  const nextNote = currentIndex >= 0 && currentIndex < navigationNotes.length - 1 ? navigationNotes[currentIndex + 1] : null;
  const sharedImageStyle = shouldEdit ? undefined : ({ viewTransitionName: sharedJourneyNames.image } as SharedJourneyStyle);
  const sharedTitleStyle = shouldEdit ? undefined : ({ viewTransitionName: sharedJourneyNames.title } as SharedJourneyStyle);

  const navigateWithJourney = (event: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    runSharedJourneyTransition(() => navigate(target));
  };

  return (
    <main className={`duomei-detail${shouldEdit ? " detail-edit-page inline-detail-editing" : ""}${shouldEdit && toolbarOpen ? " toolbar-open" : ""}`}>
      <Link className="detail-back" to="/#notes" onClick={(event) => navigateWithJourney(event, "/#notes")}>← 返回小记</Link>

      {isLoggedIn && editMode && !shouldEdit ? (
        <div className="detail-edit-actions">
          <button type="button" onClick={() => setSearchParams({ edit: "1" })}>编辑这篇小记</button>
          {note.status === "draft" ? (
            <button className="detail-publish-button" type="button" onClick={() => setDraftStatus("published")}>发布</button>
          ) : (
            <button className="detail-status-button" type="button" onClick={() => setDraftStatus("draft")}>转为草稿</button>
          )}
          <button className="detail-danger-button" type="button" onClick={() => setConfirmDelete(true)}>删除这篇小记</button>
        </div>
      ) : null}

      {shouldEdit ? (
        <>
          <button
            className={`detail-toolbar-toggle${toolbarOpen ? " is-open" : ""}`}
            type="button"
            onClick={() => setToolbarOpen((value) => !value)}
            aria-label="切换小记编辑工具"
            aria-expanded={toolbarOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`detail-inline-toolbar${toolbarOpen ? " is-open" : ""}`} role="toolbar" aria-label="小记编辑工具栏">
            <button type="button" onClick={() => persistNote()} disabled={isSaving}>{isSaving ? "同步中..." : "保存修改"}</button>
            {isPublished ? (
              <button type="button" className="is-muted" disabled>已发布</button>
            ) : (
              <button type="button" className="is-primary" onClick={() => persistNote("published")} disabled={isSaving}>{isSaving ? "发布中..." : "发布"}</button>
            )}
            {isPublished ? <button type="button" onClick={() => persistNote("draft")} disabled={isSaving}>转为草稿</button> : null}
            <button type="button" onClick={previewCurrentDraft} disabled={isSaving}>预览</button>
            <button type="button" onClick={undoDraft} disabled={undoCount === 0}>撤销</button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("paragraph"), type: "paragraph", text: "" })}>插入段落</button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("quote"), type: "quote", text: "" })}>插入引用</button>
            <button type="button" onClick={() => insertBlock({ id: createBlockId("divider"), type: "divider" })}>分割线</button>
            <button type="button" onClick={() => { setImagePanelMode("cover"); setToolbarOpen(false); }} disabled={isSaving}>添加封面</button>
            <button type="button" onClick={() => { setImagePanelMode("article"); setToolbarOpen(false); }} disabled={isSaving}>添加图片</button>
            <button className="detail-danger-button" type="button" onClick={() => setConfirmDelete(true)}>删除</button>
            <button type="button" onClick={() => navigate("/")}>返回首页</button>
          </div>
          {imagePanelMode ? (
            <div
              className="detail-image-panel"
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchStartCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ImageUploadPanel
                compact
                coverOnly={imagePanelMode === "cover"}
                onInsert={insertBlocks}
                onSetCover={(coverImageUrl) => updateDraft({ coverImageUrl })}
                onClose={() => setImagePanelMode(null)}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {message ? (
        <div className={`detail-save-message sync-${syncStep}`}>
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
        <div className="detail-cover-wrap" data-shared-journey-image style={sharedImageStyle}>
          <NoteCover note={activeNote} detail />
        </div>
        {shouldEdit ? (
          <>
            <input className="detail-category detail-inline-input category-input" value={activeNote.category} onChange={(event) => updateDraft({ category: event.target.value })} aria-label="分类" />
            <textarea className="detail-title-editor" value={activeNote.title} onChange={(event) => updateDraft({ title: event.target.value })} aria-label="标题" />
            <div className="detail-meta editable-meta">
              <input value={activeNote.date} onChange={(event) => updateDraft({ date: event.target.value })} aria-label="日期" />
              <input value={activeNote.location} onChange={(event) => updateDraft({ location: event.target.value })} aria-label="地点" />
            </div>
            <div className="detail-tags editable-tags">
              {activeNote.tags.map((tag, index) => (
                <span className="editable-tag" key={`tag-${index}`}>
                  <input
                    value={tag}
                    onChange={(event) => updateTag(index, event.currentTarget.value)}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    aria-label={`标签 ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeTag(index);
                    }}
                    aria-label="删除标签"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button className="tag-add-button" type="button" onClick={addTag}>+</button>
            </div>
            <textarea className="detail-excerpt-editor" value={activeNote.excerpt} onChange={(event) => updateDraft({ excerpt: event.target.value })} placeholder="摘要" aria-label="摘要" />
            <div className="inline-block-editor">
              {blocks.map((block) => {
                if (block.type === "divider") {
                  return <div className="editable-block-row" key={block.id}><hr /><button type="button" onClick={() => removeBlock(block.id)}>删除</button></div>;
                }
                if (block.type === "image") {
                  return (
                    <EditableImageBlock
                      key={block.id}
                      block={block}
                      onChange={(nextBlock) => replaceBlock(nextBlock)}
                      onDelete={() => removeBlock(block.id)}
                      onMove={(direction) => moveBlock(block.id, direction)}
                      onSetCover={() => updateDraft({ coverImageUrl: block.src })}
                    />
                  );
                }
                return (
                  <div className={`editable-text-block ${block.type === "quote" ? "is-quote" : ""}`} key={block.id}>
                    <textarea value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} placeholder={block.type === "quote" ? "引用文字" : "正文"} />
                    <button type="button" onClick={() => removeBlock(block.id)}>删除</button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="detail-category">{note.category}</p>
            <h1 data-shared-journey-title style={sharedTitleStyle}>{note.title}</h1>
            <div className="detail-meta"><span>{note.date}</span><span>{note.location}</span></div>
            <div className="detail-tags">{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <NoteBlockRenderer blocks={blocks} />
          </>
        )}
      </article>
      <nav className="detail-note-nav" aria-label="小记翻页">
        {previousNote ? (
          <Link className="detail-note-nav-card" to={`/note/${previousNote.slug}`} onClick={(event) => navigateWithJourney(event, `/note/${previousNote.slug}`)}><span>上一篇</span><strong>{previousNote.title}</strong></Link>
        ) : (
          <span className="detail-note-nav-card is-disabled"><span>上一篇</span><strong>已经是第一篇</strong></span>
        )}
        <Link className="detail-note-nav-home" to="/#notes" onClick={(event) => navigateWithJourney(event, "/#notes")}>返回主页</Link>
        {nextNote ? (
          <Link className="detail-note-nav-card align-right" to={`/note/${nextNote.slug}`} onClick={(event) => navigateWithJourney(event, `/note/${nextNote.slug}`)}><span>下一篇</span><strong>{nextNote.title}</strong></Link>
        ) : (
          <span className="detail-note-nav-card align-right is-disabled"><span>下一篇</span><strong>已经是最后一篇</strong></span>
        )}
      </nav>
    </main>
  );
}
