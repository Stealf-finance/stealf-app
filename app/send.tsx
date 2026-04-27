import { useLocalSearchParams } from 'expo-router';
import { SendFlow } from '@/src/features/send/SendFlow';
import { Tone } from '@/src/design-system/palettes';

export default function SendRoute() {
  const { tone } = useLocalSearchParams<{ tone?: string }>();
  const resolvedTone: Tone = tone === 'gold' ? 'gold' : 'silver';
  return <SendFlow tone={resolvedTone} />;
}
