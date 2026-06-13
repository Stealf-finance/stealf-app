import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { T } from '@/src/design-system/tokens';
import { txPalette } from '@/src/design-system/palettes';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';

import {
  formatPillText,
  phaseLabel,
  useTopPendingOp,
  usePendingOps,
} from './PendingOpsContext';
import type { PendingOp } from './types';

const PILL_HEIGHT = 44;
const HORIZONTAL_PAD = 16;
const MAX_WIDTH = 280;

export function PendingOpsPill() {
  const op = useTopPendingOp();
  const { dismiss } = usePendingOps();
  const insets = useSafeAreaInsets();
  // On the Home and Pay tabs the pending status is surfaced inside the
  // header (in place of the greeting), so the floating pill is suppressed.
  const pathname = usePathname();
  const onHome = pathname === '/bank' || pathname === '/stealth';

  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(op ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [op, enter]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * -28 },
      { scale: 0.96 + enter.value * 0.04 },
    ],
  }));

  if (onHome) return null;

  if (!op) {
    // Keep mounted-but-empty so the animation can run on the next op without
    // a layout flicker.
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: insets.top + 8,
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PAD,
          },
          containerStyle,
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          top: insets.top + 8,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PAD,
          zIndex: 50,
        },
        containerStyle,
      ]}
      accessibilityLiveRegion="polite"
    >
      <PillBody op={op} onDismiss={() => dismiss(op.id)} />
    </Animated.View>
  );
}

const SPINNER_SIZE = 14;
const SPINNER_STROKE = 2;
const SPINNER_RADIUS = (SPINNER_SIZE - SPINNER_STROKE) / 2;
const SPINNER_CIRC = 2 * Math.PI * SPINNER_RADIUS;

export function Spinner({ color }: { color: string }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 950, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(rot);
  }, [rot]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        { width: SPINNER_SIZE, height: SPINNER_SIZE },
        style,
      ]}
    >
      <Svg
        width={SPINNER_SIZE}
        height={SPINNER_SIZE}
        viewBox={`0 0 ${SPINNER_SIZE} ${SPINNER_SIZE}`}
      >
        {/* Faint full track for visual weight, like Loader2's bg layer. */}
        <Circle
          cx={SPINNER_SIZE / 2}
          cy={SPINNER_SIZE / 2}
          r={SPINNER_RADIUS}
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={SPINNER_STROKE}
          fill="none"
        />
        {/* Bright arc covering ~70% of the circle so the rotation is legible. */}
        <Circle
          cx={SPINNER_SIZE / 2}
          cy={SPINNER_SIZE / 2}
          r={SPINNER_RADIUS}
          stroke={color}
          strokeWidth={SPINNER_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${SPINNER_CIRC * 0.7} ${SPINNER_CIRC}`}
        />
      </Svg>
    </Animated.View>
  );
}

function PillBody({ op, onDismiss }: { op: PendingOp; onDismiss: () => void }) {
  const palette = txPalette(op.tone);
  const isDone = op.phase === 'done';
  const isFailed = op.phase === 'failed';

  const accent = isFailed ? T.error : isDone ? T.green : palette.accent;
  const tappable = isFailed || isDone;
  const text = formatPillText(op);

  return (
    <Pressable
      onPress={tappable ? onDismiss : undefined}
      accessibilityRole={tappable ? 'button' : undefined}
      accessibilityLabel={
        isFailed
          ? `${text}${op.errorMessage ? `: ${op.errorMessage}` : ''}. Tap to dismiss.`
          : isDone
            ? `${text}. Tap to dismiss.`
            : `${text}. ${phaseLabel(op.phase)}`
      }
      style={{
        // Auto-sized to content; capped at MAX_WIDTH so the longest possible
        // label still respects the modal-sheet vibe.
        alignSelf: 'center',
        maxWidth: MAX_WIDTH,
        height: PILL_HEIGHT,
        borderRadius: PILL_HEIGHT / 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isFailed
          ? 'rgba(209,96,74,0.35)'
          : isDone
            ? 'rgba(126,166,136,0.32)'
            : palette.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <LinearGradient
        colors={['rgba(20,20,22,0.96)', 'rgba(12,12,14,0.96)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: tappable ? 8 : 14,
          gap: 10,
        }}
      >
        {/* Status indicator: rotating spinner while in-flight, icon for terminal states */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: isFailed
              ? 'rgba(209,96,74,0.16)'
              : isDone
                ? 'rgba(126,166,136,0.16)'
                : palette.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDone ? (
            <Icons.check size={12} color={accent} />
          ) : isFailed ? (
            <Icons.close size={11} color={accent} />
          ) : (
            <Spinner color={accent} />
          )}
        </View>

        {/* Single-line label, derived from kind+phase so it never overflows */}
        <Text
          style={[
            sansation,
            {
              fontSize: 12,
              color: T.ink,
              fontWeight: '600',
              includeFontPadding: false,
              flexShrink: 1,
            },
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>

        {tappable ? (
          <View
            style={{
              width: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 2,
            }}
          >
            <Icons.close size={11} color={palette.inkDim} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
