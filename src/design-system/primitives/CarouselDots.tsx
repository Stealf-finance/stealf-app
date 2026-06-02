import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';

type Props = {
  count: number;
  /** Animated 0..count-1 position from SwipePager. */
  progress: SharedValue<number>;
  activeColor?: string;
  onSelect?: (i: number) => void;
};

function Dot({
  i,
  progress,
  activeColor,
  onSelect,
}: {
  i: number;
  progress: SharedValue<number>;
  activeColor: string;
  onSelect?: (i: number) => void;
}) {
  const style = useAnimatedStyle(() => {
    // 1 when progress is on this dot, →0 one page away.
    const active = Math.max(0, 1 - Math.abs(progress.value - i));
    return {
      width: interpolate(active, [0, 1], [6, 20]),
      backgroundColor: interpolateColor(active, [0, 1], ['rgba(255,255,255,0.20)', activeColor]),
    };
  });
  return (
    <Pressable hitSlop={8} onPress={() => onSelect?.(i)}>
      <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />
    </Pressable>
  );
}

export function CarouselDots({ count, progress, activeColor = T.ink, onSelect }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} progress={progress} activeColor={activeColor} onSelect={onSelect} />
      ))}
    </View>
  );
}
