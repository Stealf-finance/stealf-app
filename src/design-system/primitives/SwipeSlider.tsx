import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  /** Shared 0..n-1 position from a SwipePager. */
  progress: SharedValue<number>;
  pageWidth: number;
  pages: ReactNode[];
};

/**
 * A clipped row of full-width pages translated horizontally by `progress`.
 * Multiple sliders sharing one SwipePager `progress` move in lockstep — that's
 * how the balance cards and the action tiles slide together.
 */
export function SwipeSlider({ progress, pageWidth, pages }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * pageWidth }],
  }));
  return (
    <View style={{ width: pageWidth, overflow: 'hidden' }}>
      <Animated.View
        style={[{ flexDirection: 'row', width: pageWidth * pages.length }, style]}
      >
        {pages.map((p, i) => (
          <View key={i} style={{ width: pageWidth }}>
            {p}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
