import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { uploadNoteDataUrl } from "../lib/supabaseNotes";
import type { TimePoetryEffect, TimePoetryImage, TimePoetryTextBlock, TimePoetryWork } from "../lib/timePoetryContent";
import { defaultPoetryFont } from "../lib/timePoetryContent";
import { ImageUploadPanel } from "./ImageUploadPanel";

type ElementKind = "text" | "image";

type Interaction = {
  kind: ElementKind;
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PoetryCanvasEditorProps = {
  pages: TimePoetryWork[];
  activeIndex: number;
  onSave: () => void;
  onCancel: () => void;
  onCheckpoint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onUpdate: (updater: (page: TimePoetryWork) => TimePoetryWork) => void;
};

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function PoetryCanvasEditor({
  pages,
  activeIndex,
  onSave,
  onCancel,
  onCheckpoint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onUpdate,
}: PoetryCanvasEditorProps) {
  const page = pages[activeIndex];
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionCleanupRef = useRef<() => void>(() => undefined);
  const [selected, setSelected] = useState<{ kind: ElementKind; id: string } | null>(null);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);

  useEffect(() => {
    setSelected(null);
  }, [activeIndex]);

  useEffect(() => () => interactionCleanupRef.current(), []);

  if (!page) return null;

  const textBlocks = page.textBlocks ?? [];
  const selectedText = selected?.kind === "text" ? textBlocks.find((block) => block.id === selected.id) : undefined;
  const selectedImage = selected?.kind === "image" ? page.images.find((image) => image.id === selected.id) : undefined;

  const updateText = (id: string, patch: Partial<TimePoetryTextBlock>) => {
    onUpdate((current) => ({
      ...current,
      title: patch.content !== undefined && current.textBlocks?.find((block) => block.id === id)?.kind === "title" ? patch.content : current.title,
      verticalColumns: patch.content !== undefined && current.textBlocks?.find((block) => block.id === id)?.kind === "poem" ? lines(patch.content) : current.verticalColumns,
      textBlocks: (current.textBlocks ?? []).map((block) => block.id === id ? { ...block, ...patch } : block),
    }));
  };

  const updateImage = (id: string, patch: Partial<TimePoetryImage>) => {
    onUpdate((current) => ({ ...current, images: current.images.map((image) => image.id === id ? { ...image, ...patch } : image) }));
  };

  const beginInteraction = (
    event: ReactPointerEvent,
    kind: ElementKind,
    id: string,
    mode: "move" | "resize",
    frame: { x: number; y: number; width: number; height: number },
  ) => {
    interactionCleanupRef.current();
    onCheckpoint();
    event.preventDefault();
    event.stopPropagation();
    setSelected({ kind, id });
    const interaction: Interaction = { kind, id, mode, startX: event.clientX, startY: event.clientY, ...frame };
    const move = (pointerEvent: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((pointerEvent.clientX - interaction.startX) / rect.width) * 100;
      const dy = ((pointerEvent.clientY - interaction.startY) / rect.height) * 100;
      const nextFrame = interaction.mode === "move"
        ? {
            x: Math.max(0, Math.min(100 - interaction.width, interaction.x + dx)),
            y: Math.max(0, Math.min(100 - interaction.height, interaction.y + dy)),
            width: interaction.width,
            height: interaction.height,
          }
        : {
            x: interaction.x,
            y: interaction.y,
            width: Math.max(5, Math.min(100 - interaction.x, interaction.width + dx)),
            height: Math.max(5, Math.min(100 - interaction.y, interaction.height + dy)),
          };
      onUpdate((current) => interaction.kind === "text"
        ? { ...current, textBlocks: (current.textBlocks ?? []).map((block) => block.id === interaction.id ? { ...block, ...nextFrame } : block) }
        : { ...current, images: current.images.map((image) => image.id === interaction.id ? { ...image, ...nextFrame } : image) });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      interactionCleanupRef.current = () => undefined;
    };
    interactionCleanupRef.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const addText = (direction: "vertical" | "horizontal") => {
    onCheckpoint();
    const block: TimePoetryTextBlock = {
      id: `text-${Date.now()}`,
      kind: "poem",
      content: "在这里写下诗句",
      x: 34,
      y: 18,
      width: direction === "vertical" ? 22 : 34,
      height: direction === "vertical" ? 62 : 20,
      fontSize: 42,
      direction,
      zIndex: 10,
    };
    onUpdate((current) => ({ ...current, textBlocks: [...(current.textBlocks ?? []), block] }));
    setSelected({ kind: "text", id: block.id });
  };

  const insertCroppedImages = async (blocks: Array<{ type: string; src?: string; caption?: string }>) => {
    onCheckpoint();
    const additions: TimePoetryImage[] = [];
    for (const [index, block] of blocks.entries()) {
      if (block.type !== "image" || !block.src) continue;
      let src = block.src;
      try {
        src = await uploadNoteDataUrl(block.src, "poetry");
      } catch {
        // Offline editing remains available; cloud upload is retried on the next replacement.
      }
      additions.push({
        id: `image-${Date.now()}-${index}`,
        label: block.caption || "诗词图片",
        src,
        position: "50% 50%",
        x: 54 - index * 3,
        y: 12 + index * 3,
        width: 38,
        height: 70,
        zIndex: 5 + index,
        cropX: 0,
        cropY: 0,
        scale: 1,
        effect: "ink",
      });
    }
    if (!additions.length) return;
    onUpdate((current) => ({ ...current, images: [...current.images, ...additions] }));
    setSelected({ kind: "image", id: additions[additions.length - 1].id! });
    setImagePanelOpen(false);
  };

  const deleteSelected = () => {
    if (!selected) return;
    onCheckpoint();
    onUpdate((current) => selected.kind === "text"
      ? { ...current, textBlocks: (current.textBlocks ?? []).filter((block) => block.id !== selected.id) }
      : { ...current, images: current.images.filter((image) => image.id !== selected.id) });
    setSelected(null);
  };

  const changeLayer = (delta: number) => {
    onCheckpoint();
    if (selectedText) updateText(selectedText.id, { zIndex: Math.max(1, selectedText.zIndex + delta) });
    if (selectedImage?.id) updateImage(selectedImage.id, { zIndex: Math.max(1, (selectedImage.zIndex ?? 1) + delta) });
  };

  return createPortal(
    <div className="poetry-canvas-editor" role="dialog" aria-modal="true" aria-label="直接编辑诗词页面">
      <header className="poetry-canvas-editor-header">
        <div>
          <strong>诗词画布</strong>
          <span>直接点选、拖动和缩放</span>
        </div>
        <div className="poetry-canvas-editor-actions">
          <button type="button" onClick={() => addText("vertical")}>＋竖排文字</button>
          <button type="button" onClick={() => addText("horizontal")}>＋横排文字</button>
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="撤销">↶ 撤销</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="重做">↷ 前进</button>
          <button type="button" onClick={() => setImagePanelOpen(true)}>＋图片</button>
          <button type="button" onClick={onCancel}>取消</button>
          <button className="is-primary" type="button" onClick={onSave}>完成并保存</button>
        </div>
      </header>

      <aside className="poetry-canvas-pages" aria-label="作品页面">
        {pages.map((item, index) => (
          <button className={index === activeIndex ? "is-active" : ""} key={item.id} type="button" onClick={() => onSelect(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <img src={item.images[0]?.src} alt="" />
            <strong>{item.title}</strong>
          </button>
        ))}
        <button className="is-add" type="button" onClick={onAdd}>＋ 新页面</button>
      </aside>

      <main className="poetry-canvas-workspace">
        <div className="poetry-canvas-pagebar">
          <button type="button" onClick={() => onMove(-1)} disabled={activeIndex === 0}>前移</button>
          <button type="button" onClick={() => onMove(1)} disabled={activeIndex === pages.length - 1}>后移</button>
          <button type="button" onClick={onDuplicate}>复制页面</button>
          <button type="button" onClick={onDelete} disabled={pages.length <= 1}>删除页面</button>
        </div>
        <div className="poetry-canvas-stage" ref={canvasRef} onPointerDown={() => setSelected(null)}>
          {page.images.map((image, index) => {
            const id = image.id ?? `${page.id}-image-${index}`;
            const frame = { x: image.x ?? 55, y: image.y ?? 9, width: image.width ?? 41, height: image.height ?? 74 };
            const active = selected?.kind === "image" && selected.id === id;
            return (
              <div
                className={`poetry-canvas-element is-image${active ? " is-selected" : ""}`}
                key={id}
                style={{ left: `${frame.x}%`, top: `${frame.y}%`, width: `${frame.width}%`, height: `${frame.height}%`, zIndex: image.zIndex ?? 2 }}
                onPointerDown={(event) => { event.stopPropagation(); setSelected({ kind: "image", id }); }}
              >
                <img
                  src={image.src}
                  alt={image.label}
                  style={{
                    objectPosition: image.position,
                    transform: `translate3d(${image.cropX ?? 0}%, ${image.cropY ?? 0}%, 0) scale(${image.scale ?? 1})`,
                  }}
                  draggable={false}
                />
                {active ? (
                  <>
                    <button className="poetry-element-move" type="button" aria-label="移动图片" onPointerDown={(event) => beginInteraction(event, "image", id, "move", frame)}>移动</button>
                    <button className="poetry-element-resize" type="button" aria-label="缩放图片" onPointerDown={(event) => beginInteraction(event, "image", id, "resize", frame)} />
                  </>
                ) : null}
              </div>
            );
          })}

          {textBlocks.map((block) => {
            const frame = { x: block.x, y: block.y, width: block.width, height: block.height };
            const active = selected?.kind === "text" && selected.id === block.id;
            const style = {
              left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%`, height: `${block.height}%`,
              zIndex: block.zIndex, color: block.color || "#211d19",
              fontFamily: page.fontFamily || defaultPoetryFont,
              fontSize: `${block.fontSize / 14.4}cqw`,
              writingMode: block.direction === "vertical" ? "vertical-rl" : "horizontal-tb",
            } as CSSProperties;
            return (
              <div
                className={`poetry-canvas-element is-text is-${block.kind}${active ? " is-selected" : ""}`}
                key={block.id}
                style={style}
                onPointerDown={(event) => { event.stopPropagation(); setSelected({ kind: "text", id: block.id }); }}
              >
                <div
                  contentEditable
                  role="textbox"
                  aria-label={`${block.kind === "title" ? "标题" : block.kind === "poem" ? "诗句" : "说明"}文字`}
                  suppressContentEditableWarning
                  onFocus={onCheckpoint}
                  onBlur={(event) => updateText(block.id, { content: event.currentTarget.innerText })}
                >{block.content}</div>
                {active ? (
                  <>
                    <button className="poetry-element-move" type="button" aria-label="移动文字" onPointerDown={(event) => beginInteraction(event, "text", block.id, "move", frame)}>移动</button>
                    <button className="poetry-element-resize" type="button" aria-label="缩放文字框" onPointerDown={(event) => beginInteraction(event, "text", block.id, "resize", frame)} />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>

      <aside className="poetry-canvas-inspector">
        <strong>{selectedText ? "文字设置" : selectedImage ? "图片设置" : "选择一个元素"}</strong>
        {selectedText ? (
          <>
            <label>字号<input type="range" min="12" max="140" value={selectedText.fontSize} onPointerDown={onCheckpoint} onChange={(event) => updateText(selectedText.id, { fontSize: Number(event.target.value) })} /></label>
            <label>字号数值<input type="number" min="12" max="180" value={selectedText.fontSize} onChange={(event) => updateText(selectedText.id, { fontSize: Number(event.target.value) })} /></label>
            <label>排列<select value={selectedText.direction} onChange={(event) => updateText(selectedText.id, { direction: event.target.value as "vertical" | "horizontal" })}><option value="vertical">竖排</option><option value="horizontal">横排</option></select></label>
            <label>颜色<input type="color" value={selectedText.color || "#211d19"} onChange={(event) => updateText(selectedText.id, { color: event.target.value })} /></label>
            <label>出现特效<select value={selectedText.effect ?? "ink"} onFocus={onCheckpoint} onChange={(event) => updateText(selectedText.id, { effect: event.target.value as TimePoetryEffect })}><option value="ink">墨迹揭露</option><option value="rise">缓慢上浮</option><option value="slide">侧向进入</option><option value="zoom">轻微缩放</option><option value="fade">淡入</option><option value="none">无动画</option></select></label>
          </>
        ) : null}
        {selectedImage?.id ? (
          <>
            <label>图片说明<input value={selectedImage.label} onChange={(event) => updateImage(selectedImage.id!, { label: event.target.value })} /></label>
            <label>裁切位置<select value={selectedImage.position} onChange={(event) => updateImage(selectedImage.id!, { position: event.target.value })}><option value="50% 50%">居中</option><option value="50% 20%">靠上</option><option value="50% 80%">靠下</option><option value="20% 50%">靠左</option><option value="80% 50%">靠右</option></select></label>
            <label>画面缩放<input type="range" min="100" max="300" value={Math.round((selectedImage.scale ?? 1) * 100)} onPointerDown={onCheckpoint} onChange={(event) => updateImage(selectedImage.id!, { scale: Number(event.target.value) / 100 })} /></label>
            <label>水平取景<input type="range" min="-50" max="50" value={selectedImage.cropX ?? 0} onPointerDown={onCheckpoint} onChange={(event) => updateImage(selectedImage.id!, { cropX: Number(event.target.value) })} /></label>
            <label>垂直取景<input type="range" min="-50" max="50" value={selectedImage.cropY ?? 0} onPointerDown={onCheckpoint} onChange={(event) => updateImage(selectedImage.id!, { cropY: Number(event.target.value) })} /></label>
            <label>出现特效<select value={selectedImage.effect ?? "ink"} onFocus={onCheckpoint} onChange={(event) => updateImage(selectedImage.id!, { effect: event.target.value as TimePoetryEffect })}><option value="ink">遮罩揭露</option><option value="slide">侧向进入</option><option value="zoom">镜头推进</option><option value="rise">缓慢上浮</option><option value="fade">淡入</option><option value="none">无动画</option></select></label>
            <button type="button" onClick={() => { onCheckpoint(); updateImage(selectedImage.id!, { cropX: 0, cropY: 0, scale: 1, position: "50% 50%" }); }}>重置取景</button>
          </>
        ) : null}
        {selected ? (
          <div className="poetry-canvas-layer-actions">
            <button type="button" onClick={() => changeLayer(1)}>上移一层</button>
            <button type="button" onClick={() => changeLayer(-1)}>下移一层</button>
            <button className="is-danger" type="button" onClick={deleteSelected}>删除元素</button>
          </div>
        ) : <p>点击画布中的文字或图片。双击文字即可直接改写。</p>}
      </aside>
      {imagePanelOpen ? (
        <div className="poetry-image-editor-overlay" role="dialog" aria-modal="true" aria-label="添加并裁剪诗词图片">
          <ImageUploadPanel compact onInsert={insertCroppedImages} onClose={() => setImagePanelOpen(false)} />
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
