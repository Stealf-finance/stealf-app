/**
 * "Tokenized Stocks" group card for the Earn screen's "Available products"
 * section, below the JitoSOL card. One BlurGlass card: title + provider
 * subtitle, then a row per xStock (logo + name + live price).
 *
 * The card used to render nothing until the catalogue loaded, which made the
 * whole section appear late and looked identical to an empty catalogue and to
 * a failed fetch. It now holds its shape while loading, and says so when the
 * catalogue can't be reached — see `resolveCatalogueState` for why that isn't
 * the same as hiding it.
 */
import { Text } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { resolveCatalogueState } from '../lib/catalogueState';
import { useXstockAssets } from '../hooks/useXstockAssets';
import { XstockRow, XstockRowSkeleton } from './XstockRow';

const S = txPalette('silver');

export function AvailableStocks() {
  const { data: assets, isError } = useXstockAssets();
  const state = resolveCatalogueState(assets, isError);

  if (state === 'hidden') return null;

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

      {state === 'skeleton' ? (
        [0, 1, 2].map((i) => <XstockRowSkeleton key={i} />)
      ) : state === 'error' ? (
        <Text
          style={[sansation, { fontSize: 14, color: S.inkFaint, paddingVertical: 16 }]}
        >
          Couldn&apos;t load the catalogue.
        </Text>
      ) : (
        assets?.map((asset) => <XstockRow key={asset.id} asset={asset} />)
      )}
    </BlurGlass>
  );
}
