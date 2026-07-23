import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

const HEIGHT = 120;

// Hardcoded step curve (design placeholder until balance history is wired).
// ViewBox is 100×40, scaled full-bleed. Plateaus rise left → right through
// smooth S-shaped transitions (cubic béziers), dashed continuation at the
// end, per the reference.
const LINE =
  'M 0 32 L 25 32 ' +
  'C 29.5 32 29.5 22 34 22 L 59 22 ' +
  'C 62.5 22 62.5 18 66 18 L 75 18 ' +
  'C 79.5 18 79.5 8 84 8 L 92 8';
const FILL = `${LINE} L 92 40 L 0 40 Z`;
const TAIL = 'M 92 8 L 100 8';

/** Full-bleed hardcoded balance curve under the Home total. Line wears the
 *  FAB silver gradient (#e8e8ea → #9a9a9f); soft fill fades to the black bg. */
export function HomeSparkline() {
  const { width } = useWindowDimensions();
  return (
    <View style={{ height: HEIGHT, marginTop: 0, marginBottom: 16 }}>
      <Svg
        width={width}
        height={HEIGHT}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <Defs>
          {/* FAB silver, along the line */}
          <LinearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#9a9a9f" />
            <Stop offset="1" stopColor="#e8e8ea" />
          </LinearGradient>
          <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e8e8ea" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#e8e8ea" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={FILL} fill="url(#sparkFill)" />
        <Path
          d={LINE}
          stroke="url(#sparkLine)"
          strokeWidth={2.4}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={TAIL}
          stroke="#e8e8ea"
          strokeOpacity={0.35}
          strokeWidth={2}
          strokeDasharray="2 2.5"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </View>
  );
}
