import type { HomeBalances } from './aggregateHomeBalances';

export type HomeGridAccent = 'silver' | 'gold';
export type HomeGridIconKey = 'bank' | 'invest' | 'shieldFull' | 'bolt';

type Base = {
  key: 'cash' | 'earn' | 'encrypted' | 'wallet';
  label: string;
  accent: HomeGridAccent;
  iconKey: HomeGridIconKey;
};

export type HomeGridCardVM =
  | (Base & { valueUSD: number; teaser?: never })
  | (Base & { teaser: string; valueUSD?: never });

/** Hardcoded yield teaser — Grow is not wired yet. Swap for a live APY later. */
export const EARN_APY_TEASER = '5.41%';

/** View-models for the 4 home grid cards, in fixed display order. Pure. */
export function buildHomeCards(b: HomeBalances): HomeGridCardVM[] {
  return [
    { key: 'cash', label: 'Cash', accent: 'silver', iconKey: 'bank', valueUSD: b.bankUSD },
    { key: 'earn', label: 'Earn', accent: 'silver', iconKey: 'invest', teaser: `Up to ${EARN_APY_TEASER} APY` },
    { key: 'encrypted', label: 'Encrypted Balance', accent: 'gold', iconKey: 'shieldFull', valueUSD: b.encryptedUSD },
    { key: 'wallet', label: 'Wallet', accent: 'silver', iconKey: 'bolt', valueUSD: b.stealfUSD },
  ];
}
