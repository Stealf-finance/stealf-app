import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/** Transparent (blurred glass) "Claim" pill shown right under the bank balance —
 *  same glassmorphism treatment as GetBankAccountCard. Opens the claims screen. */
export function BankClaimButton() {
  const router = useSafeRouter();

  return (
    <Pressable
      onPress={() => router.push('/receive/claims')}
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
          borderWidth: 1,
          borderColor: T.hairlineStrong,
        }}
      >
        <BlurView
          intensity={28}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={{
            paddingVertical: 11,
            paddingHorizontal: 30,
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
    </Pressable>
  );
}
