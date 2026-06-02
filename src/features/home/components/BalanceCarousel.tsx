import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
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
  /** Shared swipe position; the background halo reads the same value. */
  progress: SharedValue<number>;
};

export function BalanceCarousel({
  balances,
  hidden,
  onToggleHidden,
  index,
  onIndexChange,
  progress,
}: Props) {
  return (
    <SwipePager
      count={HOME_CARDS.length}
      index={index}
      onIndexChange={onIndexChange}
      progress={progress}
    >
      {(p, pageWidth) => (
        <View style={{ alignItems: 'center' }}>
          {/* Balance cards slider */}
          <SwipeSlider
            progress={p}
            pageWidth={pageWidth}
            pages={HOME_CARDS.map((c) => {
              const pal = paletteFor(c.id);
              return (
                <BalanceCard
                  key={c.id}
                  kicker={c.kicker}
                  amountUSD={usdFor(c.id, balances)}
                  hidden={hidden}
                  onToggleHidden={onToggleHidden}
                  accent={pal.accent}
                  ink={pal.ink}
                  inkDim={pal.inkDim}
                />
              );
            })}
          />

          <View style={{ marginVertical: 20 }}>
            <CarouselDots count={HOME_CARDS.length} progress={p} onSelect={onIndexChange} />
          </View>

          {/* Action tiles slider — same `progress`, slides in lockstep */}
          <SwipeSlider
            progress={p}
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
