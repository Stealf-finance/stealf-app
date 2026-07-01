import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getEnv } from '@/src/services/env';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { claimFaucet } from '@/src/features/add-funds/api/faucet';
import { BuyWithCard } from '@/src/features/add-funds/components/BuyWithCard';
import { ApiError } from '@/src/services/api/errors';

type WalletSource = 'bank' | 'stealth';

type Props = {
  tone?: Tone;
  wallet?: WalletSource;
};

const QR_SIZE = 244;

const ACCENT_GRADIENTS: Record<Tone, [string, string]> = {
  gold: ['#e6c079', '#a37b2e'],
  silver: ['#e8e8ea', '#9a9a9f'],
};

const ACCENT_DIM: Record<Tone, string> = {
  gold: 'rgba(230,192,121,0.22)',
  silver: 'rgba(232,232,234,0.2)',
};

export function AddFundsScreen({ tone = 'gold', wallet }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const palette = txPalette(tone);
  const isGold = tone === 'gold';
  const accent = palette.accent;
  const chipGradient = ACCENT_GRADIENTS[tone];
  const accentDim = ACCENT_DIM[tone];
  const kickerColor = isGold ? 'rgba(230,192,121,0.85)' : T.inkFaint;

  const resolvedWallet: WalletSource = wallet ?? (isGold ? 'stealth' : 'bank');
  const isStealth = resolvedWallet === 'stealth';

  const [network] = useState('Solana');
  const fullAddress = (isStealth ? user?.stealfWallet : user?.bankWallet) ?? '';
  const displayAddress = fullAddress
    ? `${fullAddress.slice(0, 14)}...${fullAddress.slice(-6)}`
    : '—';

  const back = () => router.back();
  const [copied, setCopied] = useState(false);

  // Tap feedback: a soft squish + a brief lift, plus a cross-fade between
  // the copy icon / address and the check icon / "Copied" label. The fade
  // is JS-driven via the `copied` state so it survives across re-renders.
  const rowScale = useSharedValue(1);
  const copiedProgress = useSharedValue(0);

  useEffect(() => {
    copiedProgress.value = withTiming(copied ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [copied, copiedProgress]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));
  const copyIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - copiedProgress.value,
    transform: [{ scale: 1 - copiedProgress.value * 0.2 }],
  }));
  const checkIconStyle = useAnimatedStyle(() => ({
    opacity: copiedProgress.value,
    transform: [{ scale: 0.6 + copiedProgress.value * 0.4 }],
  }));
  const addressTextStyle = useAnimatedStyle(() => ({
    opacity: 1 - copiedProgress.value,
  }));
  const copiedTextStyle = useAnimatedStyle(() => ({
    opacity: copiedProgress.value,
    transform: [{ translateY: (1 - copiedProgress.value) * 4 }],
  }));

  const handleCopy = async () => {
    if (!fullAddress) return;
    rowScale.value = withSequence(
      withTiming(0.96, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 320, mass: 0.6 }),
    );
    await Clipboard.setStringAsync(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const queryClient = useQueryClient();
  // Inline status pinned to the faucet button itself. Auto-clears after a
  // few seconds. We don't rely on the global toast for this flow because the
  // AddFunds screen is presented as an iOS modal (`presentation: 'modal'`),
  // and the `ToastHost` mounted in `_layout.tsx` sits below that UIKit
  // modal layer — toasts would render hidden behind the screen.
  const [claimResult, setClaimResult] = useState<
    { kind: 'success' | 'error'; label: string } | null
  >(null);
  useEffect(() => {
    if (!claimResult) return;
    const ms = claimResult.kind === 'success' ? 3000 : 4500;
    const t = setTimeout(() => setClaimResult(null), ms);
    return () => clearTimeout(t);
  }, [claimResult]);
  // Show the faucet button only on devnet builds. The backend faucet
  // route exists only on dev/staging, so this also avoids 404s in prod.
  const isDevnet = useMemo(() => {
    const url = getEnv().EXPO_PUBLIC_SOLANA_RPC_URL ?? '';
    return /devnet/i.test(url);
  }, []);

  const airdrop = useMutation({
    mutationFn: async () => {
      const token = session?.sessionToken;
      if (!token) throw new Error('Not authenticated');
      if (!fullAddress) throw new Error('Wallet unavailable');
      return claimFaucet(token, fullAddress, isStealth ? 'stealf' : 'cash');
    },
    onSuccess: (data) => {
      const sol = (data.amountLamports / 1_000_000_000).toFixed(2);
      setClaimResult({ kind: 'success', label: `Received +${sol} SOL` });
      queryClient.invalidateQueries({
        queryKey: balanceQueries.byAddress(fullAddress),
      });
    },
    onError: (err: unknown) => {
      // Backend distinguishes cooldown (429) / out-of-funds (503) / chain
      // failure (502) — render a tailored short label per case so the user
      // knows whether to wait or whether something's broken.
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const nextAvailable =
            (err.data as { nextAvailableAt?: string } | undefined)
              ?.nextAvailableAt;
          const when = nextAvailable
            ? new Date(nextAvailable).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;
          setClaimResult({
            kind: 'error',
            label: when ? `On cooldown · retry ${when}` : 'On cooldown',
          });
          return;
        }
        if (err.status === 503) {
          setClaimResult({ kind: 'error', label: 'Faucet empty' });
          return;
        }
      }
      setClaimResult({ kind: 'error', label: 'Airdrop failed' });
    },
  });

  const handleShare = async () => {
    if (!fullAddress) return;
    try {
      await Share.share({ message: fullAddress });
    } catch {
      // user cancel — no-op
    }
  };


  return (
    <CenterGlow tone={tone} flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackBtn onPress={back} />
        <Text
          style={[
            sansation,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 32,
              fontWeight: '600',
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          Receive
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 14, alignItems: 'center' }}>
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              color: kickerColor,
              fontWeight: '700',
            },
          ]}
        >
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingLeft: 8,
            paddingRight: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Image
            source={{
              uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            }}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 24, height: 24, borderRadius: 12 }}
          />
          <Text
            style={[sansation, { fontSize: 14, color: T.ink, fontWeight: '500' }]}
          >
            {network}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: 28 }}>
        <View
          style={{
            width: 280,
            padding: 18,
            borderRadius: 28,
            backgroundColor: '#f6f2e8',
            shadowColor: isGold ? '#e6c079' : '#ffffff',
            shadowOpacity: isGold ? 0.25 : 0.08,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {fullAddress ? (
            <QRCode
              value={fullAddress}
              size={QR_SIZE}
              color="#0a0a0a"
              backgroundColor="#f6f2e8"
              ecl="M"
            />
          ) : (
            <View
              style={{
                width: QR_SIZE,
                height: QR_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[sansation, { color: '#0a0a0a', fontSize: 12 }]}>
                Wallet unavailable
              </Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Address copied' : 'Copy address'}
        hitSlop={8}
      >
        <Animated.View
          style={[
            {
              paddingTop: 20,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            },
            rowAnimatedStyle,
          ]}
        >
          <View style={{ position: 'relative', justifyContent: 'center' }}>
            <Animated.Text
              style={[
                mono,
                {
                  fontSize: 13,
                  color: T.ink,
                  letterSpacing: 0.26,
                },
                addressTextStyle,
              ]}
            >
              {displayAddress}
            </Animated.Text>
            <Animated.Text
              style={[
                sansation,
                {
                  position: 'absolute',
                  alignSelf: 'center',
                  fontSize: 13,
                  letterSpacing: 0.4,
                  color: accent,
                  fontWeight: '600',
                },
                copiedTextStyle,
              ]}
            >
              Copied to clipboard
            </Animated.Text>
          </View>
          <View
            style={{
              width: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                copyIconStyle,
              ]}
            >
              <Icons.copy size={14} color={T.inkDim} />
            </Animated.View>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                checkIconStyle,
              ]}
            >
              <Icons.check size={14} color={accent} strokeWidth={2.4} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>

      {isDevnet && fullAddress ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable
            onPress={() => {
              if (airdrop.isPending) return;
              setClaimResult(null);
              airdrop.mutate();
            }}
            accessibilityRole="button"
            accessibilityLabel="Request a 2 SOL devnet airdrop"
            disabled={airdrop.isPending}
            style={{
              paddingVertical: 14,
              borderRadius: 100,
              backgroundColor:
                claimResult?.kind === 'success'
                  ? 'rgba(58,170,90,0.12)'
                  : claimResult?.kind === 'error'
                    ? 'rgba(229,72,77,0.10)'
                    : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor:
                claimResult?.kind === 'success'
                  ? 'rgba(58,170,90,0.45)'
                  : claimResult?.kind === 'error'
                    ? 'rgba(229,72,77,0.45)'
                    : T.hairline,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: airdrop.isPending ? 0.6 : 1,
            }}
          >
            {airdrop.isPending ? (
              <ActivityIndicator size="small" color={T.ink} />
            ) : claimResult?.kind === 'success' ? (
              <Icons.check size={14} color="#3AAA5A" strokeWidth={2.4} />
            ) : claimResult?.kind === 'error' ? (
              <Icons.info size={14} color={T.error} />
            ) : (
              <Icons.plus size={14} color={T.ink} />
            )}
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.42,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color:
                    claimResult?.kind === 'success'
                      ? '#3AAA5A'
                      : claimResult?.kind === 'error'
                        ? T.error
                        : T.ink,
                },
              ]}
            >
              {airdrop.isPending
                ? 'Requesting…'
                : claimResult
                  ? claimResult.label
                  : 'Get 2 SOL (devnet)'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {resolvedWallet === 'bank' && user?.bankWallet ? (
        <BuyWithCard walletAddress={user.bankWallet} />
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 28, paddingBottom: 16, alignItems: 'center' }}>
        <Text
          style={[
            sansation,
            {
              fontSize: 11,
              color: T.inkFaint,
              lineHeight: 16,
              textAlign: 'center',
            },
          ]}
        >
          Only send{' '}
          <Text style={{ color: accent, fontWeight: '600' }}>{network}</Text>{' '}
          network tokens to this address.
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy address"
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: T.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icons.copy size={14} color={T.ink} />
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                letterSpacing: 2.42,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: T.ink,
              },
            ]}
          >
            {copied ? 'Copied' : 'Copy address'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share address"
          style={{
            flex: 1,
            borderRadius: 100,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            shadowColor: accentDim,
            shadowOpacity: 1,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <LinearGradient
            colors={chipGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icons.arrUpRight size={14} color="#0a0a0a" />
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.42,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color: '#0a0a0a',
                },
              ]}
            >
              Share
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </CenterGlow>
  );
}

