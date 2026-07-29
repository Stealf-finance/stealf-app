import { Text } from 'react-native';
import { getGreeting } from '@/src/lib/greeting';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

/** The navbar left slot: the time-based greeting. Transaction progress now
 *  surfaces as a sonner toast rather than taking over this slot. */
export function GreetingSlot() {
  const greeting = getGreeting();
  const { user } = useAuth();
  const username = user?.username ?? '';

  return (
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
  );
}
