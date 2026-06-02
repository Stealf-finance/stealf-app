import { describe, expect, it } from 'vitest';
import { homeCardActions } from '../homeCardActions';

describe('homeCardActions', () => {
  it('Total card has no actions (read-only)', () => {
    expect(homeCardActions('total')).toEqual([]);
  });
  it('Bank card exposes move + details', () => {
    expect(homeCardActions('bank').map((a) => a.key)).toEqual(['move', 'details']);
  });
  it('Stealf card exposes receive/move', () => {
    expect(homeCardActions('stealf').map((a) => a.key)).toEqual(['receive', 'move']);
  });
  it('Encrypted card exposes shield/unshield', () => {
    expect(homeCardActions('encrypted').map((a) => a.key)).toEqual(['shield', 'unshield']);
  });
});
