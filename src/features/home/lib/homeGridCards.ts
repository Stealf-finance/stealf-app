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
  // `/earn`. `store` has no screen yet, hence no route.
  key: 'public-balance' | 'private-balance' | 'earn' | 'store';
  label: string;
  accent: HomeGridAccent;
  iconKey: HomeGridIconKey;
  /** Detail-screen route; omitted while a card's screen isn't built yet. */
  route?: string;
};

export type HomeGridCardVM =
  | (Base & { valueUSD: number; teaser?: never })
  | (Base & { teaser: string; valueUSD?: never });

/** Hardcoded yield teaser — Grow is not wired yet. Swap for a live APY later. */
export const EARN_APY_TEASER = '5.41%';

/** View-models for the 4 home grid cards, in fixed display order. Pure. */
export function buildHomeCards(b: HomeBalances): HomeGridCardVM[] {
  return [
    {
      key: 'public-balance',
      label: 'Public Balance',
      accent: 'silver',
      iconKey: 'bank',
      valueUSD: b.bankUSD,
      route: '/public-balance',
    },
    {
      key: 'private-balance',
      label: 'Private Balance',
      accent: 'gold',
      iconKey: 'shieldFull',
      valueUSD: b.encryptedUSD,
      route: '/private-balance',
    },
    {
      key: 'earn',
      label: 'Earn',
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
      teaser: 'Soon',
    },
  ];
}
