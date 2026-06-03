import { useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';
import { SwipeSlider } from '@/src/design-system/primitives/SwipeSlider';
import { SWIPE_PAGE_INSET } from '@/src/design-system/primitives/SwipePager';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel, HOME_CARDS } from '../components/BalanceCarousel';
import { HomeActivity } from '../components/HomeActivity';
import { StealthActivity } from '../components/StealthActivity';
import { AssetsList } from '../components/AssetsList';
import { GetBankAccountCard } from '../components/GetBankAccountCard';
import { TonalHalo } from '../components/TonalHalo';
import type { HomeCardId } from '../lib/homeCardActions';

// Matches the carousel's page width so the bottom slider moves in lockstep.
const PAGE_WIDTH = Dimensions.get('window').width - SWIPE_PAGE_INSET * 2;

function bottomFor(id: HomeCardId) {
  switch (id) {
    case 'bank':
      return (
        <>
          <GetBankAccountCard />
          <HomeActivity />
        </>
      );
    case 'stealf':
      return (
        <>
          <AssetsList card="stealf" />
          <StealthActivity />
        </>
      );
    case 'encrypted':
      return <AssetsList card="encrypted" />;
    default:
      return null;
  }
}

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  // Shared between the carousel (drives it) and the background halo (reads it).
  const progress = useSharedValue(0);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TonalHalo progress={progress} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <BalanceCarousel
          balances={balances}
          hidden={hidden}
          onToggleHidden={() => setHidden((h) => !h)}
          index={index}
          onIndexChange={setIndex}
          progress={progress}
        />
        {/* Bottom section slides in lockstep with the carousel: Total → the
            "Get your bank account" card, Bank → recent activity, Wallet /
            Encrypted → their assets list. */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <SwipeSlider
            progress={progress}
            pageWidth={PAGE_WIDTH}
            pages={HOME_CARDS.map((c) => bottomFor(c.id))}
          />
        </View>
      </ScrollView>
    </View>
  );
}
