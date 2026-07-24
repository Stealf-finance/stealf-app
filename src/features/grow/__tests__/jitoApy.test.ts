import { describe, expect, it } from 'vitest';
import { JitoApySchema } from '../api/jitoApy';

describe('JitoApySchema', () => {
  it('parses the backend apy payload (percent, not a fraction)', () => {
    expect(JitoApySchema.parse({ latestApy: 5.18 }).latestApy).toBe(5.18);
  });

  it('rejects a missing or non-numeric apy', () => {
    expect(() => JitoApySchema.parse({})).toThrow();
    expect(() => JitoApySchema.parse({ latestApy: '5.18' })).toThrow();
  });
});
