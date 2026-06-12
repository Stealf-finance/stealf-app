import { useCallback, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { T } from '@/src/design-system/tokens';
import { SwipeSlider } from '@/src/design-system/primitives/SwipeSlider';
import { SWIPE_PAGE_INSET } from '@/src/design-system/primitives/SwipePager';
import { ProgressOverlay } from '@/src/design-system/primitives/ProgressOverlay';
import { StealfWalletSetup } from '@/src/features/stealth/screens/StealfWalletSetup';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { useStealfWalletSetupFlow } from '@/src/features/stealth/hooks/useStealfWalletSetupFlow';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { encryptedBalancesQueries } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { useHomeBalances } from '../hooks/useHomeBalances';
import { HomeHeader } from '../components/HomeHeader';
import { BalanceCarousel, HOME_CARDS } from '../components/BalanceCarousel';
import { HomeActivity } from '../components/HomeActivity';
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
      return <AssetsList card="stealf" />;
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

  // Stealth-wallet setup flow (shared with the Payment-tab gate). When the
  // user is on the Wallet / Encrypted card with no stealth wallet yet, the
  // setup screen takes over the Home until they create or import one.
  const setupFlow = useStealfWalletSetupFlow();
  const currentCard: HomeCardId = HOME_CARDS[index]?.id ?? 'bank';
  const needsStealthSetup =
    !setupFlow.stealfWallet &&
    (currentCard === 'stealf' || currentCard === 'encrypted');

  // Pull-to-refresh: refetch balance + history for both wallets and the
  // encrypted/shielded balances (covers all three cards at once).
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

  if (needsStealthSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <StealfWalletSetup
          onComplete={setupFlow.handleSetupComplete}
          onCancel={setupFlow.cancelSetup}
          loading={setupFlow.loading}
          generatedMnemonic={setupFlow.pendingMnemonic ?? undefined}
          onExit={() => setIndex(0)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TonalHalo progress={progress} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 90 }}
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
        <HomeHeader card={HOME_CARDS[index]?.id ?? 'bank'} />
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

      {/* Encrypted-balance section: prompt Umbra registration when the user
          lands on the Encrypted card (self-hides once registered). */}
      {currentCard === 'encrypted' ? (
        <StealthSetupOverlay onClose={() => setIndex(0)} />
      ) : null}

      {/* Post-setup claim scan (only fires right after a create/import here) */}
      {setupFlow.syncProgress !== null ? (
        <ProgressOverlay
          tone="gold"
          label="Syncing your wallet"
          sub="Setup can take up to a minute. Sit tight — we're scanning Umbra Privacy for any encrypted balance tied to your wallet."
          progress={setupFlow.syncProgress}
        />
      ) : null}
    </View>
  );
}
