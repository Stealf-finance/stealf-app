import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import {
  maxSpendableSol,
  SOL_DECIMALS,
  PRIVATE_OP_SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { sansation } from '@/src/design-system/typography';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { TiledKeypadPanel } from '@/src/features/send/components/TiledKeypadPanel';
import { AmountCardTiles } from '@/src/features/send/components/AmountCardTiles';
import { AssetSelectRow } from '@/src/features/send/components/AssetSelectRow';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  setSelectedAsset,
  useSelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  shieldedBalanceQueries,
  useShieldedSolBalance,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import {
  useEncryptedBalances,
  encryptedBalancesQueries,
} from '@/src/features/stealth/hooks/useEncryptedBalances';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import { INSUFFICIENT_FEE_SOL_MESSAGE } from '@/src/features/stealth/lib/errors';
import { amountBand, scrubString } from '@/src/services/observability/scrub';
import * as Sentry from '@sentry/react-native';

type Direction = 'shield' | 'unshield';

type Props = { direction: Direction };

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(4).replace(/\.?0+$/, '');
}

export function ShieldFlow({ direction }: Props) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  const isShield = direction === 'shield';
  const tone: Tone = isShield ? 'silver' : 'gold';
  // On-screen visuals stay silver (like the Send flow); `tone` above still
  // drives the pending-op card color.
  const uiTone: Tone = 'silver';

  const title = isShield ? 'Shield' : 'Unshield';

  const { user } = useAuth();
  const { deposit, withdraw } = useUmbra();
  const { data: solPrice } = useSolPrice();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const posthog = usePostHog();
  const posthogRef = useRef(posthog);
  posthogRef.current = posthog;

  const { data: stealthBalance } = useBalance(
    isShield ? user?.stealfWallet ?? null : null,
  );
  const { data: shielded } = useShieldedSolBalance();
  const { data: encrypted } = useEncryptedBalances();

  const selected = useSelectedAsset();
  const isSolSelected =
    !selected || selected.mint === SOL_MINT || selected.symbol === 'SOL';
  const selectionActive = !isSolSelected && !!selected;

  const assetSymbol = selected?.symbol ?? 'SOL';
  const decimals = selectionActive ? selected!.decimals : SOL_DECIMALS;
  const iconUri = selectionActive ? selected!.iconUri : SOL_ICON_URI;

  let sourceBalance = 0;
  if (isShield) {
    const tokens = stealthBalance?.tokens ?? [];
    sourceBalance = selectionActive
      ? tokens.find((t) => t.tokenMint === selected!.mint)?.balance ?? 0
      : tokens.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else {

    sourceBalance = selectionActive
      ? encrypted?.tokens.find((t) => t.mint === selected!.mint)?.amount ?? 0
      : shielded?.sol ?? 0;
  }

  const rate = selectionActive
    ? selected!.price
    : typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : 0;

  const reserveFees = isShield && !selectionActive;

  const maxSol = maxSpendableSol(
    sourceBalance,
    reserveFees,
    true,
    PRIVATE_OP_SOL_FEE_RESERVE,
  );

  const {
    setAmount,
    inputMode,
    solAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  } = useAmountInput({ rate, maxSol, decimals });


  useEffect(() => {
    setAmount('0');
  }, [selected?.mint, setAmount]);

  useEffect(() => {
    return () => {
      setSelectedAsset(null);
    };
  }, []);

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;

  const balanceLabel = `${formatBalance(sourceBalance)} ${assetSymbol}`;

  const close = () => router.back();

  const insufficient = solAmount > sourceBalance;
  const swipeDisabled = solAmount <= 0 || insufficient;

  const onSubmit = () => {
    const num = solAmount;
    if (!num || num <= 0) return;

    const failPre = (msg: string) => {
      const id = pendingOps.enqueue({
        kind: isShield ? 'shield' : 'unshield',
        tone,
        amountSol: num,
        assetSymbol,
      });
      pendingOps.complete(id, 'failed', msg);
      close();
    };

    if (!user?.stealfWallet) {
      return failPre(
        'Set up your wallet first. Open the Payment tab to create or import one.',
      );
    }
    if (num > sourceBalance) {
      return failPre(
        `Not enough ${assetSymbol}. You have ${formatBalance(sourceBalance)} ${assetSymbol} available.`,
      );
    }

    const stealthPublicSol =
      stealthBalance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
    if (isShield && stealthPublicSol < PRIVATE_OP_SOL_FEE_RESERVE) {
      return failPre(INSUFFICIENT_FEE_SOL_MESSAGE);
    }

    const mintAddr = selectionActive ? selected!.mint : SOL_MINT;
    const amountBigInt = BigInt(Math.floor(num * 10 ** decimals));
    const mint = toAddress(mintAddr);
    const stealfWallet = user?.stealfWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: isShield ? 'shield' : 'unshield',
      tone,
      amountSol: num,
      assetSymbol,
    });

    close();

    void (async () => {

      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        if (isShield) {
          await deposit(mint, amountBigInt);
        } else {
          await withdraw(mint, amountBigInt);
        }
        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        if (__DEV__) console.log('[ShieldFlow] success → invalidating balances');
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: shieldedBalanceQueries.byStealfWallet(stealfWallet ?? ''),
          }),
          // Multi-mint encrypted query — key includes the mint list so we
          // invalidate by prefix to catch every active variant.
          queryClient.invalidateQueries({
            queryKey: encryptedBalancesQueries.byStealfWalletPrefix(
              stealfWallet ?? '',
            ),
          }),
          stealfWallet
            ? queryClient.invalidateQueries({
                queryKey: balanceQueries.byAddress(stealfWallet),
              })
            : Promise.resolve(),
          stealfWallet
            ? queryClient.invalidateQueries({
                queryKey: historyQueries.byAddress(stealfWallet),
              })
            : Promise.resolve(),
        ]);

        posthogRef.current?.capture('shield_completed', {
          direction,
          asset_symbol: assetSymbol,
          amount_band: amountBand(
            typeof solPrice === 'number' && solPrice > 0 ? num * solPrice : 0,
          ),
        });
        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Operation failed';
        if (__DEV__) console.warn('[ShieldFlow] failed:', msg);
        // wrap() already captures StealthError — skip to avoid dup.
        if (err?.name !== 'StealthError') {
          Sentry.captureException(err, {
            tags: { 'op.kind': `shield-${direction}`, 'wallet.source': 'stealf' },
            extra: {
              userMessage: msg,
              amountBand: amountBand(num),
              asset: assetSymbol,
            },
          });
        }
        posthogRef.current?.capture('shield_failed', {
          direction,
          asset_symbol: assetSymbol,
          error: scrubString(msg),
        });
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone={uiTone} flat>
      {/* Header aligned with the Send flow: bare chevron back, centered 22pt
          title, 24 inset. */}
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

      {/* Centered glass amount card (asset row moved below) */}
      <View style={{ marginTop: 20 }}>
        <AmountCardTiles
          iconSource={{ uri: iconUri ?? SOL_ICON_URI }}
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

      {/* Asset selector + balance + Use Max, below the amount */}
      <View style={{ marginBottom: 14 }}>
        <AssetSelectRow
          iconSource={{ uri: iconUri ?? SOL_ICON_URI }}
          name={assetSymbol}
          balanceLabel={balanceLabel}
          onPressSelect={() =>
            router.push(
              isShield
                ? '/asset-picker?wallet=stealth'
                : '/asset-picker?wallet=encrypted',
            )
          }
          onPressMax={() => onPressPercent(1)}
        />
      </View>

      {/* Tiled keypad + CTA wrapped in one glass panel */}
      <View style={{ paddingBottom: insets.bottom + 12 }}>
        <TiledKeypadPanel
          onKey={onKey}
          tone={uiTone}
          ctaLabel={insufficient ? 'Insufficient balance' : title}
          onPressCta={onSubmit}
          ctaDisabled={swipeDisabled}
        />
      </View>

      {/* Registration overlay only on Shield (public → encrypted). Unshield
          already implies a registered encrypted balance, so it's not gated. */}
      {isShield ? <StealthSetupOverlay onClose={close} /> : null}
    </CenterGlow>
  );
}
