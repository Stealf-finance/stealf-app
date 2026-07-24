/**
 * The xStocks catalogue as rendered in the Earn screen's "Available products"
 * section, below the JitoSOL card. Live from the backend; renders nothing until
 * the catalogue loads (or if it's empty / errors).
 */
import { View } from 'react-native';
import { useXstockAssets } from '../hooks/useXstockAssets';
import { XstockCard } from './XstockCard';

export function AvailableStocks() {
  const { data: assets } = useXstockAssets();

  if (!assets || assets.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      {assets.map((asset) => (
        <XstockCard key={asset.id} asset={asset} />
      ))}
    </View>
  );
}
