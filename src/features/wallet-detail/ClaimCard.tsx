import { Pressable, Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { usePendingClaimsForCash } from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';

/**
 * Full-width gold "Claim" button (matching the FAB accent) rendered under a
 * wallet balance; opens the claims scan. A dark dot marks it when incoming
 * transfers are pending.
 */
export function ClaimCard({ target = 'bank' }: { target?: 'bank' | 'encrypted' }) {
  const router = useSafeRouter();
  const isEncrypted = target === 'encrypted';
  // Read-only cache slices (the claims screen owns the forced scan).
  const cash = usePendingClaimsForCash();
  const inbound = usePendingClaims();
  const hasPending = ((isEncrypted ? inbound.data : cash.data)?.length ?? 0) > 0;

  return (
    <Pressable
      onPress={() => router.push(isEncrypted ? '/claims?target=encrypted' : '/claims')}
      accessibilityRole="button"
      accessibilityLabel="Claim incoming transfers"
      style={{
        backgroundColor: T.gold,
        borderRadius: 18,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[sansationBold, { fontSize: 16, color: '#0a0a0a' }]}>Claim</Text>
      {hasPending ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#0a0a0a',
          }}
        />
      ) : null}
    </Pressable>
  );
}
