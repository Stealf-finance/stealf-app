/**
 * What WalletScreen shows for its assets list. The balance next to it uses the
 * shared `resolveValueState` in `@/src/lib/asyncValue`; this one stays local
 * because the footer rule below is specific to this scaffold.
 */

export type AssetsState = 'rows' | 'skeleton' | 'error' | 'empty' | 'hidden';

/**
 * `undefined` is "not known yet", `[]` is "this wallet holds nothing" — the
 * whole point of not defaulting the list to `[]` upstream.
 *
 * A footer means the assets list isn't the screen's subject (Investments puts
 * its product catalog there), so both placeholders are suppressed: skeleton
 * rows would flash in and straight back out above the real content.
 */
export function resolveAssetsState(
  assets: readonly unknown[] | undefined,
  error: boolean,
  hasFooter: boolean,
): AssetsState {
  if (assets === undefined) {
    if (error) return 'error';
    return hasFooter ? 'hidden' : 'skeleton';
  }
  if (assets.length === 0) return hasFooter ? 'hidden' : 'empty';
  return 'rows';
}
