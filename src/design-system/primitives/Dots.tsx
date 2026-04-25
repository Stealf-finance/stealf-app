import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';

type Props = { count: number; active: number; color?: string };

export function Dots({ count, active, color = T.gold }: Props) {
  return (
    <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: i === active ? color : T.inkMute,
          }}
        />
      ))}
    </View>
  );
}
