import { describe, expect, it } from 'vitest';
import { formatCompact } from '../formatCompact';

describe('formatCompact', () => {
  it('formats thousands / millions / billions with a trimmed decimal', () => {
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(1_500)).toBe('1.5K');
    expect(formatCompact(2_000)).toBe('2K');
    expect(formatCompact(14_200_000)).toBe('14.2M');
    expect(formatCompact(1_200_000_000)).toBe('1.2B');
  });

  it('handles zero and non-finite input', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(Number.NaN)).toBe('—');
    expect(formatCompact(Infinity)).toBe('—');
  });
});
