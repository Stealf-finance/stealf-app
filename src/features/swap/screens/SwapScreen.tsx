import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { TiledKeypadPanel } from '@/src/features/send/components/TiledKeypadPanel';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { SWAP_TOKENS, type SwapToken } from '../lib/tokens';
import { useSwapQuote } from '../hooks/useSwapQuote';
import { useSwapExecute } from '../hooks/useSwapExecute';
import { TokenSelectSheet } from '@/src/design-system/primitives/TokenSelectSheet';
import { ConfirmSheet } from '@/src/components/confirm/ConfirmSheet';
import { tradeRows } from '@/src/components/confirm/rows';

const S = txPalette('silver');

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');
const fmt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 6 });

function TokenPill({
  token,
  onPress,
}: {
  token: SwapToken;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 6,
        paddingRight: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Image
        source={{ uri: token.logoUri }}
        style={{ width: 28, height: 28, borderRadius: 14 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <Text
        style={[sansation, { fontSize: 16, fontWeight: '600', color: T.ink }]}
      >
        {token.symbol}
      </Text>
      <Icons.chevD size={16} color={S.inkDim} />
    </Pressable>
  );
}

export function SwapScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { show } = useToast();
  const { user } = useAuth();

  const [payToken, setPayToken] = useState<SwapToken>(SWAP_TOKENS[0]);
  const [receiveToken, setReceiveToken] = useState<SwapToken>(SWAP_TOKENS[1]);
  const [pickerSide, setPickerSide] = useState<'pay' | 'receive' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: wallet } = useBalance(user?.bankWallet ?? null);
  const payBalance =
    wallet?.tokens?.find((t) => t.tokenSymbol === payToken.symbol)?.balance ??
    0;

  const { setAmount, solAmount, primaryDisplay, onKey, onPressPercent } =
    useAmountInput({
      rate: 0,
      maxSol: payBalance,
      decimals: payToken.decimals,
    });

  useEffect(() => {
    setAmount('0');
  }, [payToken.mint, setAmount]);

  // A failure goes inline while the sheet is up; once the user has walked away
  // only a toast can carry it.
  const onScreen = useRef(true);
  useEffect(() => {
    return () => {
      onScreen.current = false;
    };
  }, []);

  const {
    receiveAmount,
    order,
    loading: quoting,
  } = useSwapQuote(payToken, receiveToken, solAmount);
  const { swap, loading: swapping } = useSwapExecute();

  const insufficient = solAmount > payBalance;
  const reviewDisabled = solAmount <= 0 || insufficient;

  const pickToken = (tk: SwapToken) => {
    const other = pickerSide === 'pay' ? receiveToken : payToken;
    if (tk.mint === other.mint) {
      // Picking the same token as the other side → swap them.
      if (pickerSide === 'pay') setReceiveToken(payToken);
      else setPayToken(receiveToken);
    }
    if (pickerSide === 'pay') setPayToken(tk);
    else setReceiveToken(tk);
    setAmount('0');
  };

  const flip = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setAmount('0');
  };

  const onConfirm = () => {
    setError(null);
    void (async () => {
      try {
        const res = await swap(payToken, receiveToken, solAmount);
        setTxSig(res.signature);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Trade failed';
        if (onScreen.current) {
          setError(message);
        } else {
          show({ kind: 'error', title: 'Swap failed', message });
        }
      }
    })();
  };

  return (
    <CenterGlow tone="silver" flat>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={() => router.back()} />
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
            Swap
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* You pay */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={[
              sansation,
              { fontSize: 14, color: S.inkDim, marginBottom: 8 },
            ]}
          >
            Swap from
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 44,
                  letterSpacing: -1,
                  color: solAmount > 0 ? S.ink : T.inkMute,
                  includeFontPadding: false,
                  flexShrink: 1,
                },
              ]}
              numberOfLines={1}
            >
              {primaryDisplay}
            </Text>
            <TokenPill token={payToken} onPress={() => setPickerSide('pay')} />
          </View>
          <Pressable
            onPress={() => onPressPercent(1)}
            hitSlop={8}
            style={{ alignSelf: 'flex-end', marginTop: 8 }}
          >
            <Text style={[sansation, { fontSize: 14, color: S.inkDim }]}>
              <Text style={{ color: S.ink, fontWeight: '600' }}>MAX</Text>{' '}
              {trim(payBalance)}
            </Text>
          </Pressable>
        </View>

        {/* Flip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginVertical: 20,
            paddingHorizontal: 24,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: S.hairline }} />
          <Pressable onPress={flip} hitSlop={10} style={{ padding: 4 }}>
            <Icons.swapV size={22} color={T.ink} />
          </Pressable>
          <View style={{ flex: 1, height: 1, backgroundColor: S.hairline }} />
        </View>

        {/* You receive */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={[
              sansation,
              { fontSize: 14, color: S.inkDim, marginBottom: 8 },
            ]}
          >
            Swap to
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 44,
                  letterSpacing: -1,
                  color: receiveAmount > 0 ? S.ink : T.inkMute,
                  includeFontPadding: false,
                  flexShrink: 1,
                },
              ]}
              numberOfLines={1}
            >
              {receiveAmount > 0 ? fmt(receiveAmount) : quoting ? '…' : '0'}
            </Text>
            <TokenPill
              token={receiveToken}
              onPress={() => setPickerSide('receive')}
            />
          </View>
        </View>
      </View>

      {/* Keypad + Review */}
      <View style={{ paddingBottom: insets.bottom + 12 }}>
        <TiledKeypadPanel
          onKey={onKey}
          tone="silver"
          ctaLabel={insufficient ? 'Insufficient balance' : 'Review'}
          onPressCta={() => setReviewOpen(true)}
          ctaDisabled={reviewDisabled}
        />
      </View>

      <TokenSelectSheet
        open={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        items={SWAP_TOKENS}
        keyOf={(t) => t.mint}
        toRow={(t) => ({ symbol: t.symbol, name: t.name, iconUri: t.logoUri })}
        onSelect={pickToken}
      />
      {/* Jupiter lands the tx before /execute returns, so the signature
          already means confirmed. */}
      <ConfirmSheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onDone={() => router.back()}
        title="Swap"
        slideLabel="Slide to swap"
        amountLabel={`${fmt(solAmount)} ${payToken.symbol}`}
        rows={[
          ...tradeRows({
            pay: `${fmt(solAmount)} ${payToken.symbol}`,
            receive: `≈ ${fmt(receiveAmount)} ${receiveToken.symbol}`,
            rate:
              solAmount > 0
                ? `1 ${payToken.symbol} ≈ ${fmt(receiveAmount / solAmount)} ${receiveToken.symbol}`
                : undefined,
          }),
          ...(order?.priceImpact != null
            ? [
                {
                  label: 'Price impact',
                  value: `${(order.priceImpact * 100).toFixed(2)}%`,
                },
              ]
            : []),
        ]}
        onConfirm={onConfirm}
        submitting={swapping}
        signature={txSig ?? undefined}
        error={error ?? undefined}
        successTitle="Swap sent"
      />
    </CenterGlow>
  );
}
