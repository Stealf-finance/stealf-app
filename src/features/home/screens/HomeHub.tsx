import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel, HOME_CARDS } from '../components/BalanceCarousel';
import { HomeActivity } from '../components/HomeActivity';
import { AssetsList } from '../components/AssetsList';
import { TonalHalo } from '../components/TonalHalo';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  // Shared between the carousel (drives it) and the background halo (reads it).
  const progress = useSharedValue(0);
  const card = HOME_CARDS[index].id;

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
        {/* Bottom section follows the active card: Bank/Total → recent
            activity; Wallet/Encrypted → the holdings list. */}
        {card === 'stealf' || card === 'encrypted' ? (
          <AssetsList card={card} />
        ) : (
          <HomeActivity />
        )}
      </ScrollView>
    </View>
  );
}
