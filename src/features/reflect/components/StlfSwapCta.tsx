/**
 * Conversion row on Public Balance: pushes idle cash into STLF, Stealf's
 * yield-bearing stablecoin (backed by Reflect USDC+).
 *
 * A single tappable row — mark, the APY pitch, chevron — outlined rather than
 * filled, the same grey-contour treatment as the Points card on Profile.
 */
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useReflectStats } from '../hooks/useReflectData';

const S = txPalette('silver');

/** Shown while the live holder APY is loading or unavailable — same fallback
 *  as the Earn product cards. */
const FALLBACK_APY_PCT = 0.0;

export function StlfSwapCta() {
  const router = useSafeRouter();
  const { data: stats } = useReflectStats();

  const apyPct =
    typeof stats?.realtimeApy === 'number'
      ? stats.realtimeApy
      : FALLBACK_APY_PCT;

  return (
    <Pressable
      onPress={() => router.push('/stlf-buy')}
      accessibilityRole="button"
      accessibilityLabel={`Earn ${apyPct.toFixed(2)} percent APY on Stealf stablecoin`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      >
        {/* The Stealf mark doubles as the STLF token icon. The asset is a
            black tile with the glyph centred, so it rounds into a coin. */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={{ width: 34, height: 34, borderRadius: 17 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 15,
                lineHeight: 20,
                fontWeight: '600',
                letterSpacing: -0.2,
                color: S.ink,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            Earn{' '}
            <Text style={{ color: T.green }}>{apyPct.toFixed(2)}% APY</Text>
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                lineHeight: 17,
                color: S.inkDim,
                marginTop: 2,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            on Stealf stablecoin
          </Text>
        </View>

        <Icons.chevR size={14} color={S.inkFaint} />
      </View>
    </Pressable>
  );
}
