/** A payment method tile on the Pay hub. `discKey` selects the leading Disc
 *  in PayMethodTiles; `route` is omitted for coming-soon tiles. */
export type PayMethod = {
  key: 'private' | 'simple' | 'bank';
  label: string;
  discKey: 'umbra' | 'solana' | 'globe';
  route?: string;
  disabled?: boolean;
};

export const PAY_METHODS: PayMethod[] = [
  {
    key: 'private',
    label: 'Private transfer',
    discKey: 'umbra',
    route: '/send/flow?tone=gold&wallet=stealth&mode=private',
  },
  {
    key: 'simple',
    label: 'Simple transfer',
    discKey: 'solana',
    // Both transfers originate from the stealth wallet — sending from the bank
    // wallet is intentionally not offered here.
    route: '/send/flow?tone=silver&wallet=stealth',
  },
  { key: 'bank', label: 'Bank transfer', discKey: 'globe', disabled: true },
];
