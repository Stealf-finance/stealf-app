export const T = {
  bg: '#0a0a0a',
  bgRaised: '#151513',
  bgRaised2: '#1e1d1a',
  bgCard: 'rgba(255,255,255,0.03)',
  bgCardStrong: 'rgba(255,255,255,0.06)',
  bgLight: '#e8e0d0',
  bgLightInk: '#0a0a0a',

  ink: '#f1ece1',
  inkDim: 'rgba(241,236,225,0.65)',
  inkFaint: 'rgba(241,236,225,0.4)',
  inkMute: 'rgba(241,236,225,0.25)',
  hairline: 'rgba(241,236,225,0.09)',
  hairlineStrong: 'rgba(241,236,225,0.18)',
  trace: 'rgba(241,236,225,0.04)',

  gold: '#c9a86a',
  goldDim: 'rgba(201,168,106,0.5)',
  goldFaint: 'rgba(201,168,106,0.15)',
  goldGlow: 'rgba(201,168,106,0.28)',

  green: '#7ea688',
  error: '#d1604a',
} as const;

export type Token = keyof typeof T;
