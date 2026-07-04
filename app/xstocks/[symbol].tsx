import { useLocalSearchParams } from 'expo-router';
import { XstockDetailScreen } from '@/src/features/xstocks/screens/XstockDetailScreen';

export default function XstockDetailRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return <XstockDetailScreen symbol={symbol} />;
}
