import { useLocalSearchParams } from 'expo-router';
import { SendFlow } from '@/src/features/send/SendFlow';
import { Tone } from '@/src/design-system/palettes';

export default function SendRoute() {
  const { tone, wallet } = useLocalSearchParams<{
    tone?: string;
    wallet?: string;
  }>();
  const resolvedTone: Tone = tone === 'gold' ? 'gold' : 'silver';
  const resolvedWallet =
    wallet === 'stealth' ? 'stealth' : wallet === 'bank' ? 'bank' : undefined;
  return <SendFlow tone={resolvedTone} wallet={resolvedWallet} />;
}
