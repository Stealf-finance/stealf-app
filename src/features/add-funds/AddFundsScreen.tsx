import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  serif,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

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
  const { user } = useAuth();
  const palette = txPalette(tone);
  const isGold = tone === 'gold';
  const accent = palette.accent;
  const chipGradient = ACCENT_GRADIENTS[tone];
  const accentDim = ACCENT_DIM[tone];
  const kickerColor = isGold ? 'rgba(230,192,121,0.85)' : T.inkFaint;

  const resolvedWallet: WalletSource = wallet ?? (isGold ? 'stealth' : 'bank');
  const isStealth = resolvedWallet === 'stealth';

  const [network] = useState('Solana');
  const destination = isStealth ? 'Stealth wallet' : 'Bank wallet';
  const fullAddress = (isStealth ? user?.stealfWallet : user?.bankWallet) ?? '';
  const displayAddress = fullAddress
    ? `${fullAddress.slice(0, 14)}...${fullAddress.slice(-6)}`
    : '—';

  const close = () => router.back();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!fullAddress) return;
    await Clipboard.setStringAsync(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    if (!fullAddress) return;
    try {
      await Share.share({ message: fullAddress });
    } catch {
      // user cancel — no-op
    }
  };

  return (
    <CenterGlow tone={tone}>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
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
          Add funds
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
          <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
        </Pressable>
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
          — Deposit to {destination} —
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
            source={require('@/assets/images/solana-icon.png')}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 24, height: 24, borderRadius: 12 }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                letterSpacing: 2.52,
                textTransform: 'uppercase',
                color: T.inkFaint,
                fontWeight: '700',
              },
            ]}
          >
            Network
          </Text>
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

      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Text
          style={[
            mono,
            {
              fontSize: 13,
              color: T.ink,
              letterSpacing: 0.26,
            },
          ]}
        >
          {displayAddress}
        </Text>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy address"
          hitSlop={6}
          style={{
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.copy size={14} color={T.inkDim} />
        </Pressable>
      </View>

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

