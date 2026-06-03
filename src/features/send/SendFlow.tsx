import { useEffect, useMemo, useRef, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { TxHeader } from '@/src/features/send/components/TxHeader';
import { TxTitleBlock } from '@/src/features/send/components/TxTitleBlock';
import { Asset } from '@/src/features/send/components/AssetPill';
import {
  useSelectedAsset,
  setSelectedAsset,
  type SelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { SourceAssetCard } from '@/src/features/send/components/SourceAssetCard';
import { PercentageChips } from '@/src/features/send/components/PercentageChips';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  RecipientRow,
  Recipient,
} from '@/src/features/send/components/RecipientRow';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { SuccessScreen } from '@/src/features/transactions/SuccessScreen';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from './hooks/useSolPrice';
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
  protocolFeeSol,
  SOL_DECIMALS,
  toRawAmount,
  PRIVATE_OP_SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { INSUFFICIENT_FEE_SOL_MESSAGE } from '@/src/features/stealth/lib/errors';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';
import { amountBand, scrubString } from '@/src/services/observability/scrub';

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

type Props = { tone?: Tone; wallet?: WalletSource; mode?: SendMode };

export function SendFlow({ tone = 'silver', wallet, mode = 'public' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const S = txPalette(tone);
  const { user, isAuthenticated } = useAuth();
  const walletSource: WalletSource =
    wallet ?? (tone === 'gold' ? 'stealth' : 'bank');
  const isPrivate = mode === 'private';
  const title = isPrivate ? 'Private transfer' : 'Simple transfer';
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
      ? 'Stealth wallet'
      : 'Bank wallet';
  const { data: balance } = useBalance(fromAddress);
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
  // Default to the first holding when nothing has been picked yet.
  useEffect(() => {
    if (!selected && !asset && assets.length > 0) setAsset(assets[0]);
  }, [selected, asset, assets]);
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
    setAmount,
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
  const maxBalanceLabel =
    inputMode === 'fiat'
      ? `$${(maxSpendable * rate).toFixed(2)}`
      : `${maxSpendable.toFixed(4).replace(/\.?0+$/, '') || '0'} ${asset?.symbol ?? ''}`;
  const feeUSD =
    typeof solPrice === 'number' && solPrice > 0
      ? NETWORK_FEE_SOL * solPrice
      : null;
  const feeLabel = feeUSD === null ? '—' : `$${feeUSD.toFixed(4)}`;

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
        transitionTo(4, 'forward');
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
      transitionTo(4, 'forward');
    } catch (err: any) {
      if (__DEV__) console.warn('[SendFlow] send failed:', err);
      const msg =
        err?.userMessage ||
        (err instanceof Error
          ? err.message
          : 'Could not send the transaction.');
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


  if (step === 4 && asset && recipient) {

    const finishToOrigin = () => {
      if (walletSource === 'bank') {
        router.replace('/(tabs)/bank');
        return;
      }
      setMode(isPrivate ? 'private' : 'public');
      router.replace('/(tabs)/stealth');
    };
    const onDone = finishToOrigin;
    const onSuccessClose = finishToOrigin;
    return (
      <SuccessScreen
        tone={tone}
        kicker="Sent"
        prefix="$"
        amount={fiatValue}
        subtitle={`to ${truncateAddress(recipient.name)}`}
        onClose={onSuccessClose}
        onDone={onDone}
        onNewTransfer={() => {
          setRecipient(null);
          setRecipientQuery('');
          setRecipientError(null);
          setAmount('0');
          setSendError(null);
          setTxSig(null);
          setStep(1);
        }}
        onViewExplorer={() => {
          if (txSig) void Linking.openURL(`https://solscan.io/tx/${txSig}`);
        }}
      />
    );
  }

  return (
    <CenterGlow tone={tone}>
      <TxHeader title={title} onBack={handleBack} />

      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        {step === 1 && asset && (
          <>
            <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: recipientError ? '#E5484D' : S.hairline,
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
                <Text
                  style={[
                    serif,
                    {
                      fontStyle: 'italic',
                      fontSize: 20,
                      color: S.accent,
                      lineHeight: 22,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  @
                </Text>
                <TextInput
                  value={recipientQuery}
                  onChangeText={(v) => {
                    setRecipientQuery(v);
                    if (recipientError) setRecipientError(null);
                  }}
                  placeholder="address or name.sol"
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
                  accessibilityLabel="Scan QR"
                  hitSlop={6}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: S.hairline,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icons.qr size={16} color={S.accent} />
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
                  <Text style={[sansation, { fontSize: 12, color: '#E5484D' }]}>
                    {recipientError}
                  </Text>
                ) : null}
              </View>
            </View>
            {recents.length > 0 ? (
              <>
                <View style={{ paddingHorizontal: 24, marginBottom: 6 }}>
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 9,
                        letterSpacing: 2.52,
                        textTransform: 'uppercase',
                        color: S.inkFaint,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    Recent
                  </Text>
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
                      tone={tone}
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
                tone={tone}
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

        {step === 2 && asset && recipient && (
          <>
            <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
              <SourceAssetCard
                label={isPrivate ? 'Sending privately' : 'Sending'}
                toLabel={truncateAddress(recipient.name)}
                tone={tone}
                iconSource={asset.iconSource ?? { uri: SOL_ICON_URI }}
                tokenLabel={asset.symbol}
                primaryAmount={primaryDisplay}
                secondaryAmount={
                  inputMode === 'asset'
                    ? `$${fiatAmount.toFixed(2)}`
                    : `${tokenAmountLabel} ${asset.symbol}`
                }
                inputMode={inputMode}
                onPressTokenPill={() =>
                  router.push(`/asset-picker?wallet=${pickerWalletParam}`)
                }
                onToggleMode={onToggleMode}
                toggleDisabled={rate <= 0}
                maxLabel={maxBalanceLabel}
              />
            </View>

            <PercentageChips
              onPressPercent={onPressPercent}
              disabled={maxSpendable <= 0}
            />

            <Numpad onKey={onKey} tone={tone} />

            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <PillBtn
                variant="primary"
                tone={tone}
                label={exceedsBalance && amountNum > 0 ? 'Insufficient balance' : 'Continue'}
                disabled={!amountValid}
                onPress={() => transitionTo(3, 'forward')}
              />
            </View>
          </>
        )}

        {step === 3 && asset && recipient && (
          <>
            <TxTitleBlock
              kicker="Step 3 of 3"
              title={isPrivate ? 'Confirm private send' : 'Confirm'}
              subtitle={
                isPrivate
                  ? 'Create an unlinkable transfer claimable by the receiver.'
                  : 'Review and swipe to send'
              }
            />

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: S.hairline,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.01)',
                  ]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{ padding: 24 }}
                >
                  {/* Amount hero */}
                  <View
                    style={{
                      alignItems: 'center',
                      paddingBottom: 22,
                      borderBottomWidth: 1,
                      borderBottomColor: S.hairline,
                    }}
                  >
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: 9,
                          letterSpacing: 2.88,
                          textTransform: 'uppercase',
                          color: S.inkFaint,
                          fontWeight: '700',
                          marginBottom: 8,
                        },
                      ]}
                    >
                      Amount
                    </Text>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'baseline' }}
                    >
                      <Text
                        style={[
                          serif,
                          {
                            fontSize: 26,
                            color: S.accent,
                            fontStyle: 'italic',
                            lineHeight: 26,
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
                            fontSize: 54,
                            letterSpacing: -1.62,
                            color: S.ink,
                            lineHeight: 54,
                            includeFontPadding: false,
                          },
                        ]}
                      >
                        {fiatValue}
                      </Text>
                    </View>
                    <Text
                      style={[
                        serif,
                        {
                          fontSize: 13,
                          color: S.inkDim,
                          fontStyle: 'italic',
                          marginTop: 8,
                        },
                      ]}
                    >
                      ≈ {tokenAmountLabel} {asset.symbol}
                    </Text>
                  </View>

                  {(
                    [
                      ['From', fromLabel],
                      ['To', truncateAddress(recipient.name)],
                      ['Asset', `${asset.symbol} · ${asset.name}`],
                      ['Network fee', feeLabel],
                      ...(isPrivate
                        ? ([
                            [
                              `Privacy fee · ${(PROTOCOL_FEE_RATE * 100).toFixed(2)}%`,
                              `${protocolFeeSol(amountNum)
                                .toFixed(4)
                                .replace(/\.?0+$/, '')} ${asset.symbol}`,
                            ],
                          ] as const)
                        : []),
                    ] as const
                  ).map(([l, v], i, arr) => (
                    <View
                      key={l}
                      style={{
                        paddingVertical: 12,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                        borderBottomColor: S.hairline,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: S.inkFaint }}>
                        {l}
                      </Text>
                      <Text style={{ fontSize: 14, color: S.ink }}>{v}</Text>
                    </View>
                  ))}
                </LinearGradient>
              </View>

              <View
                style={{
                  marginTop: 14,
                  paddingHorizontal: 8,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 10,
                      letterSpacing: 2.8,
                      textTransform: 'uppercase',
                      color: S.inkFaint,
                      fontWeight: '700',
                    },
                  ]}
                >
                  Total debit
                </Text>
                <Text
                  style={[
                    serif,
                    {
                      fontSize: 20,
                      fontStyle: 'italic',
                      color: S.ink,
                    },
                  ]}
                >
                  ${(Number(fiatValue) + (feeUSD ?? 0)).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: insets.bottom + 24,
              }}
            >
              {sendError ? (
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 12,
                      color: '#E5484D',
                      textAlign: 'center',
                      marginBottom: 10,
                    },
                  ]}
                >
                  {sendError}
                </Text>
              ) : null}
              <SwipeToSend
                key={swipeAttempt.current}
                tone={tone}
                label={
                  sendMutation.isPending || privateSending
                    ? 'Sending…'
                    : 'Swipe to send'
                }
                onSend={onSwipeSend}
                disabled={
                  !amountValid || sendMutation.isPending || privateSending
                }
                loading={sendMutation.isPending || privateSending}
              />
            </View>
          </>
        )}

      </Animated.View>
    </CenterGlow>
  );
}
