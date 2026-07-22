import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone } from '@/src/design-system/palettes';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  tone?: Tone;
  rightIcon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const PRIMARY_GRADIENT: Record<Tone, [string, string]> = {
  silver: ['#e8e8ea', '#9a9a9f'],
  gold: ['#e6c079', '#a37b2e'],
};

const PRIMARY_GLOW: Record<Tone, string> = {
  silver: 'rgba(220,220,225,0.35)',
  gold: 'rgba(212,165,83,0.45)',
};

export function PillBtn({
  label,
  onPress,
  variant = 'primary',
  tone = 'silver',
  rightIcon,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          {
            borderRadius: 100,
            overflow: 'hidden',
            shadowColor: tone === 'gold' ? '#000' : '#000',
            shadowOpacity: disabled ? 0 : 0.5,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 10 },
            elevation: disabled ? 0 : 12,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <LinearGradient
          colors={PRIMARY_GRADIENT[tone]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={{
            paddingVertical: 20,
            paddingHorizontal: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Text
            style={[
              sansationBold,
              {
                fontSize: 11,
                letterSpacing: 2.64,
                textTransform: 'uppercase',
                color: '#0a0a0a',
              },
            ]}
          >
            {label}
          </Text>
          {rightIcon && <View>{rightIcon}</View>}
        </LinearGradient>
        {!disabled && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              shadowColor: PRIMARY_GLOW[tone],
              shadowOpacity: 1,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          paddingVertical: 20,
          paddingHorizontal: 22,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.035)',
          borderWidth: 1,
          borderColor: T.hairline,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          sansationBold,
          {
            fontSize: 11,
            letterSpacing: 2.64,
            textTransform: 'uppercase',
            color: T.ink,
          },
        ]}
      >
        {label}
      </Text>
      {rightIcon && <View>{rightIcon}</View>}
    </Pressable>
  );
}
