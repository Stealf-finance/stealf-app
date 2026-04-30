import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { TxTitleBlock } from '@/src/features/send/components/TxTitleBlock';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { useShieldedSolBalance } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';

type Direction = 'shield' | 'unshield';

type Props = { direction: Direction };

// Devnet-only: only SOL is available on shield/unshield until USDC ships.
const ASSET_SYMBOL = 'SOL' as const;
const SOL_DECIMALS = 9;

// Reserve for tx fee (~5k lamports) + ATA rent (~0.002 SOL) + headroom.
// Without it, "Max" leaves the wallet unable to pay its own deposit fee.
const SHIELD_RESERVE_SOL = 0.005;

const PILL_GRADIENTS: Record<Tone, [string, string]> = {
  silver: ['#e8e8ea', '#9a9a9f'],
  gold: ['#e6c079', '#a37b2e'],
};

function formatSolBalance(sol: number): string {
  if (sol === 0) return '0';
  return sol.toFixed(4).replace(/\.?0+$/, '');
}

export function ShieldFlow({ direction }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');

  const isShield = direction === 'shield';
  const tone: Tone = isShield ? 'silver' : 'gold';
  const palette = txPalette(tone);
  const pillGradient = PILL_GRADIENTS[tone];

  const title = isShield ? 'Shield' : 'Unshield';
  const ctaLabel = isShield ? 'Slide to shield' : 'Slide to unshield';
  const directionLine = isShield
    ? 'Shield your assets to protect them'
    : 'Unshield to bring assets back public';

  const { user } = useAuth();
  const { deposit, withdraw, loading } = useUmbra();
  const { data: solPrice } = useSolPrice();
  const queryClient = useQueryClient();

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

  const onSubmit = async () => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    const amountBigInt = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);

    try {
      if (isShield) {
        if (!user?.stealfWallet) {
          throw new Error('Stealth wallet not set up. Open it once before shielding.');
        }
        await deposit(mint, amountBigInt);
      } else {
        await withdraw(mint, amountBigInt);
      }

      // Refresh both sides — shielded pool balance + the stealth public ATA.
      // Shield debits public, credits private. Unshield does the reverse.
      // Either way both queries change.
      if (__DEV__) console.log('[ShieldFlow] success → invalidating balances');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shielded-balance'] }),
        user?.stealfWallet
          ? queryClient.invalidateQueries({
              queryKey: balanceQueries.byAddress(user.stealfWallet),
            })
          : Promise.resolve(),
        user?.stealfWallet
          ? queryClient.invalidateQueries({
              queryKey: historyQueries.byAddress(user.stealfWallet),
            })
          : Promise.resolve(),
      ]);

      close();
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Operation failed';
      Alert.alert(isShield ? 'Shield failed' : 'Unshield failed', msg);
    }
  };

  return (
    <CenterGlow tone={tone}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
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

      <TxTitleBlock
        tone={tone}
        kicker={title}
        title="How much?"
        subtitle={directionLine}
      />

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            paddingHorizontal: 28,
            gap: 4,
          }}
        >
          <Text
            style={[
              sansationLight,
              {
                fontSize: 84,
                letterSpacing: -4.2,
                color: palette.ink,
                lineHeight: 84,
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
                fontSize: 30,
                color: palette.accent,
                fontStyle: 'italic',
                lineHeight: 30,
                includeFontPadding: false,
                marginLeft: 6,
              },
            ]}
          >
            {ASSET_SYMBOL}
          </Text>
        </View>
        <Text
          style={[
            serif,
            {
              textAlign: 'center',
              marginTop: 10,
              fontStyle: 'italic',
              fontSize: 18,
              color: palette.inkDim,
            },
          ]}
        >
          ≈ ${fiat}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Pressable
          onPress={() => setAmount(balanceLabel)}
          accessibilityRole="button"
          accessibilityLabel={`Use max balance ${balanceLabel} ${ASSET_SYMBOL}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 9,
            paddingLeft: 6,
            paddingRight: 16,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <LinearGradient
            colors={pillGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(0,0,0,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#0a0a0a',
                  includeFontPadding: false,
                },
              ]}
            >
              ◎
            </Text>
          </View>
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
            {ASSET_SYMBOL}
          </Text>
          <View
            style={{
              width: 1,
              height: 10,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                color: '#0a0a0a',
                fontWeight: '500',
              },
            ]}
          >
            {balanceLabel} {ASSET_SYMBOL}
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
          label={loading ? 'Processing…' : ctaLabel}
          onSend={onSubmit}
        />
      </View>
    </CenterGlow>
  );
}
