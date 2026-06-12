import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';

/** Promo card (glassmorphism): CTA to open a virtual bank account. */
export function GetBankAccountCard() {
  const { show } = useToast();
  return (
    <Pressable
      onPress={() =>
        show({
          kind: 'info',
          title: 'Coming soon',
          message: 'Virtual bank accounts are coming soon.',
        })
      }
      style={({ pressed }) => ({ marginTop: 22, opacity: pressed ? 0.85 : 1 })}
    >
      {/* Outer view clips the blur to the rounded corners. */}
      <View
        style={{
          borderRadius: 22,
          overflow: 'hidden',
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
              Get your virtual bank account
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
