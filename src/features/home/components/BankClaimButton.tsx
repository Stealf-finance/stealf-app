import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { usePendingClaimsForCash } from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';

/** Transparent (blurred glass) "Claim" pill shown right under the balance —
 *  same glassmorphism treatment as GetBankAccountCard. Opens the claims screen.
 *  Shows a gold dot when there are private transfers waiting to be claimed.
 *
 *  `target` selects the claim destination (and therefore which pending notes
 *  the dot reflects): `bank` → claim out to the public bank wallet, `encrypted`
 *  → claim into the encrypted balance. */
export function BankClaimButton({
  target = 'bank',
}: {
  target?: 'bank' | 'encrypted';
}) {
  const router = useSafeRouter();
  const isEncrypted = target === 'encrypted';
  // Read-only cache slices (no forced scan here — the claims screen owns that).
  const cash = usePendingClaimsForCash();
  const inbound = usePendingClaims();
  const pending = isEncrypted ? inbound.data : cash.data;
  const hasPending = (pending?.length ?? 0) > 0;

  return (
    <Pressable
      onPress={() =>
        router.push(isEncrypted ? '/claims?target=encrypted' : '/claims')
      }
      accessibilityRole="button"
      accessibilityLabel="Claim pending transfers"
      style={({ pressed }) => ({
        alignSelf: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Rounding + border live on a static View (clips the blur to the
          rounded corners) — same pattern as GetBankAccountCard. */}
      <View
        style={{
          borderRadius: 100,
          overflow: 'hidden',
        }}
      >
        <BlurView
          intensity={28}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={{
            paddingVertical: 9,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
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
            Claim
          </Text>
        </BlurView>
      </View>

      {/* Gold dot — signals private transfers are waiting to be claimed. */}
      {hasPending ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 3,
            right: 2,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: '#dcdce1',
          }}
        />
      ) : null}
    </Pressable>
  );
}
