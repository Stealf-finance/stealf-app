import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { shieldedBalanceQueries } from '@/src/features/umbra/hooks/useShieldedSolBalance';
import { encryptedBalancesQueries } from '@/src/features/umbra/hooks/useEncryptedBalances';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { HomeTotal } from '../components/HomeTotal';
import { HomeSparkline } from '../components/HomeSparkline';
import { HomeGrid } from '../components/HomeGrid';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  // Pull-to-refresh: refetch the wallet's balance + history plus the
  // encrypted/shielded balances (covers all cards at once).
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    const wallet = user?.bankWallet;
    if (!wallet) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: balanceQueries.byAddress(wallet),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueries.byAddress(wallet),
        }),
        queryClient.invalidateQueries({
          queryKey: shieldedBalanceQueries.byWallet(wallet),
        }),
        queryClient.invalidateQueries({
          queryKey: encryptedBalancesQueries.byWalletPrefix(wallet),
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user?.bankWallet]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.ink}
            colors={[T.ink]}
            progressViewOffset={insets.top}
          />
        }
      >
        <HomeHeader />
        <HomeTotal
          amountUSD={balances.totalUSD}
          hidden={hidden}
          onToggleHidden={() => setHidden((h) => !h)}
        />
        {/* Hardcoded curve (design placeholder) — pushes the grid down */}
        <HomeSparkline />
        <HomeGrid balances={balances} hidden={hidden} />
      </ScrollView>
    </View>
  );
}
