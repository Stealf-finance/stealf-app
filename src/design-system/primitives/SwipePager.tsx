import { ReactNode, useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { resolveSwipeTarget } from './swipePagerLogic';

const SCREEN_W = Dimensions.get('window').width;
const SNAP = { duration: 320 } as const;

type Props = {
  /** One node per page. */
  pages: ReactNode[];
  /** Horizontal inset the pager sits inside; page width = screen width - 2*inset. */
  inset?: number;
  /** Controlled active page index. */
  index: number;
  onIndexChange: (next: number) => void;
  /** Render-prop exposing the animated 0..count-1 position (for dots / halo cross-fade). */
  children?: (progress: SharedValue<number>) => ReactNode;
};

export function SwipePager({ pages, inset = 24, index, onIndexChange, children }: Props) {
  const pageWidth = SCREEN_W - inset * 2;
  const count = pages.length;
  const progress = useSharedValue(index);
  const startX = useSharedValue(index);

  // Settle progress whenever the controlled index changes (dot tap, swipe commit).
  useEffect(() => {
    progress.value = withTiming(index, SNAP);
  }, [index, progress]);

  // Runs on the JS thread: pure-fn target resolution + controlled state update.
  const onPanEnd = (translationX: number, velocityX: number) => {
    const target = resolveSwipeTarget({ index, translationX, velocityX, count, pageWidth });
    if (target === index) {
      // No page change → snap back here (the index useEffect won't fire).
      progress.value = withTiming(index, SNAP);
    } else {
      onIndexChange(target); // the index useEffect animates progress to the new page
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      startX.value = progress.value;
    })
    .onUpdate((e) => {
      progress.value = startX.value - e.translationX / pageWidth;
    })
    .onEnd((e) => {
      runOnJS(onPanEnd)(e.translationX, e.velocityX);
    });

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * pageWidth }],
  }));

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={{ width: pageWidth, overflow: 'hidden', alignSelf: 'center' }}>
          <Animated.View style={[{ flexDirection: 'row', width: pageWidth * count }, sliderStyle]}>
            {pages.map((p, i) => (
              <View key={i} style={{ width: pageWidth }}>
                {p}
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
      {children?.(progress)}
    </View>
  );
}
