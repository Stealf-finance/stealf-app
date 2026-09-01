/** Screen gutter and the gap between the two columns. */
export const GRID_GUTTER = 20;
export const GRID_GAP = 12;

/** Width of one tile in the two-column grid. */
export function tileWidth(screenWidth: number): number {
  return (screenWidth - GRID_GUTTER * 2 - GRID_GAP) / 2;
}

/** Splits products into rows of two, so every tile keeps the same width. */
export function rowsOfTwo<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}
