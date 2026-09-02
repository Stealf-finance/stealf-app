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
import { ConfirmSheet } from '@/src/components/confirm/ConfirmSheet';
import { feeRows, tradeRows } from '@/src/components/confirm/rows';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import {
  maxSpendableSol,
  NETWORK_FEE_SOL,
  SOL_DECIMALS,
  SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { SOL_ICON_URI } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { useTurnkeySigning } from '@/src/features/bank/hooks/useTurnkeySigning';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { stakeSOL } from '@/src/services/jitoSOL/staking';
import { unstakeJitoSOL } from '@/src/services/jitoSOL/unstaking';
import { usePoolInfo } from './hooks/usePoolInfo';
import {
  useJitoSolBalance,
  jitoSolBalanceQueries,
} from './hooks/useJitoSolBalance';

type Direction = 'deposit' | 'withdraw';

const JITOSOL_ICON = require('@/assets/images/jito.png');

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(4).replace(/\.?0+$/, '');
}

export function StakeFlow({ direction }: { direction: Direction }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const isDeposit = direction === 'deposit';
  const title = isDeposit ? 'Stake' : 'Unstake';
  const assetSymbol = isDeposit ? 'SOL' : 'JitoSOL';
  const iconSource = isDeposit ? { uri: SOL_ICON_URI } : JITOSOL_ICON;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { signHex } = useTurnkeySigning();
  const { data: bal } = useBalance(
    isDeposit ? (user?.bankWallet ?? null) : null,
  );
  const { data: solPrice } = useSolPrice();
  const { data: pool } = usePoolInfo();
  const { data: jitoBal } = useJitoSolBalance();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deposit: source = the wallet's public SOL. Withdraw: JitoSOL held.
  const sourceBalance = isDeposit
    ? (bal?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0)
    : (jitoBal?.uiAmount ?? 0);

  // USD rate: SOL price on deposit; jitoSOL ≈ (SOL per jitoSOL) · SOL price.
  const price = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;
  const rate = isDeposit ? price : pool ? pool.solJitoConversion * price : 0;

  // Reserve a little SOL for tx fees when maxing out a deposit.
  const maxAsset = isDeposit
    ? maxSpendableSol(sourceBalance, true, false, SOL_FEE_RESERVE)
    : sourceBalance;

  const {
    setAmount,
    inputMode,
    solAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  } = useAmountInput({ rate, maxSol: maxAsset, decimals: SOL_DECIMALS });

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

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;
  const balanceLabel = `${formatBalance(sourceBalance)} ${assetSymbol}`;

  const close = () => router.back();
  const insufficient = solAmount > sourceBalance;
  const disabled = solAmount <= 0 || insufficient;

  const amountLabel = `${formatBalance(solAmount)} ${assetSymbol}`;

  // SOL per JitoSOL — unavailable on a devnet RPC, so the estimate is dropped
  // rather than guessed.
  const conversion = pool?.solJitoConversion;
  const receiveSymbol = isDeposit ? 'JitoSOL' : 'SOL';
  const receiveAmount =
    conversion && conversion > 0
      ? isDeposit
        ? solAmount / conversion
        : solAmount * conversion
      : undefined;

  const rows = tradeRows({
    pay: amountLabel,
    receive:
      receiveAmount === undefined
        ? `— ${receiveSymbol}`
        : `≈ ${formatBalance(receiveAmount)} ${receiveSymbol}`,
    rate: conversion ? `1 JitoSOL ≈ ${conversion.toFixed(4)} SOL` : undefined,
  });

  const onConfirm = () => {
    const amt = solAmount;
    if (amt <= 0 || insufficient) return;
    const owner = user?.bankWallet;
    if (!owner) {
      setError(
        'Virtual bank account missing. Sign out and back in to restore it.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);

    void (async () => {
      try {
        const sig = isDeposit
          ? await stakeSOL(amt, owner, signHex)
          : await unstakeJitoSOL(amt, owner, signHex, { instant: true });
        setTxSig(sig);
        void queryClient.invalidateQueries({
          queryKey: jitoSolBalanceQueries.byWallet(owner),
        });
        void queryClient.invalidateQueries({
          queryKey: balanceQueries.byAddress(owner),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        if (onScreen.current) {
          setError(message);
        } else {
          show({
            kind: 'error',
            title: isDeposit ? 'Stake failed' : 'Unstake failed',
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
      {/* Header — aligned with the Shield / Send flow */}
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
            {title}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Amount card */}
      <View style={{ marginTop: 20 }}>
        <AmountCardTiles
          iconSource={iconSource}
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
          iconSource={iconSource}
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

      {/* signAndSendWithTurnkey broadcasts *and* confirms, so the signature
          already means settled: no optimistic pending state. */}
      <ConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onDone={close}
        title={title}
        slideLabel={`Slide to ${title.toLowerCase()}`}
        fiat={fiatAmount}
        amountLabel={amountLabel}
        rows={rows}
        feeRows={feeRows({ networkFeeUsd: NETWORK_FEE_SOL * price })}
        onConfirm={onConfirm}
        submitting={submitting}
        error={error ?? undefined}
        signature={txSig ?? undefined}
        successTitle={isDeposit ? 'Stake sent' : 'Unstake sent'}
      />
    </CenterGlow>
  );
}
