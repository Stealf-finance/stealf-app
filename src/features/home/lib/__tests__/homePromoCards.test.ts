import { describe, expect, it } from 'vitest';
import {
  activeCardIndex,
  buildHomePromoCards,
  PROMO_FALLBACK_APY_PCT,
} from '../homePromoCards';

describe('buildHomePromoCards', () => {
  it('returns the three cards in fixed order', () => {
    expect(buildHomePromoCards(5).map((c) => c.key)).toEqual([
      'stlf',
      'shield',
      'store',
    ]);
  });

  it('formats the live APY to two decimals', () => {
    expect(buildHomePromoCards(5.4123)[0].highlight).toBe('5.41% APY');
    expect(buildHomePromoCards(0)[0].highlight).toBe('0.00% APY');
  });

  it('falls back when the APY has not loaded', () => {
    const fallback = `${PROMO_FALLBACK_APY_PCT.toFixed(2)}% APY`;
    expect(buildHomePromoCards(undefined)[0].highlight).toBe(fallback);
  });

  it('falls back on a non-finite APY rather than printing NaN', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(buildHomePromoCards(bad)[0].highlight).not.toContain('NaN');
      expect(buildHomePromoCards(bad)[0].highlight).not.toContain('Infinity');
    }
  });

  it('highlights only the STLF card', () => {
    const [, shield, store] = buildHomePromoCards(5);
    expect(shield.highlight).toBeUndefined();
    expect(store.highlight).toBeUndefined();
  });

  it('gives every card a destination and copy', () => {
    for (const card of buildHomePromoCards(5)) {
      expect(card.route.startsWith('/')).toBe(true);
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('keeps the two reprised prompts pointing at their own flows', () => {
    const routes = Object.fromEntries(
      buildHomePromoCards(5).map((c) => [c.key, c.route]),
    );
    expect(routes).toEqual({
      stlf: '/stlf-buy',
      shield: '/shield',
      store: '/store',
    });
  });
});

describe('activeCardIndex', () => {
  const W = 320;

  it('reports the page the scroll settled on', () => {
    expect(activeCardIndex(0, W, 3)).toBe(0);
    expect(activeCardIndex(W, W, 3)).toBe(1);
    expect(activeCardIndex(W * 2, W, 3)).toBe(2);
  });

  it('rounds to the nearest page', () => {
    expect(activeCardIndex(W * 0.49, W, 3)).toBe(0);
    expect(activeCardIndex(W * 0.51, W, 3)).toBe(1);
  });

  it('clamps an overscroll bounce to the ends', () => {
    expect(activeCardIndex(-80, W, 3)).toBe(0);
    expect(activeCardIndex(W * 9, W, 3)).toBe(2);
  });

  it('stays at 0 for degenerate inputs rather than returning NaN', () => {
    expect(activeCardIndex(NaN, W, 3)).toBe(0);
    expect(activeCardIndex(100, 0, 3)).toBe(0);
    expect(activeCardIndex(100, -W, 3)).toBe(0);
    expect(activeCardIndex(100, W, 0)).toBe(0);
  });
});
