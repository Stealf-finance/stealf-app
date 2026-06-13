import { Fragment, ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SWIPE_PAGE_GUTTER } from './SwipePager';

type Props = {
  /** Shared 0..n-1 position from a SwipePager. */
  progress: SharedValue<number>;
  pageWidth: number;
  pages: ReactNode[];
};

/**
 * A clipped row of full-width pages separated by a gutter, translated by
 * `progress`. Multiple sliders sharing one SwipePager `progress` move in
 * lockstep — that's how the balance cards, the tiles, and the bottom section
 * slide together, with a visible gap between screens.
 */
export function SwipeSlider({ progress, pageWidth, pages }: Props) {
  const slideDist = pageWidth + SWIPE_PAGE_GUTTER;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * slideDist }],
  }));
  const rowWidth = pageWidth * pages.length + SWIPE_PAGE_GUTTER * Math.max(0, pages.length - 1);
  return (
    <View style={{ width: pageWidth, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row', width: rowWidth }, style]}>
        {pages.map((p, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={{ width: SWIPE_PAGE_GUTTER }} /> : null}
            <View style={{ width: pageWidth }}>{p}</View>
          </Fragment>
        ))}
      </Animated.View>
    </View>
  );
}
