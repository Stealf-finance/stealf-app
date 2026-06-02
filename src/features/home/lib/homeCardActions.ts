import { Icons } from '@/src/design-system/icons';

export type HomeCardId = 'total' | 'bank' | 'stealf' | 'encrypted';

export type HomeAction = {
  key: string;
  label: string;
  iconKey: keyof typeof Icons;
  /** Expo-router path to navigate to on press. Omitted for coming-soon tiles. */
  route?: string;
  /** When true, the tile shows a "coming soon" toast instead of navigating. */
  comingSoon?: boolean;
};

// Bank / Stealf actions — sourced from BankWallet.tsx (SquareActionTile props
// and router.push calls).
const MOVE: HomeAction = {
  key: 'move',
  label: 'Move',
  iconKey: 'move',
  route: '/moove?direction=bank-to-shielded',
};
// Stealf ("Wallet") tiles: receive straight into the stealth wallet, and move
// the stealth wallet's public balance out to the bank.
const RECEIVE_STEALTH: HomeAction = {
  key: 'receive',
  label: 'Receive',
  iconKey: 'arrDown',
  route: '/receive/flow?tone=silver&wallet=stealth',
};
const MOVE_STEALTH_TO_BANK: HomeAction = {
  key: 'move',
  label: 'Move',
  iconKey: 'move',
  route: '/moove?direction=stealth-to-bank',
};
// Encrypted balance tile: move the encrypted (shielded) balance out to the bank.
const MOVE_ENCRYPTED_TO_BANK: HomeAction = {
  key: 'move',
  label: 'Move',
  iconKey: 'move',
  route: '/moove?direction=shielded-to-bank',
};
// Shield: move the stealth wallet's public balance into the encrypted balance.
const SHIELD: HomeAction = {
  key: 'shield',
  label: 'Shield',
  iconKey: 'shieldCheck',
  route: '/shield',
};
// Unshield: move the encrypted balance back out to the public stealth wallet.
const UNSHIELD: HomeAction = {
  key: 'unshield',
  label: 'Unshield',
  iconKey: 'shieldOff',
  route: '/unshield',
};
// Swap: not built yet — surfaces a "coming soon" toast.
const SWAP: HomeAction = {
  key: 'swap',
  label: 'Swap',
  iconKey: 'swap',
  comingSoon: true,
};
const DETAILS: HomeAction = {
  key: 'details',
  label: 'Details',
  iconKey: 'bank',
  route: '/transactions?wallet=bank',
};

export function homeCardActions(card: HomeCardId): HomeAction[] {
  switch (card) {
    case 'bank':
      return [MOVE, DETAILS];
    case 'stealf':
      return [RECEIVE_STEALTH, MOVE_STEALTH_TO_BANK, SHIELD];
    case 'encrypted':
      return [MOVE_ENCRYPTED_TO_BANK, SWAP, UNSHIELD];
    case 'total':
    default:
      return [];
  }
}
