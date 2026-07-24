/**
 * "Available products" section for the Earn screen — a catalog of yield
 * products the user can put money into. For now a single static JitoSOL
 * (liquid staking) card; the actual stake flow (`services/jitoSOL`) is wired
 * in a follow-up. APY is hardcoded to match the old GrowHub figure (7.84%).
 *
 * Card chrome is `BlurGlass` (radius 22, dark tint, 5% white veil) — the same
 * primitive the Home grid cards use. Typography is `sansation` throughout (one
 * family, varied by size/weight/color) like the wallet screens and Home cards.
 * APY sits in a neutral pill on the right, aligned with the product title.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

const JITO_APY = '7.84%';

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
  return (
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
                  { fontSize: 12, lineHeight: 16, fontWeight: '600', color: S.inkDim },
                ]}
              >
                {JITO_APY} APY
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

      {/* Description */}
      <Text
        style={[
          sansation,
          { fontSize: 14, lineHeight: 20, color: S.inkDim, marginTop: 16 },
        ]}
      >
        Stake SOL with Jito to earn staking rewards — your SOL keeps working
        while it stays liquid.
      </Text>
    </BlurGlass>
  );
}
