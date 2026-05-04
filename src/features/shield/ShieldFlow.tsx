import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import {
  applyAmountKey,
  maxSpendableSol,
  SOL_DECIMALS,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { CloseBtn } from '@/src/design-system/primitives/CloseBtn';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
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

const PILL_GRADIENTS: Record<Tone, [string, string]> = {
  silver: ['#e8e8ea', '#9a9a9f'],
  gold: ['#e6c079', '#a37b2e'],
};

function formatSolBalance(sol: number): string {
  if (sol === 0) return '0';
  return sol.toFixed(4).replace(/\.?0+$/, '');
}

export function ShieldFlow({ direction }: Props) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');

  const isShield = direction === 'shield';
  const tone: Tone = isShield ? 'silver' : 'gold';
  const palette = txPalette(tone);
  const pillGradient = PILL_GRADIENTS[tone];
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

  // Shield: source = stealth public ATA, fee payer = same → reserve.
  // Unshield: source = encrypted balance, fee payer = stealth public ATA →
  // different buckets, full balance is spendable.
  const maxSol = maxSpendableSol(sourceSol, isShield);
  const maxLabel = formatSolBalance(maxSol);

  const rate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;
  const fiat = (Number(amount) * rate).toFixed(2);

  const close = () => router.back();
  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k));

  const numericAmount = Number(amount);
  const insufficient = numericAmount > sourceSol;
  const swipeDisabled = numericAmount <= 0 || insufficient;

  const digitCount = amount.replace('.', '').length;
  const amountFontSize =
    digitCount >= 12 ? 36 : digitCount >= 10 ? 48 : digitCount >= 8 ? 60 : 72;

  const onSubmit = () => {
    const num = Number(amount);
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

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            paddingHorizontal: 28,
            gap: 6,
          }}
        >
          <Text
            style={[
              sansationLight,
              {
                fontSize: amountFontSize,
                letterSpacing: amountFontSize * -0.05,
                color: palette.ink,
                lineHeight: amountFontSize,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {amount}
          </Text>
          <Text
            style={[
              serif,
              {
                fontSize: 28,
                color: palette.accent,
                fontStyle: 'italic',
                lineHeight: 28,
                includeFontPadding: false,
              },
            ]}
          >
            {assetSymbol}
          </Text>
        </View>
        <Text
          style={[
            serif,
            {
              textAlign: 'center',
              marginTop: 8,
              fontStyle: 'italic',
              fontSize: 16,
              color: palette.inkDim,
            },
          ]}
        >
          ≈ ${fiat}
        </Text>
        {insufficient ? (
          <Text
            style={[
              sansation,
              {
                textAlign: 'center',
                marginTop: 10,
                fontSize: 11,
                letterSpacing: 0.4,
                color: T.red,
              },
            ]}
          >
            Not enough {assetSymbol} — you have {balanceLabel} {assetSymbol}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable
          onPress={() => setAmount(maxLabel)}
          accessibilityRole="button"
          accessibilityLabel={`Use max balance ${maxLabel} ${assetSymbol}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={pillGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: '#0a0a0a',
              },
            ]}
          >
            Max
          </Text>
          <View style={{ width: 1, height: 10, backgroundColor: 'rgba(0,0,0,0.2)' }} />
          <Text
            style={[
              sansation,
              { fontSize: 10, color: '#0a0a0a', fontWeight: '500' },
            ]}
          >
            {maxLabel} {assetSymbol}
          </Text>
        </Pressable>
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
