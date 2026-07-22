import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { WalletBottomBar } from '@/src/features/wallet-detail/WalletBottomBar';
import { type QuickAction } from '@/src/components/nav/QuickActionMenu';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { SOL_ICON_URI } from '@/src/constants/solana';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send-choice' },
  { key: 'receive', label: 'Receive', iconKey: 'arrDownLeft', route: '/receive-choice' },
  { key: 'buy', label: 'Buy', iconKey: 'dollar' }, // not built yet
  { key: 'move', label: 'Move', iconKey: 'moove', route: '/moove' },
];

export default function CashScreen() {
  const { user } = useAuth();
  const bal = useBalance(user?.bankWallet ?? null);

  const assets = (bal.data?.tokens ?? []).map((t) => ({
    key: t.tokenMint ?? t.tokenSymbol,
    iconSource: t.tokenIcon
      ? { uri: t.tokenIcon }
      : t.tokenSymbol === 'SOL'
        ? { uri: SOL_ICON_URI }
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
      bottomBar={
        <WalletBottomBar fabActions={ACTIONS} historyRoute="/transactions" claimTarget="bank" />
      }
      tone="silver"
    />
  );
}
