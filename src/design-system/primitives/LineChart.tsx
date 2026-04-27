import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { T } from '@/src/design-system/tokens';

const DEFAULT_POINTS = [
  0.38, 0.41, 0.39, 0.45, 0.43, 0.49, 0.52, 0.5, 0.56, 0.58, 0.56, 0.62, 0.64,
  0.62, 0.68, 0.66, 0.71, 0.74, 0.72, 0.77, 0.79, 0.76, 0.83, 0.81, 0.87, 0.89,
  0.86, 0.92, 0.95,
];

type Props = {
  width: number;
  height?: number;
  color?: string;
  glow?: string;
  points?: number[];
};

export function LineChart({
  width,
  height = 160,
  color = T.gold,
  glow = T.goldGlow,
  points = DEFAULT_POINTS,
}: Props) {
  const stepX = width / (points.length - 1);
  const toY = (v: number) => height - 14 - v * (height - 30);
  const lineD = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(2)},${toY(p).toFixed(2)}`,
    )
    .join(' ');
  const areaD = `${lineD} L${width},${height} L0,${height} Z`;
  const endY = toY(points[points.length - 1]);
  const gradId = 'line-chart-fill';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaD} fill={`url(#${gradId})`} />
      {/* glow halo: thicker, lower-opacity stroke under the main line */}
      <Path
        d={lineD}
        fill="none"
        stroke={glow}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <Path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* end-of-line dot with halo */}
      <Circle cx={width - 2} cy={endY} r={7} fill={color} opacity={0.18} />
      <Circle cx={width - 2} cy={endY} r={6} fill={glow} opacity={0.6} />
      <Circle cx={width - 2} cy={endY} r={3.5} fill={color} />
    </Svg>
  );
}
