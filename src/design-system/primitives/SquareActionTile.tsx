import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Tone } from '@/src/design-system/palettes';

type Props = {
  iconKey: keyof typeof Icons;
  label: string;
  accent?: boolean;
  accentTone?: Tone;
  iconColor?: string;
  onPress?: () => void;
};

export function SquareActionTile({
  iconKey,
  label,
  accent = false,
  accentTone = 'silver',
  iconColor: iconColorOverride,
  onPress,
}: Props) {
  const accentColors: [string, string] =
    accentTone === 'gold' ? ['#e6c079', '#a37b2e'] : ['#e8e8ea', '#9a9a9f'];
  const darkColors: [string, string] = [
    'rgba(22,22,24,0.95)',
    'rgba(10,10,12,0.98)',
  ];
  const colors = accent ? accentColors : darkColors;
  const iconColor = iconColorOverride ?? (accent ? '#0a0a0a' : '#e8e8ea');
  const labelColor = accent ? '#1a1a1a' : '#e8e8ea';
  const Icon = Icons[iconKey];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 76,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: accent ? 0 : 1,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={[
              accent ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.04)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <Icon size={22} color={iconColor} />
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              fontWeight: '500',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: labelColor,
            },
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
