/**
 * Conversion row on Public Balance: pushes idle cash into STLF, Stealf's
 * yield-bearing stablecoin (backed by Reflect USDC+). Taps into /stlf-buy.
 */
import { Text } from 'react-native';
import { Image } from 'expo-image';
import { OutlinedRow } from '@/src/design-system/primitives/OutlinedRow';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useReflectStats } from '../hooks/useReflectData';

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
  const apyLabel = `${apyPct.toFixed(2)}% APY`;

  return (
    <OutlinedRow
      onPress={() => router.push('/stlf-buy')}
      accessibilityLabel={`Earn ${apyPct.toFixed(2)} percent APY on Stealf stablecoin`}
      icon={
        // The Stealf mark doubles as the STLF token icon. The asset is a black
        // tile with the glyph centred, so it rounds into a coin.
        <Image
          source={require('@/assets/images/icon.png')}
          style={{ width: 34, height: 34, borderRadius: 17 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      }
      title={
        <>
          Earn <Text style={{ color: T.green }}>{apyLabel}</Text>
        </>
      }
      subtitle="on Stealf stablecoin"
    />
  );
}
