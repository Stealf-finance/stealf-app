/**
 * What the "Tokenized Stocks" card should render.
 *
 * The distinction that matters: an *empty* catalogue means the product isn't
 * offered, and the card has no place on the screen. An *unreachable* one means
 * we don't know what's offered — hiding the card there claims something we
 * can't back up, and (since the card renders skeletons first) makes it appear
 * and then vanish.
 */
export type CatalogueState = 'rows' | 'skeleton' | 'error' | 'hidden';

export function resolveCatalogueState(
  assets: readonly unknown[] | undefined,
  error: boolean,
): CatalogueState {
  // Cached rows win over a failed refetch, as everywhere else.
  if (assets === undefined) return error ? 'error' : 'skeleton';
  return assets.length === 0 ? 'hidden' : 'rows';
}
