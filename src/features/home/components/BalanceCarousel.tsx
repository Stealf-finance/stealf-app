import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { txPalette } from '@/src/design-system/palettes';
import { SwipePager } from '@/src/design-system/primitives/SwipePager';
import { SwipeSlider } from '@/src/design-system/primitives/SwipeSlider';
import { CarouselDots } from '@/src/design-system/primitives/CarouselDots';
import { BalanceCard } from './BalanceCard';
import { HomeActionRow } from './HomeActionRow';
import type { HomeBalances } from '../lib/aggregateHomeBalances';
import type { HomeCardId } from '../lib/homeCardActions';

const SILVER = txPalette('silver');
const GOLD = txPalette('gold');

export const HOME_CARDS: { id: HomeCardId; kicker: string }[] = [
  { id: 'total', kicker: 'Total balance' },
  { id: 'bank', kicker: 'Virtual Bank account' },
  { id: 'stealf', kicker: 'Wallet' },
  { id: 'encrypted', kicker: 'Encrypted balance' },
];

const usdFor = (id: HomeCardId, b: HomeBalances) =>
  id === 'total'
    ? b.totalUSD
    : id === 'bank'
      ? b.bankUSD
      : id === 'stealf'
        ? b.stealfUSD
        : b.encryptedUSD;

const paletteFor = (id: HomeCardId) => (id === 'encrypted' ? GOLD : SILVER);

type Props = {
  balances: HomeBalances;
  hidden: boolean;
  onToggleHidden: () => void;
  index: number;
  onIndexChange: (i: number) => void;
};

// Gold wash fading in as the pager approaches the Encrypted page (index 3).
function GoldHalo({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [2.2, 3], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: -30, left: -24, right: -24, height: 260, zIndex: -1 },
        style,
      ]}
    >
      <LinearGradient colors={['rgba(201,168,106,0.18)', 'transparent']} style={{ flex: 1 }} />
    </Animated.View>
  );
}

export function BalanceCarousel({
  balances,
  hidden,
  onToggleHidden,
  index,
  onIndexChange,
}: Props) {
  return (
    <SwipePager count={HOME_CARDS.length} index={index} onIndexChange={onIndexChange}>
      {(progress, pageWidth) => (
        <View style={{ alignItems: 'center' }}>
          <GoldHalo progress={progress} />

          {/* Balance cards slider */}
          <SwipeSlider
            progress={progress}
            pageWidth={pageWidth}
            pages={HOME_CARDS.map((c) => {
              const p = paletteFor(c.id);
              return (
                <BalanceCard
                  key={c.id}
                  kicker={c.kicker}
                  amountUSD={usdFor(c.id, balances)}
                  hidden={hidden}
                  onToggleHidden={onToggleHidden}
                  accent={p.accent}
                  ink={p.ink}
                  inkDim={p.inkDim}
                />
              );
            })}
          />

          <View style={{ marginVertical: 20 }}>
            <CarouselDots count={HOME_CARDS.length} progress={progress} onSelect={onIndexChange} />
          </View>

          {/* Action tiles slider — same `progress`, slides in lockstep */}
          <SwipeSlider
            progress={progress}
            pageWidth={pageWidth}
            pages={HOME_CARDS.map((c) => (
              <HomeActionRow key={c.id} card={c.id} />
            ))}
          />
        </View>
      )}
    </SwipePager>
  );
}
