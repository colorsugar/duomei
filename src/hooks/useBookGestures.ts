import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * One gesture layer owns every pointer on the reader stage, so the flip engine
 * never competes with the browser or with a second tap heuristic:
 *  - tap (any hold length, no movement) → turn the page on that side
 *  - horizontal swipe at 1× → turn
 *  - pinch / ctrl+wheel / ±0 keys → zoom about the pointer
 *  - one finger drag or plain wheel while zoomed → pan
 */
export type BookView = { scale: number; tx: number; ty: number };

const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
const TAP_SLOP = 8;
const SWIPE_DISTANCE = 40;
const TOGGLE_SCALE = 2.2;
const IDENTITY: BookView = { scale: 1, tx: 0, ty: 0 };

type Gesture =
  | { kind: "press"; id: number; x: number; y: number; view: BookView; moved: boolean; mode: "tap" | "pan" | "swipe" }
  | { kind: "pinch"; ids: [number, number]; dist: number; mid: { x: number; y: number }; view: BookView }
  | { kind: "settle" };

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useBookGestures({
  stageRef,
  zoomRef,
  onTurn,
  turnDirection,
}: {
  /** Untransformed spread box; its rect is the zoom origin. */
  stageRef: RefObject<HTMLElement | null>;
  /** Element that receives the transform. */
  zoomRef: RefObject<HTMLElement | null>;
  onTurn: (direction: -1 | 1) => void;
  /** Decide the direction for a tap at a horizontal position 0..1 across the visible spread. */
  turnDirection: (ratio: number) => -1 | 1 | 0;
}) {
  const viewRef = useRef<BookView>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>({ kind: "settle" });
  const [zoomed, setZoomed] = useState(false);
  const [dragging, setDragging] = useState(false);

  const stageBox = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  }, [stageRef]);

  const clampView = useCallback((view: BookView): BookView => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale));
    if (scale <= 1.001) return IDENTITY;
    const box = stageBox();
    if (!box) return { scale, tx: view.tx, ty: view.ty };
    const width = box.w * scale;
    const height = box.h * scale;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tx = width <= vw ? 0 : Math.min(width / 2 - box.cx, Math.max(vw - width / 2 - box.cx, view.tx));
    const ty = height <= vh ? 0 : Math.min(height / 2 - box.cy, Math.max(vh - height / 2 - box.cy, view.ty));
    return { scale, tx: Math.round(tx * 100) / 100, ty: Math.round(ty * 100) / 100 };
  }, [stageBox]);

  const apply = useCallback((view: BookView, animate: boolean) => {
    const next = clampView(view);
    viewRef.current = next;
    const element = zoomRef.current;
    if (element) {
      element.style.transition = animate ? "transform var(--dur-long) var(--ease-out)" : "none";
      element.style.transform = next.scale === 1
        ? ""
        : `translate3d(${next.tx.toFixed(2)}px, ${next.ty.toFixed(2)}px, 0) scale(${next.scale.toFixed(4)})`;
    }
    setZoomed(next.scale > 1);
  }, [clampView, zoomRef]);

  /** Zoom so the stage point under `anchor` stays put. */
  const zoomAbout = useCallback((scale: number, anchor: { x: number; y: number }, from: BookView, animate: boolean) => {
    const box = stageBox();
    if (!box) return;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const ratio = nextScale / from.scale;
    apply({
      scale: nextScale,
      tx: anchor.x - box.cx - ratio * (anchor.x - box.cx - from.tx),
      ty: anchor.y - box.cy - ratio * (anchor.y - box.cy - from.ty),
    }, animate);
  }, [apply, stageBox]);

  const resetZoom = useCallback(() => apply(IDENTITY, true), [apply]);

  const toggleZoom = useCallback(() => {
    const box = stageBox();
    if (!box) return;
    if (viewRef.current.scale > 1) resetZoom();
    else zoomAbout(TOGGLE_SCALE, { x: box.cx, y: box.cy }, viewRef.current, true);
  }, [resetZoom, stageBox, zoomAbout]);

  const stepZoom = useCallback((factor: number) => {
    const box = stageBox();
    if (!box) return;
    zoomAbout(viewRef.current.scale * factor, { x: box.cx, y: box.cy }, viewRef.current, true);
  }, [stageBox, zoomAbout]);

  const tapRatio = useCallback((x: number) => {
    const box = stageBox();
    if (!box) return null;
    const view = viewRef.current;
    const left = box.cx + view.tx - (box.w * view.scale) / 2;
    const width = box.w * view.scale;
    const ratio = (x - left) / width;
    // A generous margin keeps taps that land just off the paper edge working on phones.
    const slack = 48 / width;
    if (ratio < -slack || ratio > 1 + slack) return null;
    return Math.min(1, Math.max(0, ratio));
  }, [stageBox]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const zoomElement = zoomRef.current;
    if (zoomElement) zoomElement.style.transition = "none";

    if (pointers.current.size === 1) {
      gesture.current = {
        kind: "press",
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        view: viewRef.current,
        moved: false,
        mode: "tap",
      };
      return;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()];
      gesture.current = {
        kind: "pinch",
        ids: [a[0], b[0]],
        dist: Math.max(1, distance(a[1], b[1])),
        mid: { x: (a[1].x + b[1].x) / 2, y: (a[1].y + b[1].y) / 2 },
        view: viewRef.current,
      };
      setDragging(true);
      return;
    }
    gesture.current = { kind: "settle" };
  }, [zoomRef]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const point = pointers.current.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;
    const current = gesture.current;

    if (current.kind === "pinch") {
      const a = pointers.current.get(current.ids[0]);
      const b = pointers.current.get(current.ids[1]);
      if (!a || !b) return;
      const scale = current.view.scale * (distance(a, b) / current.dist);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const box = stageBox();
      if (!box) return;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE * 0.85, scale));
      const ratio = nextScale / current.view.scale;
      // Keep the pinched paper under the fingers, then let the fingers drag it.
      const tx = mid.x - box.cx - ratio * (current.mid.x - box.cx - current.view.tx);
      const ty = mid.y - box.cy - ratio * (current.mid.y - box.cy - current.view.ty);
      viewRef.current = { scale: nextScale, tx, ty };
      const element = zoomRef.current;
      if (element) {
        element.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${nextScale.toFixed(4)})`;
      }
      setZoomed(nextScale > 1);
      return;
    }

    if (current.kind !== "press" || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.hypot(dx, dy) < TAP_SLOP) return;
      current.moved = true;
      current.mode = current.view.scale > 1 ? "pan" : "swipe";
      if (current.mode === "pan") setDragging(true);
    }
    if (current.mode === "pan") {
      apply({ scale: current.view.scale, tx: current.view.tx + dx, ty: current.view.ty + dy }, false);
    }
  }, [apply, stageBox, zoomRef]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const point = pointers.current.get(event.pointerId);
    if (!point) return;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const current = gesture.current;

    if (current.kind === "pinch") {
      // Snap back into bounds once the pinch ends; the remaining finger only settles.
      apply(viewRef.current, true);
      gesture.current = { kind: "settle" };
      setDragging(false);
      return;
    }

    if (current.kind === "press" && current.id === event.pointerId) {
      gesture.current = { kind: "settle" };
      setDragging(false);
      if (cancelled) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.moved) {
        const ratio = tapRatio(event.clientX);
        if (ratio === null) return;
        const direction = turnDirection(ratio);
        if (direction !== 0) onTurn(direction);
        return;
      }
      if (current.mode === "swipe" && Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) {
        onTurn(dx < 0 ? 1 : -1);
      }
      return;
    }

    if (pointers.current.size === 0) {
      gesture.current = { kind: "settle" };
      setDragging(false);
    }
  }, [apply, onTurn, tapRatio, turnDirection]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => finishPointer(event, false), [finishPointer]);
  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => finishPointer(event, true), [finishPointer]);

  // React registers wheel listeners as passive, so the browser zoom cannot be stopped there.
  const layerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0022));
        zoomAbout(viewRef.current.scale * factor, { x: event.clientX, y: event.clientY }, viewRef.current, false);
        return;
      }
      if (viewRef.current.scale > 1) {
        event.preventDefault();
        const view = viewRef.current;
        apply({ scale: view.scale, tx: view.tx - event.deltaX, ty: view.ty - event.deltaY }, false);
      }
    };
    layer.addEventListener("wheel", onWheel, { passive: false });
    return () => layer.removeEventListener("wheel", onWheel);
  }, [apply, zoomAbout]);

  useEffect(() => {
    const onResize = () => apply(viewRef.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply]);

  return {
    layerRef,
    zoomed,
    dragging,
    resetZoom,
    toggleZoom,
    stepZoom,
    layerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    },
  };
}
