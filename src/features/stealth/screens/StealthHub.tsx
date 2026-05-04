import { useEffect, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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
import { Icons } from '@/src/design-system/icons';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
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
  // Match the BankWallet hero exactly so toggling tabs doesn't shift the
  // amount typography. Static sizes mirror BankWallet.tsx:134/148/162.
  const balanceFontSize = { int: 76, dec: 32, dollar: 36 } as const;

  const solRow = balanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL');
  const solBalance = isPrivate ? (shielded?.sol ?? 0) : (solRow?.balance ?? 0);
  const solUSD = isPrivate ? privateUSD : (solRow?.balanceUSD ?? 0);

  // Public / private split — each side proportional to its share of the
  // wallet's total dollar value. Drives the horizontal bar below the
  // balance; falls to 0 cleanly when the wallet is empty.
  const totalUSD = publicUSD + privateUSD;
  const publicValue = totalUSD > 0 ? publicUSD / totalUSD : 0;

  const kicker = isPrivate ? 'Shielded Pool' : 'Stealth Wallet';

  const modeProgress = useSharedValue(isPrivate ? 1 : 0);
  const contentOpacity = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Fade the main hub in when the user just finished wallet setup. Initialize
  // to 1 if the wallet was already set on first mount (cold-start case) so we
  // don't flash an empty screen behind the splash.
  const enterOpacity = useSharedValue(stealfWallet ? 1 : 0);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
  }));
  useEffect(() => {
    if (stealfWallet) {
      enterOpacity.value = withTiming(1, { duration: 360 });
    }
  }, [stealfWallet, enterOpacity]);

  // Keep modeProgress in sync if the context mode changes externally
  // (e.g. from another screen, future: a global toggle elsewhere).
  useEffect(() => {
    modeProgress.value = withTiming(isPrivate ? 1 : 0, { duration: MORPH_DUR });
  }, [isPrivate, modeProgress]);

  const setup = useSetupStealfWallet();
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);

  const persistStealfWallet = async (
    walletAddress: string,
    isFresh: boolean,
  ) => {
    if (!sessionToken || !user) {
      Alert.alert('Not signed in', 'Please sign in again before continuing.');
      return;
    }
    setRegistering(true);
    try {
      await registerStealfWallet(sessionToken, walletAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register wallet';
      if (__DEV__) console.warn('[StealthHub] register failed:', msg);
      Alert.alert('Could not save wallet', msg);
      setRegistering(false);
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
    setRegistering(false);
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
        loading={setup.loading || registering}
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
      <Animated.View style={[{ flex: 1 }, enterStyle]}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <CircleIconBtn
          iconKey="history"
          tone={tone}
          onPress={() => router.push('/transactions?wallet=stealth')}
        />
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
          {/* Kicker + eye toggle — grouped inline so the eye reads as part
              of the wallet header rather than floating at the screen edge. */}
          <Animated.View
            style={[
              {
                paddingTop: 12,
                marginBottom: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
              },
              contentStyle,
            ]}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 3.2,
                  textTransform: 'uppercase',
                  color: T.ink,
                  fontWeight: '700',
                },
              ]}
            >
              {kicker}
            </Text>
            <Pressable
              onPress={() => setBalanceHidden((h) => !h)}
              accessibilityRole="button"
              accessibilityLabel={
                balanceHidden ? 'Show balance' : 'Hide balance'
              }
              hitSlop={10}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              {balanceHidden ? (
                <Icons.eyeOff size={22} color={T.ink} />
              ) : (
                <Icons.eye size={22} color={T.ink} />
              )}
            </Pressable>
          </Animated.View>

          {/* Balance — cross-fade on mode swap. marginTop balances the
              kicker's marginBottom (18) so the amount sits at the visual
              midpoint between the kicker and the nav dots below. */}
          <Animated.View
            style={[
              { alignItems: 'center', marginTop: 30, marginBottom: 48 },
              contentStyle,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              {balanceHidden ? null : (
                <Text
                  style={[
                    serif,
                    {
                      fontSize: balanceFontSize.dollar,
                      color: palette.accent,
                      fontStyle: 'italic',
                      lineHeight: balanceFontSize.dollar,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  $
                </Text>
              )}
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: balanceFontSize.int,
                    letterSpacing: balanceFontSize.int * -0.04,
                    lineHeight: balanceFontSize.int,
                    color: palette.ink,
                    includeFontPadding: false,
                  },
                ]}
              >
                {balanceHidden ? '****' : balance.int}
              </Text>
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: balanceFontSize.dec,
                    color: palette.inkDim,
                    letterSpacing: balanceFontSize.dec * -0.02,
                    lineHeight: balanceFontSize.dec,
                    includeFontPadding: false,
                  },
                ]}
              >
                {balanceHidden ? '' : balance.dec}
              </Text>
            </View>
          </Animated.View>

          {/* Dots indicator — stays visible, snaps width */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 24,
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

          {/* Public / private split — sits below the toggle dots so the
              gauge reads as a summary of the wallet's distribution rather
              than as part of the balance hero. Width-aligned with the
              action tiles row (no extra horizontal padding — the parent
              ScrollView already insets by 24). */}
          <View
            style={{
              marginBottom: 32,
            }}
          >
            <View
              style={{
                height: 4,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.05)',
                flexDirection: 'row',
                marginBottom: 12,
              }}
            >
              {totalUSD === 0 ? null : (
                <>
                  <View
                    style={{
                      width: `${publicValue * 100}%`,
                      backgroundColor: SILVER.accent,
                    }}
                  />
                  <View style={{ flex: 1, backgroundColor: GOLD.accent }} />
                </>
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: SILVER.accent,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: palette.inkDim }}>
                    Public
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: palette.ink }}>
                  {balanceHidden ? '***' : `$${publicUSD.toFixed(2)}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, color: palette.inkDim }}>
                    Private
                  </Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: GOLD.accent,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 14, color: GOLD.accent }}>
                  {balanceHidden ? '***' : `$${privateUSD.toFixed(2)}`}
                </Text>
              </View>
            </View>
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
                  router.push(
                    '/send/flow?tone=gold&wallet=stealth&mode=private',
                  )
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
                  router.push('/receive/flow?tone=silver&wallet=stealth')
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
                  router.push('/send/flow?tone=silver&wallet=stealth')
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
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: palette.ink }}>
                {isPrivate ? 'WSOL' : 'SOL'}
              </Text>
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
      </Animated.View>

      {isPrivate ? <StealthSetupOverlay onClose={() => setMode('public')} /> : null}
    </TonalBackground>
  );
}
