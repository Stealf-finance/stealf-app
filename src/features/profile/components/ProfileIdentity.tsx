import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { User } from '@/src/features/onboarding/types';
import { PseudoRow } from './PseudoRow';

const S = txPalette('silver');

type Props = {
  user: User | null;
  /** Plaintext email resolved by the screen (user record, or Turnkey for
   *  email-OTP users) — may be empty for OAuth users without one. */
  email: string;
};

/** Identity block: editable @username → email + copy. Left-aligned, no avatar
 *  / provider logo. */
export function ProfileIdentity({ user, email }: Props) {
  const username = user?.username ?? '';

  const [emailCopied, setEmailCopied] = useState(false);
  const emailPop = useSharedValue(1);
  const emailIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emailPop.value }],
  }));
  const copyEmail = async () => {
    if (!email) return;
    await Clipboard.setStringAsync(email);
    setEmailCopied(true);
    emailPop.set(
      withSequence(
        withTiming(0.6, { duration: 90 }),
        withSpring(1, { damping: 7, stiffness: 320 }),
      ),
    );
    setTimeout(() => setEmailCopied(false), 1200);
  };

  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <PseudoRow username={username} />

      {email ? (
        <Pressable
          onPress={copyEmail}
          accessibilityRole="button"
          accessibilityLabel="Copy email"
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {/* row layout on a static View — flexDirection in a Pressable
              style-fn doesn't apply reliably, which dropped the icon below */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                flexShrink: 1,
                fontSize: 13,
                color: S.inkDim,
                letterSpacing: 0.2,
                includeFontPadding: false,
              }}
            >
              {email}
            </Text>
            <Animated.View style={emailIconStyle}>
              {emailCopied ? (
                <Icons.check size={13} color={T.green} strokeWidth={2.4} />
              ) : (
                <Icons.copy size={13} color={S.inkFaint} />
              )}
            </Animated.View>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
