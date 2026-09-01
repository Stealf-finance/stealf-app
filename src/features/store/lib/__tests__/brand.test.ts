import { describe, it, expect } from 'vitest';
import {
  brandColors,
  brandHue,
  brandArtUrl,
  brandIconUrl,
  isRemoteImage,
  monogram,
} from '../brand';

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

describe('isRemoteImage', () => {
  it('accepts an absolute https url', () => {
    expect(isRemoteImage('https://cdn.bitrefill.com/amazon.png')).toBe(true);
  });

  it('accepts http as well', () => {
    expect(isRemoteImage('http://cdn.bitrefill.com/amazon.png')).toBe(true);
  });

  it('rejects a relative path, which expo-image cannot load', () => {
    expect(isRemoteImage('/static/amazon.png')).toBe(false);
  });

  it('rejects a protocol-relative url', () => {
    expect(isRemoteImage('//cdn.bitrefill.com/amazon.png')).toBe(false);
  });

  it('rejects an empty or missing value', () => {
    expect(isRemoteImage('')).toBe(false);
    expect(isRemoteImage(undefined)).toBe(false);
    expect(isRemoteImage('   ')).toBe(false);
  });

  it('rejects a non-http scheme', () => {
    expect(isRemoteImage('data:image/png;base64,AAAA')).toBe(false);
  });
});

describe('brandIconUrl', () => {
  it('keys the URL on the product id, not on the image slug', () => {
    expect(brandIconUrl('netflix-eu', 44)).toContain('/netflix-eu.webp');
  });

  it('asks for a square big enough for a 3x screen', () => {
    expect(brandIconUrl('netflix-eu', 44)).toContain('i1w256h256');
    expect(brandIconUrl('netflix-eu', 104)).toContain('i1w512h512');
    expect(brandIconUrl('netflix-eu', 20)).toContain('i1w64h64');
  });

  it('caps at the largest bucket the CDN serves', () => {
    expect(brandIconUrl('netflix-eu', 400)).toContain('i1w512h512');
  });

  it('handles an id carrying an underscore', () => {
    expect(brandIconUrl('nando_s-ie', 44)).toContain('/nando_s-ie.webp');
  });

  it('builds an absolute https url isRemoteImage accepts', () => {
    expect(isRemoteImage(brandIconUrl('amazon-uk', 44))).toBe(true);
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
