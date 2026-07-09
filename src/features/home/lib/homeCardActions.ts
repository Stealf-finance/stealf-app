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

// Stealf ("Wallet") tiles: receive straight into the stealth wallet.
const RECEIVE_STEALTH: HomeAction = {
  key: 'receive',
  label: 'Receive',
  iconKey: 'arrDown',
  route: '/receive/flow?tone=silver&wallet=stealth',
};
// Shield: move the stealth wallet's public balance into the encrypted balance.
const SHIELD: HomeAction = {
  key: 'shield',
  label: 'Shield',
  iconKey: 'shieldFull',
  route: '/shield',
};
// Unshield: move the encrypted balance back out to the public stealth wallet.
const UNSHIELD: HomeAction = {
  key: 'unshield',
  label: 'Unshield',
  iconKey: 'shieldSplit',
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
  route: '/account-details',
};
// Borrow: open the Portola loan flow (KYC + uncollateralized loan) in a WebView.
const BORROW: HomeAction = {
  key: 'borrow',
  label: 'Borrow',
  iconKey: 'bolt',
  route: '/borrow',
};

export function homeCardActions(card: HomeCardId): HomeAction[] {
  switch (card) {
    case 'bank':
      return [DETAILS, BORROW];
    case 'stealf':
      return [RECEIVE_STEALTH, SHIELD];
    case 'encrypted':
      return [SWAP, UNSHIELD];
    case 'total':
    default:
      return [];
  }
}
