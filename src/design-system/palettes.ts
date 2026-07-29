export type Tone = 'silver' | 'gold';

export type Palette = {
  bg: string;
  accent: string;
  accentDim: string;
  accentSoft: string;
  accentGlow: string;
  ink: string;
  inkDim: string;
  inkFaint: string;
  hairline: string;
};

// Theme is uniformly silver: both tones resolve to the same silver palette.
// The `Tone` param stays for API compatibility with existing call sites.
const SILVER: Palette = {
  bg: '#0c0c0e',
  accent: '#c9c9cc',
  accentDim: 'rgba(201,201,204,0.32)',
  accentSoft: 'rgba(201,201,204,0.1)',
  accentGlow: 'rgba(220,220,225,0.28)',
  ink: '#e8e8ea',
  inkDim: '#8a8a8f',
  inkFaint: '#6a6a70',
  hairline: 'rgba(230,230,235,0.1)',
};

export const txPalette = (_tone: Tone): Palette => SILVER;
