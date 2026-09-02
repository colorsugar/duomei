export const GUYU_CAROUSEL_DWELL_MS = 1_600;
export const GUYU_SWIPE_DISTANCE_PX = 36;
export const GUYU_SWIPE_VELOCITY_PX_MS = 0.45;

export type GuyuCarouselDirection = -1 | 1;

export function wrapGuyuCarouselIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

export function getGuyuSwipeDirection({
  deltaX,
  deltaY,
  velocityX,
}: {
  deltaX: number;
  deltaY: number;
  velocityX: number;
}): GuyuCarouselDirection | 0 {
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return 0;
  if (Math.abs(deltaX) < GUYU_SWIPE_DISTANCE_PX && Math.abs(velocityX) < GUYU_SWIPE_VELOCITY_PX_MS) {
    return 0;
  }
  return (Math.abs(deltaX) >= GUYU_SWIPE_DISTANCE_PX ? deltaX : velocityX) < 0 ? 1 : -1;
}
