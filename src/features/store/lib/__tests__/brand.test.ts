import { describe, it, expect } from 'vitest';
import { brandColors, brandHue, monogram } from '../brand';
import { STORE_CATALOG } from '../catalog';

describe('monogram', () => {
  it('takes one initial from a single-word brand', () => {
    expect(monogram('Amazon')).toBe('A');
  });

  it('takes two initials from a two-word brand', () => {
    expect(monogram('Uber Eats')).toBe('UE');
  });

  it('ignores punctuation inside a name', () => {
    expect(monogram('H&M')).toBe('H');
    expect(monogram('Booking.com')).toBe('B');
  });

  it('uppercases a lowercase initial', () => {
    expect(monogram('eBay')).toBe('E');
  });

  it('falls back rather than crashing on an empty name', () => {
    expect(monogram('   ')).toBe('?');
  });

  it('produces a mark for every product in the catalog', () => {
    for (const p of STORE_CATALOG) {
      expect(monogram(p.name)).toMatch(/^[\p{L}\p{N}]{1,2}$/u);
    }
  });
});

describe('brandHue', () => {
  it('is stable for one seed', () => {
    expect(brandHue('amazon-fr')).toBe(brandHue('amazon-fr'));
  });

  it('stays inside the hue circle', () => {
    for (const p of STORE_CATALOG) {
      const hue = brandHue(p.id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('separates ids that share a prefix', () => {
    expect(brandHue('amazon-fr')).not.toBe(brandHue('apple-fr'));
  });
});

describe('brandColors', () => {
  it('returns a fill and an ink as hsl strings', () => {
    const { bg, ink } = brandColors('amazon-fr');
    expect(bg).toMatch(/^hsl\(\d+, 42%, 26%\)$/);
    expect(ink).toMatch(/^hsl\(\d+, 62%, 82%\)$/);
  });
});
