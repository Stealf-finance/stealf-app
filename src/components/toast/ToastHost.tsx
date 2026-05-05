import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { T } from '@/src/design-system/tokens';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationBold } from '@/src/design-system/typography';

import { useToast, useTopToast } from './ToastContext';
import type { Toast, ToastKind } from './ToastContext';

const HORIZONTAL_PAD = 16;
const MAX_WIDTH = 380;
// Sit just under the dynamic island / status bar. The PendingOpsPill is
// only visible inside the authenticated tabs (top + 8 + 44 height); on
// auth screens this offset gives the toast a clean banner-like position
// at the top of the view, and inside the app the pill nudges it down
// only a bit.
const TOP_OFFSET = 8;

export function ToastHost() {
  const top = useTopToast();
  const { dismiss } = useToast();
  const insets = useSafeAreaInsets();

  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(top ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [top, enter]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * -20 }],
  }));

  if (!top) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: insets.top + TOP_OFFSET,
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PAD,
          },
          containerStyle,
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          top: insets.top + TOP_OFFSET,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PAD,
          zIndex: 60,
        },
        containerStyle,
      ]}
      accessibilityLiveRegion="polite"
    >
      <ToastBody toast={top} onDismiss={() => dismiss(top.id)} />
    </Animated.View>
  );
}

function accentFor(kind: ToastKind): string {
  switch (kind) {
    case 'error':
      return T.error;
    case 'success':
      return T.green;
    case 'info':
      return T.gold;
  }
}

function ToastBody({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const accent = accentFor(toast.kind);

  const Icon =
    toast.kind === 'error'
      ? Icons.close
      : toast.kind === 'success'
        ? Icons.check
        : Icons.info;

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ''}. Tap to dismiss.`}
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: MAX_WIDTH,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      }}
    >
      {/* Glassmorphism: blur + dark wash. iOS gets the native blur; on
          Android we fall back to a translucent solid because BlurView is
          spotty there. */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 50 : 0}
        tint="dark"
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
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor:
            Platform.OS === 'ios'
              ? 'rgba(12,12,14,0.55)'
              : 'rgba(12,12,14,0.92)',
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingLeft: 16,
          paddingRight: 18,
          gap: 14,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={14} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              sansationBold,
              {
                fontSize: 16,
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={2}
          >
            {toast.title}
          </Text>
          {toast.message ? (
            <Text
              style={[
                sansation,
                {
                  marginTop: 4,
                  fontSize: 14,
                  color: T.inkDim,
                  lineHeight: 18,
                  includeFontPadding: false,
                },
              ]}
              numberOfLines={3}
            >
              {toast.message}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
