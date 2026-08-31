import { describe, expect, it } from 'vitest';
import { buildHomeCards, EARN_APY_TEASER } from '../homeGridCards';

const balances = { totalUSD: 105, bankUSD: 100, encryptedUSD: 5 };

describe('buildHomeCards', () => {
  it('returns the four cards in order', () => {
    expect(buildHomeCards(balances).map((c) => c.key)).toEqual([
      'public-balance',
      'private-balance',
      'earn',
      'store',
    ]);
  });
  it('maps balances to the value cards', () => {
    const byKey = Object.fromEntries(
      buildHomeCards(balances).map((c) => [c.key, c]),
    );
    expect(byKey['public-balance']).toMatchObject({
      valueUSD: 100,
      accent: 'silver',
      iconKey: 'bank',
    });
    expect(byKey['private-balance']).toMatchObject({
      valueUSD: 5,
      accent: 'gold',
      iconKey: 'shieldFull',
    });
  });
  it('gives Earn a hardcoded APY teaser instead of a value', () => {
    const earn = buildHomeCards(balances).find((c) => c.key === 'earn')!;
    expect(earn).toMatchObject({
      teaser: `${EARN_APY_TEASER} APY`,
      accent: 'silver',
      iconKey: 'invest',
    });
    expect('valueUSD' in earn).toBe(false);
  });
  it('teases Store with what it sells rather than a value', () => {
    const store = buildHomeCards(balances).find((c) => c.key === 'store')!;
    expect(store).toMatchObject({ teaser: 'Gift cards', iconKey: 'store' });
    expect('valueUSD' in store).toBe(false);
  });
  it('routes each built card at its matching screen', () => {
    const routes = Object.fromEntries(
      buildHomeCards(balances).map((c) => [c.key, c.route]),
    );
    expect(routes['public-balance']).toBe('/public-balance');
    expect(routes['private-balance']).toBe('/private-balance');
    expect(routes.earn).toBe('/earn');
    expect(routes.store).toBe('/store');
  });
  it('uses the correct user-facing labels', () => {
    expect(buildHomeCards(balances).map((c) => c.label)).toEqual([
      'Public Balance',
      'Private Balance',
      'Earn',
      'Store',
    ]);
  });
});
