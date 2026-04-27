import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansationLight } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  onKey: (k: string) => void;
  tone?: Tone;
};

const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function Numpad({ onKey, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ paddingHorizontal: 24, gap: 8 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((k) => (
            <Pressable
              key={k}
              onPress={() => onKey(k)}
              accessibilityRole="button"
              accessibilityLabel={k === '⌫' ? 'Backspace' : k}
              style={{
                flex: 1,
                borderRadius: 14,
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
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                }}
              >
                {k === '⌫' ? (
                  <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.backspace size={22} color={palette.ink} />
                  </View>
                ) : (
                  <Text
                    style={[
                      sansationLight,
                      {
                        fontSize: 26,
                        color: palette.ink,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {k}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
