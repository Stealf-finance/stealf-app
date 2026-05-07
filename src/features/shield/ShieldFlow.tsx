import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { maxSpendableSol, SOL_DECIMALS } from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { CloseBtn } from '@/src/design-system/primitives/CloseBtn';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { SourceAssetCard } from '@/src/features/send/components/SourceAssetCard';
import { PercentageChips } from '@/src/features/send/components/PercentageChips';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  setSelectedAsset,
  useSelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  shieldedBalanceQueries,
  useShieldedSolBalance,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';

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
  const palette = txPalette(tone);

  const title = isShield ? 'Shield' : 'Unshield';
  const ctaLabel = isShield ? 'Slide to shield' : 'Slide to unshield';

  const subtitle = isShield
    ? 'Protect your assets'
    : 'Bring assets back to public';

  const { user } = useAuth();
  const { deposit, withdraw } = useUmbra();
  const { data: solPrice } = useSolPrice();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();

  // - unshield: stealth encrypted → stealth public ATA
  const { data: stealthBalance } = useBalance(
    isShield ? user?.stealfWallet ?? null : null,
  );
  const { data: shielded } = useShieldedSolBalance();

  // Asset selection — only meaningful in shield direction (encrypted balance
  // is SOL-only on the SDK side today, so unshield stays pinned to WSOL).
  const selected = useSelectedAsset();
  const isSolSelected =
    !selected || selected.mint === SOL_MINT || selected.symbol === 'SOL';

  const assetSymbol = isShield
    ? selected?.symbol ?? 'SOL'
    : 'WSOL';
  const decimals = isShield ? selected?.decimals ?? SOL_DECIMALS : SOL_DECIMALS;
  // Icon resolution: prefer the URI baked into the selection (the picker
  // writes the official CDN URL for SOL). Fallback to the official SOL CDN
  // for the unshield direction and the unselected default.
  const iconUri =
    isShield && !isSolSelected
      ? selected?.iconUri
      : selected?.iconUri ?? SOL_ICON_URI;

  const publicAssetBalance = isShield
    ? selected
      ? stealthBalance?.tokens?.find((t) => {
          if (isSolSelected) return t.tokenSymbol === 'SOL';
          return t.tokenMint === selected.mint;
        })?.balance ?? 0
      : stealthBalance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0
    : 0;
  const privateSol = shielded?.sol ?? 0;
  const sourceBalance = isShield ? publicAssetBalance : privateSol;

  // Price: SOL has a live feed, others use the per-token rate Helius DAS
  // already returns (balanceUSD / balance). Falls back to 0 for tokens with
  // no balance (toggle disabled in that case).
  const rate = isShield
    ? isSolSelected
      ? typeof solPrice === 'number' && solPrice > 0
        ? solPrice
        : 0
      : selected?.price ?? 0
    : typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : 0;

  // Shield+SOL: source = stealth public ATA, fee payer = same → reserve SOL.
  // Shield+SPL: fees still paid in SOL, but the SOL bucket is separate from
  // the SPL bucket — the SPL balance is fully spendable.
  // Unshield: source = encrypted balance, fee payer = stealth public ATA.
  const reserveFees = isShield && isSolSelected;
  const maxSol = maxSpendableSol(sourceBalance, reserveFees);

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

  // Reset typed amount when user picks a different token: rate changes, so
  // any previously typed fiat value would silently misrepresent the new
  // token amount.
  useEffect(() => {
    setAmount('0');
  }, [selected?.mint, setAmount]);

  // Wipe selection on unmount so the next time the modal opens it starts
  // fresh (default = SOL).
  useEffect(() => {
    return () => {
      setSelectedAsset(null);
    };
  }, []);

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;

  const maxBalanceLabel =
    inputMode === 'fiat'
      ? `$${(maxSol * rate).toFixed(2)}`
      : `${maxSol.toFixed(4)} ${assetSymbol}`;

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
      });
      pendingOps.complete(id, 'failed', msg);
      close();
    };

    if (!user?.stealfWallet) {
      return failPre(
        'Set up your stealth wallet first. Open the Stealth tab to create or import one.',
      );
    }
    if (num > sourceBalance) {
      return failPre(
        `Not enough ${assetSymbol}. You have ${formatBalance(sourceBalance)} ${assetSymbol} available.`,
      );
    }

    const mintAddr = isShield && !isSolSelected && selected
      ? selected.mint
      : SOL_MINT;
    const amountBigInt = BigInt(Math.floor(num * 10 ** decimals));
    const mint = toAddress(mintAddr);
    const stealfWallet = user?.stealfWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: isShield ? 'shield' : 'unshield',
      tone,
      amountSol: num,
    });

    close();

    // Detached async — survives this component's unmount because the closure
    // holds stable references to pendingOps + queryClient (root-level singletons).
    void (async () => {
      // Heuristic phase progression: most of the wall-clock time on these
      // ops is spent in ZK proof gen. Surface "Generating proof…" after a
      // short submitting window so the pill feels alive.
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

        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Operation failed';
        if (__DEV__) console.warn('[ShieldFlow] failed:', msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone={tone}>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ width: 36 }} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {title}
        </Text>
        <CloseBtn onPress={close} />
      </View>

      <Text
        style={[
          serif,
          {
            textAlign: 'center',
            fontSize: 14,
            fontStyle: 'italic',
            color: palette.inkDim,
            paddingHorizontal: 24,
          },
        ]}
      >
        {subtitle}
      </Text>

      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <SourceAssetCard
          label={isShield ? 'Shielding' : 'Unshielding'}
          iconSource={{ uri: iconUri ?? SOL_ICON_URI }}
          tokenLabel={assetSymbol}
          primaryAmount={primaryDisplay}
          secondaryAmount={secondaryAmount}
          inputMode={inputMode}
          onPressTokenPill={
            isShield ? () => router.push('/asset-picker') : undefined
          }
          onToggleMode={onToggleMode}
          toggleDisabled={rate <= 0}
          maxLabel={maxBalanceLabel}
        />
      </View>

      <PercentageChips
        onPressPercent={onPressPercent}
        disabled={maxSol <= 0}
      />

      <Numpad onKey={onKey} tone={tone} />

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <SwipeToSend
          tone={tone}
          label={insufficient ? 'Insufficient balance' : ctaLabel}
          onSend={onSubmit}
          disabled={swipeDisabled}
        />
      </View>

      <StealthSetupOverlay onClose={close} />
    </CenterGlow>
  );
}
