import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = { size?: number };

export function JitoMark({ size = 48 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="jito-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#e8e8ea" />
          <Stop offset="0.55" stopColor="#c9c9cc" />
          <Stop offset="1" stopColor="#6a6a70" />
        </LinearGradient>
        <LinearGradient id="jito-sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="0.6" stopColor="rgba(255,255,255,0)" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={24}
        cy={24}
        r={22}
        fill="url(#jito-body)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={0.5}
      />
      <Circle cx={24} cy={18} r={18} fill="url(#jito-sheen)" />
      <Path
        d="M15 20 Q20 15 24 18 Q28 21 33 16 M15 26 Q20 21 24 24 Q28 27 33 22 M15 32 Q20 27 24 30 Q28 33 33 28"
        stroke="#0a0a0a"
        strokeWidth={1.2}
        fill="none"
        opacity={0.55}
        strokeLinecap="round"
      />
    </Svg>
  );
}
