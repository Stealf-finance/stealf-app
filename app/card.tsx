import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function CardModal() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">card — TODO</Text>
      </View>
    </Frame>
  );
}
