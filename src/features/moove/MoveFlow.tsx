import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { useShieldedSolBalance, shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';

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

  const [amount, setAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [swipeAttempt, setSwipeAttempt] = useState(0);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: solPrice } = useSolPrice();
  const rate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;

  const {
    selfShield,
    selfShieldFromPublicStealth,
    selfShieldFromPublicBank,
    loading: umbraLoading,
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

  const onSubmit = async () => {
    const num = Number(amount);
    if (!num || num <= 0) return;
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in again before continuing.');
      return;
    }

    const lamports = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);

    setSubmitting(true);
    try {
      if (direction === 'bank-to-shielded') {
        // Bank ATA → self-claimable UTXO locked to the stealth wallet.
        // Signed by Turnkey (bank). Stealth claims it back into shielded pool.
        if (!user.stealfWallet) {
          throw new Error('Stealth wallet not set up. Open the Stealth tab once first.');
        }
        await selfShieldFromPublicBank(
          toAddress(user.stealfWallet),
          mint,
          lamports,
        );
      } else if (direction === 'shielded-to-bank') {
        // Shielded balance → self-claimable UTXO locked to the bank wallet.
        // Signed by stealth (encrypted-balance source). Bank claims it later
        // into its public ATA.
        if (!user.bankWallet) throw new Error('Bank wallet missing.');
        await selfShield(mint, lamports, toAddress(user.bankWallet));
      } else {
        // Stealth ATA → self-claimable UTXO locked to the bank wallet.
        // Signed by stealth (public-balance source).
        if (!user.bankWallet || !user.stealfWallet) {
          throw new Error('Wallets missing.');
        }
        await selfShieldFromPublicStealth(
          mint,
          lamports,
          toAddress(user.bankWallet),
        );
      }

      if (__DEV__) console.log('[MoveFlow] success →', direction);
      await invalidateAll();
      close();
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Move failed';
      if (__DEV__) console.warn('[MoveFlow] failed:', direction, msg);
      Alert.alert('Move failed', msg);
      setSwipeAttempt((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting || umbraLoading;
  const ctaLabel = loading ? 'Processing…' : config.cta;

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
          {config.title}
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
            SOL
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
          accessibilityLabel={`Use max balance ${balanceLabel} SOL`}
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
            {balanceLabel} SOL
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
          key={swipeAttempt}
          tone={tone}
          label={ctaLabel}
          onSend={onSubmit}
        />
      </View>
    </CenterGlow>
  );
}

function DirectionRow({
  fromLabel,
  toLabel,
  tone,
}: {
  fromLabel: string;
  toLabel: string;
  tone: Tone;
}) {
  const palette = txPalette(tone);

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.hairline,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: palette.inkFaint,
            },
          ]}
        >
          From
        </Text>
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: palette.ink,
              fontWeight: '500',
            },
          ]}
          numberOfLines={1}
        >
          {fromLabel}
        </Text>
        <View style={{ flex: 1 }} />
        <Icons.arrRight size={14} color={palette.accent} />
        <View style={{ flex: 1 }} />
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: palette.inkFaint,
            },
          ]}
        >
          To
        </Text>
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: palette.ink,
              fontWeight: '500',
            },
          ]}
          numberOfLines={1}
        >
          {toLabel}
        </Text>
      </LinearGradient>
    </View>
  );
}
