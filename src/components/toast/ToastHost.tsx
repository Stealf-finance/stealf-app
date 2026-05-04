import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { T } from '@/src/design-system/tokens';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationBold } from '@/src/design-system/typography';

import { useToast, useTopToast } from './ToastContext';
import type { Toast, ToastKind } from './ToastContext';

const HORIZONTAL_PAD = 16;
const MAX_WIDTH = 340;
// Sits below the PendingOpsPill (top + 8 + 44 height) so a concurrent
// transaction pill doesn't overlap with a wallet-management toast.
const TOP_OFFSET = 60;

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

function borderFor(kind: ToastKind): string {
  switch (kind) {
    case 'error':
      return 'rgba(209,96,74,0.35)';
    case 'success':
      return 'rgba(126,166,136,0.32)';
    case 'info':
      return 'rgba(201,168,106,0.32)';
  }
}

function badgeFor(kind: ToastKind): string {
  switch (kind) {
    case 'error':
      return 'rgba(209,96,74,0.16)';
    case 'success':
      return 'rgba(126,166,136,0.16)';
    case 'info':
      return 'rgba(201,168,106,0.16)';
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
  const border = borderFor(toast.kind);
  const badge = badgeFor(toast.kind);

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
        maxWidth: MAX_WIDTH,
        minHeight: 52,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: border,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <LinearGradient
        colors={['rgba(20,20,22,0.96)', 'rgba(12,12,14,0.96)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: 12,
          paddingLeft: 12,
          paddingRight: 14,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: badge,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          <Icon size={12} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              sansationBold,
              {
                fontSize: 13,
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
                  marginTop: 2,
                  fontSize: 12,
                  color: T.inkDim,
                  lineHeight: 16,
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
