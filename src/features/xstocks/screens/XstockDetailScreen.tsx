/**
 * XstockDetailScreen — one tokenized stock: logo, name, reference price, your
 * holdings, and Buy / Sell actions.
 *
 * Buy takes a USD amount (Alert.prompt, iOS). Sell offers 25% / 50% / 100% of
 * the on-chain holdings. Trading is disabled with a "halted" pill when the
 * asset is halted. On success we surface the tx signature (mirrors UsdcPlusCard).
 */
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { mono, sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useXstockBalance, useXstockDetail, useInvalidateXstock } from '../hooks/useXstocksData';
import { useXstocksTrade, type SellPct } from '../hooks/useXstocksTrade';
import { HaltedPill } from '../components/XstockRow';

const S = txPalette('silver');

function promptUsdAmount(title: string, onSubmit: (amount: number) => void) {
  if (Platform.OS !== 'ios') {
    Alert.alert('Coming soon', 'Amount entry is available on iOS for now.');
    return;
  }
  Alert.prompt(
    title,
    'Enter amount in USD (up to 6 decimals)',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: (raw?: string) => {
          const amount = Number((raw ?? '').replace(',', '.'));
          if (!Number.isFinite(amount) || amount <= 0) {
            Alert.alert('Invalid amount');
            return;
          }
          onSubmit(amount);
        },
      },
    ],
    'plain-text',
    '',
    'decimal-pad',
  );
}

export function XstockDetailScreen({ symbol }: { symbol: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const wallet = user?.bankWallet;

  const { data: detail, isLoading: detailLoading } = useXstockDetail(symbol);
  const { data: balance, isLoading: balanceLoading } = useXstockBalance(
    wallet,
    symbol,
  );
  const invalidate = useInvalidateXstock();
  const { buy, sell, loading } = useXstocksTrade();

  const halted =
    detail?.isTradingHalted ||
    detail?.status.isMarketTradingHalted ||
    detail?.status.isAtomicTradingHalted ||
    false;

  const referencePrice = detail?.referencePrice ?? null;
  const uiAmount = balance?.uiAmount ?? 0;
  const usdValue = referencePrice != null ? uiAmount * referencePrice : null;

  const handleBuy = useCallback(() => {
    promptUsdAmount(`Buy ${symbol}`, async (amount) => {
      try {
        const res = await buy(symbol, amount);
        Alert.alert('Order sent', `Tx: ${res.signature.slice(0, 16)}…`);
        invalidate(wallet ?? undefined, symbol);
      } catch (err) {
        Alert.alert(
          'Buy failed',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    });
  }, [buy, invalidate, symbol, wallet]);

  const handleSell = useCallback(
    (pct: SellPct) => {
      const label = `${Math.round(pct * 100)}%`;
      Alert.alert(`Sell ${label} of ${symbol}?`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await sell(symbol, pct);
              Alert.alert('Order sent', `Tx: ${res.signature.slice(0, 16)}…`);
              invalidate(wallet ?? undefined, symbol);
            } catch (err) {
              Alert.alert(
                'Sell failed',
                err instanceof Error ? err.message : 'Unknown error',
              );
            }
          },
        },
      ]);
    },
    [sell, invalidate, symbol, wallet],
  );

  return (
    <TonalBackground tone="silver">
      {/* Header row */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[sansation, { fontSize: 15, color: S.inkDim }]}>
            Back
          </Text>
        </TouchableOpacity>
        <Kicker color={T.gold} style={{ letterSpacing: 3.2 }}>
          {symbol}
        </Kicker>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {detailLoading && !detail && (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={S.inkFaint} />
          </View>
        )}

        {detail && (
          <>
            {/* Identity */}
            <View style={{ alignItems: 'center', paddingBottom: 20 }}>
              {detail.logo ? (
                <Image
                  source={{ uri: detail.logo }}
                  style={{ width: 72, height: 72, borderRadius: 36 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                />
              )}
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 24,
                    letterSpacing: -0.48,
                    color: S.ink,
                    marginTop: 14,
                    textAlign: 'center',
                  },
                ]}
              >
                {detail.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <Text
                  style={[
                    mono,
                    { fontSize: 12, color: S.inkFaint, letterSpacing: 0.24 },
                  ]}
                >
                  {detail.symbol}
                </Text>
                {halted && <HaltedPill />}
              </View>
            </View>

            {/* Reference price */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: 12,
              }}
            >
              <LinearGradient
                colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{ paddingVertical: 18, paddingHorizontal: 22 }}
              >
                <Kicker color={S.inkFaint} style={{ fontSize: 9 }}>
                  Reference price
                </Kicker>
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 30,
                      letterSpacing: -0.6,
                      color: S.ink,
                      marginTop: 6,
                    },
                  ]}
                >
                  {referencePrice != null
                    ? `$${referencePrice.toFixed(2)}`
                    : '—'}
                </Text>
              </LinearGradient>
            </View>

            {/* Your holdings */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <LinearGradient
                colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{ paddingVertical: 18, paddingHorizontal: 22 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Kicker color={S.inkFaint} style={{ fontSize: 9 }}>
                    Your holdings
                  </Kicker>
                  {balanceLoading && (
                    <ActivityIndicator size="small" color={S.inkFaint} />
                  )}
                </View>
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 24,
                      letterSpacing: -0.48,
                      color: S.ink,
                      marginTop: 6,
                    },
                  ]}
                >
                  {balance ? `${uiAmount.toFixed(4)} ${detail.symbol}` : '—'}
                </Text>
                {usdValue != null && usdValue > 0 && (
                  <Text
                    style={[
                      mono,
                      {
                        fontSize: 11,
                        color: S.inkFaint,
                        marginTop: 6,
                        letterSpacing: 0.2,
                      },
                    ]}
                  >
                    ≈ ${usdValue.toFixed(2)} USD
                  </Text>
                )}
              </LinearGradient>
            </View>

            {/* Buy */}
            <ActionButton
              label={halted ? 'Trading halted' : 'Buy'}
              onPress={handleBuy}
              disabled={loading || halted}
              primary
            />

            {/* Sell — percentages of holdings */}
            <Text
              style={[
                sansation,
                {
                  fontSize: 12,
                  color: S.inkDim,
                  marginTop: 20,
                  marginBottom: 10,
                  letterSpacing: 0.2,
                },
              ]}
            >
              Sell
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([0.25, 0.5, 1] as const).map((pct) => (
                <ActionButton
                  key={pct}
                  label={`${Math.round(pct * 100)}%`}
                  onPress={() => handleSell(pct)}
                  disabled={loading || halted || uiAmount <= 0}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </TonalBackground>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: primary
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={[
          sansation,
          { fontSize: 13, color: S.ink, fontWeight: '600', letterSpacing: 0.2 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
