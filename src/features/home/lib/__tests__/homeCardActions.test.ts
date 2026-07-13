import { describe, expect, it } from 'vitest';
import { homeCardActions } from '../homeCardActions';

describe('homeCardActions', () => {
  it('Total card has no actions (read-only)', () => {
    expect(homeCardActions('total')).toEqual([]);
  });
  it('Bank card exposes details and borrow', () => {
    const actions = homeCardActions('bank');
    expect(actions.map((a) => a.key)).toEqual(['details', 'borrow']);
    expect(actions.find((a) => a.key === 'details')?.route).toBe('/account-details');
    expect(actions.find((a) => a.key === 'borrow')?.route).toBe('/borrow');
  });
  it('Stealf card receives into the stealth wallet and shields', () => {
    const actions = homeCardActions('stealf');
    expect(actions.map((a) => a.key)).toEqual(['receive', 'shield']);
    expect(actions.find((a) => a.key === 'receive')?.route).toBe(
      '/receive/flow?tone=silver&wallet=stealth',
    );
    expect(actions.find((a) => a.key === 'shield')?.route).toBe('/shield');
  });
  it('Encrypted card swaps (coming soon) and unshields', () => {
    const actions = homeCardActions('encrypted');
    expect(actions.map((a) => a.key)).toEqual(['swap', 'unshield']);
    expect(actions.find((a) => a.key === 'unshield')?.route).toBe('/unshield');
    const swap = actions.find((a) => a.key === 'swap');
    expect(swap?.comingSoon).toBe(true);
    expect(swap?.route).toBeUndefined();
  });
});
