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

const FADE_OUT = 160;
const FADE_IN = 220;

const MAX_GRADIENTS: Record<Tone, [string, string]> = {
  silver: ['#e8e8ea', '#9a9a9f'],
  gold: ['#e6c079', '#a37b2e'],
};

// Solana base fee = 5,000 lamports per signature. Single-sig transfer = 5,000.
const NETWORK_FEE_SOL = 0.000005;

// Solana base58: alphabet excludes 0, O, I, l. Address length is 32–44.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Lightweight .sol name accept-list — backend will resolve later.
const SOL_NAME_RE = /^[a-zA-Z0-9._-]{1,32}\.sol$/;

function isValidRecipient(input: string): boolean {
  const s = input.trim();
  return SOLANA_ADDRESS_RE.test(s) || SOL_NAME_RE.test(s);
}

function truncateAddress(input: string, head = 6, tail = 4): string {
  const s = input.trim();
  if (s.length <= head + tail + 1) return s;
  if (!SOLANA_ADDRESS_RE.test(s)) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

type Props = { tone?: Tone };

export function SendFlow({ tone = 'silver' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const S = txPalette(tone);
  const maxGradient = MAX_GRADIENTS[tone];
  const { user, isAuthenticated } = useAuth();
  const bankWallet = user?.bankWallet ?? '';
  const { data: balance } = useBalance(bankWallet);
  const { data: solPrice } = useSolPrice();
  const sendMutation = useSendSimple();

  const assets = useMemo(
    () => mapTokensToAssets(balance?.tokens ?? []),
    [balance],
  );
  // Recent recipients endpoint not yet built — empty until the backend exposes it.
  const recents: Recipient[] = [];

  const [step, setStep] = useState(0);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('0');
  const [inToken, setInToken] = useState(true);
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

  const onKey = (k: string) => {
    if (k === '⌫') {
      setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
    } else if (k === '.') {
      setAmount((a) => (a.includes('.') ? a : a + '.'));
    } else {
      // Cap at 9 chars so the giant amount typography never overflows
      // the screen and shifts the layout (matches Apple Pay / Revolut).
      setAmount((a) => {
        if (a.length >= 9) return a;
        return a === '0' ? k : a + k;
      });
    }
  };

  // SOL → live price from the dedicated endpoint (fresher than wallet snapshot).
  // Other tokens → per-unit price derived from the wallet balance/balanceUSD pair
  // (or stable parity for USDC/EURC/USDT). 0 if we genuinely don't know.
  const rate = asset
    ? asset.symbol === 'SOL' && typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : (asset.priceUSD ?? 0)
    : 0;
  const fiatValue = (Number(amount) * rate).toFixed(2);
  const amountNum = Number(amount);
  const balanceNum = asset ? Number(asset.balance) : 0;
  // Reserve the network fee on top of the amount when the asset is the gas token.
  const exceedsBalance =
    asset?.symbol === 'SOL'
      ? amountNum + NETWORK_FEE_SOL > balanceNum
      : amountNum > balanceNum;
  const amountValid = amountNum > 0 && !exceedsBalance;
  const amountError =
    amountNum > 0 && exceedsBalance
      ? `Insufficient balance · max ${asset?.balance ?? 0} ${asset?.symbol ?? ''}`
      : null;
  const feeUSD =
    typeof solPrice === 'number' && solPrice > 0
      ? NETWORK_FEE_SOL * solPrice
      : null;
  const feeLabel = feeUSD === null ? '—' : `$${feeUSD.toFixed(4)}`;
  const fromLabel = tone === 'gold' ? 'Stealth wallet' : 'Bank wallet';

  const submitRecipient = () => {
    const trimmed = recipientQuery.trim();
    if (!trimmed) {
      setRecipientError('Enter a Solana address or .sol name.');
      return;
    }
    if (!isValidRecipient(trimmed)) {
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
    if (__DEV__) console.log('[SendFlow] sending', amount, asset.symbol, '→', recipient.name);
    try {
      const sig = await sendMutation.mutateAsync({
        fromAddress: user.bankWallet,
        toAddress: recipient.name.trim(),
        amountSol: Number(amount),
        balanceSol: balanceNum,
      });
      if (__DEV__) console.log('[SendFlow] success, sig=', sig);
      setTxSig(sig);
      transitionTo(4, 'forward');
    } catch (err) {
      if (__DEV__) console.warn('[SendFlow] send failed:', err);
      const msg =
        err instanceof Error ? err.message : 'Could not send the transaction.';
      setSendError(msg);
      // Force the swipe widget to reset visually so the user can retry.
      swipeAttempt.current += 1;
    }
  };

  // Success owns the whole screen (its own CenterGlow + header) so we early-return
  // to avoid double-wrapping in the wizard's CenterGlow.
  if (step === 4 && asset && recipient) {
    return (
      <SuccessScreen
        tone={tone}
        kicker="Sent"
        prefix="$"
        amount={fiatValue}
        subtitle={`to ${truncateAddress(recipient.name)}`}
        onClose={close}
        onDone={close}
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
                      key={a.symbol}
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
              {recipientError ? (
                <Text
                  style={[
                    sansation,
                    {
                      marginTop: 10,
                      paddingHorizontal: 4,
                      fontSize: 12,
                      color: '#E5484D',
                    },
                  ]}
                >
                  {recipientError}
                </Text>
              ) : null}
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
                disabled={!isValidRecipient(recipientQuery)}
                onPress={submitRecipient}
              />
            </View>
          </>
        )}

        {step === 2 && asset && recipient && (
          <>
            <TxTitleBlock
              kicker="Step 3 of 4"
              title={`For ${truncateAddress(recipient.name)}`}
              subtitle="Enter the amount to send"
            />

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Pressable
                onPress={() => setInToken((v) => !v)}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  paddingHorizontal: 28,
                  gap: 4,
                }}
              >
                {inToken ? (
                  <>
                    <Text
                      style={[
                        sansationLight,
                        {
                          fontSize: 84,
                          letterSpacing: -4.2,
                          color: S.ink,
                          lineHeight: 84,
                          includeFontPadding: false,
                        },
                      ]}
                    >
                      {amount}
                    </Text>
                    <Text
                      style={[
                        serif,
                        {
                          fontSize: 30,
                          color: S.accent,
                          fontStyle: 'italic',
                          lineHeight: 30,
                          includeFontPadding: false,
                          marginLeft: 6,
                        },
                      ]}
                    >
                      {asset.symbol}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        serif,
                        {
                          fontSize: 38,
                          color: S.accent,
                          fontStyle: 'italic',
                          lineHeight: 38,
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
                          fontSize: 84,
                          letterSpacing: -4.2,
                          color: S.ink,
                          lineHeight: 84,
                          includeFontPadding: false,
                        },
                      ]}
                    >
                      {fiatValue}
                    </Text>
                  </>
                )}
              </Pressable>
              <Text
                style={[
                  serif,
                  {
                    textAlign: 'center',
                    marginTop: 10,
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: S.inkDim,
                  },
                ]}
              >
                ≈ {inToken ? `$${fiatValue}` : `${amount} ${asset.symbol}`}
              </Text>
            </View>

            <View
              style={{
                alignItems: 'center',
                marginBottom: 28,
              }}
            >
              <Pressable
                onPress={() => setAmount(asset.balance)}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <LinearGradient
                  colors={maxGradient}
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
                    sansation,
                    {
                      fontSize: 10,
                      letterSpacing: 2.2,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      color: '#0a0a0a',
                    },
                  ]}
                >
                  Max
                </Text>
                <View
                  style={{
                    width: 1,
                    height: 10,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                />
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 10,
                      color: '#0a0a0a',
                      fontWeight: '500',
                    },
                  ]}
                >
                  {asset.balance} {asset.symbol}
                </Text>
              </Pressable>
            </View>

            <Numpad onKey={onKey} tone={tone} />

            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: insets.bottom + 24,
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
                      marginBottom: 10,
                    },
                  ]}
                >
                  {amountError}
                </Text>
              ) : null}
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
              title="Confirm"
              subtitle="Review and swipe to send"
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
                      ≈ {amount} {asset.symbol}
                    </Text>
                  </View>

                  {[
                    ['From', fromLabel],
                    ['To', truncateAddress(recipient.name)],
                    ['Asset', `${asset.symbol} · ${asset.name}`],
                    ['Network fee', feeLabel],
                  ].map(([l, v], i, arr) => (
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
                label={sendMutation.isPending ? 'Sending…' : 'Swipe to send'}
                onSend={onSwipeSend}
              />
            </View>
          </>
        )}

      </Animated.View>
    </CenterGlow>
  );
}
