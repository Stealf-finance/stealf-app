/**
 * STLF buy/sell amount entry — mirrors the JitoSOL StakeFlow. Buy mints STLF
 * from the bank wallet's USDC; Sell burns STLF back to USDC. Bank/Turnkey
 * signing via useReflectYield; the hook polls the tx to confirmation before
 * recording the position, so the success message reflects the real on-chain
 * outcome (a slow tx shows "confirming", never a false success).
 */
import { useEffect } from 'react';
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
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useReflectYield } from './hooks/useReflectYield';
import { useReflectBalance, useReflectStats, useInvalidateReflect } from './hooks/useReflectData';

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

  const { data: bankBal } = useBalance(isBuy ? user?.bankWallet ?? null : null);
  const { data: stlfBal } = useReflectBalance(!isBuy ? user?.bankWallet : null);
  const { data: stats } = useReflectStats();

  // Buy: spend bank USDC ($1 each). Sell: send STLF (≈ its USD rate).
  const sourceBalance = isBuy
    ? bankBal?.tokens?.find((t) => t.tokenSymbol === 'USDC')?.balance ?? 0
    : stlfBal?.usdcPlusUiAmount ?? 0;

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

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(2)} ${assetSymbol}`;
  const balanceLabel = `${formatBalance(sourceBalance)} ${assetSymbol}`;

  const close = () => router.back();
  const insufficient = solAmount > sourceBalance;
  const disabled = solAmount <= 0 || insufficient;

  const onSubmit = () => {
    const amt = solAmount;
    if (amt <= 0 || insufficient) return;
    close();

    void (async () => {
      try {
        const res = isBuy ? await buy(amt) : await sell(amt);
        void queryClient.invalidateQueries({ queryKey: ['reflect-balance'] });
        void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        invalidate(user?.bankWallet ?? undefined);
        if (res.confirmed) {
          show({
            kind: 'success',
            title: isBuy ? 'Bought STLF' : 'Sold STLF',
            message: `Tx ${res.signature.slice(0, 8)}…`,
          });
        } else {
          show({
            kind: 'info',
            title: isBuy ? 'Buy submitted' : 'Sell submitted',
            message: 'Confirming on-chain…',
          });
        }
      } catch (err) {
        show({
          kind: 'error',
          title: isBuy ? 'Buy failed' : 'Sell failed',
          message: err instanceof Error ? err.message : 'Operation failed',
        });
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
          onPressCta={onSubmit}
          ctaDisabled={disabled}
        />
      </View>
    </CenterGlow>
  );
}
