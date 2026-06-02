import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

const PRESETS = [
  { label: '25%', pct: 0.25 },
  { label: '50%', pct: 0.5 },
  { label: '75%', pct: 0.75 },
  { label: 'MAX', pct: 1 },
];

type Props = {
  onPressPercent: (pct: number) => void;
  disabled?: boolean;
};

export function PercentageChips({ onPressPercent, disabled = false }: Props) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {PRESETS.map(({ label, pct }) => (
          <Pressable
            key={label}
            onPress={() => onPressPercent(pct)}
            accessibilityRole="button"
            accessibilityLabel={`Set amount to ${label} of balance`}
            disabled={disabled}
            style={({ pressed }) => ({
              opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.06)',
                  'rgba(255,255,255,0.015)',
                ]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{
                  paddingVertical: 11,
                  paddingHorizontal: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    sansationBold,
                    {
                      fontSize: 11,
                      letterSpacing: 1,
                      color: T.ink,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {label}
                </Text>
              </LinearGradient>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
