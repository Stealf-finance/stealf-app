import { useLocalSearchParams } from 'expo-router';
import { AddFundsScreen } from '@/src/features/add-funds/AddFundsScreen';
import { Tone } from '@/src/design-system/palettes';

export default function AddFundsModal() {
  const { tone } = useLocalSearchParams<{ tone?: string }>();
  const resolvedTone: Tone = tone === 'silver' ? 'silver' : 'gold';
  return <AddFundsScreen tone={resolvedTone} />;
}
