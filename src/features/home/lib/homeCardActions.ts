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
      return [RECEIVE, MOVE];
    case 'encrypted':
      return [MOVE];
    case 'total':
    default:
      return [];
  }
}
