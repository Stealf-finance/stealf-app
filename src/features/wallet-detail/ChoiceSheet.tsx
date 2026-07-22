import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export type ChoiceOption = {
  key: string;
  /** Leading icon node (e.g. a colored disc). */
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Bottom-sheet chooser: an accent icon, title + subtitle, and a list of
 * options (icon · title · subtitle · chevron). Presentational — render it in a
 * transparent-modal route and pass `onClose` = router.back.
 */
export function ChoiceSheet({
  accentIcon,
  title,
  subtitle,
  options,
  onClose,
}: {
  accentIcon: ReactNode;
  title: string;
  subtitle: string;
  options: ChoiceOption[];
  onClose: () => void;
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
        style={{
          backgroundColor: T.bgRaised2,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
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
          style={{ position: 'absolute', top: 16, right: 16, padding: 4 }}
        >
          <Icons.close size={22} color={T.inkFaint} />
        </Pressable>

        <View style={{ alignItems: 'center', marginBottom: 12 }}>{accentIcon}</View>

        <Text
          style={[
            sansation,
            { fontSize: 22, fontWeight: '600', color: T.ink, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            sansation,
            {
              fontSize: 15,
              lineHeight: 22,
              color: T.inkDim,
              textAlign: 'center',
              marginTop: 6,
              marginBottom: 20,
            },
          ]}
        >
          {subtitle}
        </Text>

        {options.map((o, i) => (
          <Pressable
            key={o.key}
            onPress={o.disabled ? undefined : o.onPress}
            disabled={o.disabled}
            accessibilityRole="button"
            accessibilityLabel={o.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingVertical: 16,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: T.hairline,
              opacity: o.disabled ? 0.4 : 1,
            }}
          >
            {o.icon}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[sansation, { fontSize: 17, fontWeight: '600', color: T.ink }]}>
                {o.title}
              </Text>
              <Text style={[sansation, { fontSize: 14, color: T.inkDim, marginTop: 2 }]}>
                {o.subtitle}
              </Text>
            </View>
            <Icons.chevR size={18} color={T.inkFaint} />
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}
