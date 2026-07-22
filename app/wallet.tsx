import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { WalletBottomBar } from '@/src/features/wallet-detail/WalletBottomBar';
import { type QuickAction } from '@/src/components/nav/QuickActionMenu';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { SOL_ICON_URI } from '@/src/constants/solana';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  { key: 'swap', label: 'Swap', iconKey: 'swap' }, // not built yet
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send/flow?tone=silver&wallet=bank' },
  { key: 'receive', label: 'Receive', iconKey: 'arrDownLeft', route: '/receive' },
];

export default function WalletRoute() {
  const { user } = useAuth();
  const bal = useBalance(user?.stealfWallet ?? null);

  const assets = (bal.data?.tokens ?? []).map((t) => ({
    key: t.tokenMint ?? t.tokenSymbol,
    iconSource: t.tokenIcon
      ? { uri: t.tokenIcon }
      : t.tokenSymbol === 'SOL'
        ? { uri: SOL_ICON_URI }
        : undefined,
    symbol: t.tokenSymbol,
    caption: `${trim(t.balance)} · on-chain`,
    priceLabel: `$${t.balanceUSD.toFixed(2)}`,
  }));

  return (
    <WalletScreen
      title="Wallet"
      iconImage={require('@/assets/images/wallet.png')}
      balanceUSD={bal.data?.totalUSD ?? 0}
      assets={assets}
      bottomBar={
        <WalletBottomBar
          fabActions={ACTIONS}
          historyRoute="/transactions?wallet=stealth"
          claimTarget="encrypted"
        />
      }
      tone="silver"
    />
  );
}
