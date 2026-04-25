import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { BalanceLarge } from '@/src/design-system/primitives/BalanceLarge';
import { Dots } from '@/src/design-system/primitives/Dots';
import { CarouselBar } from '@/src/design-system/primitives/CarouselBar';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 justify-center" style={{ paddingHorizontal: 24, gap: 32 }}>
        <BalanceLarge amount="3,847.20" align="center" />
        <Dots count={4} active={1} />
        <CarouselBar count={3} active={0} labels={['Today', 'Week', 'Month']} />
      </View>
    </Frame>
  );
}
