import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { scheduleClipboardClear } from '@/src/features/profile/lib/clipboardAutoClear';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { Icons } from '@/src/design-system/icons';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { mono, sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const CLIPBOARD_CLEAR_DELAY_MS = 30_000;
const S = txPalette('silver');

export type RevealState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; value: string }
  | { phase: 'error'; message: string };

/** One wallet's export card — Home-cards glass (BlurGlass 22), kicker title,
 *  truncated address, and the reveal/copy block. Logic unchanged from the
 *  pre-decomposition screen. */
export function KeyCard({
  title,
  accent,
  address,
  state,
  onAsk,
  onRetry,
  onDelete,
}: {
  title: string;
  accent: string;
  address: string | null;
  state: RevealState;
  onAsk: () => void;
  onRetry: () => void;
  onDelete?: () => void;
}) {
  const truncatedAddress =
    address && address.length > 16
      ? `${address.slice(0, 6)}…${address.slice(-6)}`
      : address ?? '—';

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (state.phase !== 'ready') setRevealed(false);
  }, [state.phase]);

  const onCopy = async (value: string) => {
    await Clipboard.setStringAsync(value);
  };

  const isReady = state.phase === 'ready';
  const EyeIcon = revealed ? Icons.hideEye : Icons.eye;

  return (
    <BlurGlass radius={22} innerStyle={{ paddingVertical: 18, paddingHorizontal: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Kicker color={accent} style={{ fontSize: 9, letterSpacing: 2.52 }}>
          {title}
        </Kicker>
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete wallet"
            onPress={onDelete}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(229,72,77,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(229,72,77,0.28)',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icons.trash size={14} color={T.error} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 12,
          marginBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Kicker
            color={S.inkFaint}
            style={{ fontSize: 9, letterSpacing: 2, marginBottom: 4 }}
          >
            Address
          </Kicker>
          <Text
            style={[
              mono,
              {
                fontSize: 12,
                color: T.ink,
                letterSpacing: 0.4,
              },
            ]}
            numberOfLines={1}
          >
            {truncatedAddress}
          </Text>
        </View>
        {isReady && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? 'Hide recovery phrase' : 'Reveal recovery phrase'
            }
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <EyeIcon size={20} color={T.ink} strokeWidth={1.6} />
          </Pressable>
        )}
      </View>

      <KeyBlock
        state={state}
        onAsk={onAsk}
        onRetry={onRetry}
        onCopy={onCopy}
        accent={accent}
        revealed={revealed}
      />
    </BlurGlass>
  );
}

function KeyBlock({
  state,
  onAsk,
  onRetry,
  onCopy,
  accent,
  revealed,
}: {
  state: RevealState;
  onAsk: () => void;
  onRetry: () => void;
  onCopy: (value: string) => Promise<void>;
  accent: string;
  revealed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const clearTimerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!copied) return;
    const labelTimer = setTimeout(() => setCopied(false), CLIPBOARD_CLEAR_DELAY_MS);
    return () => clearTimeout(labelTimer);
  }, [copied]);

  useEffect(() => {
    return () => {
      clearTimerRef.current?.();
    };
  }, []);

  if (state.phase === 'idle') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export your private key"
        onPress={onAsk}
        style={{
          paddingVertical: 12,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icons.eye size={18} color={T.ink} strokeWidth={1.6} />
        <Text
          style={[
            sansation,
            {
              fontSize: 11,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              color: T.ink,
              fontWeight: '700',
            },
          ]}
        >
          Export your private key
        </Text>
      </Pressable>
    );
  }

  if (state.phase === 'loading') {
    return (
      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
        <Text
          style={[
            sansation,
            { fontSize: 11, color: S.inkDim, letterSpacing: 1 },
          ]}
        >
          Loading…
        </Text>
      </View>
    );
  }

  if (state.phase === 'error') {
    return (
      <View
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: 'rgba(229,72,77,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(229,72,77,0.25)',
        }}
      >
        <Text
          style={[
            sansation,
            { fontSize: 12, color: T.error, lineHeight: 17 },
          ]}
        >
          {state.message}
        </Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={{ marginTop: 8 }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: accent,
                fontWeight: '700',
              },
            ]}
          >
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const CopyIcon = copied ? Icons.check : Icons.copy;

  const handleCopy = async () => {
    await onCopy(state.value);
    clearTimerRef.current?.();
    clearTimerRef.current = scheduleClipboardClear(state.value, {
      delayMs: CLIPBOARD_CLEAR_DELAY_MS,
    });
    setCopied(true);
  };

  return (
    <View>
      <MnemonicGrid value={state.value} hidden={!revealed} />

      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy recovery phrase"
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 18,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CopyIcon
              size={14}
              color={copied ? accent : T.inkDim}
              strokeWidth={copied ? 2.4 : 1.6}
            />
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  lineHeight: 14,
                  letterSpacing: 2.4,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color: copied ? accent : T.inkDim,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                },
              ]}
            >
              {copied ? 'Copied — clears in 30s' : 'Copy'}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function MnemonicGrid({
  value,
  hidden,
}: {
  value: string;
  hidden?: boolean;
}) {
  const words = hidden
    ? Array.from({ length: 12 }, () => '******')
    : value.trim().split(/\s+/);
  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 12,
        paddingHorizontal: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {words.map((w, i) => (
        <View
          key={`${i}-${w}`}
          style={{
            width: '33.333%',
            paddingHorizontal: 4,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                color: T.inkFaint,
                width: 16,
                textAlign: 'right',
              },
            ]}
          >
            {i + 1}
          </Text>
          <Text
            style={[
              mono,
              { fontSize: 13, color: T.ink, includeFontPadding: false },
            ]}
          >
            {w}
          </Text>
        </View>
      ))}
    </View>
  );
}
