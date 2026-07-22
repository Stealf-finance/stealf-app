import { describe, expect, it } from 'vitest';
import { buildHomeCards, EARN_APY_TEASER } from '../homeGridCards';

const balances = { totalUSD: 125, bankUSD: 100, stealfUSD: 20, encryptedUSD: 5 };

describe('buildHomeCards', () => {
  it('returns the four cards in order: cash, earn, encrypted, wallet', () => {
    expect(buildHomeCards(balances).map((c) => c.key)).toEqual([
      'cash', 'earn', 'encrypted', 'wallet',
    ]);
  });
  it('maps balances to the value cards', () => {
    const byKey = Object.fromEntries(buildHomeCards(balances).map((c) => [c.key, c]));
    expect(byKey.cash).toMatchObject({ valueUSD: 100, accent: 'silver', iconKey: 'bank' });
    expect(byKey.encrypted).toMatchObject({ valueUSD: 5, accent: 'gold', iconKey: 'shieldFull' });
    expect(byKey.wallet).toMatchObject({ valueUSD: 20, accent: 'silver', iconKey: 'bolt' });
  });
  it('gives Earn a hardcoded APY teaser instead of a value', () => {
    const earn = buildHomeCards(balances).find((c) => c.key === 'earn')!;
    expect(earn).toMatchObject({ teaser: `Up to ${EARN_APY_TEASER} APY`, accent: 'silver', iconKey: 'invest' });
    expect('valueUSD' in earn).toBe(false);
  });
  it('uses the correct user-facing labels', () => {
    expect(buildHomeCards(balances).map((c) => c.label)).toEqual([
      'Cash', 'Earn', 'Encrypted Balance', 'Wallet',
    ]);
  });
});
