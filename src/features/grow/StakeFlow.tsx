/**
 * StakeFlow — Deposit (stake SOL → jitoSOL) / Withdraw (unstake jitoSOL → SOL).
 *
 * Reuses the Shield/Send flow's UI primitives (CenterGlow, AmountCardTiles,
 * AssetSelectRow, TiledKeypadPanel, useAmountInput) for a visually identical
 * amount-entry screen — but the submit path is JitoSOL staking, NOT Umbra. The
 * asset is fixed (SOL on deposit, jitoSOL on withdraw), so there's no asset
 * picker.
 *
 * Signing goes through the JitoSOL service (`stakeSOL` / `unstakeJitoSOL`),
 * which uses the stealth wallet's local ED25519 key (hard rule #3). The Jito
 * pool is mainnet-only, so on a devnet build the tx fails — surfaced as an error
 * toast. The withdraw source balance is a placeholder (0) until a real JitoSOL
 * balance hook exists, so Withdraw stays at "Insufficient balance" for now.
 */
import { useEffect } from 'react';
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
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  maxSpendableSol,
  SOL_DECIMALS,
  SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { SOL_ICON_URI } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { stakeSOL } from '@/src/services/jitoSOL/staking';
import { unstakeJitoSOL } from '@/src/services/jitoSOL/unstaking';
import { usePoolInfo } from './hooks/usePoolInfo';

type Direction = 'deposit' | 'withdraw';

const JITOSOL_ICON = require('@/assets/images/jito.png');
/** Placeholder — swap for the real JitoSOL balance hook to enable Withdraw. */
const JITOSOL_BALANCE = 0;

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(4).replace(/\.?0+$/, '');
}

export function StakeFlow({ direction }: { direction: Direction }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const isDeposit = direction === 'deposit';
  const title = isDeposit ? 'Deposit' : 'Withdraw';
  const assetSymbol = isDeposit ? 'SOL' : 'JitoSOL';
  const iconSource = isDeposit ? { uri: SOL_ICON_URI } : JITOSOL_ICON;

  const { user } = useAuth();
  const { data: bal } = useBalance(isDeposit ? user?.stealfWallet ?? null : null);
  const { data: solPrice } = useSolPrice();
  const { data: pool } = usePoolInfo();

  // Deposit: source = stealth wallet public SOL. Withdraw: JitoSOL held
  // (placeholder 0 until a balance hook exists).
  const sourceBalance = isDeposit
    ? bal?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0
    : JITOSOL_BALANCE;

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

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;
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
        const sig = isDeposit
          ? await stakeSOL(amt)
          : await unstakeJitoSOL(amt, { instant: true });
        show({
          kind: 'success',
          title: isDeposit ? 'Deposit sent' : 'Withdrawal sent',
          message: `Tx ${sig.slice(0, 8)}…`,
        });
      } catch (err) {
        show({
          kind: 'error',
          title: isDeposit ? 'Deposit failed' : 'Withdrawal failed',
          message: err instanceof Error ? err.message : 'Operation failed',
        });
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
          onPressCta={onSubmit}
          ctaDisabled={disabled}
        />
      </View>
    </CenterGlow>
  );
}
