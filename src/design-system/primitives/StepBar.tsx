import { View } from 'react-native';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  current: number;
  total?: number;
  tone?: Tone;
};

export function StepBar({ current, total = 4, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i <= current;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: filled ? palette.accent : 'rgba(255,255,255,0.08)',
              shadowColor: filled ? palette.accentGlow : 'transparent',
              shadowOpacity: filled ? 1 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        );
      })}
    </View>
  );
}
