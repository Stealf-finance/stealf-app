import { View } from 'react-native';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { VaultGlyph } from '@/src/design-system/icons/VaultGlyph';
import { GreetingSlot } from '@/src/components/GreetingSlot';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import type { HomeCardId } from '../lib/homeCardActions';

/** Top bar. The greeting (or a live pending-op indicator) sits on the left;
 *  the right holds quick shortcuts — Cards on the public cards, History +
 *  Claim on the private ones, plus History on Bank. */
export function HomeHeader({ card }: { card: HomeCardId }) {
  const { show } = useToast();
  const router = useSafeRouter();
  const soon = (label: string) =>
    show({ kind: 'info', title: 'Coming soon', message: `${label} are coming soon.` });

  const isPrivate = card === 'stealf' || card === 'encrypted';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <GreetingSlot />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {isPrivate ? (
          <>
            <CircleIconBtn
              iconKey="history"
              tone="silver"
              accessibilityLabel="Transaction history"
              onPress={() => router.push('/transactions?wallet=stealth')}
            />
            <CircleIconBtn
              icon={<VaultGlyph width={26} />}
              tone="silver"
              accessibilityLabel="Claim pending transfers"
              // Both private cards (Wallet + Encrypted balance) claim incoming
              // private transfers into the encrypted balance.
              onPress={() => router.push('/claims?target=encrypted')}
            />
          </>
        ) : (
          <>
            {card === 'bank' ? (
              <CircleIconBtn
                iconKey="history"
                tone="silver"
                accessibilityLabel="Transaction history"
                onPress={() => router.push('/transactions')}
              />
            ) : null}
            <CircleIconBtn iconKey="card" tone="silver" onPress={() => soon('Cards')} />
          </>
        )}
      </View>
    </View>
  );
}
