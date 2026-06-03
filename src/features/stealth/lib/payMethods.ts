/** A payment method tile on the Pay hub. `discKey` selects the leading Disc
 *  in PayMethodTiles; `route` is omitted for coming-soon tiles. */
export type PayMethod = {
  key: 'private' | 'simple' | 'bank';
  label: string;
  discKey: 'stealf' | 'usdc' | 'bank';
  route?: string;
  disabled?: boolean;
};

export const PAY_METHODS: PayMethod[] = [
  {
    key: 'private',
    label: 'Private',
    discKey: 'stealf',
    route: '/send/flow?tone=gold&wallet=stealth&mode=private',
  },
  {
    key: 'simple',
    label: 'Simple',
    discKey: 'usdc',
    route: '/send/flow?tone=silver&wallet=bank',
  },
  { key: 'bank', label: 'Bank', discKey: 'bank', disabled: true },
];
