/**
 * Bank products rail for the Cash screen, shown directly under the balance.
 * A horizontal row of BlurGlass tiles (same chrome as the Earn cards): Card,
 * Virtual bank account, Loan. The rail bleeds past the screen's 24px gutter so
 * tiles scroll off the right edge.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const S = txPalette('silver');

const GUTTER = 24; // matches WalletScreen's contentContainer paddingHorizontal
const TILE_W = 160;
const TILE_H = 146;
const ICON = 48; // bare 3D PNG, Home-card language

function ProductTile({
  title,
  image,
  onPress,
}: {
  title: string;
  image: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <BlurGlass radius={22} innerStyle={{ width: TILE_W, height: TILE_H, padding: 14 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          style={[
            sansation,
            {
              fontSize: 13,
              lineHeight: 17,
              fontWeight: '600',
              letterSpacing: -0.2,
              color: S.inkDim,
              includeFontPadding: false,
            },
          ]}
        >
          {title}
        </Text>
        <View style={{ marginTop: 14 }}>
          <Image
            source={image}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: ICON, height: ICON }}
          />
        </View>
      </BlurGlass>
    </Pressable>
  );
}

export function BankProducts() {
  const router = useSafeRouter();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -GUTTER }}
      contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
    >
      <ProductTile
        title="Card"
        image={require('@/assets/images/card.png')}
        onPress={() => router.push('/card')}
      />
      <ProductTile
        title="Virtual bank account"
        image={require('@/assets/images/bank.png')}
      />
      <ProductTile title="Loan" image={require('@/assets/images/loan.png')} />
    </ScrollView>
  );
}
