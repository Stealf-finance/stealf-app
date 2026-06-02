import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel } from '../components/BalanceCarousel';
import { HomeActivity } from '../components/HomeActivity';
import { TonalHalo } from '../components/TonalHalo';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  // Shared between the carousel (which drives it) and the background halo
  // (which reads it) so swiping to Encrypted recolours the whole background.
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
        <HomeActivity />
      </ScrollView>
    </View>
  );
}
