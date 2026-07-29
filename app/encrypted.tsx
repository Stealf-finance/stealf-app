import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { WalletBottomBar } from '@/src/features/wallet-detail/WalletBottomBar';
import { type QuickAction } from '@/src/components/nav/QuickActionMenu';
import { useEncryptedBalances } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { StealthWalletGate } from '@/src/features/stealth/screens/StealthWalletGate';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  { key: 'shield', label: 'Shield', iconKey: 'shieldFull', route: '/shield' },
  { key: 'move', label: 'Move', iconKey: 'moove', route: '/moove' },
  { key: 'unshield', label: 'Unshield', iconKey: 'shieldSplit', route: '/unshield' },
  { key: 'swap', label: 'Private Swap', iconKey: 'swap' }, // not built yet
  { key: 'send', label: 'Private Send', iconKey: 'arrUpRight', route: '/send/flow?mode=private&wallet=stealth' },
];

export default function EncryptedScreen() {
  const router = useSafeRouter();
  const encrypted = useEncryptedBalances();

  const assets = (encrypted.data?.tokens ?? []).map((t) => ({
    key: t.mint,
    iconSource: t.iconUri ? { uri: t.iconUri } : undefined,
    symbol: t.symbol,
    caption: t.amount > 0 ? `${trim(t.amount)} · encrypted` : 'encrypted',
    priceLabel: `$${t.amountUSD.toFixed(2)}`,
  }));

  // Gate on the stealth wallet — no wallet yet renders the create/import setup
  // screen. Once a wallet exists, StealthSetupOverlay adds the Umbra
  // registration step (self-hides once registered). Both dismiss this route.
  return (
    <StealthWalletGate onExit={() => router.back()}>
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
      <StealthSetupOverlay onClose={() => router.back()} />
    </StealthWalletGate>
  );
}
