import { describe, expect, it } from 'vitest';
import { homeCardActions } from '../homeCardActions';

describe('homeCardActions', () => {
  it('Total card has no actions (read-only)', () => {
    expect(homeCardActions('total')).toEqual([]);
  });
  it('Bank card exposes move + details', () => {
    expect(homeCardActions('bank').map((a) => a.key)).toEqual(['move', 'details']);
  });
  it('Stealf card receives into the stealth wallet, moves to bank, and shields', () => {
    const actions = homeCardActions('stealf');
    expect(actions.map((a) => a.key)).toEqual(['receive', 'move', 'shield']);
    expect(actions.find((a) => a.key === 'receive')?.route).toBe(
      '/receive/flow?tone=silver&wallet=stealth',
    );
    expect(actions.find((a) => a.key === 'move')?.route).toBe(
      '/moove?direction=stealth-to-bank',
    );
    expect(actions.find((a) => a.key === 'shield')?.route).toBe('/shield');
  });
  it('Encrypted card moves to bank, swaps (coming soon), and unshields', () => {
    const actions = homeCardActions('encrypted');
    expect(actions.map((a) => a.key)).toEqual(['move', 'swap', 'unshield']);
    expect(actions.find((a) => a.key === 'move')?.route).toBe(
      '/moove?direction=shielded-to-bank',
    );
    expect(actions.find((a) => a.key === 'unshield')?.route).toBe('/unshield');
    const swap = actions.find((a) => a.key === 'swap');
    expect(swap?.comingSoon).toBe(true);
    expect(swap?.route).toBeUndefined();
  });
});
