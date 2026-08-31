/** Favourite gift cards — a set of product ids, kept as an ordered list so
 *  the UI can show them in the order they were starred. Pure. */

export function toggleFavorite(
  ids: readonly string[],
  id: string,
): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function isFavorite(ids: readonly string[], id: string): boolean {
  return ids.includes(id);
}
