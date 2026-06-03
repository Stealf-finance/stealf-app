import { describe, expect, it } from 'vitest';
import { PAY_METHODS } from '../payMethods';

describe('PAY_METHODS', () => {
  it('lists Private, Simple, Bank in order', () => {
    expect(PAY_METHODS.map((m) => m.key)).toEqual(['private', 'simple', 'bank']);
  });
  it('routes Private to the private stealth send flow', () => {
    const m = PAY_METHODS.find((m) => m.key === 'private');
    expect(m?.label).toBe('Private transfer');
    expect(m?.discKey).toBe('umbra');
    expect(m?.route).toBe('/send/flow?tone=gold&wallet=stealth&mode=private');
    expect(m?.disabled).toBeFalsy();
  });
  it('routes Simple to the public bank send flow', () => {
    const m = PAY_METHODS.find((m) => m.key === 'simple');
    expect(m?.label).toBe('Simple transfer');
    expect(m?.discKey).toBe('solana');
    expect(m?.route).toBe('/send/flow?tone=silver&wallet=bank');
    expect(m?.disabled).toBeFalsy();
  });
  it('marks Bank as coming-soon (disabled, no route)', () => {
    const m = PAY_METHODS.find((m) => m.key === 'bank');
    expect(m?.label).toBe('Bank transfer');
    expect(m?.discKey).toBe('globe');
    expect(m?.disabled).toBe(true);
    expect(m?.route).toBeUndefined();
  });
});
