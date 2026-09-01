import { describe, it, expect } from 'vitest';
import { shortProductName } from '../productName';

describe('shortProductName', () => {
  it('turns the domain into a country code and drops the market word', () => {
    expect(shortProductName('Amazon.co.uk United Kingdom')).toBe('Amazon UK');
  });

  it('drops a trailing market word', () => {
    expect(shortProductName('Zalando Ireland')).toBe('Zalando');
    expect(shortProductName('Apple Ireland')).toBe('Apple');
    expect(shortProductName('IKEA Ireland')).toBe('IKEA');
  });

  it('keeps a multi-word brand intact', () => {
    expect(shortProductName('Currys PC World Ireland')).toBe('Currys PC World');
    expect(shortProductName('Just Eat Ireland')).toBe('Just Eat');
  });

  it('drops a generic TLD without inventing a country', () => {
    expect(shortProductName('Booking.com')).toBe('Booking');
    expect(shortProductName('Amazon.com United States')).toBe('Amazon');
  });

  it('handles the pan-European entries', () => {
    expect(shortProductName('Netflix EU')).toBe('Netflix');
    expect(shortProductName('Steam International')).toBe('Steam');
  });

  it('leaves a name that needs no shortening alone', () => {
    expect(shortProductName('Twitch')).toBe('Twitch');
    expect(shortProductName("Nando's")).toBe("Nando's");
  });

  it('never returns an empty string', () => {
    expect(shortProductName('Ireland')).toBe('Ireland');
    expect(shortProductName('  Apple  ')).toBe('Apple');
  });
});
