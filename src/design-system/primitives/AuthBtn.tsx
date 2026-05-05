import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Variant = 'primary' | 'glass';

type Props = {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const PRIMARY_BG = '#f1ece1';
const PRIMARY_INK = '#0a0a0a';

/**
 * Auth provider button (Apple / Google / Email). Two variants:
 *  - `primary`: cream slab — used for the recommended provider.
 *  - `glass`: subtle semi-transparent slab with hairline border.
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
  style,
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }, style]}
    >
      <View
        style={{
          borderRadius: 100,
          paddingVertical: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: isPrimary ? PRIMARY_BG : 'rgba(255,255,255,0.06)',
          borderWidth: isPrimary ? 0 : 1,
          borderColor: 'rgba(255,255,255,0.14)',
          shadowColor: '#000',
          shadowOpacity: isPrimary ? 0.4 : 0,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View>{icon}</View>
        <Text
          style={[
            sansation,
            {
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: -0.14,
              color: isPrimary ? PRIMARY_INK : T.ink,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
