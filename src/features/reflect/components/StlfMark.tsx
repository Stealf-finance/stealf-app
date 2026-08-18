import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

type Props = { size?: number };

/** Brand mark for STLF — a silver coin echoing the JitoSOL mark's treatment. */
export function StlfMark({ size = 44 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="stlf-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#e8e8ea" />
          <Stop offset="0.55" stopColor="#c9c9cc" />
          <Stop offset="1" stopColor="#6a6a70" />
        </LinearGradient>
        <LinearGradient id="stlf-sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="0.6" stopColor="rgba(255,255,255,0)" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={24}
        cy={24}
        r={22}
        fill="url(#stlf-body)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={0.5}
      />
      <Circle cx={24} cy={18} r={18} fill="url(#stlf-sheen)" />
      <SvgText
        x={24}
        y={30}
        fill="#0a0a0a"
        fontSize={16}
        fontWeight="700"
        textAnchor="middle"
      >
        $
      </SvgText>
    </Svg>
  );
}
