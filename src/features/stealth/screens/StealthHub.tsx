import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { PrivacyGauge } from '@/src/design-system/primitives/PrivacyGauge';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import {
  PrivacyMode,
  usePrivacyMode,
} from '@/src/features/stealth/PrivacyModeContext';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';
import { useFeatureFlag } from '@/src/services/observability/featureFlags';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { useShieldedSolBalance } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import {
  StealfWalletSetup,
  type SetupChoice,
} from '@/src/features/stealth/screens/StealfWalletSetup';
import { useSetupStealfWallet } from '@/src/features/stealth/hooks/useSetupStealfWallet';
import { registerStealfWallet } from '@/src/features/stealth/api/registerStealfWallet';
import {
  balanceQueries,
  fetchBalance,
} from '@/src/features/bank/api/balance';
import {
  historyQueries,
  fetchHistory,
} from '@/src/features/bank/api/history';
import type {
  BalanceResponse,
  HistoryResponse,
} from '@/src/features/bank/types';
import { socketService } from '@/src/services/real-time/socket';

const FADE_OUT = 180;
const FADE_IN = 240;
const MORPH_DUR = 420;

const SILVER = txPalette('silver');
const GOLD = txPalette('gold');

export function StealthHub() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, tone } = usePrivacyMode();
  const isPrivate = mode === 'private';
  const palette = txPalette(tone);
  const queryClient = useQueryClient();
  const { user, session, setUser } = useAuth();
  const sessionToken = session?.sessionToken ?? null;

  // Killswitch: hide the slice if the flag is flipped off in PostHog.
  // Default-on so design work in DEV is unaffected.
  const stealthEnabled = useFeatureFlag('slice-stealth-enabled', true);

  const { data: pendingClaims } = usePendingClaims();
  const claimCount = pendingClaims?.length ?? 0;

  const stealfWallet = user?.stealfWallet ?? null;
  const { data: balanceData } = useBalance(stealfWallet);
  // History is prefetched here so it's warm by the time the user opens
  // a future "see all" on the stealth tab.
  useHistory(stealfWallet);
  const { data: shielded } = useShieldedSolBalance();
  const { data: solPrice } = useSolPrice();

  const publicUSD = balanceData?.totalUSD ?? 0;
  const privateUSD =
    shielded && typeof solPrice === 'number' ? shielded.sol * solPrice : 0;

  const formatBalance = (usd: number) => {
    const safe = Math.max(0, usd);
    return {
      int: Math.floor(safe).toLocaleString('en-US'),
      dec: `.${(safe % 1).toFixed(2).slice(2)}`,
    };
  };
  const balance = formatBalance(isPrivate ? privateUSD : publicUSD);

  const solRow = balanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL');
  const solBalance = isPrivate ? (shielded?.sol ?? 0) : (solRow?.balance ?? 0);
  const solUSD = isPrivate ? privateUSD : (solRow?.balanceUSD ?? 0);

  // Privacy gauge: each side fills proportionally to its share of the
  // wallet's total dollar value. Both arcs sum to 1 when funds exist on
  // both sides; falls to 0 cleanly when the wallet is empty.
  const totalUSD = publicUSD + privateUSD;
  const publicValue = totalUSD > 0 ? publicUSD / totalUSD : 0;
  const privateValue = totalUSD > 0 ? privateUSD / totalUSD : 0;

  const kicker = isPrivate ? 'Shielded Pool' : 'Stealth Wallet';
  const subkicker = isPrivate ? 'private' : 'public';

  const modeProgress = useSharedValue(isPrivate ? 1 : 0);
  const contentOpacity = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Keep modeProgress in sync if the context mode changes externally
  // (e.g. from another screen, future: a global toggle elsewhere).
  useEffect(() => {
    modeProgress.value = withTiming(isPrivate ? 1 : 0, { duration: MORPH_DUR });
  }, [isPrivate, modeProgress]);

  const setup = useSetupStealfWallet();
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  const persistStealfWallet = async (
    walletAddress: string,
    isFresh: boolean,
  ) => {
    if (!sessionToken || !user) {
      Alert.alert('Not signed in', 'Please sign in again before continuing.');
      return;
    }
    try {
      await registerStealfWallet(sessionToken, walletAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register wallet';
      if (__DEV__) console.warn('[StealthHub] register failed:', msg);
      Alert.alert('Could not save wallet', msg);
      return;
    }

    socketService.subscribeToWallet(walletAddress);

    if (isFresh) {
      const emptyBalance: BalanceResponse = {
        address: walletAddress,
        tokens: [],
        totalUSD: 0,
      };
      const emptyHistory: HistoryResponse = {
        address: walletAddress,
        count: 0,
        transactions: [],
      };
      queryClient.setQueryData(
        balanceQueries.byAddress(walletAddress),
        emptyBalance,
      );
      queryClient.setQueryData(
        historyQueries.byAddress(walletAddress),
        emptyHistory,
      );
    } else {
      void queryClient.prefetchQuery({
        queryKey: balanceQueries.byAddress(walletAddress),
        queryFn: () => fetchBalance(sessionToken, walletAddress),
        staleTime: Infinity,
      });
      void queryClient.prefetchQuery({
        queryKey: historyQueries.byAddress(walletAddress),
        queryFn: () => fetchHistory(sessionToken, walletAddress, 10),
        staleTime: Infinity,
      });
    }

    setUser({ ...user, stealfWallet: walletAddress });
  };

  const handleSetupComplete = async (choice: SetupChoice) => {
    if (choice.mode === 'create') {
      // Two-phase: first call generates+caches the mnemonic and shows it;
      // second call (after the user confirms they saved it) registers it.
      if (pendingMnemonic && pendingAddress) {
        await persistStealfWallet(pendingAddress, true);
        setPendingMnemonic(null);
        setPendingAddress(null);
        return;
      }
      const result = await setup.createWallet();
      if (!result.success || !result.walletAddress || !result.mnemonic) {
        Alert.alert('Could not create wallet', result.error ?? 'Unknown error');
        return;
      }
      setPendingAddress(result.walletAddress);
      setPendingMnemonic(result.mnemonic);
      return;
    }

    if (choice.mode === 'import') {
      const result = await setup.importWallet(choice.mnemonic);
      if (!result.success || !result.walletAddress) {
        Alert.alert('Could not import wallet', result.error ?? 'Unknown error');
        return;
      }
      await persistStealfWallet(result.walletAddress, false);
    }
  };

  const cancelSetup = () => {
    setPendingMnemonic(null);
    setPendingAddress(null);
  };

  if (!stealthEnabled) {
    return (
      <TonalBackground tone="silver">
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 3.2,
                textTransform: 'uppercase',
                color: SILVER.accent,
                fontWeight: '700',
                marginBottom: 12,
              },
            ]}
          >
            Stealth
          </Text>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 28,
                color: T.ink,
                textAlign: 'center',
              },
            ]}
          >
            Coming soon
          </Text>
        </View>
      </TonalBackground>
    );
  }

  // No stealth wallet yet → setup screen (create or import). Cleared once
  // the backend register call succeeds and AuthContext is updated.
  if (!stealfWallet) {
    return (
      <StealfWalletSetup
        onComplete={handleSetupComplete}
        onCancel={cancelSetup}
        loading={setup.loading}
        generatedMnemonic={pendingMnemonic ?? undefined}
      />
    );
  }

  const switchMode = (target: PrivacyMode) => {
    if (target === mode) return;
    modeProgress.value = withTiming(target === 'private' ? 1 : 0, {
      duration: MORPH_DUR,
    });
    contentOpacity.value = withTiming(0, { duration: FADE_OUT }, (done) => {
      if (!done) return;
      runOnJS(setMode)(target);
      contentOpacity.value = withTiming(1, { duration: FADE_IN });
    });
  };

  // Carousel direction: swipe left = next item (private, right dot),
  // swipe right = previous item (public, left dot). At the boundary the
  // target equals the current mode and switchMode no-ops.
  const panHandlers = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 40) {
        switchMode(g.dx < 0 ? 'private' : 'public');
      }
    },
  }).panHandlers;

  return (
    <TonalBackground tone={tone}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <CircleIconBtn iconKey="history" tone={tone} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn
            iconKey="card"
            tone={tone}
            onPress={() => router.push('/card')}
          />
          <CircleIconBtn iconKey="bell" tone={tone} hasDot />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Swipe-toggle zone: kicker + gauge + dots only */}
        <View {...panHandlers}>
          {/* Kicker + subkicker — cross-fades on mode swap */}
          <Animated.View
            style={[
              {
                alignItems: 'center',
                paddingTop: 20,
                marginBottom: 24,
              },
              contentStyle,
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View
                style={{
                  width: 18,
                  height: 1,
                  backgroundColor: palette.accentDim,
                }}
              />
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 10,
                    letterSpacing: 3.2,
                    textTransform: 'uppercase',
                    color: palette.accent,
                    fontWeight: '700',
                  },
                ]}
              >
                {kicker}
              </Text>
              <View
                style={{
                  width: 18,
                  height: 1,
                  backgroundColor: palette.accentDim,
                }}
              />
            </View>
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: palette.inkDim,
                  marginTop: 6,
                },
              ]}
            >
              {subkicker}
            </Text>
          </Animated.View>

          {/* Gauge — morphs continuously, no fade */}
          <View
            style={{
              position: 'relative',
              height: 220,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <PrivacyGauge
              modeProgress={modeProgress}
              publicValue={publicValue}
              privateValue={privateValue}
              publicColor={SILVER.accent}
              privateColor={GOLD.accent}
              publicGlow={SILVER.accentGlow}
              privateGlow={GOLD.accentGlow}
              size={210}
              thickness={5}
            />

            {/* Center balance — cross-fade on mode swap */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                contentStyle,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={[
                    serif,
                    {
                      fontSize: 30,
                      color: palette.accent,
                      fontStyle: 'italic',
                      lineHeight: 30,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  $
                </Text>
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 64,
                      letterSpacing: -2.56,
                      lineHeight: 64,
                      color: palette.ink,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {balance.int}
                </Text>
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 28,
                      color: palette.inkDim,
                      letterSpacing: -0.56,
                      lineHeight: 28,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {balance.dec}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Dots indicator — stays visible, snaps width */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 36,
            }}
          >
            {(['public', 'private'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${m} mode`}
                  hitSlop={8}
                  style={{
                    width: isActive ? 22 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isActive
                      ? palette.accent
                      : 'rgba(255,255,255,0.2)',
                    shadowColor: isActive ? palette.accentGlow : 'transparent',
                    shadowOpacity: isActive ? 1 : 0,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              );
            })}
          </View>
        </View>
        {/* /swipe-toggle zone */}

        {/* Action tiles — cross-fade on mode swap */}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              gap: 8,
              paddingBottom: 40,
            },
            contentStyle,
          ]}
        >
          {isPrivate ? (
            <>
              <SquareActionTile
                iconKey="shieldOff"
                label="Unshield"
                onPress={() => router.push('/unshield')}
              />
              <SquareActionTile
                iconKey="move"
                label="Move"
                onPress={() => router.push('/moove?direction=shielded-to-bank')}
              />
              <SquareActionTile
                iconKey="arrUp"
                label="Send"
                accent
                accentTone="gold"
                onPress={() =>
                  router.push('/send?tone=gold&wallet=stealth')
                }
              />
              <SquareActionTile
                iconKey="gift"
                label="Claim"
                badge={claimCount}
                onPress={() => router.push('/claim-pending')}
              />
            </>
          ) : (
            <>
              <SquareActionTile
                iconKey="arrDown"
                label="Receive"
                onPress={() =>
                  router.push('/add-funds?tone=silver&wallet=stealth')
                }
              />
              <SquareActionTile
                iconKey="move"
                label="Move"
                onPress={() => router.push('/moove?direction=stealth-to-bank')}
              />
              <SquareActionTile
                iconKey="shieldCheck"
                label="Shield"
                accent
                accentTone="silver"
                onPress={() => router.push('/shield')}
              />
              <SquareActionTile
                iconKey="arrUp"
                label="Send"
                onPress={() =>
                  router.push('/send?tone=silver&wallet=stealth')
                }
              />
            </>
          )}
        </Animated.View>

        {/* Assets */}
        <Text
          style={[
            sansationLight,
            {
              fontSize: 22,
              letterSpacing: -0.44,
              color: palette.ink,
              marginBottom: 4,
            },
          ]}
        >
          Assets
        </Text>

        <View style={{ paddingTop: 6 }}>
          <View
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Image
              source={require('@/assets/images/solana-icon.png')}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: palette.ink }}>SOL</Text>
              <Text
                style={{
                  fontSize: 11,
                  color: palette.inkFaint,
                  marginTop: 2,
                }}
              >
                {solBalance > 0
                  ? `${solBalance.toFixed(4)} · ${isPrivate ? 'encrypted' : 'on-chain'}`
                  : isPrivate
                    ? 'encrypted'
                    : 'on-chain'}
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: palette.ink }}>
              {`$${solUSD.toFixed(2)}`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </TonalBackground>
  );
}
