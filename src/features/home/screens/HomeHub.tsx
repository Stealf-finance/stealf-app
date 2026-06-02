import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel } from '../components/BalanceCarousel';
import { HomeActivity } from '../components/HomeActivity';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);

  return (
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
      />
      <HomeActivity />
    </ScrollView>
  );
}
