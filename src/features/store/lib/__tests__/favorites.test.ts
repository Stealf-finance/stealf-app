import { describe, it, expect } from 'vitest';
import { isFavorite, toggleFavorite } from '../favorites';

describe('toggleFavorite', () => {
  it('adds an id that is not favourited', () => {
    expect(toggleFavorite([], 'amazon-fr')).toEqual(['amazon-fr']);
  });

  it('removes an id that already is', () => {
    expect(toggleFavorite(['amazon-fr'], 'amazon-fr')).toEqual([]);
  });

  it('appends rather than reordering the existing favourites', () => {
    expect(toggleFavorite(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('leaves the other favourites in place when removing one', () => {
    expect(toggleFavorite(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('does not mutate the list it was given', () => {
    const before = ['a'];
    toggleFavorite(before, 'b');
    expect(before).toEqual(['a']);
  });
});

describe('isFavorite', () => {
  it('is true only for a listed id', () => {
    expect(isFavorite(['a'], 'a')).toBe(true);
    expect(isFavorite(['a'], 'b')).toBe(false);
  });
});
