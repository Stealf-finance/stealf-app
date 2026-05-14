import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { scheduleClipboardClear } from '@/src/features/profile/lib/clipboardAutoClear';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useDeleteStealthWallet } from '@/src/features/stealth/hooks/useDeleteStealthWallet';
import { useToast } from '@/src/components/toast/ToastContext';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';

const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

const S = txPalette('silver');
const G = txPalette('gold');

type RevealState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; value: string }
  | { phase: 'error'; message: string };

type WalletKind = 'bank' | 'stealth';

export function PrivateKeyScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { exportWallet, wallets } = useTurnkey();

  const bankAddress = user?.bankWallet ?? null;
  const stealthAddress = user?.stealfWallet ?? null;
  const bankWalletId = wallets?.[0]?.walletId ?? null;

  const [bank, setBank] = useState<RevealState>({ phase: 'idle' });
  const [stealth, setStealth] = useState<RevealState>({ phase: 'idle' });
  const [confirmingFor, setConfirmingFor] = useState<WalletKind | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const deleteStealthWallet = useDeleteStealthWallet();
  const { show: showToast } = useToast();

  const askDeleteStealth = () => setConfirmingDelete(true);
  const cancelDelete = () => setConfirmingDelete(false);
  const onConfirmDelete = async () => {
    setConfirmingDelete(false);
    try {
      await deleteStealthWallet.mutateAsync();
      setStealth({ phase: 'idle' });
      showToast({
        kind: 'success',
        title: 'Stealth wallet deleted',
        message: 'Re-create or import one from the Stealth tab.',
      });
      router.back();
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: "Couldn't delete",
        message: err?.message || 'Try again in a moment.',
      });
    }
  };

  const askBank = () => setConfirmingFor('bank');
  const askStealth = () => setConfirmingFor('stealth');
  const cancelConfirm = () => setConfirmingFor(null);
  const onConfirmExport = () => {
    const target = confirmingFor;
    setConfirmingFor(null);
    if (target === 'bank') void revealBank();
    else if (target === 'stealth') void revealStealth();
  };

  const revealBank = async () => {
    if (!bankWalletId) {
      setBank({ phase: 'error', message: 'Bank wallet not set up.' });
      return;
    }
    setBank({ phase: 'loading' });
    try {
      const mnemonic = await exportWallet({ walletId: bankWalletId });
      const value = typeof mnemonic === 'string' ? mnemonic : String(mnemonic);
      setBank({ phase: 'ready', value });
    } catch (err: any) {
      const cause = err?.cause;
      const msg =
        cause?.message || err?.message || 'Export failed.';
      if (__DEV__) {
        console.warn('[PrivateKey] bank export failed', {
          message: err?.message,
          code: err?.code,
          causeMessage: cause?.message,
          causeStatus: cause?.statusCode,
          causeCode: cause?.code,
        });
      }
      setBank({ phase: 'error', message: msg });
    }
  };

  const revealStealth = async () => {
    setStealth({ phase: 'loading' });
    try {
      const mnemonic = await walletKeyCache.getMnemonicPersisted();
      if (!mnemonic) {
        setStealth({
          phase: 'error',
          message:
            'Recovery phrase unavailable. Set up the stealth wallet first.',
        });
        return;
      }
      setStealth({ phase: 'ready', value: mnemonic });
    } catch (err: any) {
      setStealth({
        phase: 'error',
        message: err?.message || 'Could not load recovery phrase.',
      });
    }
  };

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
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
          Solana Private Key
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <WarningBanner />

        <KeyCard
          title="Bank wallet"
          accent={S.accent}
          address={bankAddress}
          state={bank}
          onAsk={askBank}
          onRetry={revealBank}
        />

        <KeyCard
          title="Stealth wallet"
          accent={G.accent}
          address={stealthAddress}
          state={stealth}
          onAsk={askStealth}
          onRetry={revealStealth}
          onDelete={stealthAddress ? askDeleteStealth : undefined}
        />
      </ScrollView>

      <ConfirmExportSheet
        visible={confirmingFor !== null}
        onConfirm={onConfirmExport}
        onCancel={cancelConfirm}
      />

      <ConfirmDeleteStealthSheet
        visible={confirmingDelete}
        deleting={deleteStealthWallet.isPending}
        onConfirm={onConfirmDelete}
        onCancel={cancelDelete}
      />
    </CenterGlow>
  );
}

function WarningBanner() {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(229,72,77,0.30)',
        backgroundColor: 'rgba(229,72,77,0.08)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icons.info size={14} color={T.error} />
      </View>
      <Text
        style={[
          sansation,
          {
            flex: 1,
            fontSize: 12,
            lineHeight: 17,
            color: T.ink,
          },
        ]}
      >
        Never share your private key. Anyone with access can move your funds —
        Stealf will never ask for it.
      </Text>
    </View>
  );
}

function KeyCard({
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
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingVertical: 18, paddingHorizontal: 18 }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                letterSpacing: 2.52,
                textTransform: 'uppercase',
                color: accent,
                fontWeight: '700',
              },
            ]}
          >
            {title}
          </Text>
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete stealth wallet"
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
            <Text
              style={[
                sansation,
                {
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: S.inkFaint,
                  fontWeight: '700',
                  marginBottom: 4,
                },
              ]}
            >
              Address
            </Text>
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
      </LinearGradient>
    </View>
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

function ConfirmExportSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset checkbox each time the sheet opens.
  const handleClose = () => {
    setAcknowledged(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (!acknowledged) return;
    setAcknowledged(false);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
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
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.7,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 14 },
          }}
        >
          <LinearGradient
            colors={['rgba(22,22,24,0.98)', 'rgba(8,8,10,0.99)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              paddingTop: 32,
              paddingHorizontal: 24,
              paddingBottom: 24,
              gap: 20,
            }}
          >
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(229,72,77,0.92)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: 'rgba(229,72,77,0.6)',
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Icons.shieldOff size={30} color="#fff" strokeWidth={1.8} />
              </View>
            </View>

            <Text
              style={[
                serif,
                {
                  fontSize: 24,
                  lineHeight: 30,
                  color: T.ink,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  paddingHorizontal: 8,
                },
              ]}
            >
              Keep your private key secret
            </Text>

            <View style={{ gap: 14 }}>
              <Bullet
                iconKey="key"
                text="Your private key is the master key to your wallet."
              />
              <Bullet
                iconKey="hideEye"
                text="If someone gets it, they can drain your funds. Lost funds cannot be recovered."
              />
              <Bullet
                iconKey="info"
                text="Never share it. Not with anyone, not on any website or app."
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />

            <Pressable
              onPress={() => setAcknowledged((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              accessibilityLabel="I understand"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: acknowledged ? T.ink : 'rgba(255,255,255,0.20)',
                  backgroundColor: acknowledged ? T.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {acknowledged ? (
                  <Icons.check size={14} color="#0a0a0a" strokeWidth={2.6} />
                ) : null}
              </View>
              <Text
                style={[
                  sansation,
                  {
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 18,
                    color: T.ink,
                  },
                ]}
              >
                I understand that sharing my private key could lead to permanent
                loss of funds.
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!acknowledged}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 12,
                borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={[
                  sansation,
                  {
                    textAlign: 'center',
                    fontSize: 11,
                    letterSpacing: 2.4,
                    textTransform: 'uppercase',
                    color: T.ink,
                    fontWeight: '700',
                    opacity: acknowledged ? 1 : 0.4,
                  },
                ]}
              >
                Continue
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmDeleteStealthSheet({
  visible,
  deleting,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleClose = () => {
    if (deleting) return;
    setAcknowledged(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (!acknowledged || deleting) return;
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
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
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.7,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 14 },
          }}
        >
          <LinearGradient
            colors={['rgba(22,22,24,0.98)', 'rgba(8,8,10,0.99)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              paddingTop: 32,
              paddingHorizontal: 24,
              paddingBottom: 24,
              gap: 20,
            }}
          >
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              disabled={deleting}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(229,72,77,0.92)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: 'rgba(229,72,77,0.6)',
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Icons.trash size={28} color="#fff" strokeWidth={1.8} />
              </View>
            </View>

            <Text
              style={[
                serif,
                {
                  fontSize: 24,
                  lineHeight: 30,
                  color: T.ink,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  paddingHorizontal: 8,
                },
              ]}
            >
              Delete stealth wallet?
            </Text>

            <View style={{ gap: 14 }}>
              <Bullet
                iconKey="shieldOff"
                text="This wipes the local key and recovery phrase from this device."
              />
              <Bullet
                iconKey="hideEye"
                text="Your encrypted balance stays on-chain but becomes unreachable without your recovery phrase."
              />
              <Bullet
                iconKey="info"
                text="Your bank wallet and account stay untouched."
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />

            <Pressable
              onPress={() => setAcknowledged((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              accessibilityLabel="I have saved my recovery phrase"
              disabled={deleting}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: acknowledged ? T.ink : 'rgba(255,255,255,0.20)',
                  backgroundColor: acknowledged ? T.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {acknowledged ? (
                  <Icons.check size={14} color="#0a0a0a" strokeWidth={2.6} />
                ) : null}
              </View>
              <Text
                style={[
                  sansation,
                  {
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 18,
                    color: T.ink,
                  },
                ]}
              >
                I have saved my recovery phrase and understand my encrypted
                balance will be unreachable without it.
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!acknowledged || deleting}
              accessibilityRole="button"
              accessibilityLabel="Delete stealth wallet"
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 12,
                borderRadius: 100,
                backgroundColor: acknowledged
                  ? 'rgba(229,72,77,0.92)'
                  : 'rgba(229,72,77,0.30)',
                borderWidth: 1,
                borderColor: 'rgba(229,72,77,0.60)',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={[
                  sansation,
                  {
                    textAlign: 'center',
                    fontSize: 11,
                    letterSpacing: 2.4,
                    textTransform: 'uppercase',
                    color: '#fff',
                    fontWeight: '700',
                  },
                ]}
              >
                {deleting ? 'Deleting…' : 'Delete stealth wallet'}
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({
  iconKey,
  text,
}: {
  iconKey: keyof typeof Icons;
  text: string;
}) {
  const Icon = Icons[iconKey];
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: 'rgba(229,72,77,0.85)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={14} color="#fff" strokeWidth={1.8} />
      </View>
      <Text
        style={[
          sansation,
          {
            flex: 1,
            fontSize: 12,
            lineHeight: 17,
            color: T.ink,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

