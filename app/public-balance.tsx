import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import {
  QuickActionMenu,
  type QuickAction,
} from '@/src/components/nav/QuickActionMenu';
import { StlfSwapCta } from '@/src/features/reflect/components/StlfSwapCta';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { USDC_LOGO_URI } from '@/src/constants/solana';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

// Send goes straight to the public flow, not the /send-choice hub: neither of
// the hub's other options can spend this balance — private send draws on the
// encrypted balance, and fiat isn't built.
const ACTIONS: QuickAction[] = [
  { key: 'swap', label: 'Swap', iconKey: 'swap', route: '/swap' },
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send/flow' },
  {
    key: 'receive',
    label: 'Receive',
    iconKey: 'arrDownLeft',
    route: '/receive-qr',
  },
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
      title="Public Balance"
      iconImage={require('@/assets/images/coin.png')}
      balanceUSD={bal.data?.totalUSD ?? 0}
      assets={assets}
      belowBalance={<StlfSwapCta />}
      bottomBar={<QuickActionMenu actions={ACTIONS} />}
      tone="silver"
    />
  );
}
