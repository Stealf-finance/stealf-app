import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Icons } from '@/src/design-system/icons';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export default function ReceiveQr() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { wallet } = useLocalSearchParams<{ wallet?: string }>();
  const { user } = useAuth();

  const isStealth = wallet === 'stealth';
  const address = (isStealth ? user?.stealfWallet : user?.bankWallet) ?? '';
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '—';

  const [copied, setCopied] = useState(false);
  const close = () => router.back();

  const copy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const share = () => {
    if (address) void Share.share({ message: address });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.5)' }]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      {/* Panel — opaque, Home-cards color (matches ChoiceSheet). */}
      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{
          backgroundColor: '#0d0d0d',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[sansation, { fontSize: 22, fontWeight: '600', color: T.ink }]}>
            Receive
          </Text>
          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ position: 'absolute', right: 0, top: 0 }}
          >
            <Icons.close size={22} color={T.inkFaint} />
          </Pressable>
        </View>

        <Text
          style={[
            sansation,
            { fontSize: 14, lineHeight: 20, color: T.inkDim, textAlign: 'center', marginTop: 8 },
          ]}
        >
          Only Solana assets are supported
        </Text>

        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <View style={{ padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {address ? (
              <QRCode value={address} size={220} color={T.ink} backgroundColor="transparent" />
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 }}>
          <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: T.ink }]}>
            {isStealth ? 'Wallet' : 'Cash'}
          </Text>
          <Text style={[sansation, { fontSize: 15, color: T.inkDim }]}>· {short}</Text>
        </View>

        <View style={{ gap: 12 }}>
          {/* Silver primary pill — same as the flows' Continue buttons */}
          <PillBtn
            variant="primary"
            tone="silver"
            label={copied ? 'Copied' : 'Copy Address'}
            onPress={copy}
          />
          <Pressable
            onPress={share}
            accessibilityRole="button"
            accessibilityLabel="Share"
            style={{
              paddingVertical: 16,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center',
            }}
          >
            <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: T.ink }]}>Share</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
