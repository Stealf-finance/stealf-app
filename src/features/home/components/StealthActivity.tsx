import { Pressable, Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Icons } from '@/src/design-system/icons';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import type { Transaction } from '@/src/features/bank/types';

const DISPLAY_LIMIT = 2;

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

/** Recent stealth-wallet activity: the two latest transactions + "See all". */
export function StealthActivity() {
  const { user } = useAuth();
  const router = useSafeRouter();
  const { data: history } = useHistory(user?.stealfWallet);
  const txRows =
    history?.transactions.slice(0, DISPLAY_LIMIT).map(formatTxRow) ?? [];

  if (txRows.length === 0) return null;

  return (
    <View style={{ marginTop: 22 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: T.inkFaint,
            },
          ]}
        >
          Recent activity
        </Text>
        <Pressable
          onPress={() => router.push('/transactions?wallet=stealth')}
          accessibilityRole="button"
          accessibilityLabel="See all stealth transactions"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={[
              sansation,
              { fontSize: 11, color: T.inkDim, fontWeight: '600' },
            ]}
          >
            See all
          </Text>
          <Icons.chevR size={12} color={T.inkDim} />
        </Pressable>
      </View>
      {txRows.map((row, i) => (
        <TxRow
          key={`${row.title}-${row.meta}-${i}`}
          type={row.type}
          title={row.title}
          meta={row.meta}
          amount={row.amount}
          last={i === txRows.length - 1}
        />
      ))}
    </View>
  );
}
