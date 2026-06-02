import { Icons } from '@/src/design-system/icons';

export type HomeCardId = 'total' | 'bank' | 'stealf' | 'encrypted';

export type HomeAction = {
  key: string;
  label: string;
  iconKey: keyof typeof Icons;
  /** Expo-router path to navigate to on press. */
  route: string;
};

// Bank / Stealf actions — sourced from BankWallet.tsx (SquareActionTile props
// and router.push calls).
const RECEIVE: HomeAction = {
  key: 'receive',
  label: 'Receive',
  iconKey: 'arrDown',
  route: '/receive',
};
const MOVE: HomeAction = {
  key: 'move',
  label: 'Move',
  iconKey: 'move',
  route: '/moove?direction=bank-to-shielded',
};
const SEND: HomeAction = {
  key: 'send',
  label: 'Send',
  iconKey: 'arrUp',
  route: '/send',
};

// Encrypted (private mode) actions — sourced from StealthHub.tsx private-mode
// tile panel (SquareActionTile props and router.push calls).
const SHIELD: HomeAction = {
  key: 'shield',
  label: 'Shield',
  iconKey: 'shieldCheck',
  route: '/shield',
};
const UNSHIELD: HomeAction = {
  key: 'unshield',
  label: 'Unshield',
  iconKey: 'shieldOff',
  route: '/unshield',
};
const SEND_ENCRYPTED: HomeAction = {
  key: 'send',
  label: 'Send',
  iconKey: 'arrUp',
  route: '/send/flow?tone=gold&wallet=stealth&mode=private',
};
const CLAIM: HomeAction = {
  key: 'claim',
  label: 'Claim',
  iconKey: 'gift',
  route: '/claim-pending',
};

export function homeCardActions(card: HomeCardId): HomeAction[] {
  switch (card) {
    case 'bank':
    case 'stealf':
      return [RECEIVE, MOVE, SEND];
    case 'encrypted':
      return [SHIELD, UNSHIELD, SEND_ENCRYPTED, CLAIM];
    case 'total':
    default:
      return [];
  }
}
