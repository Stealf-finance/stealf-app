import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { mono, sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useUmbra } from '@/src/features/umbra/hooks/useUmbra';
import { useHasActiveSigner } from '@/src/features/umbra/hooks/useHasActiveSigner';
import {
  encryptedBalancesQueries,
  useEncryptedBalances,
} from '@/src/features/umbra/hooks/useEncryptedBalances';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { toRawAmount } from '@/src/features/send/lib/amount';
import { DEFAULT_MICRO_LAMPORTS_PER_ACU } from '@/src/services/umbra/operations/confidentialTransfer';
import { toAddress } from '@/src/services/solana/kit';

/** Stealf's treasury on devnet — the backend's `AUTHORITY_PUBLIC_KEY`. */
const DEFAULT_RECEIVER = 'FpRVZrZ7zAigWG4mGMirCJMibxedQ4DmMcQCo3p94nwF';

function randomRef(): Uint8Array {
  const bytes = new Uint8Array(32);
  const source = globalThis.crypto;
  if (source?.getRandomValues) return source.getRandomValues(bytes);
  for (let i = 0; i < 32; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 6 }}>
      <Text style={[sansation, { fontSize: 13, color: T.inkFaint, width: 96 }]}>
        {label}
      </Text>
      <Text
        selectable
        style={[mono, { flex: 1, fontSize: 12, color: T.inkDim }]}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Dev-only: one confidential transfer, no order and no backend. Isolates the
 * Umbra + Arcium path from the Store checkout. Crude on purpose.
 */
export function DevConfidentialTransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const umbra = useUmbra();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const signerReady = useHasActiveSigner();
  const { data: encrypted } = useEncryptedBalances();

  const [receiver, setReceiver] = useState(DEFAULT_RECEIVER);
  const [human, setHuman] = useState('0.01');
  const [withRef, setWithRef] = useState(true);
  const [acuBid, setAcuBid] = useState(String(DEFAULT_MICRO_LAMPORTS_PER_ACU));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whatever the wallet holds; the point is to exercise the transfer.
  const token = useMemo(
    () => encrypted?.tokens?.find((t) => t.amountRaw > 0n),
    [encrypted],
  );

  const raw = useMemo(() => {
    const parsed = Number(human);
    if (!token || !Number.isFinite(parsed) || parsed <= 0) return undefined;
    try {
      return toRawAmount(parsed, token.decimals);
    } catch {
      return undefined;
    }
  }, [human, token]);

  const short = !!token && raw !== undefined && token.amountRaw < raw;
  const blocked = !signerReady || !token || raw === undefined || short || busy;

  const send = async () => {
    if (blocked || !token || raw === undefined) return;
    setError(null);
    setResult(null);
    setBusy(true);
    const ref = withRef ? randomRef() : undefined;
    try {
      const bid = /^\d+$/.test(acuBid.trim())
        ? BigInt(acuBid.trim())
        : DEFAULT_MICRO_LAMPORTS_PER_ACU;
      const out = await umbra.sendConfidential(
        toAddress(receiver.trim()),
        toAddress(token.mint),
        raw,
        ref,
        bid,
      );
      setResult(
        `signature ${String(out.signature)}\n\noptionalData ${ref ? hex(ref) : '(none — 32 zero bytes)'}`,
      );
      await queryClient.invalidateQueries({
        queryKey: encryptedBalancesQueries.byWalletPrefix(user?.bankWallet ?? ''),
      });
    } catch (err: any) {
      setError(err?.userMessage || err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 12 }}>
        <BackBtn onPress={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
      >
        <Text style={[sansation, { fontSize: 20, color: T.ink, marginBottom: 4 }]}>
          Confidential transfer
        </Text>
        <Text style={[sansation, { fontSize: 13, color: T.inkFaint, marginBottom: 20 }]}>
          Dev only. Sends straight from your encrypted balance — no order, no
          backend.
        </Text>

        <Line label="signer" value={signerReady ? 'ready' : 'not hydrated'} />
        <Line label="token" value={token ? `${token.symbol} · ${token.decimals}d` : 'none held'} />
        <Line label="mint" value={token?.mint ?? '—'} />
        <Line label="balance" value={token ? `${token.amountRaw} raw` : '—'} />
        <Line label="sending" value={raw === undefined ? '—' : `${raw} raw`} />
        {short ? (
          <Text style={[sansation, { fontSize: 13, color: T.error, marginTop: 8 }]}>
            More than the encrypted balance holds.
          </Text>
        ) : null}

        <Text style={[sansation, { fontSize: 13, color: T.inkFaint, marginTop: 20 }]}>
          Receiver
        </Text>
        <TextInput
          value={receiver}
          onChangeText={setReceiver}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            mono,
            {
              marginTop: 6,
              padding: 12,
              borderRadius: 10,
              backgroundColor: T.bgCard,
              color: T.ink,
              fontSize: 12,
            },
          ]}
        />

        <Text style={[sansation, { fontSize: 13, color: T.inkFaint, marginTop: 16 }]}>
          Amount
        </Text>
        <TextInput
          value={human}
          onChangeText={setHuman}
          keyboardType="decimal-pad"
          style={[
            mono,
            {
              marginTop: 6,
              padding: 12,
              borderRadius: 10,
              backgroundColor: T.bgCard,
              color: T.ink,
              fontSize: 14,
            },
          ]}
        />

        <Text style={[sansation, { fontSize: 13, color: T.inkFaint, marginTop: 16 }]}>
          microLamports per ACU — the transfer circuit costs ~1.39e9 ACU
        </Text>
        <TextInput
          value={acuBid}
          onChangeText={setAcuBid}
          keyboardType="number-pad"
          style={[
            mono,
            {
              marginTop: 6,
              padding: 12,
              borderRadius: 10,
              backgroundColor: T.bgCard,
              color: T.ink,
              fontSize: 14,
            },
          ]}
        />

        <Pressable
          onPress={() => setWithRef((v) => !v)}
          style={{ marginTop: 16, paddingVertical: 8 }}
        >
          <Text style={[sansation, { fontSize: 13, color: T.inkDim }]}>
            {withRef ? '☑' : '☐'} attach a random 32-byte optionalData
          </Text>
        </Pressable>

        <Pressable
          onPress={send}
          disabled={blocked}
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: blocked ? T.bgCard : T.bgCardStrong,
            borderWidth: 1,
            borderColor: blocked ? T.hairline : T.hairlineStrong,
          }}
        >
          <Text style={[sansation, { fontSize: 15, color: blocked ? T.inkFaint : T.ink }]}>
            {busy ? 'Sending…' : 'Send'}
          </Text>
        </Pressable>

        {error ? (
          <Text selectable style={[mono, { marginTop: 20, fontSize: 12, color: T.error }]}>
            {error}
          </Text>
        ) : null}
        {result ? (
          <Text selectable style={[mono, { marginTop: 20, fontSize: 12, color: T.green }]}>
            {result}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
