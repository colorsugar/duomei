import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { compressImageFile } from "../lib/imageTools";
import { defaultPoetryFont } from "../lib/timePoetryContent";
import type { TimePoetryCanvas, TimePoetryCanvasElement, TimePoetryWork } from "../lib/timePoetryContent";

const WIDTH = 1600;
const HEIGHT = 900;

function uid(type: string) {
  return `poetry-canvas-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createPoetryCanvas(work: TimePoetryWork, pageIndex: number): TimePoetryCanvas {
  const elements: TimePoetryCanvasElement[] = [
    { id: `${work.id}-eyebrow`, kind: "text", binding: "eyebrow", x: 16, y: 18, width: 260, height: 38, fontSize: 15, letterSpacing: 5, color: "#6b655d", zIndex: 5 },
    { id: `${work.id}-page`, kind: "text", binding: "page", text: String(pageIndex + 1).padStart(2, "0"), x: 380, y: 18, width: 70, height: 36, fontSize: 15, color: "#777066", zIndex: 5 },
    { id: `${work.id}-title`, kind: "text", binding: "title", x: 18, y: 88, width: 660, height: 170, fontSize: Math.max(54, work.fontSize + 24), fontFamily: work.fontFamily || defaultPoetryFont, lineHeight: 1.08, zIndex: 6 },
    { id: `${work.id}-image-0`, kind: "image", binding: "image", index: 0, x: 875, y: 18, width: 705, height: 760, objectFit: "cover", zIndex: 1 },
    { id: `${work.id}-citation`, kind: "text", binding: "citation", x: 18, y: 652, width: 500, height: 72, fontSize: 15, lineHeight: 1.7, color: "#645f57", zIndex: 5 },
    { id: `${work.id}-meta`, kind: "text", binding: "meta", x: 18, y: 792, width: 430, height: 68, fontSize: 14, lineHeight: 1.9, letterSpacing: 2, color: "#6d675f", zIndex: 5 },
  ];

  work.verticalColumns.forEach((_, index) => {
    elements.push({
      id: `${work.id}-vertical-${index}`,
      kind: "text",
      binding: "vertical",
      index,
      x: 585 + index * 92,
      y: 102 + (index % 2) * 42,
      width: 82,
      height: 540,
      fontSize: Math.max(27, work.fontSize * 0.58),
      fontFamily: work.fontFamily || defaultPoetryFont,
      lineHeight: 1.65,
      vertical: true,
      zIndex: 7,
    });
  });

  work.images.slice(1).forEach((_, index) => {
    elements.push({ id: `${work.id}-image-${index + 1}`, kind: "image", binding: "image", index: index + 1, x: 940 + index * 34, y: 64 + index * 34, width: 560, height: 660, objectFit: "cover", zIndex: index + 2 });
  });

  return { width: WIDTH, height: HEIGHT, background: "#f7f3eb", elements };
}

function valueOf(element: TimePoetryCanvasElement, work: TimePoetryWork, pageIndex: number) {
  if (element.binding === "title") return work.title;
  if (element.binding === "eyebrow") return work.eyebrow;
  if (element.binding === "page") return element.text || String(pageIndex + 1).padStart(2, "0");
  if (element.binding === "citation") return work.citation ?? "";
  if (element.binding === "meta") return work.meta.join("\n");
  if (element.binding === "vertical") return work.verticalColumns[element.index ?? 0] ?? "";
  if (element.binding === "body") return work.body[element.index ?? 0] ?? "";
  return element.text ?? "";
}

function styleOf(element: TimePoetryCanvasElement): CSSProperties {
  return {
    left: `${(element.x / WIDTH) * 100}%`,
    top: `${(element.y / HEIGHT) * 100}%`,
    width: `${(element.width / WIDTH) * 100}%`,
    height: `${(element.height / HEIGHT) * 100}%`,
    zIndex: element.zIndex ?? 1,
    color: element.color ?? "#1f1f1b",
    fontFamily: element.fontFamily || defaultPoetryFont,
    fontSize: `${(element.fontSize ?? 24) / 16}cqw`,
    fontWeight: element.fontWeight ?? 400,
    lineHeight: element.lineHeight ?? 1.45,
    letterSpacing: `${(element.letterSpacing ?? 0) / 16}cqw`,
    textAlign: element.align ?? "left",
    writingMode: element.vertical ? "vertical-rl" : "horizontal-tb",
  };
}

function updateBoundText(work: TimePoetryWork, element: TimePoetryCanvasElement, text: string): TimePoetryWork {
  if (element.binding === "title") return { ...work, title: text };
  if (element.binding === "eyebrow") return { ...work, eyebrow: text };
  if (element.binding === "citation") return { ...work, citation: text };
  if (element.binding === "meta") return { ...work, meta: text.split("\n") };
  if (element.binding === "vertical") {
    const verticalColumns = [...work.verticalColumns];
    verticalColumns[element.index ?? 0] = text;
    return { ...work, verticalColumns };
  }
  if (element.binding === "body") {
    const body = [...work.body];
    body[element.index ?? 0] = text;
    return { ...work, body };
  }
  return {
    ...work,
    canvas: work.canvas ? { ...work.canvas, elements: work.canvas.elements.map((item) => item.id === element.id ? { ...item, text } : item) } : work.canvas,
  };
}

export function PoetryCanvasPage({
  work,
  pageIndex,
  editing,
  canEdit,
  onEdit,
  onDone,
  onChange,
}: {
  work: TimePoetryWork;
  pageIndex: number;
  editing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDone: () => void;
  onChange: (work: TimePoetryWork) => void;
}) {
  const canvas = work.canvas ?? createPoetryCanvas(work, pageIndex);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ mode: "move" | "resize"; startX: number; startY: number; origin: TimePoetryCanvasElement } | null>(null);
  const selected = useMemo(() => canvas.elements.find((element) => element.id === selectedId), [canvas.elements, selectedId]);

  const changeCanvas = (next: TimePoetryCanvas) => onChange({ ...work, canvas: next });
  const patchElement = (id: string, patch: Partial<TimePoetryCanvasElement>) => changeCanvas({ ...canvas, elements: canvas.elements.map((element) => element.id === id ? { ...element, ...patch } : element) });

  useEffect(() => {
    if (!editing || work.canvas) return;
    onChange({ ...work, canvas });
  }, [canvas, editing, onChange, work]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((event.clientX - drag.startX) / rect.width) * WIDTH;
      const dy = ((event.clientY - drag.startY) / rect.height) * HEIGHT;
      changeCanvas({
        ...canvas,
        elements: canvas.elements.map((element) => {
          if (element.id !== drag.origin.id) return element;
          if (drag.mode === "move") return { ...element, x: Math.max(0, Math.min(WIDTH - element.width, drag.origin.x + dx)), y: Math.max(0, Math.min(HEIGHT - element.height, drag.origin.y + dy)) };
          return { ...element, width: Math.max(50, Math.min(WIDTH - element.x, drag.origin.width + dx)), height: Math.max(30, Math.min(HEIGHT - element.y, drag.origin.height + dy)) };
        }),
      });
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [canvas, drag]);

  const begin = (event: ReactPointerEvent, element: TimePoetryCanvasElement, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    setEditingId(null);
    setSelectedId(element.id);
    setDrag({ mode, startX: event.clientX, startY: event.clientY, origin: { ...element } });
  };

  const addText = () => {
    const element: TimePoetryCanvasElement = { id: uid("text"), kind: "text", binding: "custom", text: "双击输入完整文字", x: 260, y: 300, width: 520, height: 150, fontSize: 30, fontFamily: work.fontFamily || defaultPoetryFont, lineHeight: 1.6, zIndex: 20 };
    changeCanvas({ ...canvas, elements: [...canvas.elements, element] });
    setSelectedId(element.id);
    setEditingId(element.id);
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    const src = await compressImageFile(file, 2200, 0.88, 1800);
    const imageIndex = work.images.length;
    const nextWork = { ...work, images: [...work.images, { label: file.name.replace(/\.[^.]+$/, ""), src, position: "50% 50%" }] };
    const element: TimePoetryCanvasElement = { id: uid("image"), kind: "image", binding: "image", index: imageIndex, x: 860, y: 80, width: 620, height: 680, objectFit: "cover", zIndex: 12 };
    onChange({ ...nextWork, canvas: { ...canvas, elements: [...canvas.elements, element] } });
    setSelectedId(element.id);
  };

  const duplicate = () => {
    if (!selected) return;
    const next = { ...selected, id: uid(selected.kind), x: selected.x + 28, y: selected.y + 28, zIndex: (selected.zIndex ?? 1) + 1, binding: "custom" as const, text: selected.kind === "text" ? valueOf(selected, work, pageIndex) : selected.text };
    changeCanvas({ ...canvas, elements: [...canvas.elements, next] });
    setSelectedId(next.id);
  };

  return (
    <article className={`poetry-freeform-page${editing ? " is-editing" : ""}`} aria-label={`${work.title} 自由画布`}>
      {editing ? (
        <div className="poetry-canvas-toolbar">
          <button type="button" onClick={onDone}>完成</button>
          <button type="button" onClick={addText}>+ 文字</button>
          <button type="button" onClick={() => uploadRef.current?.click()}>+ 图片</button>
          <input ref={uploadRef} type="file" accept="image/*" onChange={uploadImage} hidden />
          <span>双击文字直接输入；左上角拖动，右下角缩放</span>
          {selected ? (
            <>
              {selected.kind === "text" ? <label>字号<input type="number" min="8" max="220" value={selected.fontSize ?? 24} onChange={(event) => patchElement(selected.id, { fontSize: Number(event.target.value) })} /></label> : null}
              {selected.kind === "text" ? <button type="button" onClick={() => patchElement(selected.id, { vertical: !selected.vertical })}>{selected.vertical ? "横排" : "竖排"}</button> : null}
              {selected.kind === "image" ? <button type="button" onClick={() => patchElement(selected.id, { objectFit: selected.objectFit === "contain" ? "cover" : "contain" })}>{selected.objectFit === "contain" ? "铺满" : "完整显示"}</button> : null}
              <button type="button" onClick={() => patchElement(selected.id, { zIndex: (selected.zIndex ?? 1) + 1 })}>上移一层</button>
              <button type="button" onClick={duplicate}>复制</button>
              <button type="button" className="is-danger" onClick={() => { changeCanvas({ ...canvas, elements: canvas.elements.filter((element) => element.id !== selected.id) }); setSelectedId(null); }}>删除</button>
            </>
          ) : null}
        </div>
      ) : canEdit ? <button className="poetry-canvas-edit-button" type="button" onClick={onEdit}>直接编辑作品</button> : null}

      <div className="poetry-canvas-scroll">
        <div ref={canvasRef} className="poetry-canvas-stage" style={{ aspectRatio: `${canvas.width} / ${canvas.height}`, background: canvas.background }} onPointerDown={() => { setSelectedId(null); setEditingId(null); }}>
          {canvas.elements.map((element) => (
            <div
              key={element.id}
              className={`poetry-canvas-element is-${element.kind}${selectedId === element.id && editing ? " is-selected" : ""}`}
              style={styleOf(element)}
              onPointerDown={(event) => { event.stopPropagation(); if (editing) setSelectedId(element.id); }}
              onDoubleClick={(event) => { event.stopPropagation(); if (editing && element.kind === "text") setEditingId(element.id); }}
            >
              {element.kind === "text" ? (
                <div
                  className="poetry-canvas-text"
                  contentEditable={editing && editingId === element.id}
                  suppressContentEditableWarning
                  onBlur={(event) => { onChange(updateBoundText(work, element, event.currentTarget.innerText.replace(/\u00a0/g, " "))); setEditingId(null); }}
                  onKeyDown={(event) => event.stopPropagation()}
                >{valueOf(element, work, pageIndex)}</div>
              ) : (
                <img src={work.images[element.index ?? 0]?.src || ""} alt={work.images[element.index ?? 0]?.label || work.title} draggable={false} style={{ objectFit: element.objectFit ?? "cover", objectPosition: work.images[element.index ?? 0]?.position || "50% 50%" }} />
              )}
              {editing && selectedId === element.id ? <><button className="poetry-canvas-move" type="button" onPointerDown={(event) => begin(event, element, "move")} aria-label="拖动元素">✥</button><button className="poetry-canvas-resize" type="button" onPointerDown={(event) => begin(event, element, "resize")} aria-label="缩放元素" /></> : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
