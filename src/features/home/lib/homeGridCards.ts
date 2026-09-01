import type { HomeBalances } from './aggregateHomeBalances';

export type HomeGridAccent = 'silver' | 'gold';
export type HomeGridIconKey =
  | 'bank'
  | 'invest'
  | 'shieldFull'
  | 'bolt'
  | 'store';

type Base = {
  // Card keys match their route segment — `/public-balance`, `/private-balance`,
  // `/earn`, `/store`.
  key: 'public-balance' | 'private-balance' | 'earn' | 'store';
  label: string;
  accent: HomeGridAccent;
  iconKey: HomeGridIconKey;
  /** Detail-screen route; omitted while a card's screen isn't built yet. */
  route?: string;
};

export type HomeGridCardVM =
  | (Base & {
      /** `undefined` while the figure is still unknown. */
      valueUSD: number | undefined;
      /** Its query settled in error with nothing to show. */
      error: boolean;
      teaser?: never;
    })
  | (Base & { teaser: string; valueUSD?: never; error?: never });

/** Hardcoded yield teaser — Grow is not wired yet. Swap for a live APY later. */
export const EARN_APY_TEASER = '5.41%';

/** View-models for the 4 home grid cards, in fixed display order. Pure. */
export function buildHomeCards(
  b: HomeBalances,
  errors: { bank: boolean; encrypted: boolean } = { bank: false, encrypted: false },
): HomeGridCardVM[] {
  return [
    {
      key: 'public-balance',
      label: 'Public Balance',
      accent: 'silver',
      iconKey: 'bank',
      valueUSD: b.bankUSD,
      error: errors.bank,
      route: '/public-balance',
    },
    {
      key: 'private-balance',
      label: 'Private Balance',
      accent: 'gold',
      iconKey: 'shieldFull',
      valueUSD: b.encryptedUSD,
      error: errors.encrypted,
      route: '/private-balance',
    },
    {
      key: 'earn',
      label: 'Investments',
      accent: 'silver',
      iconKey: 'invest',
      teaser: `${EARN_APY_TEASER} APY`,
      route: '/earn',
    },
    {
      key: 'store',
      label: 'Store',
      accent: 'silver',
      iconKey: 'store',
      teaser: 'Gift cards',
      route: '/store',
    },
  ];
}
