import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Kicker } from '@/src/design-system/primitives/Kicker';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center gap-3">
        <Kicker>— a new bank for —</Kicker>
        <Kicker color="#c9a86a">step 1 of 4</Kicker>
        <Kicker>— stealf · virtual —</Kicker>
      </View>
    </Frame>
  );
}
