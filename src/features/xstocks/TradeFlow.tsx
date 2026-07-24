/**
 * TradeFlow — Buy (USDC → xStock) / Sell (xStock → USDC) for a single symbol.
 *
 * Reuses the Shield/Send amount-entry primitives for a familiar screen. The
 * asset is fixed (USDC on buy, the xStock on sell), so there's no picker. Submit
 * runs build → sign (stealth ED25519) → execute via `useXstockTrade`; feedback
 * is a toast (fire-and-forget). BUY spends `usdcBaseUnits`; SELL sends the raw
 * Token-2022 base units derived proportionally from the holding.
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
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useToast } from '@/src/components/toast/ToastContext';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useXstockAsset } from './hooks/useXstockAsset';
import { useXstockBalance } from './hooks/useXstockBalance';
import { useXstockTrade } from './hooks/useXstockTrade';
import { sellRawBaseUnits, usdcToBaseUnits } from './lib/tradeMath';
import { displayName, formatAmount } from './lib/format';

type Mode = 'buy' | 'sell';

const USDC_ICON =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';

export function TradeFlow({ symbol, mode }: { symbol: string; mode: Mode }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const isBuy = mode === 'buy';

  const { user } = useAuth();
  const { data: detail } = useXstockAsset(symbol);
  const { data: xbal } = useXstockBalance(symbol);
  const { data: wallet } = useBalance(isBuy ? user?.stealfWallet ?? null : null);
  const { buy, sell } = useXstockTrade();

  const price = detail?.referencePrice ?? 0;
  const stockSymbol = detail?.symbol ?? symbol;
  const title = isBuy ? 'Buy' : 'Sell';
  const assetSymbol = isBuy ? 'USDC' : stockSymbol;
  const iconSource = { uri: isBuy ? USDC_ICON : detail?.logo ?? USDC_ICON };

  const sharesHeld = xbal?.uiAmount ?? 0;
  const rawHeld = xbal?.rawBaseUnits ?? 0;
  const usdcBalance =
    wallet?.tokens?.find((t) => t.tokenSymbol === 'USDC')?.balance ?? 0;
  const sourceBalance = isBuy ? usdcBalance : sharesHeld;

  const {
    setAmount,
    inputMode,
    solAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
  } = useAmountInput({ rate: 0, maxSol: sourceBalance, decimals: isBuy ? 2 : 6 });

  useEffect(() => {
    setAmount('0');
  }, [mode, symbol, setAmount]);

  // Counter-value estimate under the amount (indicative — Jupiter sets the real
  // rate at execution).
  const secondaryAmount = isBuy
    ? `≈ ${price > 0 ? (solAmount / price).toFixed(4) : '0'} ${stockSymbol}`
    : `≈ $${(solAmount * price).toFixed(2)}`;
  const balanceLabel = `${formatAmount(sourceBalance)} ${assetSymbol}`;

  const close = () => router.back();
  const insufficient = solAmount > sourceBalance;
  const disabled = solAmount <= 0 || insufficient;

  const onSubmit = () => {
    if (disabled) return;
    const amount = solAmount;
    const rawToSell = isBuy ? 0 : sellRawBaseUnits(amount, sharesHeld, rawHeld);
    if (!isBuy && rawToSell <= 0) return;
    close();

    void (async () => {
      try {
        const res = isBuy
          ? await buy(symbol, usdcToBaseUnits(amount))
          : await sell(symbol, rawToSell);
        show({
          kind: 'success',
          title: isBuy ? 'Buy sent' : 'Sell sent',
          message: `Tx ${res.signature.slice(0, 8)}…`,
        });
      } catch (err) {
        show({
          kind: 'error',
          title: isBuy ? 'Buy failed' : 'Sell failed',
          message: err instanceof Error ? err.message : 'Trade failed',
        });
      }
    })();
  };

  return (
    <CenterGlow tone="silver" flat>
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
            {title} {detail ? displayName(detail.name) : ''}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={{ marginTop: 20 }}>
        <AmountCardTiles
          iconSource={iconSource}
          tokenLabel={assetSymbol}
          primaryAmount={primaryDisplay}
          secondaryAmount={secondaryAmount}
          inputMode={inputMode}
          toggleDisabled
          showAssetRow={false}
        />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ marginBottom: 14 }}>
        <AssetSelectRow
          iconSource={iconSource}
          name={assetSymbol}
          balanceLabel={balanceLabel}
          onPressMax={() => onPressPercent(1)}
        />
      </View>

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
