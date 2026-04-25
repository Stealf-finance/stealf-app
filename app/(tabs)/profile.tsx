import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function ProfileTab() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">Profile — TODO</Text>
      </View>
    </Frame>
  );
}
