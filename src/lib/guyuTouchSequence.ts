const VIEWPORT_ZOOM_THRESHOLD = 1.01;

export function isGuyuViewportZoomed(scale: number | null | undefined) {
  return typeof scale === "number" && Number.isFinite(scale) && scale > VIEWPORT_ZOOM_THRESHOLD;
}

export function updateGuyuTouchSequence(
  multiTouch: boolean,
  zoomedTouch: boolean,
  activeTouchCount: number,
  viewportScale?: number | null,
) {
  const viewportZoomed = isGuyuViewportZoomed(viewportScale);
  const blocksTurn = multiTouch || zoomedTouch || activeTouchCount >= 2 || viewportZoomed;
  return {
    blocksTurn,
    multiTouch: activeTouchCount > 0 && (multiTouch || activeTouchCount >= 2),
    zoomedTouch: activeTouchCount > 0 && (zoomedTouch || viewportZoomed),
  };
}
