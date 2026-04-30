import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import {
  sansation,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import type { Transaction } from '@/src/features/bank/types';

const S = txPalette('silver');

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

export function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: history, isLoading } = useHistory(user?.bankWallet);

  const txs = history?.transactions ?? [];

  return (
    <CenterGlow tone="silver">
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 22,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <BackBtn onPress={() => router.back()} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Transactions
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {txs.length === 0 ? (
          <EmptyState loading={isLoading} />
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
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 9,
                    letterSpacing: 2.52,
                    textTransform: 'uppercase',
                    color: S.inkFaint,
                    fontWeight: '700',
                  },
                ]}
              >
                {txs.length} {txs.length === 1 ? 'transaction' : 'transactions'}
              </Text>
            </View>
            {txs.map((tx, i) => {
              const row = formatTxRow(tx);
              return (
                <Pressable
                  key={tx.signature}
                  onPress={() => router.push(`/tx/${tx.signature}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.title} ${row.amount}`}
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

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <View
      style={{
        paddingTop: 80,
        alignItems: 'center',
      }}
    >
      <Text
        style={[
          serif,
          {
            fontSize: 15,
            fontStyle: 'italic',
            color: S.inkFaint,
            textAlign: 'center',
          },
        ]}
      >
        {loading ? 'Loading…' : 'No transactions yet'}
      </Text>
    </View>
  );
}

