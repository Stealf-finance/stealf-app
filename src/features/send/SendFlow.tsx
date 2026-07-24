import { useEffect, useMemo, useRef, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { MoveConfirm } from '@/src/features/moove/components/MoveConfirm';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { Asset } from '@/src/features/send/components/AssetPill';
import {
  useSelectedAsset,
  setSelectedAsset,
  type SelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { AmountCardTiles } from '@/src/features/send/components/AmountCardTiles';
import { TiledKeypadPanel } from '@/src/features/send/components/TiledKeypadPanel';
import { AssetSelectRow } from '@/src/features/send/components/AssetSelectRow';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  RecipientRow,
  Recipient,
} from '@/src/features/send/components/RecipientRow';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import { useSendSimple } from './hooks/useSendSimple';
import { mapTokensToAssets } from './lib/mapTokenToAsset';
import { useQueryClient } from '@tanstack/react-query';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import {
  useEncryptedBalances,
  encryptedBalancesQueries,
} from '@/src/features/stealth/hooks/useEncryptedBalances';
import { historyQueries } from '@/src/features/bank/api/history';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import {
  PROTOCOL_FEE_RATE,
  SOL_DECIMALS,
  toRawAmount,
  PRIVATE_OP_SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { INSUFFICIENT_FEE_SOL_MESSAGE } from '@/src/features/stealth/lib/errors';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';
import { amountBand, scrubString } from '@/src/services/observability/scrub';
import * as Sentry from '@sentry/react-native';

const FADE_OUT = 160;
const FADE_IN = 220;

const NETWORK_FEE_SOL = 0.000005;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOL_NAME_RE = /^[a-zA-Z0-9._-]{1,32}\.sol$/;

function isValidRecipient(input: string, selfAddress?: string): boolean {
  const s = input.trim();
  if (selfAddress && s === selfAddress) return false;
  return SOLANA_ADDRESS_RE.test(s) || SOL_NAME_RE.test(s);
}

function truncateAddress(input: string, head = 6, tail = 4): string {
  const s = input.trim();
  if (s.length <= head + tail + 1) return s;
  if (!SOLANA_ADDRESS_RE.test(s)) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function selectedToAsset(sel: SelectedAsset): Asset {
  const isSol = sel.mint === SOL_MINT || sel.symbol === 'SOL';
  return {
    mint: isSol ? null : sel.mint,
    symbol: sel.symbol,
    name: sel.symbol,
    balance: String(sel.balance),
    fiat: `$${sel.balanceUSD.toFixed(2)}`,
    gradient: isSol ? ['#9945FF', '#14F195'] : ['#c9c9cc', '#5a5a5e'],
    iconSource:
      sel.iconSource ??
      (sel.iconUri ? { uri: sel.iconUri } : { uri: SOL_ICON_URI }),
    priceUSD: sel.price > 0 ? sel.price : undefined,
    decimals: sel.decimals,
  };
}

type WalletSource = 'bank' | 'stealth';
type SendMode = 'public' | 'private';

// Rendered for a simple transfer when the wallet has no public holdings yet,
// so the screen shows the SOL amount entry instead of a blank page.
const SOL_FALLBACK_ASSET: Asset = {
  mint: null,
  symbol: 'SOL',
  name: 'SOL',
  balance: '0',
  fiat: '$0.00',
  gradient: ['#9945FF', '#14F195'],
  iconSource: { uri: SOL_ICON_URI },
  decimals: SOL_DECIMALS,
};

type Props = { tone?: Tone; wallet?: WalletSource; mode?: SendMode };

export function SendFlow({ tone = 'silver', wallet, mode = 'public' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The send flow renders in the silver theme regardless of the caller's tone
  // (private sends previously themed gold — silver throughout now). The
  // original `tone` prop is still used below only for the wallet-source logic.
  const uiTone: Tone = 'silver';
  const S = txPalette(uiTone);
  const { user, isAuthenticated } = useAuth();
  const walletSource: WalletSource =
    wallet ?? (tone === 'gold' ? 'stealth' : 'bank');
  const isPrivate = mode === 'private';
  const title = isPrivate ? 'Private send' : 'Send';
  // Which wallet's tokens the asset picker should show.
  const pickerWalletParam: 'stealth' | 'encrypted' = isPrivate
    ? 'encrypted'
    : 'stealth';
  const selected = useSelectedAsset();
  const fromAddress =
    (walletSource === 'stealth' ? user?.stealfWallet : user?.bankWallet) ?? '';
  const fromLabel = isPrivate
    ? 'Encrypted balance'
    : walletSource === 'stealth'
      ? 'Wallet'
      : 'Virtual bank account';
  const { data: balance, isLoading: balanceLoading } = useBalance(fromAddress);
  const { data: encrypted } = useEncryptedBalances();
  const { data: solPrice } = useSolPrice();
  const sendMutation = useSendSimple();
  const queryClient = useQueryClient();
  const umbra = useUmbra();
  const { setMode } = usePrivacyMode();
  const posthog = usePostHog();
  const [privateSending, setPrivateSending] = useState(false);


  const privateAssets: Asset[] = useMemo(() => {
    const tokens = (encrypted?.tokens ?? []).filter((t) => t.amount > 0);
    if (tokens.length === 0) {
      // Fallback to a 0 SOL placeholder so the wizard still has an asset
      // entry to render the "Encrypted balance is empty" empty state from.
      return [
        {
          mint: null,
          symbol: 'SOL',
          name: 'Solana',
          balance: '0',
          fiat: '$0.00',
          gradient: ['#9945FF', '#14F195'],
          iconSource: { uri: SOL_ICON_URI },
          priceUSD: undefined,
          decimals: 9,
        },
      ];
    }
    return tokens.map((t) => {
      const isSol = t.mint === SOL_MINT || t.symbol === 'SOL';
      const pricePerUnit = t.amount > 0 ? t.amountUSD / t.amount : 0;
      const balanceStr = t.amount.toFixed(6).replace(/\.?0+$/, '') || '0';
      return {
        mint: isSol ? null : t.mint,
        symbol: t.symbol,
        name: t.symbol,
        balance: balanceStr,
        fiat: pricePerUnit > 0 ? `$${t.amountUSD.toFixed(2)}` : '$—',
        gradient: isSol ? ['#9945FF', '#14F195'] : ['#c9c9cc', '#5a5a5e'],
        iconSource: t.iconUri ? { uri: t.iconUri } : undefined,
        priceUSD: pricePerUnit > 0 ? pricePerUnit : undefined,
        decimals: t.decimals,
      };
    });
  }, [encrypted]);

  const assets = useMemo(
    () =>
      isPrivate ? privateAssets : mapTokensToAssets(balance?.tokens ?? []),
    [isPrivate, privateAssets, balance],
  );
  // Recent recipients endpoint not yet built — empty until the backend exposes it.
  const recents: Recipient[] = [];

  // Flow starts at the recipient step — the asset-select step was removed and
  // the asset defaults to the first holding.
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  // Start from a clean asset-picker selection (stale picks from other flows
  // shouldn't leak in); clear again on unmount.
  useEffect(() => {
    setSelectedAsset(null);
    return () => setSelectedAsset(null);
  }, []);
  // Apply the asset chosen in the picker.
  useEffect(() => {
    if (selected) setAsset(selectedToAsset(selected));
  }, [selected]);
  // Default to the first holding when nothing has been picked yet. For a
  // simple (public) transfer, fall back to a 0-balance SOL asset once the
  // balance has loaded empty — otherwise an unfunded stealth wallet would
  // render a blank screen (only the title) with no asset to send.
  useEffect(() => {
    if (selected || asset) return;
    if (assets.length > 0) {
      setAsset(assets[0]);
    } else if (!isPrivate && !balanceLoading) {
      setAsset(SOL_FALLBACK_ASSET);
    }
  }, [selected, asset, assets, isPrivate, balanceLoading]);
  // Force-remount the swipe widget after a failed send so the thumb returns to start.
  const swipeAttempt = useRef(0);

  const opacity = useSharedValue(1);
  const translate = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  const transitionTo = (next: number, dir: 'forward' | 'back') => {
    const sign = dir === 'forward' ? -1 : 1;
    opacity.value = withTiming(0, { duration: FADE_OUT });
    translate.value = withTiming(8 * sign, { duration: FADE_OUT }, (done) => {
      if (!done) return;
      runOnJS(setStep)(next);
      translate.value = -8 * sign;
      opacity.value = withTiming(1, { duration: FADE_IN });
      translate.value = withTiming(0, { duration: FADE_IN });
    });
  };

  const close = () => router.back();
  const handleBack = () => {
    if (step <= 1) close();
    else transitionTo(step - 1, 'back');
  };


  const rate = asset
    ? asset.symbol === 'SOL' && typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : (asset.priceUSD ?? 0)
    : 0;
  const balanceNum = asset ? Number(asset.balance) : 0;

  const networkFeeReserve =
    !isPrivate && asset?.symbol === 'SOL' ? NETWORK_FEE_SOL : 0;
  const protocolFeeMultiplier = isPrivate ? 1 - PROTOCOL_FEE_RATE : 1;
  const maxSpendable = Math.max(
    0,
    balanceNum * protocolFeeMultiplier - networkFeeReserve,
  );

  const {
    inputMode,
    solAmount: typedAssetAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  } = useAmountInput({
    rate,
    maxSol: maxSpendable,
    decimals: asset?.decimals ?? SOL_DECIMALS,
  });

  const fiatValue = fiatAmount.toFixed(2);
  const amountNum = typedAssetAmount;
  const exceedsBalance =
    asset?.symbol === 'SOL'
      ? amountNum + NETWORK_FEE_SOL > balanceNum
      : amountNum > balanceNum;
  const amountValid = amountNum > 0 && !exceedsBalance;
  const tokenAmountLabel =
    amountNum === 0 ? '0' : amountNum.toFixed(6).replace(/\.?0+$/, '');
  const balanceLabel = `${
    balanceNum.toFixed(4).replace(/\.?0+$/, '') || '0'
  } ${asset?.symbol ?? ''}`;
  const feeUSD =
    typeof solPrice === 'number' && solPrice > 0
      ? NETWORK_FEE_SOL * solPrice
      : null;

  const submitRecipient = () => {
    const trimmed = recipientQuery.trim();
    if (!trimmed) {
      setRecipientError('Enter a Solana address or .sol name.');
      return;
    }
    if (fromAddress && trimmed === fromAddress) {
      setRecipientError("You can't send funds to your own wallet.");
      return;
    }
    if (!isValidRecipient(trimmed, fromAddress)) {
      setRecipientError('Not a valid Solana address.');
      return;
    }
    setRecipientError(null);
    setRecipient({ name: trimmed, meta: '' });
    transitionTo(2, 'forward');
  };

  const onSwipeSend = async () => {
    if (!isAuthenticated || !user || !asset || !recipient) {
      close();
      return;
    }
    setSendError(null);
    if (__DEV__) console.log('[SendFlow] sending', typedAssetAmount, asset.symbol, '→', recipient.name, isPrivate ? '(private)' : '');
    try {
      if (isPrivate) {
        const publicSol =
          balance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
        if (publicSol < PRIVATE_OP_SOL_FEE_RESERVE) {
          setSendError(INSUFFICIENT_FEE_SOL_MESSAGE);
          return;
        }
        setPrivateSending(true);
        const txDecimals = asset.decimals ?? SOL_DECIMALS;
        const amountRaw = toRawAmount(typedAssetAmount, txDecimals);
        const destination = toAddress(recipient.name.trim());
        const mintAddr = asset.mint ?? SOL_MINT;
        const mint = toAddress(mintAddr);
        const result = await umbra.sendEncrypted(destination, mint, amountRaw);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: shieldedBalanceQueries.byStealfWallet(fromAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: encryptedBalancesQueries.byStealfWalletPrefix(fromAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: historyQueries.byAddress(fromAddress),
          }),
        ]);

        posthog?.capture('send_completed', {
          mode: 'private',
          asset_symbol: asset.symbol,
          amount_band: amountBand(Number(fiatValue)),
          wallet_source: walletSource,
        });
        setTxSig(result?.queueSignature ?? null);
        return;
      }
      const sig = await sendMutation.mutateAsync({
        fromAddress,
        toAddress: recipient.name.trim(),
        amount: typedAssetAmount,
        mint: asset.mint,
        decimals: asset.decimals ?? SOL_DECIMALS,
        walletSource,
        balance: balanceNum,
      });
      if (__DEV__) console.log('[SendFlow] success, sig=', sig);
      posthog?.capture('send_completed', {
        mode: 'public',
        asset_symbol: asset.symbol,
        amount_band: amountBand(Number(fiatValue)),
        wallet_source: walletSource,
      });
      setTxSig(sig);
    } catch (err: any) {
      if (__DEV__) console.warn('[SendFlow] send failed:', err);
      const msg =
        err?.userMessage ||
        (err instanceof Error
          ? err.message
          : 'Could not send the transaction.');
      // wrap() already captures StealthError to Sentry — skip to avoid dup.
      if (err?.name !== 'StealthError') {
        Sentry.captureException(err, {
          tags: {
            'op.kind': isPrivate ? 'send-private' : 'send-public',
            'wallet.source': walletSource,
          },
          extra: {
            userMessage: msg,
            amountBand: amountBand(Number(fiatValue)),
            asset: asset?.symbol,
          },
        });
      }
      posthog?.capture('send_failed', {
        mode: isPrivate ? 'private' : 'public',
        asset_symbol: asset.symbol,
        error: scrubString(msg),
        wallet_source: walletSource,
      });
      setSendError(msg);
      // Force the swipe widget to reset visually so the user can retry.
      swipeAttempt.current += 1;
    } finally {
      setPrivateSending(false);
    }
  };


  // Close on the confirm sheet's success state → the Home page. (The Pay hub
  // tab is gone; privacy mode resets so the nav tone stays silver on Home.)
  const finishToHome = () => {
    setMode('public');
    router.replace('/(tabs)/bank');
  };

  // "Make new transfer" — reset the flow back to a fresh recipient step.
  const startNewTransfer = () => {
    setRecipient(null);
    setRecipientQuery('');
    setRecipientError(null);
    setSendError(null);
    setTxSig(null);
    transitionTo(1, 'back');
  };

  return (
    <CenterGlow tone={uiTone} flat>
      {/* Header: flat background, bare chevron back button, centered 22pt
          title. paddingTop uses insets.top so the title sits near the
          wallet-detail title height (see docs/screen-patterns.md). The title
          is step-aware: recipient step vs amount step (with the recipient
          echoed underneath). */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={handleBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 22,
                lineHeight: 28,
                fontWeight: '600',
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {step === 1 ? title : 'Enter amount'}
          </Text>
          {step !== 1 && recipient ? (
            <Text
              style={[
                sansation,
                { fontSize: 14, lineHeight: 20, color: T.inkDim, marginTop: 4 },
              ]}
            >
              to: {truncateAddress(recipient.name)}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        {step === 1 && asset && (
          <>
            <View style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: recipientError ? T.error : S.hairline,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                <TextInput
                  value={recipientQuery}
                  onChangeText={(v) => {
                    setRecipientQuery(v);
                    if (recipientError) setRecipientError(null);
                  }}
                  placeholder="Enter Solana address"
                  placeholderTextColor={S.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={submitRecipient}
                  style={[
                    sansation,
                    { flex: 1, padding: 0, color: S.ink, fontSize: 15 },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Paste from clipboard"
                  hitSlop={6}
                  onPress={async () => {
                    const clip = (await Clipboard.getStringAsync()).trim();
                    if (!clip) return;
                    setRecipientQuery(clip);
                    if (recipientError) setRecipientError(null);
                  }}
                  style={{
                    height: 34,
                    paddingHorizontal: 14,
                    borderRadius: 17,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: S.hairline,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={[
                      sansation,
                      { fontSize: 13, fontWeight: '600', color: S.accent },
                    ]}
                  >
                    Paste
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  height: 22,
                  marginTop: 10,
                  paddingHorizontal: 4,
                  justifyContent: 'center',
                }}
              >
                {recipientError ? (
                  <Text style={[sansation, { fontSize: 12, color: T.error }]}>
                    {recipientError}
                  </Text>
                ) : null}
              </View>
            </View>
            {recents.length > 0 ? (
              <>
                <View style={{ paddingHorizontal: 24, marginBottom: 6 }}>
                  <Kicker color={S.inkFaint} style={{ fontSize: 9 }}>
                    Recent
                  </Kicker>
                </View>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: 6,
                    paddingBottom: insets.bottom + 32,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {recents.map((r) => (
                    <RecipientRow
                      key={r.name}
                      {...r}
                      tone={uiTone}
                      onPress={() => {
                        setRecipient(r);
                        transitionTo(2, 'forward');
                      }}
                    />
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 12,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <PillBtn
                variant="primary"
                tone={uiTone}
                label={
                  fromAddress && recipientQuery.trim() === fromAddress
                    ? "Can't send to yourself"
                    : 'Continue'
                }
                disabled={!isValidRecipient(recipientQuery, fromAddress)}
                onPress={submitRecipient}
              />
            </View>
          </>
        )}

        {(step === 2 || step === 3) && asset && recipient && (
          <>
            {/* Centered glass amount card (asset row moved below) — same
                layout as the shield/unshield screens. */}
            <View style={{ marginTop: 20 }}>
              <AmountCardTiles
                iconSource={asset.iconSource ?? { uri: SOL_ICON_URI }}
                tokenLabel={asset.symbol}
                primaryAmount={primaryDisplay}
                secondaryAmount={
                  inputMode === 'asset'
                    ? `$${fiatAmount.toFixed(2)}`
                    : `${tokenAmountLabel} ${asset.symbol}`
                }
                inputMode={inputMode}
                onToggleMode={onToggleMode}
                toggleDisabled={rate <= 0}
                showAssetRow={false}
              />
            </View>

            <View style={{ flex: 1 }} />

            {/* Asset selector + balance + Use Max, below the amount */}
            <View style={{ marginBottom: 14 }}>
              <AssetSelectRow
                iconSource={asset.iconSource ?? { uri: SOL_ICON_URI }}
                name={asset.symbol}
                balanceLabel={balanceLabel}
                onPressSelect={() =>
                  router.push(`/asset-picker?wallet=${pickerWalletParam}`)
                }
                onPressMax={() => onPressPercent(1)}
              />
            </View>

            <View style={{ paddingBottom: insets.bottom + 12 }}>
              <TiledKeypadPanel
                onKey={onKey}
                tone={uiTone}
                ctaLabel={
                  exceedsBalance && amountNum > 0
                    ? 'Insufficient balance'
                    : 'Continue'
                }
                onPressCta={() => setStep(3)}
                ctaDisabled={!amountValid}
              />
            </View>
          </>
        )}

      </Animated.View>

      {/* Confirmation — same bottom sheet as the Move flow, including the
          in-sheet "submitted / pending" state after the slide. */}
      {asset && recipient ? (
        <MoveConfirm
          visible={step === 3}
          onClose={() => setStep(2)}
          onDone={finishToHome}
          onNewTransfer={startNewTransfer}
          tone={uiTone}
          title={title}
          slideLabel="Slide to send"
          fiat={Number(fiatValue)}
          amountLabel={`${tokenAmountLabel} ${asset.symbol}`}
          fromLabel={fromLabel}
          fromAddress={truncateAddress(fromAddress)}
          toLabel={truncateAddress(recipient.name)}
          networkFeeUsd={feeUSD ?? 0}
          privacyFeeUsd={isPrivate ? PROTOCOL_FEE_RATE * Number(fiatValue) : 0}
          showPrivacyFee={isPrivate}
          onConfirm={onSwipeSend}
          submitting={sendMutation.isPending || privateSending}
          error={sendError ?? undefined}
          signature={txSig ?? undefined}
          // Private sends take longer (ZK proving) so we optimistically show
          // the pending state; simple transfers settle quickly on Turnkey, so
          // we just wait for the real signature and show "confirmed".
          autoPending={isPrivate}
        />
      ) : null}

      {/* Private transfers spend the encrypted balance — gate on Umbra
          registration. Simple/public sends don't need it. */}
      {isPrivate ? <StealthSetupOverlay onClose={close} /> : null}
    </CenterGlow>
  );
}
