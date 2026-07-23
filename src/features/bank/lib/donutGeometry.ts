export type DonutSegment = { key: string; value: number };

export type DonutArc = {
  key: string;
  /** Degrees, -90 = 12 o'clock, clockwise. */
  startAngle: number;
  endAngle: number;
  /** SVG path for the arc's centerline — stroke it with the ring thickness.
   *  Empty string when `full` (render a <Circle> instead: a 360° `A` arc
   *  collapses to nothing). */
  d: string;
  /** Share of the non-zero total (0..1); 0 for empty-state quarters. */
  pct: number;
  /** Single non-zero segment — the ring is a full circle. */
  full?: boolean;
  /** All-zero placeholder quarter (greyed empty state). */
  empty?: boolean;
};

type Options = {
  /** Ring centerline radius, in SVG units. */
  radius?: number;
  /** Gap between adjacent segments, in degrees. */
  gapDegrees?: number;
};

const START = -90; // 12 o'clock
const MIN_SWEEP = 0.5; // keep slivers visible

const toRad = (deg: number) => (deg * Math.PI) / 180;

const point = (radius: number, angle: number) => ({
  x: radius * Math.cos(toRad(angle)),
  y: radius * Math.sin(toRad(angle)),
});

/** Arc centerline path around (0,0) — translate via the parent <G>. */
const arcPath = (radius: number, start: number, end: number): string => {
  const from = point(radius, start);
  const to = point(radius, end);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`;
};

/** Pure donut layout: values → proportional arcs, clockwise from 12 o'clock.
 *  Zero segments are dropped; one survivor → full ring; all-zero → equal
 *  greyed quarters so the empty state still reads as a chart. */
export function donutArcs(
  segments: DonutSegment[],
  { radius = 80, gapDegrees = 2.5 }: Options = {},
): DonutArc[] {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  // Empty state: equal quarters over the original keys.
  if (total <= 0) {
    const sweep = 360 / segments.length - gapDegrees;
    return segments.map((s, i) => {
      const start = START + i * (sweep + gapDegrees);
      return {
        key: s.key,
        startAngle: start,
        endAngle: start + sweep,
        d: arcPath(radius, start, start + sweep),
        pct: 0,
        empty: true,
      };
    });
  }

  const live = segments.filter((s) => s.value > 0);

  if (live.length === 1) {
    return [
      {
        key: live[0].key,
        startAngle: START,
        endAngle: START + 360,
        d: '',
        pct: 1,
        full: true,
      },
    ];
  }

  const usable = 360 - live.length * gapDegrees;
  let cursor = START;
  return live.map((s) => {
    const sweep = Math.max(MIN_SWEEP, usable * (s.value / total));
    const arc: DonutArc = {
      key: s.key,
      startAngle: cursor,
      endAngle: cursor + sweep,
      d: arcPath(radius, cursor, cursor + sweep),
      pct: s.value / total,
    };
    cursor += sweep + gapDegrees;
    return arc;
  });
}
