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
    <View
      style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 }}
    >
      {PRESETS.map(({ label, pct }, idx) => (
        // flex:1 on a static wrapper View so the four chips split the row
        // evenly; horizontal gaps come from padding (not flex `gap`).
        <View
          key={label}
          style={{
            flex: 1,
            paddingLeft: idx === 0 ? 0 : 5,
            paddingRight: idx === PRESETS.length - 1 ? 0 : 5,
          }}
        >
          <Pressable
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
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.015)']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    sansationBold,
                    {
                      fontSize: 13,
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
        </View>
      ))}
    </View>
  );
}
