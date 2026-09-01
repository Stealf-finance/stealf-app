/** Maps a drag position to one of the discrete denomination stops. */
export function indexFromPosition(
  x: number,
  travel: number,
  count: number,
): number {
  if (count <= 1 || travel <= 0) return 0;
  const raw = Math.round((x / travel) * (count - 1));
  return Math.min(count - 1, Math.max(0, raw));
}

/** Where the thumb sits for a stop. A single stop sits at the start. */
export function positionForIndex(
  index: number,
  travel: number,
  count: number,
): number {
  if (count <= 1 || travel <= 0) return 0;
  const clamped = Math.min(count - 1, Math.max(0, index));
  return (clamped / (count - 1)) * travel;
}
