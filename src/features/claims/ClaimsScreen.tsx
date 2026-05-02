import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { mono, sansation, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import {
  pendingClaimsForCashQueries,
  usePendingClaimsForCash,
} from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';

const CLAIM_GRADIENT: [string, string] = ['#e6c079', '#a37b2e'];
const ACCENT = '#e6c079';
const ACCENT_GLOW = 'rgba(230,192,121,0.45)';

export function ClaimsScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { claimSelfToPublic } = useUmbra();
  const { data: pendingUtxos, isLoading } = usePendingClaimsForCash();

  const claims = pendingUtxos ?? [];
  const close = () => router.back();

  const onClaim = (utxo: unknown) => {
    if (!utxo) return;
    const bankWallet = user?.bankWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: 'claim-to-bank',
      tone: 'gold',
      amountSol: 0,
    });

    close();

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        await claimSelfToPublic([utxo]);
        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        await Promise.all([
          bankWallet
            ? queryClient.invalidateQueries({
                queryKey:
                  pendingClaimsForCashQueries.byBankWallet(bankWallet),
              })
            : Promise.resolve(),
          bankWallet
            ? queryClient.invalidateQueries({
                queryKey: balanceQueries.byAddress(bankWallet),
              })
            : Promise.resolve(),
          bankWallet
            ? queryClient.invalidateQueries({
                queryKey: historyQueries.byAddress(bankWallet),
              })
            : Promise.resolve(),
        ]);

        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Claim failed';
        if (__DEV__) console.warn('[ClaimsScreen] claim failed:', msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <BackBtn onPress={close} />
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
          Pending claims
        </Text>
      </View>

      <View
        style={{
          paddingTop: 8,
          paddingBottom: 22,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              color: 'rgba(230,192,121,0.85)',
              fontWeight: '700',
            },
          ]}
        >
          — {claims.length} on the way · to bank wallet —
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {claims.length === 0 ? (
          <EmptyState loading={isLoading} />
        ) : (
          claims.map((utxo, i) => (
            <ClaimCard
              key={`claim-${i}`}
              onClaim={() => onClaim(utxo)}
            />
          ))
        )}
      </ScrollView>
    </CenterGlow>
  );
}

function ClaimCard({ onClaim }: { onClaim: () => void }) {
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(212,165,83,0.18)',
      }}
    >
      <LinearGradient
        colors={['rgba(212,165,83,0.10)', 'rgba(163,123,46,0.03)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconChip />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: T.ink,
                  fontWeight: '500',
                  includeFontPadding: false,
                },
              ]}
            >
              Encrypted to bank
            </Text>
            <Text
              style={[
                mono,
                {
                  fontSize: 10,
                  color: T.inkFaint,
                  marginTop: 3,
                  letterSpacing: 0.4,
                },
              ]}
            >
              Encrypted
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <ClaimButton onPress={onClaim} />
        </View>
      </LinearGradient>
    </View>
  );
}

function IconChip() {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Icons.clock size={16} color={ACCENT} strokeWidth={1.6} />
    </View>
  );
}

function ClaimButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Claim to bank"
      onPress={onPress}
      style={{
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: ACCENT_GLOW,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={CLAIM_GRADIENT}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icons.check size={12} color="#0a0a0a" strokeWidth={2.4} />
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: '#0a0a0a',
            },
          ]}
        >
          Claim to bank
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center' }}>
      <Text
        style={[
          serif,
          {
            fontSize: 15,
            fontStyle: 'italic',
            color: T.inkFaint,
            textAlign: 'center',
          },
        ]}
      >
        {loading
          ? 'Looking for incoming transfers…'
          : 'No transfers on the way to your bank.'}
      </Text>
    </View>
  );
}
