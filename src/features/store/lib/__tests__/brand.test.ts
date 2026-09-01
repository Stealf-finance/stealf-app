import { describe, it, expect } from 'vitest';
import { brandColors, brandHue, brandArtUrl, monogram } from '../brand';

// The live allowlist (backend CURATED_GIFTCARDS). Names come from Bitrefill at
// runtime, so only the ids are asserted against.
const CURATED_IDS = [
  'amazon-uk',
  'zalando-ireland',
  'apple-ireland',
  'currys-pc-world-ireland',
  'ikea-ireland',
  'playstation-ireland',
  'xbox-ireland',
  'nintendo-ireland',
  'steam-eur-international',
  'netflix-eu',
  'twitch-ireland',
  'just-eat-ireland',
  'uber-and-uber-eats-eu',
  'nando_s-ie',
];

const BRAND_NAMES = [
  'Amazon',
  'Zalando',
  'Apple',
  'Currys PC World',
  'IKEA',
  'PlayStation',
  'Xbox',
  'Nintendo eShop',
  'Steam',
  'Netflix',
  'Twitch',
  'Just Eat',
  'Uber & Uber Eats',
  "Nando's",
];

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

  it('produces a mark for every curated brand', () => {
    for (const name of BRAND_NAMES) {
      expect(monogram(name)).toMatch(/^[\p{L}\p{N}]{1,2}$/u);
    }
  });
});

describe('brandHue', () => {
  it('is stable for one seed', () => {
    expect(brandHue('amazon-uk')).toBe(brandHue('amazon-uk'));
  });

  it('stays inside the hue circle', () => {
    for (const id of CURATED_IDS) {
      const hue = brandHue(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('separates ids that share a prefix', () => {
    expect(brandHue('amazon-uk')).not.toBe(brandHue('apple-ireland'));
  });
});

describe('brandColors', () => {
  it('returns a fill and an ink as hsl strings', () => {
    const { bg, ink } = brandColors('amazon-fr');
    expect(bg).toMatch(/^hsl\(\d+, 42%, 26%\)$/);
    expect(ink).toMatch(/^hsl\(\d+, 62%, 82%\)$/);
  });
});

describe('brandArtUrl', () => {
  it('asks for the 5:3 card artwork, not the letterboxed logo', () => {
    const url = brandArtUrl('amazon-uk', 170);
    expect(url).toContain('/primg/w540h324/');
    expect(url).not.toContain('i1w');
  });

  it('keeps every bucket on the 5:3 ratio', () => {
    for (const width of [80, 170, 300]) {
      const [, w, h] = brandArtUrl('x', width).match(/w(\d+)h(\d+)/)!;
      expect(Number(w) / Number(h)).toBeCloseTo(5 / 3, 2);
    }
  });

  it('caps at the largest bucket the CDN serves', () => {
    expect(brandArtUrl('x', 500)).toContain('w720h432');
  });

  it('keys the URL on the product id', () => {
    expect(brandArtUrl('nando_s-ie', 170)).toContain('/nando_s-ie.webp');
  });
});
