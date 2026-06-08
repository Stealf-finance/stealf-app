import { Text, View } from 'react-native';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { VaultGlyph } from '@/src/design-system/icons/VaultGlyph';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { getGreeting } from '@/src/lib/greeting';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import type { HomeCardId } from '../lib/homeCardActions';

/** Top bar. The time-based greeting sits on the left; the right holds quick
 *  shortcuts — a Cards button on the public cards, and History + Claim on the
 *  private cards (Wallet / Encrypted balance). */
export function HomeHeader({ card }: { card: HomeCardId }) {
  const { show } = useToast();
  const { user } = useAuth();
  const router = useSafeRouter();
  const greeting = getGreeting();
  const username = user?.username ?? '';
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
      <Text
        style={[sansation, { flex: 1, fontSize: 14, color: T.inkDim }]}
        numberOfLines={1}
      >
        {greeting}
        {username ? ', ' : ''}
        {username ? (
          <Text style={{ color: T.ink, fontWeight: '600' }}>{username}</Text>
        ) : null}
      </Text>

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
              onPress={() =>
                router.push(
                  card === 'encrypted' ? '/claims?target=encrypted' : '/claims',
                )
              }
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
