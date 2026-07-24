import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

/**
 * Shared bottom-sheet shell: a dimmed / blurred backdrop (tap to close), an
 * opaque slide-up panel (#0d0d0d — the Home cards' 5% veil over black, top
 * corners only), and a close "X". Content goes in `children`.
 *
 * Render it inside a `transparentModal` route and pass `onClose` = router.back.
 * The single source of truth for the app's bottom sheets — ChoiceSheet (send /
 * receive hubs) and the product About sheet both build on it.
 */
export function SheetShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* Blurred / dimmed backdrop — tap to close */}
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.5)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}
      >
        <View
          style={{
            backgroundColor: '#0d0d0d',
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 1 }}
          >
            <Icons.close size={22} color={T.inkFaint} />
          </Pressable>

          {children}
        </View>
      </Animated.View>
    </View>
  );
}
