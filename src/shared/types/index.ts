export type WalletKind = 'bank' | 'stealth';

export interface WalletRef {
  kind: WalletKind;
  address: string;
}
