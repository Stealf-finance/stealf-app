import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

/** Promo card (glassmorphism): CTA to open a virtual bank account. Opens the
 *  (coming-soon, sample-data) Account details page. */
export function GetBankAccountCard() {
  const router = useSafeRouter();
  return (
    <Pressable
      onPress={() => router.push('/account-details')}
      style={({ pressed }) => ({ marginTop: 22, opacity: pressed ? 0.85 : 1 })}
    >
      {/* Outer view clips the blur to the rounded corners + carries the border. */}
      <View
        style={{
          borderRadius: 22,
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <Image
            source={require('@/assets/images/bank-icon.png')}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 46, height: 46 }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[sansation, { fontSize: 16, color: T.ink, fontWeight: '600' }]}>
              Get your bank account
            </Text>
            <Text
              style={[sansationLight, { fontSize: 12, color: T.inkDim, marginTop: 3 }]}
              numberOfLines={2}
            >
              Open a virtual IBAN to send and receive money.
            </Text>
          </View>
          <Icons.arrUpRight size={18} color={T.inkFaint} />
        </BlurView>
      </View>
    </Pressable>
  );
}
