import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel, HOME_CARDS } from '../components/BalanceCarousel';
import { HomeActionRow } from '../components/HomeActionRow';
import { HomeActivity } from '../components/HomeActivity';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  const card = HOME_CARDS[index].id;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader name={user?.username} hidden={hidden} onToggleHidden={() => setHidden((h) => !h)} />
      <View style={{ marginTop: 8 }}>
        <BalanceCarousel balances={balances} hidden={hidden} index={index} onIndexChange={setIndex} />
      </View>
      <HomeActionRow card={card} />
      <HomeActivity />
    </ScrollView>
  );
}
