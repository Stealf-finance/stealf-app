import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { WalletBottomBar } from '@/src/features/wallet-detail/WalletBottomBar';
import { BankProducts } from '@/src/features/bank/components/BankProducts';
import { type QuickAction } from '@/src/components/nav/QuickActionMenu';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { USDC_LOGO_URI } from '@/src/constants/solana';
import { isOfframpAvailable } from '@/src/features/offramp/constants';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  // Scoped hubs: only this account's options (the full grouped hub lives
  // behind the home FAB).
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send-choice?scope=cash' },
  { key: 'receive', label: 'Receive', iconKey: 'arrDownLeft', route: '/receive-choice?scope=cash' },
  { key: 'buy', label: 'Buy', iconKey: 'dollar' }, // not built yet
  { key: 'move', label: 'Move', iconKey: 'moove', route: '/moove' },
];

// Cash-out (crypto→fiat via Noah) is mainnet-only and env-gated; the entry
// only appears once `isOfframpAvailable()` is true, so devnet UI is unchanged.
const ACTIONS_WITH_CASHOUT: QuickAction[] = [
  ...ACTIONS,
  { key: 'cashout', label: 'Cash out', iconKey: 'bank', route: '/cash-out' },
];

export default function CashScreen() {
  const { user } = useAuth();
  const bal = useBalance(user?.bankWallet ?? null);

  const assets = (bal.data?.tokens ?? []).map((t) => ({
    key: t.tokenMint ?? t.tokenSymbol,
    iconSource: t.tokenIcon
      ? { uri: t.tokenIcon }
      : t.tokenSymbol === 'USDC'
        ? { uri: USDC_LOGO_URI }
        : undefined,
    symbol: t.tokenSymbol,
    caption: `${trim(t.balance)} ${t.tokenSymbol}`,
    priceLabel: `$${t.balanceUSD.toFixed(2)}`,
  }));

  return (
    <WalletScreen
      title="Cash"
      iconImage={require('@/assets/images/coin.png')}
      balanceUSD={bal.data?.totalUSD ?? 0}
      assets={assets}
      belowBalance={<BankProducts />}
      bottomBar={
        <WalletBottomBar
          fabActions={isOfframpAvailable() ? ACTIONS_WITH_CASHOUT : ACTIONS}
          historyRoute="/transactions"
          claimTarget="bank"
        />
      }
      tone="silver"
    />
  );
}
