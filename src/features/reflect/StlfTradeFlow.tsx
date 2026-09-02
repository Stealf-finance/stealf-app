/**
 * STLF buy/sell amount entry — mirrors the JitoSOL StakeFlow. Buy mints STLF
 * from the bank wallet's USDC; Sell burns STLF back to USDC. Bank/Turnkey
 * signing via useReflectYield, then a confirmation sheet that reports
 * settlement from the wallet's `balance:updated` socket event — the same
 * fire-and-observe shape as the Jupiter swap, with no polling.
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { AmountCardTiles } from '@/src/features/send/components/AmountCardTiles';
import { AssetSelectRow } from '@/src/features/send/components/AssetSelectRow';
import { TiledKeypadPanel } from '@/src/features/send/components/TiledKeypadPanel';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import { NETWORK_FEE_SOL } from '@/src/features/send/lib/amount';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { ConfirmSheet } from '@/src/components/confirm/ConfirmSheet';
import { feeRows, tradeRows } from '@/src/components/confirm/rows';
import { useReflectYield } from './hooks/useReflectYield';
import { useStlfSettlement } from './hooks/useStlfSettlement';
import { stlfBaseUnits } from './lib/stlfSettlement';
import {
  useReflectBalance,
  useReflectStats,
  useInvalidateReflect,
} from './hooks/useReflectData';

type Direction = 'buy' | 'sell';

const COIN_ICON = require('@/assets/images/coin.png');
const STLF_DECIMALS = 6;

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(2).replace(/\.?0+$/, '');
}

export function StlfTradeFlow({ direction }: { direction: Direction }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const isBuy = direction === 'buy';
  const title = isBuy ? 'Buy' : 'Sell';
  const assetSymbol = isBuy ? 'USDC' : 'STLF';

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateReflect();
  const { buy, sell } = useReflectYield();

  const { data: bankBal } = useBalance(user?.bankWallet ?? null);
  const { data: stlfBal } = useReflectBalance(user?.bankWallet);
  const { data: stats } = useReflectStats();
  const { data: solPrice } = useSolPrice();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Snapshot taken at submit time: the live query moves once we invalidate it.
  const [baseline, setBaseline] = useState<number | null>(null);

  const settlement = useStlfSettlement({
    wallet: user?.bankWallet,
    stlfMint: stlfBal?.mint,
    baselineBaseUnits: baseline,
    enabled: Boolean(txSig),
  });

  // Buy: spend bank USDC ($1 each). Sell: send STLF (≈ its USD rate).
  const sourceBalance = isBuy
    ? (bankBal?.tokens?.find((t) => t.tokenSymbol === 'USDC')?.balance ?? 0)
    : (stlfBal?.usdcPlusUiAmount ?? 0);

  const rate = isBuy ? 1 : stats && stats.rate > 0 ? stats.rate : 1;

  const {
    setAmount,
    inputMode,
    solAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  } = useAmountInput({ rate, maxSol: sourceBalance, decimals: STLF_DECIMALS });

  useEffect(() => {
    setAmount('0');
  }, [direction, setAmount]);

  // A failure goes inline while the sheet is up; once the user has walked away
  // only a toast can carry it.
  const onScreen = useRef(true);
  useEffect(() => {
    return () => {
      onScreen.current = false;
    };
  }, []);

  // The settled event is the cue to refresh both sides of the trade.
  useEffect(() => {
    if (settlement !== 'settled') return;
    void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    invalidate(user?.bankWallet ?? undefined);
  }, [settlement, queryClient, invalidate, user?.bankWallet]);

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(2)} ${assetSymbol}`;
  const balanceLabel = `${formatBalance(sourceBalance)} ${assetSymbol}`;

  const close = () => router.back();
  const insufficient = solAmount > sourceBalance;
  const disabled = solAmount <= 0 || insufficient;

  const stlfRate = stats && stats.rate > 0 ? stats.rate : 1;
  const receiveAmount = isBuy ? solAmount / stlfRate : solAmount * stlfRate;
  const payLabel = `${formatBalance(solAmount)} ${assetSymbol}`;
  const receiveLabel = `≈ ${formatBalance(receiveAmount)} ${isBuy ? 'STLF' : 'USDC'}`;
  const rateLabel = `1 STLF ≈ $${stlfRate.toFixed(4)}`;
  const networkFeeUsd =
    typeof solPrice === 'number' && solPrice > 0
      ? NETWORK_FEE_SOL * solPrice
      : 0;
  const confirmStatus =
    settlement === 'settled'
      ? 'confirmed'
      : settlement === 'slow'
        ? 'slow'
        : 'pending';

  const onConfirm = () => {
    const amt = solAmount;
    if (amt <= 0 || insufficient) return;
    setError(null);
    setSubmitting(true);
    setBaseline(stlfBaseUnits(bankBal?.tokens ?? [], stlfBal?.mint));

    void (async () => {
      try {
        const res = isBuy ? await buy(amt) : await sell(amt);
        setTxSig(res.signature);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        if (onScreen.current) {
          setError(message);
        } else {
          show({
            kind: 'error',
            title: isBuy ? 'Buy failed' : 'Sell failed',
            message,
          });
        }
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <CenterGlow tone="silver" flat>
      {/* Header — aligned with the Stake / Send flow */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={close} />
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
            {title} STLF
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Amount card */}
      <View style={{ marginTop: 20 }}>
        <AmountCardTiles
          iconSource={COIN_ICON}
          tokenLabel={assetSymbol}
          primaryAmount={primaryDisplay}
          secondaryAmount={secondaryAmount}
          inputMode={inputMode}
          onToggleMode={onToggleMode}
          toggleDisabled={rate <= 0}
          showAssetRow={false}
        />
      </View>

      <View style={{ flex: 1 }} />

      {/* Fixed asset + balance + Use Max (no picker) */}
      <View style={{ marginBottom: 14 }}>
        <AssetSelectRow
          iconSource={COIN_ICON}
          name={assetSymbol}
          balanceLabel={balanceLabel}
          onPressMax={() => onPressPercent(1)}
        />
      </View>

      {/* Keypad + CTA */}
      <View style={{ paddingBottom: insets.bottom + 12 }}>
        <TiledKeypadPanel
          onKey={onKey}
          tone="silver"
          ctaLabel={insufficient ? 'Insufficient balance' : title}
          onPressCta={() => setConfirmOpen(true)}
          ctaDisabled={disabled}
        />
      </View>

      {/* Turnkey returns on broadcast, so settlement is what the socket
          reports — the status line downgrades from pending to confirmed. */}
      <ConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onDone={close}
        title={`${title} STLF`}
        slideLabel={`Slide to ${isBuy ? 'buy' : 'sell'}`}
        fiat={fiatAmount}
        rows={tradeRows({
          pay: payLabel,
          receive: receiveLabel,
          rate: rateLabel,
        })}
        feeRows={feeRows({ networkFeeUsd })}
        onConfirm={onConfirm}
        submitting={submitting}
        signature={txSig ?? undefined}
        status={confirmStatus}
        error={error ?? undefined}
        successTitle={isBuy ? 'Purchase submitted' : 'Sale submitted'}
      />
    </CenterGlow>
  );
}
