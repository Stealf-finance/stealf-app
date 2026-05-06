import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import {
  applyAmountKey,
  SOL_DECIMALS,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { CloseBtn } from '@/src/design-system/primitives/CloseBtn';
import { FormError } from '@/src/design-system/primitives/FormError';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { SourceAssetCard, type InputMode } from '@/src/features/send/components/SourceAssetCard';
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

function formatSolBalance(sol: number): string {
  if (sol === 0) return '0';
  return sol.toFixed(4).replace(/\.?0+$/, '');
}

export function ShieldFlow({ direction }: Props) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('asset');

  const isShield = direction === 'shield';
  const tone: Tone = isShield ? 'silver' : 'gold';
  const palette = txPalette(tone);
  const assetSymbol = isShield ? 'SOL' : 'WSOL';

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
  const publicSol = stealthBalance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  const privateSol = shielded?.sol ?? 0;
  const sourceSol = isShield ? publicSol : privateSol;
  const balanceLabel = formatSolBalance(sourceSol);

  const rate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;

  // The Numpad writes a single string. What it represents depends on
  // inputMode: SOL when 'asset', USD when 'fiat'. Downstream tx logic
  // always needs SOL, so derive it.
  const typedNum = Number(amount) || 0;
  const solAmount = inputMode === 'asset' ? typedNum : (rate > 0 ? typedNum / rate : 0);
  const fiatAmount = inputMode === 'asset' ? typedNum * rate : typedNum;

  const secondaryAmount =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${formatSolBalance(solAmount)} ${assetSymbol}`;

  const close = () => router.back();
  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k));

  const onToggleMode = () => {
    if (rate <= 0) return;
    if (inputMode === 'asset') {
      // Promote fiat to primary: type the dollar value going forward.
      const converted = (typedNum * rate).toFixed(2);
      setAmount(converted === '0.00' ? '0' : converted);
      setInputMode('fiat');
    } else {
      const converted = (typedNum / rate).toFixed(4).replace(/\.?0+$/, '');
      setAmount(converted === '' ? '0' : converted);
      setInputMode('asset');
    }
  };

  const insufficient = solAmount > sourceSol;
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
    if (num > sourceSol) {
      return failPre(
        `Not enough ${assetSymbol}. You have ${formatSolBalance(sourceSol)} ${assetSymbol} available.`,
      );
    }

    const amountBigInt = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);
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
          iconSource={require('@/assets/images/solana-icon.png')}
          tokenLabel={assetSymbol}
          primaryAmount={amount}
          secondaryAmount={secondaryAmount}
          inputMode={inputMode}
          onPressTokenPill={() => router.push('/asset-picker')}
          onToggleMode={onToggleMode}
          toggleDisabled={rate <= 0}
        />
        <View style={{ paddingHorizontal: 24 }}>
          <FormError
            message={
              insufficient
                ? `Not enough ${assetSymbol} — you have ${balanceLabel} ${assetSymbol}`
                : null
            }
          />
        </View>
      </View>

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
          label={ctaLabel}
          onSend={onSubmit}
          disabled={swipeDisabled}
        />
      </View>

      <StealthSetupOverlay onClose={close} />
    </CenterGlow>
  );
}
