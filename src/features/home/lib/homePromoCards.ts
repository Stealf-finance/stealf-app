export type HomePromoCardVM = {
  // Keys are stable identifiers for the carousel, not route segments.
  key: 'stlf' | 'shield' | 'store';
  title: string;
  /** Rendered in green right after the title — the live APY on the STLF card. */
  highlight?: string;
  subtitle: string;
  route: string;
};

/** Shown until the live holder APY lands — same fallback as StlfSwapCta. */
export const PROMO_FALLBACK_APY_PCT = 0;

/** View-models for the 3 home promo cards, in fixed display order. Pure.
 *  Cards 1 and 2 mirror the prompts on Public / Private Balance. */
export function buildHomePromoCards(
  apyPct: number | undefined,
): HomePromoCardVM[] {
  const apy = Number.isFinite(apyPct) ? (apyPct as number) : PROMO_FALLBACK_APY_PCT;
  return [
    {
      key: 'stlf',
      title: 'Earn',
      highlight: `${apy.toFixed(2)}% APY`,
      subtitle: 'on Stealf stablecoin',
      route: '/stlf-buy',
    },
    {
      key: 'shield',
      title: 'Start protecting your wealth',
      subtitle: 'Shield funds into your private balance',
      route: '/shield',
    },
    {
      key: 'store',
      title: 'Buy gift cards privately',
      subtitle: 'Explore the store',
      route: '/store',
    },
  ];
}

/** Which card a paged scroll offset has landed on. Rounds to the nearest page
 *  and clamps, so an overscroll bounce can't index past the ends. */
export function activeCardIndex(
  offsetX: number,
  pageWidth: number,
  count: number,
): number {
  if (!Number.isFinite(offsetX) || pageWidth <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offsetX / pageWidth)));
}
