import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { DirectionRow } from '@/src/features/send/components/DirectionRow';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  useShieldedSolBalance,
  shieldedBalanceQueries,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import type { PendingOpKind } from '@/src/components/pending-ops/types';

function kindForDirection(d: MoveDirection): PendingOpKind {
  switch (d) {
    case 'bank-to-shielded':
      return 'move-bank-to-shielded';
    case 'shielded-to-bank':
      return 'move-shielded-to-bank';
    case 'stealth-to-bank':
      return 'move-stealth-to-bank';
  }
}

export type MoveDirection =
  | 'bank-to-shielded'
  | 'shielded-to-bank'
  | 'stealth-to-bank';

const SOL_DECIMALS = 9;

type DirectionConfig = {
  title: string;
  fromLabel: string;
  toLabel: string;
  cta: string;
};

const CONFIG: Record<MoveDirection, DirectionConfig> = {
  'bank-to-shielded': {
    title: 'Move to private',
    fromLabel: 'Bank wallet',
    toLabel: 'Shielded pool',
    cta: 'Slide to move',
  },
  'shielded-to-bank': {
    title: 'Move to bank',
    fromLabel: 'Shielded pool',
    toLabel: 'Bank wallet',
    cta: 'Slide to move',
  },
  'stealth-to-bank': {
    title: 'Move to bank',
    fromLabel: 'Stealth wallet',
    toLabel: 'Bank wallet',
    cta: 'Slide to move',
  },
};

function formatSolBalance(sol: number): string {
  if (sol === 0) return '0';
  return sol.toFixed(4).replace(/\.?0+$/, '');
}

export function MoveFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ direction?: string }>();
  const direction = (params.direction as MoveDirection) ?? 'bank-to-shielded';
  const config = CONFIG[direction];

  // Tone follows the source side: silver when moving out of a public wallet,
  // gold when moving out of the shielded pool. Anchors the screen on where
  // the funds are leaving from.
  const tone: Tone = direction === 'shielded-to-bank' ? 'gold' : 'silver';
  const palette = txPalette(tone);
  // Source-side asset symbol — WSOL when leaving the encrypted balance,
  // SOL otherwise. Keeps the user oriented on what they're spending.
  const assetSymbol = direction === 'shielded-to-bank' ? 'WSOL' : 'SOL';

  const [amount, setAmount] = useState('0');

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { data: solPrice } = useSolPrice();
  const rate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;

  const {
    depositFromBankToReceiver,
    transferFromEncryptedBalanceToReceiver,
    transferFromPublicStealthToReceiver,
  } = useUmbra();

  const { data: bankBalanceData } = useBalance(
    direction === 'bank-to-shielded' ? user?.bankWallet ?? null : null,
  );
  const { data: stealthBalanceData } = useBalance(
    direction === 'stealth-to-bank' ? user?.stealfWallet ?? null : null,
  );
  const { data: shielded } = useShieldedSolBalance();

  let sourceSol = 0;
  if (direction === 'bank-to-shielded') {
    sourceSol = bankBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else if (direction === 'stealth-to-bank') {
    sourceSol = stealthBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else {
    sourceSol = shielded?.sol ?? 0;
  }
  const balanceLabel = formatSolBalance(sourceSol);
  const fiat = (Number(amount) * rate).toFixed(2);

  const close = () => router.back();
  const onKey = (k: string) => {
    if (k === '⌫') setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
    else if (k === '.') setAmount((a) => (a.includes('.') ? a : a + '.'));
    else setAmount((a) => (a === '0' ? k : a + k));
  };

  const invalidateAll = async () => {
    const keys: Promise<unknown>[] = [
      queryClient.invalidateQueries({
        queryKey: shieldedBalanceQueries.byStealfWallet(user?.stealfWallet ?? ''),
      }),
    ];
    if (user?.bankWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.bankWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.bankWallet) }),
      );
    }
    if (user?.stealfWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.stealfWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.stealfWallet) }),
      );
    }
    await Promise.all(keys);
  };

  const onSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    // Pre-flight: surface auth/wallet gaps as failed pills + close the modal.
    // The user gets the explanation on the destination screen instead of an
    // intrusive Alert that traps them in the modal.
    const failPre = (msg: string) => {
      const id = pendingOps.enqueue({
        kind: kindForDirection(direction),
        tone,
        amountSol: num,
      });
      pendingOps.complete(id, 'failed', msg);
      close();
    };

    if (!user) return failPre('Please sign in again before continuing.');
    if (direction === 'bank-to-shielded' && !user.stealfWallet) {
      return failPre('Stealth wallet not set up. Open the Stealth tab once first.');
    }
    if (direction === 'shielded-to-bank' && !user.bankWallet) {
      return failPre('Bank wallet missing.');
    }
    if (direction === 'stealth-to-bank' && (!user.bankWallet || !user.stealfWallet)) {
      return failPre('Wallets missing.');
    }

    const lamportsBig = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);
    const stealfWallet = user.stealfWallet ?? null;
    const bankWallet = user.bankWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: kindForDirection(direction),
      tone,
      amountSol: num,
    });

    // Eager close — pill takes over the status surface from here. Balances
    // stay honest until the op confirms (no optimistic debit).
    close();

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        if (direction === 'bank-to-shielded') {

          await transferFromPublicStealthToReceiver(
            toAddress(stealfWallet!),
            mint,
            lamportsBig,
          );
        } else if (direction === 'shielded-to-bank') {

          await transferFromEncryptedBalanceToReceiver(
            toAddress(bankWallet!),
            mint,
            lamportsBig,
          );
        } else {

          await transferFromPublicStealthToReceiver(
            toAddress(bankWallet!),
            mint,
            lamportsBig,
          );
        }

        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        if (__DEV__) console.log('[MoveFlow] success →', direction);
        await invalidateAll();
        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Move failed';
        if (__DEV__) console.warn('[MoveFlow] failed:', direction, msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  const ctaLabel = config.cta;

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
          {config.title}
        </Text>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <DirectionRow
          fromLabel={config.fromLabel}
          toLabel={config.toLabel}
          tone={tone}
        />
      </View>

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
            colors={
              tone === 'gold' ? ['#e6c079', '#a37b2e'] : ['#e8e8ea', '#9a9a9f']
            }
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

