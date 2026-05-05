import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { LoaderDots } from './LoaderDots';

type Variant = 'primary' | 'glass';

type Props = {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  // When true, the button swaps its label/icon for a spinner. Implies
  // disabled — the caller doesn't need to set both.
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Auth provider button (Apple / Google / Email). Two variants:
 *  - `primary`: cream slab (T.ink bg) — used for the recommended provider
 *    on the current platform (Apple on iOS, Google on Android).
 *  - `glass`: subtle semi-transparent slab (T.bgCardStrong) with hairline
 *    border (T.hairlineStrong).
 *
 * Pressable is the event surface; an inner View carries all visuals.
 * That split is deliberate — applying `borderRadius` + `backgroundColor`
 * + `shadow*` directly on a Pressable rendered through a function-style
 * prop occasionally drops the styles on iOS.
 */
export function AuthBtn({
  label,
  icon,
  onPress,
  variant = 'glass',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === 'primary';
  // Primary inverts ink/bg: cream slab with dark text + dark loader dots.
  // Glass keeps cream ink on dark surface so the spinner stays visible.
  const inkColor = isPrimary ? T.bg : T.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, style]}
    >
      <View
        style={{
          // Lock height so swapping icon+label for the spinner doesn't
          // make the button shrink.
          minHeight: 52,
          borderRadius: 100,
          paddingVertical: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: isPrimary ? T.ink : T.bgCardStrong,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: T.hairlineStrong,
          shadowColor: T.shadow,
          shadowOpacity: isPrimary ? 0.4 : 0,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {loading ? (
          <LoaderDots color={inkColor} size={6} gap={5} bounce={5} />
        ) : (
          <>
            <View>{icon}</View>
            <Text
              style={[
                sansation,
                {
                  fontSize: 14,
                  fontWeight: '500',
                  letterSpacing: -0.14,
                  color: inkColor,
                },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
