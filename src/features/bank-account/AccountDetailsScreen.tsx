import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { PageTitleHeader } from '@/src/design-system/primitives/PageTitleHeader';
import { Icons } from '@/src/design-system/icons';
import { mono } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export function AccountDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { user } = useAuth();
  const address = user?.bankWallet ?? '';

  const [copied, setCopied] = useState(false);
  const pop = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const copy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    // Feedback is the icon animation only — no toast.
    setCopied(true);
    pop.value = withSequence(
      withTiming(0.6, { duration: 90 }),
      withSpring(1, { damping: 7, stiffness: 320 }),
    );
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <CenterGlow tone="silver" flat>
      <PageTitleHeader title="Account details" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel="Copy virtual bank account address"
          style={({ pressed }) => ({
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.hairline,
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Kicker color={T.inkFaint} style={{ letterSpacing: 1.6 }}>
            Wallet address
          </Kicker>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginTop: 6,
            }}
          >
            <Text
              style={[mono, { flex: 1, fontSize: 14, color: T.ink }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {address || '—'}
            </Text>
            <Animated.View style={iconStyle}>
              {copied ? (
                <Icons.check size={16} color={T.green} strokeWidth={2.4} />
              ) : (
                <Icons.copy size={16} color={T.inkFaint} />
              )}
            </Animated.View>
          </View>
        </Pressable>
      </ScrollView>
    </CenterGlow>
  );
}
