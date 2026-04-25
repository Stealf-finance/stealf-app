import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function BankTab() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">Bank — TODO</Text>
      </View>
    </Frame>
  );
}
