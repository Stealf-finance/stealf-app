import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { sansation } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import type { Transaction } from '@/src/features/bank/types';

type WalletKind = 'bank' | 'stealth';

const CONFIG: Record<
  WalletKind,
  { title: string; subtitle: string; tone: Tone }
> = {
  bank: { title: 'History', subtitle: 'History from Cash account', tone: 'silver' },
  stealth: { title: 'History', subtitle: 'History from your wallet', tone: 'gold' },
};

function formatTxRow(tx: Transaction): {
  type: 'sent' | 'received';
  title: string;
  meta: string;
  amount: string;
} {
  const direction = tx.type === 'sent' ? 'Sent' : 'Received';
  const sign = tx.type === 'sent' ? '−' : '+';
  return {
    type: tx.type === 'sent' ? 'sent' : 'received',
    title: `${direction} · ${tx.tokenSymbol}`,
    meta: tx.dateFormatted,
    amount: `${sign}$${Math.abs(tx.amountUSD).toFixed(2)}`,
  };
}

export function TransactionsScreen({
  embedded = false,
}: {
  /** When rendered as a tab (History), hide the back button and pad the
   *  bottom for the floating nav. */
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ wallet?: WalletKind }>();
  const walletKind: WalletKind = params.wallet === 'stealth' ? 'stealth' : 'bank';
  const config = CONFIG[walletKind];
  const palette = txPalette(config.tone);

  const address =
    walletKind === 'stealth' ? user?.stealfWallet : user?.bankWallet;
  const { data: history, isLoading } = useHistory(address);

  const txs = history?.transactions ?? [];

  return (
    <CenterGlow tone={config.tone} flat topGlow>
      <View
        style={{
          paddingTop: embedded ? insets.top + 8 : 20,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {embedded ? null : <GlassBackButton onPress={() => router.back()} />}
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
            {config.title}
          </Text>
          <Text
            style={[
              sansation,
              { fontSize: 14, lineHeight: 20, color: T.inkDim, marginTop: 4 },
            ]}
          >
            {config.subtitle}
          </Text>
        </View>
        {embedded ? null : <View style={{ width: 26 }} />}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + (embedded ? 96 : 32),
        }}
        showsVerticalScrollIndicator={false}
      >
        {txs.length === 0 ? (
          <EmptyState loading={isLoading} faintColor={palette.inkFaint} />
        ) : (
          <>
            <View
              style={{
                paddingTop: 4,
                paddingBottom: 10,
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <Kicker color={palette.inkFaint} style={{ fontSize: 9 }}>
                {txs.length} {txs.length === 1 ? 'transaction' : 'transactions'}
              </Kicker>
            </View>
            {txs.map((tx, i) => {
              const row = formatTxRow(tx);
              return (
                <Pressable
                  key={tx.signature}
                  onPress={() =>
                    void Linking.openURL(
                      tx.signatureURL || `https://solscan.io/tx/${tx.signature}`,
                    )
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`${row.title} ${row.amount} — open on Solana Explorer`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <TxRow
                    type={row.type}
                    title={row.title}
                    meta={row.meta}
                    amount={row.amount}
                    last={i === txs.length - 1}
                  />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </CenterGlow>
  );
}

function EmptyState({
  loading,
  faintColor,
}: {
  loading: boolean;
  faintColor: string;
}) {
  return (
    <View
      style={{
        paddingTop: 80,
        alignItems: 'center',
      }}
    >
      <Text
        style={[
          sansation,
          {
            fontSize: 15,
            color: faintColor,
            textAlign: 'center',
          },
        ]}
      >
        {loading ? 'Loading…' : 'No transactions yet'}
      </Text>
    </View>
  );
}
