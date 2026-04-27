import Animated, {
  SharedValue,
  interpolate,
  interpolateColor,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Shared value driving mode interpolation. 0 = publicMode endpoints, 1 = privateMode endpoints. */
  modeProgress: SharedValue<number>;
  publicValue: number;
  privateValue: number;
  publicColor: string;
  privateColor: string;
  publicGlow: string;
  privateGlow: string;
  size?: number;
  thickness?: number;
};

export function PrivacyGauge({
  modeProgress,
  publicValue,
  privateValue,
  publicColor,
  privateColor,
  publicGlow,
  privateGlow,
  size = 210,
  thickness = 5,
}: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const arcProps = useAnimatedProps(() => {
    const v = interpolate(
      modeProgress.value,
      [0, 1],
      [publicValue, privateValue],
    );
    return {
      strokeDasharray: `${c * v} ${c}`,
      stroke: interpolateColor(
        modeProgress.value,
        [0, 1],
        [publicColor, privateColor],
      ),
    };
  });

  const glowProps = useAnimatedProps(() => {
    const v = interpolate(
      modeProgress.value,
      [0, 1],
      [publicValue, privateValue],
    );
    return {
      strokeDasharray: `${c * v} ${c}`,
      stroke: interpolateColor(
        modeProgress.value,
        [0, 1],
        [publicGlow, privateGlow],
      ),
    };
  });

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={thickness}
        fill="none"
      />
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const r1 = r + thickness / 2 + 4;
        const r2 = r1 + (i % 5 === 0 ? 6 : 3);
        return (
          <Line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cy + Math.sin(a) * r2}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={i % 5 === 0 ? 1 : 0.5}
          />
        );
      })}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={thickness + 6}
        fill="none"
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.55}
        animatedProps={glowProps}
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        animatedProps={arcProps}
      />
    </Svg>
  );
}
