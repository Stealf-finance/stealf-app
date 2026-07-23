import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { encryptedBalancesQueries } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { HomeTotal } from '../components/HomeTotal';
import { HomeSparkline } from '../components/HomeSparkline';
import { HomeGrid } from '../components/HomeGrid';

export function HomeHub() {
  const insets = useSafeAreaInsets();
  const balances = useHomeBalances();
  const [hidden, setHidden] = useState(false);
  // Pull-to-refresh: refetch balance + history for both wallets plus the
  // encrypted/shielded balances (covers all cards at once).
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    const bankWallet = user?.bankWallet;
    const stealfWallet = user?.stealfWallet;
    setRefreshing(true);
    try {
      await Promise.all(
        [
          bankWallet &&
            queryClient.invalidateQueries({
              queryKey: balanceQueries.byAddress(bankWallet),
            }),
          bankWallet &&
            queryClient.invalidateQueries({
              queryKey: historyQueries.byAddress(bankWallet),
            }),
          stealfWallet &&
            queryClient.invalidateQueries({
              queryKey: balanceQueries.byAddress(stealfWallet),
            }),
          stealfWallet &&
            queryClient.invalidateQueries({
              queryKey: historyQueries.byAddress(stealfWallet),
            }),
          stealfWallet &&
            queryClient.invalidateQueries({
              queryKey: shieldedBalanceQueries.byStealfWallet(stealfWallet),
            }),
          stealfWallet &&
            queryClient.invalidateQueries({
              queryKey:
                encryptedBalancesQueries.byStealfWalletPrefix(stealfWallet),
            }),
        ].filter(Boolean),
      );
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user?.bankWallet, user?.stealfWallet]);

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
