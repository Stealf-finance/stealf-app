import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
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

// Devnet-only: only SOL is available on shield/unshield until USDC ships.
// The SYMBOL displayed follows the SOURCE side: SOL when depositing from
// the public ATA (shield), WSOL when spending from the encrypted balance
// (unshield) — the encrypted balance is wrapped SOL semantically.
const SOL_DECIMALS = 9;

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
  // Short guidance line under the title — no DirectionRow, the verb itself
  // already implies the source/destination, so we use the subtitle to nudge
  // the user on the *why* of the action.
  const subtitle = isShield
    ? 'Protect your assets'
    : 'Bring assets back to public';

  const { user } = useAuth();
  const { deposit, withdraw } = useUmbra();
  const { data: solPrice } = useSolPrice();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();

  // Both shield and unshield operate on the stealth wallet:
  // - shield: stealth public ATA → stealth encrypted balance
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
  const fiat = (Number(amount) * rate).toFixed(2);

  const close = () => router.back();
  const onKey = (k: string) => {
    if (k === '⌫') setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
    else if (k === '.') setAmount((a) => (a.includes('.') ? a : a + '.'));
    else setAmount((a) => (a === '0' ? k : a + k));
  };

  const onSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) return;
    if (isShield && !user?.stealfWallet) {
      // Pre-condition not met. Surface as a failed pill (so the user sees
      // the reason on the destination screen) and close the modal anyway —
      // there's nothing actionable to retry inside.
      const id = pendingOps.enqueue({
        kind: 'shield',
        tone,
        amountSol: num,
      });
      pendingOps.complete(
        id,
        'failed',
        'Stealth wallet not set up. Open it once before shielding.',
      );
      close();
      return;
    }

    const amountBigInt = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);
    const stealfWallet = user?.stealfWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: isShield ? 'shield' : 'unshield',
      tone,
      amountSol: num,
    });

    // Eager close — the modal animates away while the heavy work runs in the
    // background. The pill (mounted at the tabs layout) takes over status;
    // the balances stay honest until the op confirms (no optimistic debit).
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
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 18,
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
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icons.close size={18} color={palette.inkDim} />
        </Pressable>
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
                fontSize: 72,
                letterSpacing: -3.6,
                color: palette.ink,
                lineHeight: 72,
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
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable
          onPress={() => setAmount(balanceLabel)}
          accessibilityRole="button"
          accessibilityLabel={`Use max balance ${balanceLabel} ${assetSymbol}`}
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
            {balanceLabel} {assetSymbol}
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
        <SwipeToSend tone={tone} label={ctaLabel} onSend={onSubmit} />
      </View>
    </CenterGlow>
  );
}
