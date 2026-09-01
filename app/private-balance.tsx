import { Pressable } from 'react-native';
import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import {
  QuickActionMenu,
  type QuickAction,
} from '@/src/components/nav/QuickActionMenu';
import { VaultGlyph } from '@/src/design-system/icons/VaultGlyph';
import { ShieldPromptRow } from '@/src/features/shield/components/ShieldPromptRow';
import { useEncryptedBalances } from '@/src/features/umbra/hooks/useEncryptedBalances';
import { UmbraSetupOverlay } from '@/src/features/umbra/components/UmbraSetupOverlay';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

const ACTIONS: QuickAction[] = [
  { key: 'shield', label: 'Shield', iconKey: 'shieldFull', route: '/shield' },
  {
    key: 'unshield',
    label: 'Unshield',
    iconKey: 'shieldSplit',
    route: '/unshield',
  },
  {
    key: 'send',
    label: 'Private Send',
    iconKey: 'arrUpRight',
    route: '/send/flow?mode=private',
  },
];

export default function EncryptedScreen() {
  const router = useSafeRouter();
  const encrypted = useEncryptedBalances();

  // See the note in public-balance: `undefined` means "not known yet", which
  // an `?? []` would flatten into "this wallet is empty".
  const assets = encrypted.data?.tokens.map((t) => ({
    key: t.mint,
    iconSource: t.iconUri ? { uri: t.iconUri } : undefined,
    symbol: t.symbol,
    caption: t.amount > 0 ? `${trim(t.amount)} · encrypted` : 'encrypted',
    priceLabel: `$${t.amountUSD.toFixed(2)}`,
  }));

  // UmbraSetupOverlay carries the one-time Umbra registration and self-hides
  // once the wallet is registered.
  return (
    <>
      <WalletScreen
        title="Private Balance"
        iconImage={require('@/assets/images/shield.png')}
        balanceUSD={encrypted.data?.totalUSD}
        assets={assets}
        error={encrypted.isError}
        belowBalance={<ShieldPromptRow />}
        headerRight={
          <Pressable
            onPress={() => router.push('/claims?target=encrypted')}
            accessibilityRole="button"
            accessibilityLabel="Claim"
            hitSlop={12}
          >
            <VaultGlyph width={30} />
          </Pressable>
        }
        bottomBar={<QuickActionMenu actions={ACTIONS} />}
        tone="gold"
      />
      <UmbraSetupOverlay onClose={() => router.back()} />
    </>
  );
}
