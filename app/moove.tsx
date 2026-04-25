import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function MooveModal() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-gold font-serif text-4xl">Moove</Text>
        <Text className="text-ink-faint mt-2">bridge — TODO</Text>
      </View>
    </Frame>
  );
}
