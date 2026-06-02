import { describe, expect, it } from 'vitest';
import { homeCardActions } from '../homeCardActions';

describe('homeCardActions', () => {
  it('Total card has no actions (read-only)', () => {
    expect(homeCardActions('total')).toEqual([]);
  });
  it('Bank/Stealf cards expose receive/move/send', () => {
    expect(homeCardActions('bank').map((a) => a.key)).toEqual(['receive', 'move', 'send']);
    expect(homeCardActions('stealf').map((a) => a.key)).toEqual(['receive', 'move', 'send']);
  });
  it('Encrypted card exposes shield/unshield/send/claim', () => {
    expect(homeCardActions('encrypted').map((a) => a.key)).toEqual([
      'shield', 'unshield', 'send', 'claim',
    ]);
  });
});
