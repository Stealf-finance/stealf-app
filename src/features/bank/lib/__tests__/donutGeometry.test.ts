import { describe, expect, it } from 'vitest';
import { donutArcs, type DonutSegment } from '../donutGeometry';

const seg = (key: string, value: number): DonutSegment => ({ key, value });

const FOUR = [seg('cash', 60), seg('wallet', 30), seg('encrypted', 10), seg('earn', 0)];

describe('donutArcs', () => {
  it('omits zero-value segments from the ring', () => {
    const arcs = donutArcs(FOUR);
    expect(arcs.map((a) => a.key)).toEqual(['cash', 'wallet', 'encrypted']);
    expect(arcs.every((a) => !a.empty)).toBe(true);
  });

  it('splits sweep proportionally to values (gap deducted)', () => {
    const arcs = donutArcs([seg('a', 75), seg('b', 25)], { gapDegrees: 2 });
    const sweep = (a: { startAngle: number; endAngle: number }) =>
      a.endAngle - a.startAngle;
    // 360 - 2 gaps of 2° = 356 usable
    expect(sweep(arcs[0])).toBeCloseTo(356 * 0.75, 5);
    expect(sweep(arcs[1])).toBeCloseTo(356 * 0.25, 5);
  });

  it('starts at the top (-90°) and orders segments as given', () => {
    const arcs = donutArcs([seg('a', 50), seg('b', 50)], { gapDegrees: 0 });
    expect(arcs[0].startAngle).toBeCloseTo(-90, 5);
    expect(arcs[0].endAngle).toBeCloseTo(90, 5);
    expect(arcs[1].startAngle).toBeCloseTo(90, 5);
  });

  it('marks a single non-zero segment as a full ring', () => {
    const arcs = donutArcs([seg('cash', 0), seg('wallet', 42), seg('earn', 0)]);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]).toMatchObject({ key: 'wallet', full: true });
  });

  it('falls back to equal empty quarters when everything is zero', () => {
    const arcs = donutArcs([seg('a', 0), seg('b', 0), seg('c', 0), seg('d', 0)]);
    expect(arcs).toHaveLength(4);
    expect(arcs.every((a) => a.empty)).toBe(true);
    const sweeps = arcs.map((a) => a.endAngle - a.startAngle);
    for (const s of sweeps) expect(s).toBeCloseTo(sweeps[0], 5);
  });

  it('clamps tiny slices to a visible minimum sweep', () => {
    const arcs = donutArcs([seg('big', 9999), seg('tiny', 1)], { gapDegrees: 3 });
    const tiny = arcs.find((a) => a.key === 'tiny')!;
    expect(tiny.endAngle - tiny.startAngle).toBeGreaterThanOrEqual(0.5);
  });

  it('emits an SVG arc path for partial segments', () => {
    const arcs = donutArcs(FOUR, { radius: 80 });
    for (const a of arcs) {
      expect(a.d.startsWith('M')).toBe(true);
      expect(a.d).toContain('A 80 80');
    }
  });

  it('computes legend percentages over the non-zero total, zeros stay 0', () => {
    const arcs = donutArcs(FOUR);
    const byKey = Object.fromEntries(arcs.map((a) => [a.key, a.pct]));
    expect(byKey.cash).toBeCloseTo(0.6, 5);
    expect(byKey.wallet).toBeCloseTo(0.3, 5);
    expect(byKey.encrypted).toBeCloseTo(0.1, 5);
  });
});
