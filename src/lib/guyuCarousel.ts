export const GUYU_CAROUSEL_DWELL_MS = 1_600;
export const GUYU_FRAGMENT_SCATTER_MS = 340;
export const GUYU_FRAGMENT_MAX_DELAY_MS = 72;
export const GUYU_FRAGMENT_HOLD_MS = 110;
export const GUYU_FRAGMENT_ASSEMBLE_MS = 500;
export const GUYU_SCATTER_FALLBACK_MS = 480;
export const GUYU_ASSEMBLE_FALLBACK_MS = 650;
export const GUYU_SETTLE_FALLBACK_MS = 1_200;
export const GUYU_FRAGMENT_VISUAL_MS =
  GUYU_FRAGMENT_SCATTER_MS +
  GUYU_FRAGMENT_MAX_DELAY_MS +
  GUYU_FRAGMENT_HOLD_MS +
  GUYU_FRAGMENT_ASSEMBLE_MS +
  GUYU_FRAGMENT_MAX_DELAY_MS;
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
