import { useMemo, useState } from 'react';
import {
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

const ASSETS: Asset[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    balance: '1.8981',
    fiat: '$167.92',
    gradient: ['#9945FF', '#14F195'],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    balance: '840.12',
    fiat: '$840.12',
    gradient: ['#2775CA', '#1a5390'],
  },
  {
    symbol: 'jitoSOL',
    name: 'Jito staked SOL',
    balance: '19.42',
    fiat: '$2,847',
    gradient: ['#c9c9cc', '#5a5a5e'],
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    balance: '0.0142',
    fiat: '$892',
    gradient: ['#F7931A', '#a65e06'],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '0.38',
    fiat: '$1,124',
    gradient: ['#627EEA', '#3b4fa8'],
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    balance: '200',
    fiat: '€200',
    gradient: ['#1a2c6b', '#0a1840'],
  },
];

const RECENTS: Recipient[] = [
  { name: '@maria', meta: 'Stealf · 2 days ago', avatar: ['#c9a86a', '#8b6a2e'] },
  { name: '@jona', meta: 'Stealf · 5 days ago', avatar: ['#9945FF', '#14F195'] },
  { name: 'vitalik.sol', meta: '.sol · 1 week ago' },
  { name: '7zMmK…9xQP', meta: 'Solana · 2 weeks ago' },
  { name: '@alex', meta: 'Stealf · 3 weeks ago', avatar: ['#2775CA', '#5BA0E0'] },
];

const RATE = 88.47;

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

  // Real assets when authenticated; mock list keeps the design intact in bypass mode.
  const realAssets = useMemo(() => mapTokensToAssets(balance?.tokens ?? []), [balance]);
  const assets = isAuthenticated && realAssets.length > 0 ? realAssets : ASSETS;
  const recents = RECENTS; // Recent recipients endpoint is not in scope for Slice 3.

  const [step, setStep] = useState(0);
  const [asset, setAsset] = useState<Asset>(assets[0]);
  const [recipient, setRecipient] = useState<Recipient>(recents[0]);
  const [amount, setAmount] = useState('0');
  const [inToken, setInToken] = useState(true);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [assetQuery, setAssetQuery] = useState('');

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
      setAmount((a) => (a === '0' ? k : a + k));
    }
  };

  // Use the live SOL price for SOL; for other tokens, fall back to the asset's
  // own fiat hint or the legacy mock RATE so the design remains demoable.
  const rate =
    asset.symbol === 'SOL' && typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : RATE;
  const fiatValue = (Number(amount) * rate).toFixed(2);
  const amountValid = Number(amount) > 0;

  const onSwipeSend = async () => {
    // In bypass / unauthenticated mode, just close — the design is the contract.
    if (!isAuthenticated || !user) {
      close();
      return;
    }
    try {
      await sendMutation.mutateAsync({
        fromAddress: user.bankWallet,
        toAddress: recipient.name,
        amountSol: Number(amount),
      });
      close();
    } catch (err) {
      if (__DEV__) console.warn('[SendFlow] send failed:', err);
    }
  };

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
              {assets.filter(
                (a) =>
                  !assetQuery ||
                  a.name.toLowerCase().includes(assetQuery.toLowerCase()) ||
                  a.symbol.toLowerCase().includes(assetQuery.toLowerCase()),
              ).map((a) => (
                <AssetPill
                  key={a.symbol}
                  {...a}
                  tone={tone}
                  onPress={() => {
                    setAsset(a);
                    transitionTo(1, 'forward');
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}

        {step === 1 && (
          <>
            <TxTitleBlock
              kicker="Step 2 of 4"
              title="Who's it for?"
              subtitle="@handle, address, or .sol name"
            />
            <View style={{ paddingHorizontal: 24, marginBottom: 18 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: S.hairline,
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
                  onChangeText={setRecipientQuery}
                  placeholder="username, address or .sol"
                  placeholderTextColor={S.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
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
            </View>
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
        )}

        {step === 2 && (
          <>
            <TxTitleBlock
              kicker="Step 3 of 4"
              title={`For ${recipient.name}`}
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
                paddingTop: 28,
                paddingBottom: insets.bottom + 24,
              }}
            >
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

        {step === 3 && (
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
                    ['From', 'Bank · EUR'],
                    ['To', recipient.name],
                    ['Asset', `${asset.symbol} · ${asset.name}`],
                    ['Network fee', '$0.02'],
                    ['Note', '—'],
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
                  ${(Number(fiatValue) + 0.02).toFixed(2)}
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
              <SwipeToSend tone={tone} onSend={onSwipeSend} />
            </View>
          </>
        )}
      </Animated.View>
    </CenterGlow>
  );
}
