import { ReactNode, useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { resolveSwipeTarget } from './swipePagerLogic';

const SCREEN_W = Dimensions.get('window').width;
const SNAP = { duration: 320 } as const;

/** Default horizontal inset; page width = screen width - 2*inset. Exported so
 *  sibling sliders (driven by the same progress) can match the page width. */
export const SWIPE_PAGE_INSET = 24;

type Props = {
  /** Number of pages. */
  count: number;
  /** Controlled active page index. */
  index: number;
  onIndexChange: (next: number) => void;
  /** Horizontal inset; page width = screen width - 2*inset. */
  inset?: number;
  /**
   * Optional external progress shared value to drive screen-level effects
   * (e.g. a background halo) from the same swipe. When omitted, an internal
   * one is created.
   */
  progress?: SharedValue<number>;
  /**
   * Renders the swipe zone. The whole returned tree is inside the Pan gesture,
   * so multiple `SwipeSlider`s driven by the same `progress` slide in lockstep.
   */
  children: (progress: SharedValue<number>, pageWidth: number) => ReactNode;
};

/**
 * Horizontal pan carousel controller: owns the gesture + an animated
 * `progress` (0..count-1) and the snapping logic, but renders no pages itself —
 * the consumer composes `SwipeSlider`s with the exposed `progress`/`pageWidth`.
 */
export function SwipePager({
  count,
  index,
  onIndexChange,
  inset = SWIPE_PAGE_INSET,
  progress: externalProgress,
  children,
}: Props) {
  const pageWidth = SCREEN_W - inset * 2;
  const internalProgress = useSharedValue(index);
  const progress = externalProgress ?? internalProgress;
  const startX = useSharedValue(index);

  // Settle progress whenever the controlled index changes (dot tap, swipe commit).
  useEffect(() => {
    progress.value = withTiming(index, SNAP);
  }, [index, progress]);

  // JS thread: pure-fn target resolution + controlled state update.
  const onPanEnd = (translationX: number, velocityX: number) => {
    const target = resolveSwipeTarget({ index, translationX, velocityX, count, pageWidth });
    if (target === index) {
      progress.value = withTiming(index, SNAP);
    } else {
      onIndexChange(target);
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

  return (
    <GestureDetector gesture={pan}>
      <View>{children(progress, pageWidth)}</View>
    </GestureDetector>
  );
}
