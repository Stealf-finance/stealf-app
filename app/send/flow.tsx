import { useLocalSearchParams } from 'expo-router';
import { SendFlow } from '@/src/features/send/SendFlow';
import { Tone } from '@/src/design-system/palettes';

export default function SendFlowRoute() {
  const { tone, wallet, mode } = useLocalSearchParams<{
    tone?: string;
    wallet?: string;
    mode?: string;
  }>();
  const resolvedTone: Tone = tone === 'gold' ? 'gold' : 'silver';
  const resolvedWallet =
    wallet === 'stealth' ? 'stealth' : wallet === 'bank' ? 'bank' : undefined;
  const resolvedMode = mode === 'private' ? 'private' : 'public';
  return (
    <SendFlow
      tone={resolvedTone}
      wallet={resolvedWallet}
      mode={resolvedMode}
    />
  );
}
