import { LayoutChangeEvent, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  onSend: () => void;
  tone?: Tone;
  label?: string;
  /** Blocks the gesture and dims the track. Use when the amount is 0/invalid. */
  disabled?: boolean;
};

const THUMB = 48;
const TRACK_PAD = 5;
// Below this fraction the gesture cancels back to start. Lowered from 0.85
// because users were struggling to "complete" the swipe — most of the way
// is enough commitment to fire.
const RELEASE_THRESHOLD = 0.78;

// Spring tuned to feel like Apple Pay's slide-to-pay: light damping for
// responsive bounce-back, stiffness around 200 for natural pace. The
// snap-to-end uses a stiffer spring so the thumb arrives confidently.
const SPRING_BACK = { damping: 18, stiffness: 200, mass: 0.7 } as const;
const SPRING_SNAP = { damping: 22, stiffness: 380, mass: 0.6 } as const;

// Success flash: arrow → check on the thumb after the snap, hold briefly
// before handing off to the caller. Total dwell is ~360ms (220 cross-fade
// + 140 hold) — long enough to feel rewarding, short enough not to delay.
const SUCCESS_FADE_MS = 220;
const SUCCESS_HOLD_MS = 140;

export function SwipeToSend({
  onSend,
  tone = 'silver',
  label = 'Swipe to send',
  disabled = false,
}: Props) {
  const palette = txPalette(tone);
  // Shared values (not refs) so worklets read consistent UI-thread values.
  const trackW = useSharedValue(0);
  const x = useSharedValue(0);
  const successProgress = useSharedValue(0);

  const thumbColors: [string, string] =
    tone === 'gold' ? ['#e6c079', '#a37b2e'] : ['#e8e8ea', '#9a9a9f'];

  const onLayout = (e: LayoutChangeEvent) => {
    trackW.value = e.nativeEvent.layout.width;
  };

  const fireOnSend = () => {
    onSend();
  };

  // Pan over the FULL track surface (not just the thumb): users can grab
  // anywhere along the strip and the thumb follows. failOffsetY hands the
  // gesture back to the modal-sheet pull-down if the user moves vertically.
  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      'worklet';
      const max = trackW.value - THUMB - TRACK_PAD * 2;
      if (max <= 0) return;
      // Relative drag: x grows with the gesture's translationX, clamped
      // to the track. Thumb starts at 0 each gesture (release resets it).
      const next = Math.min(Math.max(e.translationX, 0), max);
      x.value = next;
    })
    .onEnd(() => {
      'worklet';
      const max = trackW.value - THUMB - TRACK_PAD * 2;
      if (max <= 0) {
        x.value = withSpring(0, SPRING_BACK);
        return;
      }
      if (x.value >= max * RELEASE_THRESHOLD) {
        x.value = withSpring(max, SPRING_SNAP, (snapped) => {
          'worklet';
          if (!snapped) return;
          // Cross-fade arrow → check, then hold, then hand off to JS.
          successProgress.value = withTiming(
            1,
            { duration: SUCCESS_FADE_MS },
            (faded) => {
              'worklet';
              if (!faded) return;
              successProgress.value = withTiming(
                1,
                { duration: SUCCESS_HOLD_MS },
                (held) => {
                  'worklet';
                  if (held) runOnJS(fireOnSend)();
                },
              );
            },
          );
        });
      } else {
        x.value = withSpring(0, SPRING_BACK);
      }
    })
    .onFinalize(() => {
      'worklet';
      // Belt-and-suspenders: if the gesture is interrupted by a system
      // gesture (e.g. modal dismiss), reset rather than leave the thumb
      // floating mid-track.
      const max = trackW.value - THUMB - TRACK_PAD * 2;
      if (
        max > 0 &&
        x.value > 0 &&
        x.value < max * RELEASE_THRESHOLD &&
        successProgress.value === 0
      ) {
        x.value = withSpring(0, SPRING_BACK);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scale: 1 + successProgress.value * 0.06 },
    ],
  }));

  // Progress fill: a tinted layer that grows from the left with the thumb,
  // so the gesture has visible weight (Apple Pay / Revolut style). The
  // width follows the thumb edge with a small lead so the fill peeks out.
  const fillStyle = useAnimatedStyle(() => {
    const max = Math.max(trackW.value - THUMB - TRACK_PAD * 2, 1);
    const progress = x.value / max;
    return {
      width: x.value + THUMB + TRACK_PAD * 2,
      opacity: 0.18 + progress * 0.42, // 0.18 → 0.6
    };
  });

  const fadeLabelStyle = useAnimatedStyle(() => {
    const max = Math.max(trackW.value - THUMB - TRACK_PAD * 2, 1);
    return { opacity: 1 - x.value / max };
  });

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: 1 - successProgress.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: successProgress.value,
    transform: [{ scale: 0.7 + successProgress.value * 0.3 }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={onLayout}
        style={{
          height: THUMB + TRACK_PAD * 2,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: palette.hairline,
          overflow: 'hidden',
          padding: TRACK_PAD,
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {/* Progress fill — sits behind the thumb and grows with x */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              borderRadius: 100,
              overflow: 'hidden',
            },
            fillStyle,
          ]}
        >
          <LinearGradient
            colors={[palette.accentSoft, palette.accentDim]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Label — fades out as thumb advances */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
            fadeLabelStyle,
          ]}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.8,
                textTransform: 'uppercase',
                color: palette.inkDim,
                fontWeight: '700',
              },
            ]}
          >
            {label}
          </Text>
        </Animated.View>

        {/* Thumb — pure visual; the parent View captures the gesture */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              overflow: 'hidden',
              shadowColor: palette.accentGlow,
              shadowOpacity: 1,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            },
            thumbStyle,
          ]}
        >
          <LinearGradient
            colors={thumbColors}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                arrowStyle,
              ]}
            >
              <Icons.arrRight size={20} color="#0a0a0a" />
            </Animated.View>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                checkStyle,
              ]}
            >
              <Icons.check size={22} color="#0a0a0a" strokeWidth={2.6} />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
