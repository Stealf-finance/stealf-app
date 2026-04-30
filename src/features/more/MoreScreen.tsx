import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  sansationBold,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useLogout } from '@/src/features/onboarding/hooks/useLogout';
import { useExportBankWallet } from './hooks/useExportBankWallet';

const S = txPalette('silver');

const CLIPBOARD_CLEAR_MS = 30_000;

function truncate(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { exportBankWallet, loading: exporting } = useExportBankWallet();
  const logout = useLogout();

  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [addrCopied, setAddrCopied] = useState(false);
  const [phraseCopied, setPhraseCopied] = useState(false);

  const close = () => router.back();

  const onCopyAddress = async () => {
    if (!user?.bankWallet) return;
    await Clipboard.setStringAsync(user.bankWallet);
    setAddrCopied(true);
    setTimeout(() => setAddrCopied(false), 1600);
  };

  const onReveal = async () => {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to reveal your recovery phrase',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (!auth.success) return;

    Alert.alert(
      'Reveal recovery phrase',
      'Anyone with this phrase can drain your wallet. Make sure no one is watching your screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reveal',
          style: 'destructive',
          onPress: async () => {
            const result = await exportBankWallet();
            if (!result.ok || !result.mnemonic) {
              Alert.alert(
                'Export failed',
                result.error ?? 'Could not retrieve the recovery phrase.',
              );
              return;
            }
            setMnemonic(result.mnemonic);
          },
        },
      ],
    );
  };

  const onCopyPhrase = async () => {
    if (!mnemonic) return;
    await Clipboard.setStringAsync(mnemonic);
    setPhraseCopied(true);
    setTimeout(async () => {
      setPhraseCopied(false);
      // Best-effort clear so the phrase doesn't linger in the pasteboard.
      try {
        const current = await Clipboard.getStringAsync();
        if (current === mnemonic) await Clipboard.setStringAsync('');
      } catch {
        // Ignore — clipboard read can fail silently on some devices.
      }
    }, CLIPBOARD_CLEAR_MS);
  };

  const onHide = () => setMnemonic(null);

  const onSignOut = () => {
    Alert.alert('Sign out', 'You will need Face ID to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          logout.mutate();
          close();
        },
      },
    ]);
  };

  return (
    <CenterGlow tone="silver">
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ width: 36 }} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          More
        </Text>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.close size={18} color={S.inkDim} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bank wallet address */}
        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Bank wallet
          </Kicker>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: S.hairline,
              backgroundColor: 'rgba(255,255,255,0.025)',
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 9,
                    letterSpacing: 2.52,
                    textTransform: 'uppercase',
                    color: T.inkFaint,
                    fontWeight: '700',
                    marginBottom: 4,
                  },
                ]}
              >
                Solana address
              </Text>
              <Text
                style={[
                  mono,
                  { fontSize: 13, color: T.ink, letterSpacing: 0.2 },
                ]}
              >
                {user?.bankWallet ? truncate(user.bankWallet) : '—'}
              </Text>
            </View>
            <Pressable
              onPress={onCopyAddress}
              disabled={!user?.bankWallet}
              accessibilityRole="button"
              accessibilityLabel="Copy bank wallet address"
              hitSlop={6}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: S.hairline,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.04)',
                opacity: user?.bankWallet ? 1 : 0.4,
              }}
            >
              <Icons.copy size={14} color={addrCopied ? S.accent : T.ink} />
            </Pressable>
          </View>
          {addrCopied ? (
            <Text
              style={[
                sansation,
                {
                  marginTop: 8,
                  paddingHorizontal: 4,
                  fontSize: 11,
                  color: S.accent,
                },
              ]}
            >
              Copied to clipboard.
            </Text>
          ) : null}
        </View>

        {/* Recovery phrase */}
        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>Backup</Kicker>

          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: S.hairline,
              backgroundColor: 'rgba(255,255,255,0.025)',
              padding: 18,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icons.key size={16} color={S.accent} />
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 14,
                    color: T.ink,
                    fontWeight: '500',
                    flex: 1,
                  },
                ]}
              >
                Recovery phrase
              </Text>
            </View>

            <Text
              style={[
                sansation,
                {
                  fontSize: 12,
                  color: T.inkFaint,
                  lineHeight: 18,
                },
              ]}
            >
              These words give full control of your bank wallet. Write them
              down on paper, never share them, never store them online.
            </Text>

            {mnemonic ? (
              <>
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: S.hairline,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    paddingVertical: 16,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={[
                      mono,
                      {
                        fontSize: 14,
                        color: T.ink,
                        lineHeight: 22,
                        textAlign: 'center',
                        letterSpacing: 0.4,
                      },
                    ]}
                  >
                    {mnemonic}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={onCopyPhrase}
                    accessibilityRole="button"
                    accessibilityLabel="Copy recovery phrase"
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: S.hairline,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Icons.copy size={13} color={T.ink} />
                    <Text
                      style={[
                        sansationBold,
                        {
                          fontSize: 11,
                          letterSpacing: 2.42,
                          textTransform: 'uppercase',
                          color: T.ink,
                        },
                      ]}
                    >
                      {phraseCopied ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onHide}
                    accessibilityRole="button"
                    accessibilityLabel="Hide recovery phrase"
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: S.hairline,
                      backgroundColor: 'rgba(255,255,255,0.025)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Icons.eye size={13} color={T.inkDim} />
                    <Text
                      style={[
                        sansationBold,
                        {
                          fontSize: 11,
                          letterSpacing: 2.42,
                          textTransform: 'uppercase',
                          color: T.inkDim,
                        },
                      ]}
                    >
                      Hide
                    </Text>
                  </Pressable>
                </View>
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 10,
                      color: T.inkFaint,
                      textAlign: 'center',
                      lineHeight: 14,
                    },
                  ]}
                >
                  Clipboard auto-clears in {Math.round(CLIPBOARD_CLEAR_MS / 1000)}s.
                </Text>
              </>
            ) : (
              <Pressable
                onPress={onReveal}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel="Reveal recovery phrase"
                style={{
                  paddingVertical: 14,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: S.accentDim,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                <Icons.eye size={14} color={S.accent} />
                <Text
                  style={[
                    sansationBold,
                    {
                      fontSize: 11,
                      letterSpacing: 2.64,
                      textTransform: 'uppercase',
                      color: S.accent,
                    },
                  ]}
                >
                  {exporting ? 'Authenticating…' : 'Reveal'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Account */}
        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>Account</Kicker>
          <Pressable
            onPress={onSignOut}
            disabled={logout.isPending}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: S.hairline,
              backgroundColor: 'rgba(255,255,255,0.025)',
              paddingVertical: 16,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: logout.isPending ? 0.5 : 1,
            }}
          >
            <Icons.lock size={16} color="#E5484D" />
            <Text
              style={[
                sansation,
                {
                  flex: 1,
                  fontSize: 14,
                  color: '#E5484D',
                  fontWeight: '500',
                },
              ]}
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Text>
            <Icons.chevR size={14} color={T.inkFaint} />
          </Pressable>
        </View>

        {/* Footer signature */}
        <Text
          style={[
            sansationLight,
            {
              fontSize: 10,
              color: T.inkFaint,
              textAlign: 'center',
              letterSpacing: 1.2,
              marginTop: 10,
            },
          ]}
        >
          Stealf · {user?.username ? `@${user.username}` : 'unsigned'}
        </Text>
      </ScrollView>
    </CenterGlow>
  );
}
