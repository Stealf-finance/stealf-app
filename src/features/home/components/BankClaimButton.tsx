import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/** Transparent glass "Claim" pill shown right under the bank balance. Opens the
 *  claims screen (pending private transfers claimable to the bank wallet). */
export function BankClaimButton() {
  const router = useSafeRouter();
  const { data: pendingClaims } = usePendingClaims();
  const count = pendingClaims?.length ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/receive/claims')}
      accessibilityRole="button"
      accessibilityLabel="Claim pending transfers"
      style={({ pressed }) => ({
        alignSelf: 'center',
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 11,
          paddingHorizontal: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: 1,
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {count > 0 ? `Claim · ${count}` : 'Claim'}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
