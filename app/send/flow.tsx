import { useLocalSearchParams } from 'expo-router';
import { SendFlow } from '@/src/features/send/SendFlow';

export default function SendFlowRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <SendFlow mode={mode === 'private' ? 'private' : 'public'} />;
}
