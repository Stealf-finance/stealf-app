import { Text, View } from 'react-native';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getGreeting } from '@/src/lib/greeting';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/** Top bar: time-based greeting + card / notifications shortcuts. */
export function HomeHeader() {
  const { show } = useToast();
  const { user } = useAuth();
  const greeting = getGreeting();
  const username = user?.username ?? '';
  const soon = (label: string) =>
    show({ kind: 'info', title: 'Coming soon', message: `${label} are coming soon.` });

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
        <CircleIconBtn iconKey="card" tone="silver" onPress={() => soon('Cards')} />
        <CircleIconBtn iconKey="bell" tone="silver" hasDot onPress={() => soon('Notifications')} />
      </View>
    </View>
  );
}
