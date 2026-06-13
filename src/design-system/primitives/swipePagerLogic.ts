export type SwipeArgs = {
  index: number;
  translationX: number;
  velocityX: number;
  count: number;
  pageWidth: number;
};

/** Distance fraction of a page that counts as a committed swipe. */
const DIST_FRACTION = 0.4;
/** Velocity (px/s) above which a short flick still commits. */
const VEL_THRESHOLD = 500;

/** Given a finished pan, return the page index to settle on (clamped). */
export function resolveSwipeTarget({
  index,
  translationX,
  velocityX,
  count,
  pageWidth,
}: SwipeArgs): number {
  const farEnough = Math.abs(translationX) > pageWidth * DIST_FRACTION;
  const fastEnough = Math.abs(velocityX) > VEL_THRESHOLD;
  if (!farEnough && !fastEnough) return index;
  const dir = translationX < 0 || velocityX < 0 ? 1 : -1; // left = next
  return Math.max(0, Math.min(count - 1, index + dir));
}
