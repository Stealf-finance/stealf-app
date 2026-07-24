/**
 * "Tokenized Stocks" group card for the Earn screen's "Available products"
 * section, below the JitoSOL card. One BlurGlass card: title + provider
 * subtitle, then a row per xStock (logo + name + live price). Renders nothing
 * until the catalogue loads.
 */
import { Text } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { useXstockAssets } from '../hooks/useXstockAssets';
import { XstockRow } from './XstockRow';

const S = txPalette('silver');

export function AvailableStocks() {
  const { data: assets } = useXstockAssets();

  if (!assets || assets.length === 0) return null;

  return (
    <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
      <Text
        style={[sansation, { fontSize: 17, lineHeight: 22, fontWeight: '600', color: S.ink }]}
      >
        Tokenized Stocks
      </Text>
      <Text
        style={[sansation, { fontSize: 13, lineHeight: 18, color: S.inkDim, marginTop: 2, marginBottom: 6 }]}
      >
        Tokenized US equities · xStocks
      </Text>

      {assets.map((asset) => (
        <XstockRow key={asset.id} asset={asset} />
      ))}
    </BlurGlass>
  );
}
