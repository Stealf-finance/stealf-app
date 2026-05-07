import { useMemo, useRef, useState } from 'react';
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
import { AssetPill, Asset } from '@/src/features/send/components/AssetPill';
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
import {
  shieldedBalanceQueries,
  useShieldedSolBalance,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { historyQueries } from '@/src/features/bank/api/history';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import {
  PROTOCOL_FEE_RATE,
  protocolFeeSol,
  SOL_DECIMALS,
} from '@/src/features/send/lib/amount';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';

const FADE_OUT = 160;
const FADE_IN = 220;

// Solana base fee = 5,000 lamports per signature. Single-sig transfer = 5,000.
const NETWORK_FEE_SOL = 0.000005;

// Solana base58: alphabet excludes 0, O, I, l. Address length is 32–44.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Lightweight .sol name accept-list — backend will resolve later.
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

type WalletSource = 'bank' | 'stealth';
type SendMode = 'public' | 'private';

type Props = { tone?: Tone; wallet?: WalletSource; mode?: SendMode };

export function SendFlow({ tone = 'silver', wallet, mode = 'public' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const S = txPalette(tone);
  const { user, isAuthenticated } = useAuth();
  // `wallet` decides which account signs and what balance is shown. It's
  // orthogonal to `tone` (visual styling) — the Stealth public tab uses
  // tone=silver but pulls the stealf wallet, while the Stealth private tab
  // uses tone=gold for the same wallet. Falls back to the legacy tone-based
  // mapping when the prop isn't passed.
  const walletSource: WalletSource =
    wallet ?? (tone === 'gold' ? 'stealth' : 'bank');
  const isPrivate = mode === 'private';
  const fromAddress =
    (walletSource === 'stealth' ? user?.stealfWallet : user?.bankWallet) ?? '';
  const fromLabel = isPrivate
    ? 'Encrypted balance'
    : walletSource === 'stealth'
      ? 'Stealth wallet'
      : 'Bank wallet';
  const { data: balance } = useBalance(fromAddress);
  const { data: shielded } = useShieldedSolBalance();
  const { data: solPrice } = useSolPrice();
  const sendMutation = useSendSimple();
  const queryClient = useQueryClient();
  const umbra = useUmbra();
  const { setMode } = usePrivacyMode();
  const [privateSending, setPrivateSending] = useState(false);

  // Private mode only spends encrypted balance, which currently only holds
  // SOL. We synthesize a single Asset entry from the shielded balance so the
  // wizard's existing AssetPill / Max / fiat plumbing works unchanged.
  const privateAssets: Asset[] = useMemo(() => {
    const sol = shielded?.sol ?? 0;
    const fiatRate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;
    const balanceStr =
      sol === 0 ? '0' : sol.toFixed(6).replace(/\.?0+$/, '');
    return [
      {
        mint: null,
        symbol: 'SOL',
        name: 'Solana',
        balance: balanceStr,
        fiat:
          fiatRate > 0
            ? `$${(sol * fiatRate).toFixed(2)}`
            : '$—',
        gradient: ['#9945FF', '#14F195'],
        iconSource: require('@/assets/images/solana-icon.png'),
        priceUSD: fiatRate || undefined,
      },
    ];
  }, [shielded?.sol, solPrice]);

  const assets = useMemo(
    () =>
      isPrivate ? privateAssets : mapTokensToAssets(balance?.tokens ?? []),
    [isPrivate, privateAssets, balance],
  );
  // Recent recipients endpoint not yet built — empty until the backend exposes it.
  const recents: Recipient[] = [];

  const [step, setStep] = useState(0);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
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
    if (step === 0) close();
    else transitionTo(step - 1, 'back');
  };

  // SOL → live price from the dedicated endpoint (fresher than wallet snapshot).
  // Other tokens → per-unit price derived from the wallet balance/balanceUSD pair
  // (or stable parity for USDC/EURC/USDT). 0 if we genuinely don't know.
  const rate = asset
    ? asset.symbol === 'SOL' && typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : (asset.priceUSD ?? 0)
    : 0;
  const balanceNum = asset ? Number(asset.balance) : 0;
  // Private sends pay a 0.30% Umbra protocol fee on the encrypted balance,
  // so Max has to leave that wedge unspent — otherwise the create-UTXO tx
  // fails at submit time. SOL also reserves the network fee.
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
  } = useAmountInput({ rate, maxSol: maxSpendable });

  const fiatValue = fiatAmount.toFixed(2);
  const amountNum = typedAssetAmount;
  const exceedsBalance =
    asset?.symbol === 'SOL'
      ? amountNum + NETWORK_FEE_SOL > balanceNum
      : amountNum > balanceNum;
  const amountValid = amountNum > 0 && !exceedsBalance;
  const amountError =
    amountNum > 0 && exceedsBalance
      ? `Insufficient balance · max ${asset?.balance ?? 0} ${asset?.symbol ?? ''}`
      : null;
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
        setPrivateSending(true);
        const amountLamports = BigInt(
          Math.floor(typedAssetAmount * 10 ** SOL_DECIMALS),
        );
        const destination = toAddress(recipient.name.trim());
        const mint = toAddress(SOL_MINT);
        await umbra.sendEncrypted(destination, mint, amountLamports);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: shieldedBalanceQueries.byStealfWallet(fromAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: historyQueries.byAddress(fromAddress),
          }),
        ]);
        setTxSig(null);
        transitionTo(4, 'forward');
        return;
      }
      const sig = await sendMutation.mutateAsync({
        fromAddress,
        toAddress: recipient.name.trim(),
        amountSol: typedAssetAmount,
        walletSource,
        balanceSol: balanceNum,
      });
      if (__DEV__) console.log('[SendFlow] success, sig=', sig);
      setTxSig(sig);
      transitionTo(4, 'forward');
    } catch (err: any) {
      if (__DEV__) console.warn('[SendFlow] send failed:', err);
      const msg =
        err?.userMessage ||
        (err instanceof Error
          ? err.message
          : 'Could not send the transaction.');
      setSendError(msg);
      // Force the swipe widget to reset visually so the user can retry.
      swipeAttempt.current += 1;
    } finally {
      setPrivateSending(false);
    }
  };

  // Success owns the whole screen (its own CenterGlow + header) so we early-return
  // to avoid double-wrapping in the wizard's CenterGlow.
  if (step === 4 && asset && recipient) {
    // Private sends originate from the stealth tab in private mode — land
    // back there explicitly so the user sees the new (lower) shielded
    // balance instead of relying on stack pop heuristics.
    const finishPrivate = () => {
      setMode('private');
      router.replace('/(tabs)/stealth');
    };
    const onDone = isPrivate ? finishPrivate : close;
    const onSuccessClose = isPrivate ? finishPrivate : close;
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
      <TxHeader
        step={step}
        total={4}
        tone={tone}
        onBack={handleBack}
        onClose={close}
      />

      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        {step === 0 && (
          <>
            <TxTitleBlock
              kicker="Step 1 of 4"
              title="Select asset"
              subtitle="What do you want to send?"
            />
            <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: S.hairline,
                }}
              >
                <Icons.search size={16} color={S.inkFaint} />
                <TextInput
                  value={assetQuery}
                  onChangeText={setAssetQuery}
                  placeholder="Search"
                  placeholderTextColor={S.inkFaint}
                  style={[
                    sansation,
                    { flex: 1, padding: 0, color: S.ink, fontSize: 14 },
                  ]}
                />
              </View>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 32,
              }}
              showsVerticalScrollIndicator={false}
            >
              {assets.length === 0 ? (
                <Text
                  style={[
                    serif,
                    {
                      textAlign: 'center',
                      marginTop: 48,
                      fontStyle: 'italic',
                      fontSize: 14,
                      color: S.inkFaint,
                    },
                  ]}
                >
                  No assets to send yet.
                </Text>
              ) : (
                assets
                  .filter(
                    (a) =>
                      !assetQuery ||
                      a.name.toLowerCase().includes(assetQuery.toLowerCase()) ||
                      a.symbol
                        .toLowerCase()
                        .includes(assetQuery.toLowerCase()),
                  )
                  .map((a) => (
                    <AssetPill
                      key={a.mint ?? a.symbol}
                      {...a}
                      tone={tone}
                      onPress={() => {
                        setAsset(a);
                        transitionTo(1, 'forward');
                      }}
                    />
                  ))
              )}
            </ScrollView>
          </>
        )}

        {step === 1 && asset && (
          <>
            <TxTitleBlock
              kicker="Step 2 of 4"
              title="Who's it for?"
              subtitle="Solana address or .sol name"
            />
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
                label="Continue"
                disabled={!isValidRecipient(recipientQuery, fromAddress)}
                onPress={submitRecipient}
              />
            </View>
          </>
        )}

        {step === 2 && asset && recipient && (
          <>
            <TxTitleBlock
              kicker="Step 3 of 4"
              title={
                isPrivate
                  ? 'Send privately'
                  : `For ${truncateAddress(recipient.name)}`
              }
              subtitle={
                isPrivate
                  ? `To ${truncateAddress(recipient.name)}`
                  : 'Enter the amount to send'
              }
            />

            <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
              <SourceAssetCard
                label={isPrivate ? 'Sending privately' : 'Sending'}
                iconSource={
                  asset.iconSource ?? require('@/assets/images/solana-icon.png')
                }
                tokenLabel={asset.symbol}
                primaryAmount={primaryDisplay}
                secondaryAmount={
                  inputMode === 'asset'
                    ? `$${fiatAmount.toFixed(2)}`
                    : `${tokenAmountLabel} ${asset.symbol}`
                }
                inputMode={inputMode}
                onPressTokenPill={() => transitionTo(0, 'back')}
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
              <View
                style={{
                  height: 22,
                  marginBottom: 4,
                  justifyContent: 'center',
                }}
              >
                {amountError ? (
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 12,
                        color: '#E5484D',
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {amountError}
                  </Text>
                ) : null}
              </View>
              <PillBtn
                variant="primary"
                tone={tone}
                label="Continue"
                disabled={!amountValid}
                onPress={() => transitionTo(3, 'forward')}
              />
            </View>
          </>
        )}

        {step === 3 && asset && recipient && (
          <>
            <TxTitleBlock
              kicker="Step 4 of 4"
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
