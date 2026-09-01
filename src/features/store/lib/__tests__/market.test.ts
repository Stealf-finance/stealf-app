import { describe, it, expect } from 'vitest';
import { countryFlag, dominantCountry } from '../market';

const p = (country?: string) => ({ country });

describe('countryFlag', () => {
  it('maps an alpha-2 code to its flag', () => {
    expect(countryFlag('IE')).toBe('🇮🇪');
    expect(countryFlag('US')).toBe('🇺🇸');
  });

  it('uppercases a lowercase code', () => {
    expect(countryFlag('ie')).toBe('🇮🇪');
  });

  it('maps EU, which Bitrefill uses for pan-European products', () => {
    expect(countryFlag('EU')).toBe('🇪🇺');
  });

  it('returns nothing for anything that is not an alpha-2 code', () => {
    expect(countryFlag(undefined)).toBe('');
    expect(countryFlag('')).toBe('');
    expect(countryFlag('IRL')).toBe('');
    expect(countryFlag('I1')).toBe('');
  });
});

describe('dominantCountry', () => {
  it('picks the market the catalog is mostly scoped to', () => {
    // The live Irish list: 10 IE, 3 EU, 1 GB.
    const catalog = [
      ...Array.from({ length: 10 }, () => p('IE')),
      ...Array.from({ length: 3 }, () => p('EU')),
      p('GB'),
    ];
    expect(dominantCountry(catalog)).toBe('IE');
  });

  it('follows the data when the market changes', () => {
    expect(dominantCountry([p('US'), p('US'), p('EU')])).toBe('US');
  });

  it('ignores products with no country', () => {
    expect(dominantCountry([p(undefined), p('IE')])).toBe('IE');
  });

  it('breaks a tie alphabetically rather than by input order', () => {
    expect(dominantCountry([p('US'), p('IE')])).toBe('IE');
    expect(dominantCountry([p('IE'), p('US')])).toBe('IE');
  });

  it('returns undefined for an empty or country-less catalog', () => {
    expect(dominantCountry([])).toBeUndefined();
    expect(dominantCountry([p(undefined)])).toBeUndefined();
  });
});
