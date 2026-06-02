import { View } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SwipePager } from '@/src/design-system/primitives/SwipePager';
import { CarouselDots } from '@/src/design-system/primitives/CarouselDots';
import { BalanceCard } from './BalanceCard';
import type { HomeBalances } from '../lib/aggregateHomeBalances';
import type { HomeCardId } from '../lib/homeCardActions';

export const HOME_CARDS: { id: HomeCardId; kicker: string }[] = [
  { id: 'total', kicker: 'Total balance' },
  { id: 'bank', kicker: 'Bank wallet' },
  { id: 'stealf', kicker: 'Stealf wallet · public' },
  { id: 'encrypted', kicker: 'Encrypted balance' },
];

type Props = {
  balances: HomeBalances;
  hidden?: boolean;
  index: number;
  onIndexChange: (i: number) => void;
};

const usdFor = (id: HomeCardId, b: HomeBalances) =>
  id === 'total' ? b.totalUSD : id === 'bank' ? b.bankUSD : id === 'stealf' ? b.stealfUSD : b.encryptedUSD;

// Gold wash that fades in as the pager approaches the Encrypted page (index 3).
// zIndex:-1 keeps it behind the cards (it renders after them via the render-prop).
function GoldHalo({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [2.2, 3], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: -40, left: 0, right: 0, height: 220, zIndex: -1 },
        style,
      ]}
    >
      <LinearGradient colors={['rgba(201,168,106,0.18)', 'transparent']} style={{ flex: 1 }} />
    </Animated.View>
  );
}

export function BalanceCarousel({ balances, hidden, index, onIndexChange }: Props) {
  const pages = HOME_CARDS.map((c) => (
    <BalanceCard key={c.id} kicker={c.kicker} amountUSD={usdFor(c.id, balances)} hidden={hidden} />
  ));
  return (
    <SwipePager pages={pages} index={index} onIndexChange={onIndexChange}>
      {(progress) => (
        <>
          <GoldHalo progress={progress} />
          <View style={{ marginTop: 14 }}>
            <CarouselDots count={HOME_CARDS.length} progress={progress} onSelect={onIndexChange} />
          </View>
        </>
      )}
    </SwipePager>
  );
}
