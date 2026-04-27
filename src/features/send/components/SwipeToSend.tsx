import { useRef } from 'react';
import { LayoutChangeEvent, PanResponder, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  onSend: () => void;
  tone?: Tone;
  label?: string;
};

const THUMB = 54;
const TRACK_PAD = 5;

export function SwipeToSend({ onSend, tone = 'silver', label = 'Swipe to send' }: Props) {
  const palette = txPalette(tone);
  const trackWidth = useRef(0);
  const x = useSharedValue(0);

  const thumbColors: [string, string] =
    tone === 'gold'
      ? ['#e6c079', '#a37b2e']
      : ['#e8e8ea', '#9a9a9f'];

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  const fadeLabelStyle = useAnimatedStyle(() => {
    const max = Math.max(trackWidth.current - THUMB - TRACK_PAD * 2, 1);
    return { opacity: 1 - x.value / max };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const max = Math.max(trackWidth.current - THUMB - TRACK_PAD * 2, 0);
      const next = Math.min(Math.max(g.dx, 0), max);
      x.value = next;
    },
    onPanResponderRelease: (_, g) => {
      const max = Math.max(trackWidth.current - THUMB - TRACK_PAD * 2, 0);
      if (g.dx >= max * 0.85) {
        x.value = withTiming(max, { duration: 140 }, (done) => {
          if (done) runOnJS(onSend)();
        });
      } else {
        x.value = withTiming(0, { duration: 220 });
      }
    },
    onPanResponderTerminate: () => {
      x.value = withTiming(0, { duration: 220 });
    },
  });

  return (
    <View
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
      }}
    >
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
      <Animated.View
        {...panResponder.panHandlers}
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
          <Icons.arrRight size={20} color="#0a0a0a" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
