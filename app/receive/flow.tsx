import { useLocalSearchParams } from 'expo-router';
import { AddFundsScreen } from '@/src/features/add-funds/AddFundsScreen';
import { Tone } from '@/src/design-system/palettes';

export default function ReceiveFlowRoute() {
  const { tone, wallet } = useLocalSearchParams<{
    tone?: string;
    wallet?: string;
  }>();
  const resolvedTone: Tone = tone === 'silver' ? 'silver' : 'gold';
  const resolvedWallet =
    wallet === 'stealth' ? 'stealth' : wallet === 'bank' ? 'bank' : undefined;
  return <AddFundsScreen tone={resolvedTone} wallet={resolvedWallet} />;
}
