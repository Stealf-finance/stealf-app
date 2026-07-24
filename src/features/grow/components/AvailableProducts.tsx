import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useJitoApy } from '../hooks/useJitoApy';
import { useJitoSolPosition } from '../hooks/useJitoSolBalance';

const S = txPalette('silver');

/** Shown while the live pool APY is loading or unavailable (e.g. a devnet RPC,
 *  where the mainnet-only Jito pool account doesn't exist). */
const FALLBACK_APY_PCT = 0.00;

export function AvailableProducts() {
  return (
    <View>
      <Text
        style={[
          sansation,
          {
            fontSize: 18,
            lineHeight: 24,
            fontWeight: '600',
            letterSpacing: -0.2,
            color: S.ink,
            marginBottom: 12,
          },
        ]}
      >
        Available products
      </Text>

      <JitoProductCard />
    </View>
  );
}

function JitoProductCard() {
  const router = useSafeRouter();
  const { data: apy } = useJitoApy();
  const apyPct = typeof apy === 'number' ? apy : FALLBACK_APY_PCT;
  const apyLabel = `${apyPct.toFixed(2)}% APY`;
  const { usdValue } = useJitoSolPosition();
  const balanceLabel = usdValue > 0 ? `$${usdValue.toFixed(2)}` : '$0';

  return (
    <Pressable onPress={() => router.push('/jitosol')}>
      <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
      {/* Header: logo + (title row with APY pill → kicker) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Image
          source={require('@/assets/images/jito.png')}
          style={{ width: 44, height: 44, borderRadius: 22 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 17,
                  lineHeight: 22,
                  fontWeight: '600',
                  letterSpacing: -0.2,
                  color: S.ink,
                  flexShrink: 1,
                },
              ]}
              numberOfLines={1}
            >
              Liquid staking
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Text
                style={[
                  sansation,
                  { fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.green },
                ]}
              >
                {apyLabel}
              </Text>
            </View>
          </View>
          <Text
            style={[sansation, { fontSize: 13, lineHeight: 18, color: S.inkDim, marginTop: 3 }]}
          >
            Jito
          </Text>
        </View>
      </View>

      {/* Position stats. Balance is live; Earning needs a cost basis we don't
          track yet, so it stays a placeholder for now. */}
      <View style={{ flexDirection: 'row', marginTop: 18 }}>
        <CardStat label="Balance" value={balanceLabel} />
        <CardStat label="Earning" value="$0" />
        <CardStat label="Type" value="Staking" />
      </View>
      </BlurGlass>
    </Pressable>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[sansation, { fontSize: 12, lineHeight: 16, color: S.inkFaint }]}>
        {label}
      </Text>
      <Text
        style={[sansation, { fontSize: 15, lineHeight: 20, fontWeight: '500', color: S.ink, marginTop: 4 }]}
      >
        {value}
      </Text>
    </View>
  );
}
