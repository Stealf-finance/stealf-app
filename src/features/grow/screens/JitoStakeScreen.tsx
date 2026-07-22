import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { mono, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useJitoStake } from '@/src/features/grow/hooks/useJitoStake';
import { JITOSOL_MINT, jitoSolToBaseUnits } from '@/src/features/grow/api/jitoStake';

const S = txPalette('silver');

type Result = { kind: 'stake' | 'unstake'; signature: string } | null;

export function JitoStakeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const wallet = user?.bankWallet ?? null;

  const { data: balance } = useBalance(wallet);
  const { stake, unstake, loading, error } = useJitoStake();

  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<Result>(null);

  const solBalance = useMemo(
    () => balance?.tokens.find((t) => t.tokenMint === null)?.balance ?? 0,
    [balance],
  );
  const jitoToken = useMemo(
    () => balance?.tokens.find((t) => t.tokenMint === JITOSOL_MINT),
    [balance],
  );
  const jitoBalance = jitoToken?.balance ?? 0;
  const jitoUsd = jitoToken?.balanceUSD ?? 0;

  const amountNum = Number(amount) || 0;
  const canStake = amountNum > 0 && amountNum <= solBalance && !loading;
  const canUnstake = jitoBalance > 0 && !loading;

  const onStake = async () => {
    setResult(null);
    try {
      const { signature } = await stake(amountNum);
      setResult({ kind: 'stake', signature });
      setAmount('');
    } catch {
      /* error surfaced via `error` */
    }
  };

  const onUnstakeAll = async () => {
    setResult(null);
    try {
      const raw = jitoSolToBaseUnits(jitoBalance);
      const { signature } = await unstake(raw);
      setResult({ kind: 'unstake', signature });
    } catch {
      /* error surfaced via `error` */
    }
  };

  return (
    <TonalBackground tone="silver">
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: S.ink, fontSize: 26, marginTop: -2 }}>‹</Text>
        </TouchableOpacity>
        <Kicker color={T.gold} style={{ letterSpacing: 3 }}>
          JitoSOL Staking
        </Kicker>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Holding */}
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(20,20,22,0.9)',
            padding: 22,
            marginBottom: 20,
          }}
        >
          <Text style={[mono, { fontSize: 11, color: S.inkFaint, letterSpacing: 1.6 }]}>
            YOUR JITOSOL
          </Text>
          <Text
            style={[
              sansationLight,
              { fontSize: 40, color: S.ink, marginTop: 6, letterSpacing: -1 },
            ]}
          >
            {jitoBalance.toFixed(4)}
          </Text>
          <Text style={[mono, { fontSize: 12, color: S.inkDim, marginTop: 2 }]}>
            ≈ ${jitoUsd.toFixed(2)} · liquid staking, appreciates vs SOL
          </Text>
        </View>

        {/* Stake */}
        <Text
          style={[sansationLight, { fontSize: 18, color: S.ink, marginBottom: 10 }]}
        >
          Stake SOL → JitoSOL
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(16,16,18,0.9)',
            paddingHorizontal: 18,
            height: 60,
          }}
        >
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.0"
            placeholderTextColor={S.inkFaint}
            keyboardType="decimal-pad"
            style={[sansationLight, { flex: 1, fontSize: 26, color: S.ink }]}
          />
          <TouchableOpacity
            onPress={() => setAmount(String(Math.max(0, solBalance - 0.01)))}
            hitSlop={8}
          >
            <Text style={[mono, { fontSize: 12, color: T.gold, letterSpacing: 1 }]}>
              MAX
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[mono, { fontSize: 11, color: S.inkFaint, marginTop: 6 }]}>
          Available: {solBalance.toFixed(4)} SOL
        </Text>

        <TouchableOpacity
          onPress={onStake}
          disabled={!canStake}
          activeOpacity={0.8}
          style={{
            marginTop: 16,
            height: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canStake ? T.gold : 'rgba(255,255,255,0.08)',
          }}
        >
          {loading ? (
            <ActivityIndicator color={T.bg} />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: canStake ? T.bg : S.inkFaint,
              }}
            >
              Stake
            </Text>
          )}
        </TouchableOpacity>

        {/* Unstake */}
        <TouchableOpacity
          onPress={onUnstakeAll}
          disabled={!canUnstake}
          activeOpacity={0.8}
          style={{
            marginTop: 12,
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: canUnstake
              ? 'rgba(255,255,255,0.14)'
              : 'rgba(255,255,255,0.06)',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: canUnstake ? S.ink : S.inkFaint,
            }}
          >
            Unstake all → SOL
          </Text>
        </TouchableOpacity>

        {/* Feedback */}
        {error ? (
          <Text style={[mono, { fontSize: 12, color: '#e0704f', marginTop: 16 }]}>
            {error}
          </Text>
        ) : null}
        {result ? (
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(`https://solscan.io/tx/${result.signature}`)
            }
            style={{ marginTop: 16 }}
          >
            <Text style={[mono, { fontSize: 12, color: T.gold }]}>
              {result.kind === 'stake' ? 'Staked' : 'Unstaked'} ✓ · view on Solscan ↗
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </TonalBackground>
  );
}
