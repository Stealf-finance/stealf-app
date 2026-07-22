import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { VaultGlyph } from '@/src/design-system/icons/VaultGlyph';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { QuickActionMenu, type QuickAction } from '@/src/components/nav/QuickActionMenu';

/**
 * Wallet-detail bottom bar: a History + Claim pill (left) and a per-screen "+"
 * FAB (right), mirroring the home nav. The FAB's menu is the screen's actions.
 */
export function WalletBottomBar({
  fabActions,
  historyRoute,
  claimTarget,
}: {
  fabActions: QuickAction[];
  historyRoute: string;
  claimTarget: 'bank' | 'encrypted';
}) {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const claimRoute =
    claimTarget === 'encrypted' ? '/claims?target=encrypted' : '/claims';

  return (
    <>
      <View style={{ position: 'absolute', left: 24, bottom: insets.bottom + 8, zIndex: 20 }}>
        <BlurGlass
          radius={30}
          innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 }}
        >
          <Pressable
            onPress={() => router.push(historyRoute as never)}
            accessibilityRole="button"
            accessibilityLabel="History"
            style={{ width: 64, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icons.clock size={24} color={T.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push(claimRoute as never)}
            accessibilityRole="button"
            accessibilityLabel="Claim"
            style={{ width: 64, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
          >
            <VaultGlyph width={30} />
          </Pressable>
        </BlurGlass>
      </View>

      <QuickActionMenu actions={fabActions} />
    </>
  );
}
