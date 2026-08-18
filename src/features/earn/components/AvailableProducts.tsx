/**
 * The Earn screen's "Available products" hub. Composes the product features —
 * STLF savings (reflect), JitoSOL liquid staking (jito) and Tokenized Stocks
 * (xstocks) — under one section header. Add future products (lending, etc.) here.
 */
import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { StlfProductCard } from '@/src/features/reflect/components/StlfProductCard';
import { JitoProductCard } from '@/src/features/jito/components/JitoProductCard';
import { AvailableStocks } from '@/src/features/xstocks/components/AvailableStocks';

const S = txPalette('silver');

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

      <View style={{ gap: 12 }}>
        <StlfProductCard />
        <JitoProductCard />
        <AvailableStocks />
      </View>
    </View>
  );
}
