import { Pressable, Text, View } from 'react-native';
import { getGreeting } from '@/src/lib/greeting';
import { Icons } from '@/src/design-system/icons';
import {
  useTopPendingOp,
  usePendingOps,
  formatPillText,
} from '@/src/components/pending-ops/PendingOpsContext';
import { Spinner } from '@/src/components/pending-ops/PendingOpsPill';
import type { PendingOp } from '@/src/components/pending-ops/types';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

/** Status indicator (spinner / check / cross + label) shown while a stealth
 *  operation is in flight — the same indicator as the floating pill. */
function NavPendingIndicator({
  op,
  onDismiss,
}: {
  op: PendingOp;
  onDismiss: () => void;
}) {
  const isDone = op.phase === 'done';
  const isFailed = op.phase === 'failed';
  const terminal = isDone || isFailed;
  const accent = isFailed ? T.error : isDone ? T.green : txPalette(op.tone).accent;

  return (
    <Pressable
      onPress={terminal ? onDismiss : undefined}
      disabled={!terminal}
      accessibilityRole={terminal ? 'button' : undefined}
      accessibilityLabel={formatPillText(op)}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: isFailed
            ? 'rgba(209,96,74,0.16)'
            : isDone
              ? 'rgba(126,166,136,0.16)'
              : txPalette(op.tone).accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDone ? (
          <Icons.check size={12} color={accent} />
        ) : isFailed ? (
          <Icons.close size={11} color={accent} />
        ) : (
          <Spinner color={accent} />
        )}
      </View>
      <Text
        style={[
          sansation,
          {
            flex: 1,
            fontSize: 14,
            color: T.ink,
            fontWeight: '600',
            includeFontPadding: false,
          },
        ]}
        numberOfLines={1}
      >
        {formatPillText(op)}
      </Text>
    </Pressable>
  );
}

/** The navbar left slot: the time-based greeting, replaced by a live
 *  pending-op indicator while a stealth/Umbra operation is running. */
export function GreetingSlot() {
  const op = useTopPendingOp();
  const { dismiss } = usePendingOps();
  const greeting = getGreeting();
  const { user } = useAuth();
  const username = user?.username ?? '';

  if (op) {
    return <NavPendingIndicator op={op} onDismiss={() => dismiss(op.id)} />;
  }

  return (
    <Text
      style={[sansation, { flex: 1, fontSize: 14, color: T.inkDim }]}
      numberOfLines={1}
    >
      {greeting}
      {username ? ', ' : ''}
      {username ? (
        <Text style={{ color: T.ink, fontWeight: '600' }}>{username}</Text>
      ) : null}
    </Text>
  );
}
