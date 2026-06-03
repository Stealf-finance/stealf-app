import { View } from 'react-native';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';

/** Claim pending private transfers into the bank wallet. Shown under the bank
 *  balance on the Home carousel. */
export function BankClaimButton() {
  const router = useSafeRouter();
  const { data: pendingClaims } = usePendingClaims();
  const count = pendingClaims?.length ?? 0;

  return (
    <View style={{ marginBottom: 18 }}>
      <PillBtn
        label={count > 0 ? `Claim · ${count}` : 'Claim'}
        variant="primary"
        tone="gold"
        onPress={() => router.push('/receive/claims')}
      />
    </View>
  );
}
