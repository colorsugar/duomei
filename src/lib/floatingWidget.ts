export type FloatingWidgetPosition = {
  x: number;
  y: number;
};

export function containFloatingWidget(
  position: FloatingWidgetPosition,
  widgetWidth: number,
  widgetHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 16,
): FloatingWidgetPosition {
  const safeX = Number.isFinite(position.x) ? position.x : margin;
  const safeY = Number.isFinite(position.y) ? position.y : margin;
  const maxX = Math.max(margin, viewportWidth - widgetWidth - margin);
  const maxY = Math.max(margin, viewportHeight - widgetHeight - margin);

  return {
    x: Math.min(maxX, Math.max(margin, safeX)),
    y: Math.min(maxY, Math.max(margin, safeY)),
  };
}
