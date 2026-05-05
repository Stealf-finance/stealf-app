import { useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
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
import { umbraRegistrationQueries } from '@/src/features/stealth/hooks/useUmbraRegistration';
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
import { useBalanceVisibility } from '@/src/features/wallet/BalanceVisibilityContext';
import { useToast } from '@/src/components/toast/ToastContext';


const MORPH_DUR = 480;
const EASE_INOUT = Easing.bezier(0.25, 0.1, 0.25, 1);
const EASE_RELEASE = Easing.out(Easing.cubic);
const PAGE_WIDTH = Dimensions.get('window').width - 48;
const PAGE_GUTTER = 32;
const SLIDE_DIST = PAGE_WIDTH + PAGE_GUTTER;

const SILVER = txPalette('silver');
const GOLD = txPalette('gold');

const TONAL_STOP_LOCATIONS = [0, 0.08, 0.18, 0.28, 0.4, 1];
const SILVER_GRADIENT: [string, string, ...string[]] = [
  'rgba(220,220,225,0.18)',
  'rgba(220,220,225,0.14)',
  'rgba(220,220,225,0.08)',
  'rgba(220,220,225,0.04)',
  'rgba(220,220,225,0.018)',
  'rgba(220,220,225,0)',
];
const GOLD_GRADIENT: [string, string, ...string[]] = [
  'rgba(212,175,99,0.2)',
  'rgba(212,175,99,0.16)',
  'rgba(212,175,99,0.1)',
  'rgba(212,175,99,0.05)',
  'rgba(212,175,99,0.022)',
  'rgba(212,175,99,0)',
];

export function StealthHub() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, tone } = usePrivacyMode();
  const isPrivate = mode === 'private';
  const queryClient = useQueryClient();
  const { user, session, setUser } = useAuth();
  const sessionToken = session?.sessionToken ?? null;

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
  // Both modes' balances are pre-formatted because they're rendered side
  // by side in the carousel — nothing toggles based on `isPrivate` here.
  const publicBalance = formatBalance(publicUSD);
  const privateBalance = formatBalance(privateUSD);
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


  const modeProgress = useSharedValue(isPrivate ? 1 : 0);
  // Snapshot of `modeProgress` taken at the start of each pan so the
  // gesture's translation is computed relative to where the carousel was
  // when the finger landed (not always 0 or 1). Lets a partial drag from
  // mid-transition still feel correct.
  const baseProgress = useSharedValue(isPrivate ? 1 : 0);
  // Carousel slider — both modes mount side-by-side; this drives the
  // horizontal offset between them. translateX = -modeProgress * SLIDE_DIST
  // (page width + gutter) so 0 = public visible, 1 = private visible, and
  // the gutter sits invisibly inside the parent's overflow:hidden window.
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -modeProgress.value * SLIDE_DIST }],
  }));
  // Two background layers, opacity inverted: silver fades out as gold
  // fades in. Both stay mounted, so the LinearGradients never re-render
  // when the React `mode` flips — the entire transition is opacity-only
  // on the UI thread.
  const silverBgStyle = useAnimatedStyle(() => ({
    opacity: 1 - modeProgress.value,
  }));
  const goldBgStyle = useAnimatedStyle(() => ({
    opacity: modeProgress.value,
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

  // Drive the carousel from `mode` (the React state). Skips the timing
  // when `modeProgress` is already at (or very near) the target — the
  // gesture release path animates on the UI thread first, so by the time
  // setMode flushes here we'd otherwise re-animate a no-op snap.
  useEffect(() => {
    const target = isPrivate ? 1 : 0;
    if (Math.abs(modeProgress.value - target) < 0.001) return;
    modeProgress.value = withTiming(target, {
      duration: MORPH_DUR,
      easing: EASE_INOUT,
    });
  }, [isPrivate, modeProgress]);

  const setup = useSetupStealfWallet();
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const { hidden: balanceHidden, toggle: toggleBalanceHidden } =
    useBalanceVisibility();
  const { show: showToast } = useToast();

  const persistStealfWallet = async (
    walletAddress: string,
    isFresh: boolean,
  ) => {
    if (!sessionToken || !user) {
      showToast({
        kind: 'error',
        title: 'Not signed in',
        message: 'Please sign in again before continuing.',
      });
      return;
    }
    setRegistering(true);
    try {
      await registerStealfWallet(sessionToken, walletAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register wallet';
      if (__DEV__) console.warn('[StealthHub] register failed:', msg);
      showToast({ kind: 'error', title: 'Could not save wallet', message: msg });
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
      // A freshly-created wallet is unregistered with Umbra by definition.
      // Prime the cache so StealthSetupOverlay can render the setup card
      // instantly when the user navigates to private mode, instead of
      // waiting on a round-trip to confirm what we already know.
      queryClient.setQueryData(
        umbraRegistrationQueries.byAddress(walletAddress),
        false,
      );
      // Mirror the same priming for the bank wallet — StealthSetupOverlay
      // probes BOTH wallets via a single needsProbe gate, so leaving bank
      // undefined still triggers a cold stealth client init (multi-second
      // freeze on first private-mode entry). Bank is fresh from Turnkey
      // signup so it's never registered yet.
      if (user?.bankWallet && user?.bankRegistered === undefined) {
        queryClient.setQueryData(
          umbraRegistrationQueries.byAddress(user.bankWallet),
          false,
        );
      }
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

    setUser({
      ...user,
      stealfWallet: walletAddress,
      // Fresh wallets are never registered with Umbra yet. Imports might be —
      // leave the flag undefined so the overlay does a one-time chain probe
      // and persists the result.
      ...(isFresh ? { stealthRegistered: false } : {}),
      // Persist bankRegistered too on first persist. Without this, the
      // overlay's needsProbe gate (stealth=undef OR bank=undef) re-fires
      // and triggers the cold stealth-client init we just paid to avoid.
      ...(user.bankRegistered === undefined ? { bankRegistered: false } : {}),
    });
    setRegistering(false);
    // Land on the public side of the freshly-created wallet — its
    // encrypted balance is empty by definition, so private mode would
    // greet the user with $0.00 and a setup overlay. Public is the
    // useful first view.
    setMode('public');
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
        showToast({
          kind: 'error',
          title: 'Could not create wallet',
          message: result.error ?? 'Unknown error',
        });
        return;
      }
      setPendingAddress(result.walletAddress);
      setPendingMnemonic(result.mnemonic);
      return;
    }

    if (choice.mode === 'import') {
      const result = await setup.importWallet(choice.mnemonic);
      if (!result.success || !result.walletAddress) {
        showToast({
          kind: 'error',
          title: 'Could not import wallet',
          message: result.error ?? 'Unknown error',
        });
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
    // Just flip the React state — the useEffect on `isPrivate` animates
    // `modeProgress` to the new value, which drives the carousel slider
    // and the dot indicators in lockstep.
    setMode(target);
  };

  // Continuous drag: track finger movement and update modeProgress in
  // real time so the carousel follows the finger. On release, decide
  // between snap-forward and snap-back based on travel distance + flick
  // velocity. activeOffsetX/failOffsetY hand the gesture back to the
  // ScrollView for any predominantly-vertical pan. The activation
  // threshold is small so the carousel responds immediately rather than
  // sitting in a 12-px "deadzone" before catching up to the finger.
  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      // Stop any in-flight snap animation so the finger gets immediate
      // control instead of fighting the easing curve.
      cancelAnimation(modeProgress);
      baseProgress.value = modeProgress.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = baseProgress.value - e.translationX / SLIDE_DIST;
      // Hard clamp at the edges — there are only two pages, so any
      // resistance past 0 or 1 reads as drag-lag. Snapping to the bound
      // keeps the response 1:1 with the finger inside the valid range.
      modeProgress.value = next < 0 ? 0 : next > 1 ? 1 : next;
    })
    .onEnd((e) => {
      'worklet';
      const dragged = baseProgress.value - e.translationX / SLIDE_DIST;
      // Velocity-aware snap: a fast flick commits the swap even if the
      // user only dragged a sliver; otherwise snap to whichever side
      // they ended past the midpoint.
      let target: 0 | 1;
      if (Math.abs(e.velocityX) > 500) {
        target = e.velocityX < 0 ? 1 : 0;
      } else {
        target = dragged > 0.5 ? 1 : 0;
      }
      // Adaptive duration: when the finger left the carousel near the
      // target the snap should be quick, otherwise scale up. Caps at
      // MORPH_DUR for the worst case (full half-page to cross).
      const remaining = Math.abs(target - modeProgress.value);
      const dur = Math.max(160, Math.round(MORPH_DUR * remaining));
      const startedAt = baseProgress.value < 0.5 ? 0 : 1;
      if (target === startedAt) {
        // No mode change — snap modeProgress back ourselves.
        modeProgress.value = withTiming(target, {
          duration: dur,
          easing: EASE_RELEASE,
        });
      } else {
        // Mode change — drive the snap on the UI thread first (snappy
        // post-release curve), then flush React state. The useEffect
        // guards on near-equality so it won't re-animate when it fires.
        modeProgress.value = withTiming(target, {
          duration: dur,
          easing: EASE_RELEASE,
        });
        runOnJS(setMode)(target === 1 ? 'private' : 'public');
      }
    });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Tonal halo — both gradients mounted, cross-faded by modeProgress */}
      <Animated.View
        style={[StyleSheet.absoluteFill, silverBgStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={SILVER_GRADIENT}
          locations={TONAL_STOP_LOCATIONS as [number, number, ...number[]]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, goldBgStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={GOLD_GRADIENT}
          locations={TONAL_STOP_LOCATIONS as [number, number, ...number[]]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
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
          tone="silver"
          onPress={() => router.push('/transactions?wallet=stealth')}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn
            iconKey="card"
            tone="silver"
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
        {/* Swipe-toggle zone: kicker + balance + dots + gauge + tiles all
            share one Pan gesture so a drag anywhere in the active area
            scrubs the carousel position. */}
        <GestureDetector gesture={pan}>
        <View>
          {/* Kicker + balance carousel. Both modes mounted side-by-side
              and translated as a single unit so the swap reads as a real
              slide rather than a cross-fade. */}
          <View style={{ width: PAGE_WIDTH, overflow: 'hidden' }}>
            <Animated.View
              style={[
                {
                  width: PAGE_WIDTH * 2 + PAGE_GUTTER,
                  flexDirection: 'row',
                },
                sliderStyle,
              ]}
            >
              <KickerBalancePage
                width={PAGE_WIDTH}
                kicker="Stealth Wallet"
                balance={publicBalance}
                accent={SILVER.accent}
                ink={SILVER.ink}
                inkDim={SILVER.inkDim}
                fontSize={balanceFontSize}
                balanceHidden={balanceHidden}
                onToggleHidden={toggleBalanceHidden}
              />
              <View style={{ width: PAGE_GUTTER }} />
              <KickerBalancePage
                width={PAGE_WIDTH}
                kicker="Shielded Pool"
                balance={privateBalance}
                accent={GOLD.accent}
                ink={GOLD.ink}
                inkDim={GOLD.inkDim}
                fontSize={balanceFontSize}
                balanceHidden={balanceHidden}
                onToggleHidden={toggleBalanceHidden}
              />
            </Animated.View>
          </View>

          {/* Dots indicator — morphs continuously with modeProgress so the
              active capsule glides between sides instead of snapping. */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 24,
            }}
          >
            <ModeDot
              mode="public"
              modeProgress={modeProgress}
              activeColor={SILVER.accent}
              activeGlow={SILVER.accentGlow}
              onPress={() => switchMode('public')}
            />
            <ModeDot
              mode="private"
              modeProgress={modeProgress}
              activeColor={GOLD.accent}
              activeGlow={GOLD.accentGlow}
              onPress={() => switchMode('private')}
            />
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
                  <Text style={{ fontSize: 11, color: SILVER.inkDim }}>
                    Public
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: SILVER.ink }}>
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
                  <Text style={{ fontSize: 11, color: SILVER.inkDim }}>
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

        {/* Action tiles carousel — same slider mechanism as the kicker /
            balance zone, driven by the same `modeProgress` so everything
            slides in lockstep. */}
        <View
          style={{ width: PAGE_WIDTH, overflow: 'hidden', paddingBottom: 40 }}
        >
          <Animated.View
            style={[
              {
                width: PAGE_WIDTH * 2 + PAGE_GUTTER,
                flexDirection: 'row',
              },
              sliderStyle,
            ]}
          >
            <View
              style={{
                width: PAGE_WIDTH,
                flexDirection: 'row',
                gap: 8,
              }}
            >
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
            </View>
            <View style={{ width: PAGE_GUTTER }} />
            <View
              style={{
                width: PAGE_WIDTH,
                flexDirection: 'row',
                gap: 8,
              }}
            >
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
            </View>
          </Animated.View>
        </View>
        </View>
        </GestureDetector>
        {/* /swipe-toggle zone */}

        {/* Assets */}
        <Text
          style={[
            sansationLight,
            {
              fontSize: 22,
              letterSpacing: -0.44,
              color: SILVER.ink,
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
              borderBottomColor: SILVER.hairline,
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
              <Text style={{ fontSize: 15, color: SILVER.ink }}>
                {isPrivate ? 'WSOL' : 'SOL'}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: SILVER.inkFaint,
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
            <Text style={{ fontSize: 15, color: SILVER.ink }}>
              {`$${solUSD.toFixed(2)}`}
            </Text>
          </View>
        </View>
      </ScrollView>
      </Animated.View>

      {isPrivate ? <StealthSetupOverlay onClose={() => setMode('public')} /> : null}
    </View>
  );
}

/**
 * One slide of the kicker / balance carousel. Each page owns its own
 * tone-tinted balance hero and a duplicate eye toggle (cheap — both call
 * the same setter). Width is fixed by the parent so the slider can compute
 * its translateX cleanly on the UI thread.
 */
function KickerBalancePage({
  width,
  kicker,
  balance,
  accent,
  ink,
  inkDim,
  fontSize,
  balanceHidden,
  onToggleHidden,
}: {
  width: number;
  kicker: string;
  balance: { int: string; dec: string };
  accent: string;
  ink: string;
  inkDim: string;
  fontSize: { int: number; dec: number; dollar: number };
  balanceHidden: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <View style={{ width }}>
      <View
        style={{
          paddingTop: 12,
          marginBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
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
          onPress={onToggleHidden}
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
      </View>
      <View
        style={{ alignItems: 'center', marginTop: 30, marginBottom: 48 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {balanceHidden ? null : (
            <Text
              style={[
                serif,
                {
                  fontSize: fontSize.dollar,
                  color: accent,
                  fontStyle: 'italic',
                  lineHeight: fontSize.dollar,
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
                fontSize: fontSize.int,
                letterSpacing: fontSize.int * -0.04,
                lineHeight: fontSize.int,
                color: ink,
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
                fontSize: fontSize.dec,
                color: inkDim,
                letterSpacing: fontSize.dec * -0.02,
                lineHeight: fontSize.dec,
                includeFontPadding: false,
              },
            ]}
          >
            {balanceHidden ? '' : balance.dec}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Animated mode dot — width + color + glow opacity all interpolate from
 * `modeProgress`, so the capsule morphs continuously rather than flipping
 * states on JS-thread setMode. The Pressable wraps an Animated.View so the
 * tap target stays generous (hitSlop) while the visual styles run on UI.
 */
function ModeDot({
  mode,
  modeProgress,
  activeColor,
  activeGlow,
  onPress,
}: {
  mode: PrivacyMode;
  modeProgress: SharedValue<number>;
  activeColor: string;
  activeGlow: string;
  onPress: () => void;
}) {
  // active = 1 means "this dot is the live one". For public, active when
  // modeProgress === 0; for private, active when modeProgress === 1.
  const dotStyle = useAnimatedStyle(() => {
    const active =
      mode === 'public' ? 1 - modeProgress.value : modeProgress.value;
    return {
      width: interpolate(active, [0, 1], [6, 22]),
      backgroundColor: interpolateColor(
        active,
        [0, 1],
        ['rgba(255,255,255,0.2)', activeColor],
      ),
      shadowOpacity: active,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${mode} mode`}
      hitSlop={8}
    >
      <Animated.View
        style={[
          {
            height: 6,
            borderRadius: 3,
            shadowColor: activeGlow,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
          dotStyle,
        ]}
      />
    </Pressable>
  );
}
