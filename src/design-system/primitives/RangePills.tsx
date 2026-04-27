import { Pressable, Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  tone?: Tone;
};

export function RangePills<T extends string>({
  value,
  options,
  onChange,
  tone = 'silver',
}: Props<T>) {
  const palette = txPalette(tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 24,
        paddingVertical: 14,
      }}
    >
      {options.map((r) => {
        const active = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            accessibilityRole="button"
            accessibilityLabel={r}
            accessibilityState={{ selected: active }}
            hitSlop={6}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              minWidth: 48,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 2.2,
                  fontWeight: active ? '700' : '500',
                  color: active ? palette.ink : palette.inkFaint,
                  textTransform: 'uppercase',
                },
              ]}
            >
              {r}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
