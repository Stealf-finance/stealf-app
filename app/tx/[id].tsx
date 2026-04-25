import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function TxDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">tx · {id ?? 'unknown'} — TODO</Text>
      </View>
    </Frame>
  );
}
