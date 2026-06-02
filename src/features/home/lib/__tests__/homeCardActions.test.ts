import { describe, expect, it } from 'vitest';
import { homeCardActions } from '../homeCardActions';

describe('homeCardActions', () => {
  it('Total card has no actions (read-only)', () => {
    expect(homeCardActions('total')).toEqual([]);
  });
  it('Bank card exposes move + details', () => {
    expect(homeCardActions('bank').map((a) => a.key)).toEqual(['move', 'details']);
  });
  it('Stealf card receives into the stealth wallet and moves to bank', () => {
    const actions = homeCardActions('stealf');
    expect(actions.map((a) => a.key)).toEqual(['receive', 'move']);
    expect(actions.find((a) => a.key === 'receive')?.route).toBe(
      '/receive/flow?tone=silver&wallet=stealth',
    );
    expect(actions.find((a) => a.key === 'move')?.route).toBe(
      '/moove?direction=stealth-to-bank',
    );
  });
  it('Encrypted card moves the encrypted balance to bank', () => {
    const actions = homeCardActions('encrypted');
    expect(actions.map((a) => a.key)).toEqual(['move']);
    expect(actions[0].route).toBe('/moove?direction=shielded-to-bank');
  });
});
