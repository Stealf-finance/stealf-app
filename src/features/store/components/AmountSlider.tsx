import { useEffect } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { indexFromPosition, positionForIndex } from '../lib/slider';

const S = txPalette('silver');

const THUMB = 26;
const TRACK_H = 4;
const SPRING = { damping: 18, stiffness: 260 };

/** Snaps to the product's denominations — no free values between them. */
export function AmountSlider({
  count,
  index,
  onChange,
}: {
  count: number;
  index: number;
  onChange: (index: number) => void;
}) {
  const travel = useSharedValue(0);
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const active = useSharedValue(0);

  // Keeps the thumb in step when the steppers or a re-render move the index.
  useEffect(() => {
    x.set(withSpring(positionForIndex(index, travel.get(), count), SPRING));
  }, [index, count, x, travel]);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width - THUMB;
    travel.set(Math.max(0, width));
    x.set(positionForIndex(index, Math.max(0, width), count));
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      start.set(x.get());
      active.set(withSpring(1, SPRING));
    })
    .onUpdate((e) => {
      const next = Math.min(
        travel.get(),
        Math.max(0, start.get() + e.translationX),
      );
      x.set(next);
    })
    .onEnd(() => {
      const snapped = indexFromPosition(x.get(), travel.get(), count);
      x.set(withSpring(positionForIndex(snapped, travel.get(), count), SPRING));
      scheduleOnRN(onChange, snapped);
    })
    .onFinalize(() => {
      active.set(withSpring(0, SPRING));
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scale: 1 + active.get() * 0.12 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: x.get() + THUMB / 2,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        style={{ height: THUMB, justifyContent: 'center' }}
      >
        <View
          style={{
            position: 'absolute',
            left: THUMB / 2,
            right: THUMB / 2,
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            backgroundColor: T.hairlineStrong,
          }}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              height: TRACK_H,
              borderRadius: TRACK_H / 2,
              backgroundColor: S.accent,
            },
            fillStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: S.ink,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
