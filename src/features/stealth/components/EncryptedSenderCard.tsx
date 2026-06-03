// src/features/stealth/components/EncryptedSenderCard.tsx
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { sansation } from '@/src/design-system/typography';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';


export function EncryptedSenderCard() {
  const router = useSafeRouter();
  const { data: pendingClaims } = usePendingClaims();
  const count = pendingClaims?.length ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/receive/claims')}
      accessibilityRole="button"
      accessibilityLabel="Vault, private transfers ready to claim"
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 15,
          paddingHorizontal: 16,
        }}
      >
        {/* top inset highlight — matches GlassTile */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <Image
          source={require('@/assets/images/Lock.png')}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={{ width: 50, height: 50 }}
        />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[sansation, { fontSize: 16, color: T.ink, includeFontPadding: false }]}>
            Vault
          </Text>
          <Text
            style={[
              sansation,
              { fontSize: 13, color: T.inkDim, marginTop: 3, includeFontPadding: false },
            ]}
          >
            Private transfers ready to claim
          </Text>
        </View>

        {count > 0 ? (
          <View
            style={{
              minWidth: 22,
              height: 22,
              paddingHorizontal: 7,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[sansation, { fontSize: 12, fontWeight: '600', color: T.ink }]}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        ) : (
          <Icons.chevR size={16} color={T.inkFaint} />
        )}
      </LinearGradient>
    </Pressable>
  );
}
