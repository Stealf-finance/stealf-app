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

/** Top bar. On the public cards it shows the time-based greeting + a Cards
 *  shortcut. On the private cards (Wallet / Encrypted balance) the greeting
 *  and Cards shortcut are dropped in favour of a History shortcut. */
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
      {isPrivate ? (
        // Greeting dropped on the private cards — a Claim shortcut takes the
        // left slot (space-between keeps the right icons right-aligned).
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
      ) : (
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
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {isPrivate ? (
          <CircleIconBtn
            iconKey="history"
            tone="silver"
            accessibilityLabel="Transaction history"
            onPress={() => router.push('/transactions?wallet=stealth')}
          />
        ) : (
          <CircleIconBtn iconKey="card" tone="silver" onPress={() => soon('Cards')} />
        )}
        <CircleIconBtn
          iconKey="bell"
          tone="silver"
          hasDot
          onPress={() => soon('Notifications')}
        />
      </View>
    </View>
  );
}
