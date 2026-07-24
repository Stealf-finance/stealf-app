import { useLocalSearchParams } from 'expo-router';
import { TradeFlow } from '@/src/features/xstocks/TradeFlow';

export default function XstockTradeRoute() {
  const { symbol, mode } = useLocalSearchParams<{ symbol: string; mode?: string }>();
  return <TradeFlow symbol={symbol ?? ''} mode={mode === 'sell' ? 'sell' : 'buy'} />;
}
