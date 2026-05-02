import { ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';

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
  const { exportWalletAccount } = useTurnkey();

  const bankAddress = user?.bankWallet ?? null;
  const stealthAddress = user?.stealfWallet ?? null;

  const [bank, setBank] = useState<RevealState>({ phase: 'idle' });
  const [stealth, setStealth] = useState<RevealState>({ phase: 'idle' });
  const [confirmingFor, setConfirmingFor] = useState<WalletKind | null>(null);

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
    if (!bankAddress) {
      setBank({ phase: 'error', message: 'Bank wallet not set up.' });
      return;
    }
    setBank({ phase: 'loading' });
    try {
      const decrypted = await exportWalletAccount({ address: bankAddress });
      const value = typeof decrypted === 'string' ? decrypted : String(decrypted);
      setBank({ phase: 'ready', value });
    } catch (err: any) {
      const msg = err?.message || 'Export failed.';
      if (__DEV__) console.warn('[PrivateKey] bank export failed:', msg);
      setBank({ phase: 'error', message: msg });
    }
  };

  const revealStealth = async () => {
    setStealth({ phase: 'loading' });
    try {
      const pk = await walletKeyCache.getPrivateKey();
      if (!pk) {
        setStealth({
          phase: 'error',
          message:
            'Stealth wallet key unavailable. Set up the stealth wallet first.',
        });
        return;
      }
      setStealth({ phase: 'ready', value: pk });
    } catch (err: any) {
      setStealth({
        phase: 'error',
        message: err?.message || 'Could not load stealth key.',
      });
    }
  };

  const hideBank = () => setBank({ phase: 'idle' });
  const hideStealth = () => setStealth({ phase: 'idle' });

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
          accentSoft={S.accentDim}
          address={bankAddress}
          state={bank}
          onAsk={askBank}
          onRetry={revealBank}
          onHide={hideBank}
        />

        <KeyCard
          title="Stealth wallet"
          accent={G.accent}
          accentSoft={G.accentDim}
          address={stealthAddress}
          state={stealth}
          onAsk={askStealth}
          onRetry={revealStealth}
          onHide={hideStealth}
        />
      </ScrollView>

      <ConfirmExportSheet
        visible={confirmingFor !== null}
        onConfirm={onConfirmExport}
        onCancel={cancelConfirm}
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
        <Icons.info size={14} color={T.red} />
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
  accentSoft,
  address,
  state,
  onAsk,
  onRetry,
  onHide,
}: {
  title: string;
  accent: string;
  accentSoft: string;
  address: string | null;
  state: RevealState;
  onAsk: () => void;
  onRetry: () => void;
  onHide: () => void;
}) {
  const truncatedAddress =
    address && address.length > 16
      ? `${address.slice(0, 6)}…${address.slice(-6)}`
      : address ?? '—';

  const onCopy = async (value: string) => {
    await Clipboard.setStringAsync(value);
  };

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
            gap: 8,
            marginBottom: 4,
          }}
        >
          <View
            style={{ width: 14, height: 1, backgroundColor: accentSoft }}
          />
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
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            marginBottom: 14,
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
          {address ? (
            <SmallBtn
              label="Copy"
              icon="copy"
              onPress={() => void onCopy(address)}
            />
          ) : null}
        </View>

        <KeyBlock
          state={state}
          onAsk={onAsk}
          onRetry={onRetry}
          onHide={onHide}
          onCopy={onCopy}
          accent={accent}
        />
      </LinearGradient>
    </View>
  );
}

function KeyBlock({
  state,
  onAsk,
  onRetry,
  onHide,
  onCopy,
  accent,
}: {
  state: RevealState;
  onAsk: () => void;
  onRetry: () => void;
  onHide: () => void;
  onCopy: (value: string) => Promise<void>;
  accent: string;
}) {
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
        <Icons.eye size={14} color={T.ink} strokeWidth={1.6} />
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
            { fontSize: 12, color: T.red, lineHeight: 17 },
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

  return (
    <View>
      <View
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Text
          style={[
            mono,
            {
              fontSize: 12,
              color: T.ink,
              letterSpacing: 0.3,
              lineHeight: 18,
            },
          ]}
          selectable
        >
          {state.value}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 10,
        }}
      >
        <SmallBtn
          label="Copy"
          icon="copy"
          flex
          onPress={() => void onCopy(state.value)}
        />
        <SmallBtn label="Hide" icon="hideEye" flex onPress={onHide} />
      </View>
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
                paddingVertical: 16,
                borderRadius: 100,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: acknowledged ? '#ffffff' : 'transparent',
                borderWidth: 1,
                borderColor: acknowledged
                  ? '#ffffff'
                  : 'rgba(255,255,255,0.25)',
                opacity: pressed && acknowledged ? 0.85 : 1,
              })}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 12,
                    letterSpacing: 2.6,
                    textTransform: 'uppercase',
                    color: acknowledged ? '#0a0a0a' : T.ink,
                    fontWeight: '700',
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

function SmallBtn({
  label,
  icon,
  onPress,
  flex,
}: {
  label: string;
  icon: keyof typeof Icons;
  onPress: () => void;
  flex?: boolean;
}) {
  const Icon = Icons[icon];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        width: flex ? undefined : 36,
        height: flex ? undefined : 36,
        paddingVertical: flex ? 8 : 0,
        borderRadius: flex ? 100 : 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={14} color={T.ink} strokeWidth={1.6} />
    </Pressable>
  );
}
