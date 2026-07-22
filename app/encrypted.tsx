import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { WalletBottomBar } from '@/src/features/wallet-detail/WalletBottomBar';
import { type QuickAction } from '@/src/components/nav/QuickActionMenu';
import { useEncryptedBalances } from '@/src/features/stealth/hooks/useEncryptedBalances';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  { key: 'shield', label: 'Shield', iconKey: 'shieldFull', route: '/shield' },
  { key: 'unshield', label: 'Unshield', iconKey: 'shieldSplit', route: '/unshield' },
  { key: 'swap', label: 'Swap', iconKey: 'swap' }, // not built yet
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send/flow?mode=private&wallet=stealth' },
];

export default function EncryptedScreen() {
  const encrypted = useEncryptedBalances();

  const assets = (encrypted.data?.tokens ?? []).map((t) => ({
    key: t.mint,
    iconSource: t.iconUri ? { uri: t.iconUri } : undefined,
    symbol: t.symbol,
    caption: t.amount > 0 ? `${trim(t.amount)} · encrypted` : 'encrypted',
    priceLabel: `$${t.amountUSD.toFixed(2)}`,
  }));

  return (
    <WalletScreen
      title="Encrypted Balance"
      iconImage={require('@/assets/images/shield.png')}
      balanceUSD={encrypted.data?.totalUSD ?? 0}
      assets={assets}
      bottomBar={
        <WalletBottomBar
          fabActions={ACTIONS}
          historyRoute="/transactions?wallet=stealth"
          claimTarget="encrypted"
        />
      }
      tone="gold"
    />
  );
}
