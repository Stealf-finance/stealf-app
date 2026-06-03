import { Circle, Path, Rect, Svg } from 'react-native-svg';
import type { ReactNode } from 'react';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const make = (
  children: ReactNode | ((color: string) => ReactNode),
  vbW = 24,
  vbH = 24,
) => {
  const Icon = ({
    size = 18,
    color = 'currentColor',
    strokeWidth = 1.5,
  }: Props) => (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {typeof children === 'function' ? children(color) : children}
    </Svg>
  );
  Icon.displayName = 'Icon';
  return Icon;
};

export const Icons = {
  arrUp: make(<Path d="M12 19V5M5 12l7-7 7 7" />),
  arrDown: make(<Path d="M12 5v14M5 12l7 7 7-7" />),
  arrRight: make(<Path d="M5 12h14M13 6l6 6-6 6" />),
  arrLeft: make(<Path d="M19 12H5M11 6l-6 6 6 6" />),
  backspace: make(
    <>
      <Path d="M22 5H9l-6 7 6 7h13a1 1 0 001-1V6a1 1 0 00-1-1z" />
      <Path d="M13 9l6 6M19 9l-6 6" />
    </>,
  ),
  arrUpRight: make(<Path d="M7 17L17 7M7 7h10v10" />),
  arrDownLeft: make(<Path d="M17 7L7 17M17 17H7V7" />),
  arrDownRight: make(<Path d="M7 7L17 17M17 7v10H7" />),
  plus: make(<Path d="M12 5v14M5 12h14" />),
  minus: make(<Path d="M5 12h14" />),
  more: make((color) => (
    <>
      <Circle cx="5" cy="12" r="1.5" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      <Circle cx="19" cy="12" r="1.5" fill={color} stroke="none" />
    </>
  )),
  moove: make(
    <Path d="M7 7h11M18 7l-3-3M18 7l-3 3M17 17H6M6 17l3-3M6 17l3 3" />,
  ),
  move: make(
    <>
      <Path d="M3 7h3l12 10h3M18 14l3 3-3 3" />
      <Path d="M3 17h3l4-3.3M14 10.3l4-3.3h3M18 4l3 3-3 3" />
    </>,
  ),
  shield: make(<Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />),
  shieldCheck: make(
    <>
      <Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />
      <Path d="M9 12l2 2 4-4" />
    </>,
  ),
  eye: make(
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>,
  ),
  eyeOff: make(
    <Path d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.9 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a13.16 13.16 0 01-2.4 3.17M6.61 6.61A13.53 13.53 0 002 12s3.5 7 10 7a9.74 9.74 0 005.39-1.6" />,
  ),
  hideEye: make(
    <Path d="M3 3l18 18M10 10a2 2 0 002 2M9 4a10 10 0 0113 10M6 6a13 13 0 00-4 6s3.5 7 10 7a10 10 0 005.4-1.5" />,
  ),
  lock: make(
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 018 0v4" />
    </>,
  ),
  card: make(
    <>
      <Rect x="2" y="6" width="20" height="14" rx="2" />
      <Path d="M2 11h20M6 16h4" />
    </>,
  ),
  bank: make(
    <Path d="M3 9l9-6 9 6M5 9v10h14V9M3 21h18M9 13v3M12 13v3M15 13v3" />,
  ),
  bolt: make(<Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  swap: make(<Path d="M7 10l-4-4 4-4M3 6h14M17 14l4 4-4 4M21 18H7" />),
  swapV: make(<Path d="M10 7L7 4 4 7M7 4v14M14 17l3 3 3-3M17 20V6" />),
  invest: make(<Path d="M3 17l5-5 4 4 9-9M15 7h6v6" />),
  home: make(
    <>
      <Path d="M3 11l9-8 9 8v10a2 2 0 01-2 2H5a2 2 0 01-2-2V11z" />
      <Path d="M9 22V12h6v10" />
    </>,
  ),
  user: make(
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0116 0" />
    </>,
  ),
  // Bottom-bar tab icons (from assets/icons/*.svg). House mixes stroke +
  // two fill paths (door, chimney); the others are single stroke paths.
  tabHome: make((color) => (
    <>
      <Path d="M4 10V17C4 18.8856 4 19.8284 4.58579 20.4142C5.17157 21 6.11438 21 8 21H16C17.8856 21 18.8284 21 19.4142 20.4142C20 19.8284 20 18.8856 20 17V10" />
      <Path d="M3 11L9.17158 4.82842C10.5049 3.49509 11.1716 2.82843 12 2.82843C12.8284 2.82843 13.4951 3.49509 14.8284 4.82843L21 11" />
      <Path
        d="M9 17C9 16.0681 9 15.6022 9.15224 15.2346C9.35523 14.7446 9.74458 14.3552 10.2346 14.1522C10.6022 14 11.0681 14 12 14C12.9319 14 13.3978 14 13.7654 14.1522C14.2554 14.3552 14.6448 14.7446 14.8478 15.2346C15 15.6022 15 16.0681 15 17V21H9V17Z"
        fill={color}
        stroke="none"
      />
      <Path
        d="M16 4.5C16 4.03406 16 3.80109 16.0761 3.61732C16.1776 3.37229 16.3723 3.17761 16.6173 3.07612C16.8011 3 17.0341 3 17.5 3C17.9659 3 18.1989 3 18.3827 3.07612C18.6277 3.17761 18.8224 3.37229 18.9239 3.61732C19 3.80109 19 4.03406 19 4.5V10L16 6.5V4.5Z"
        fill={color}
        stroke="none"
      />
    </>
  )),
  tabPayment: make(
    <Path d="M5.63608 18.364L18.364 5.63606M9.00003 5.63601L18.364 5.63606V15" />,
  ),
  tabProfile: make(
    <Path d="M19 20.9999L19 19.5499C19 18.5732 19 18.0849 18.8874 17.6856C18.604 16.681 17.8189 15.8958 16.8143 15.6125C16.415 15.4999 15.9266 15.4999 14.95 15.4999H8.05C7.07337 15.4999 6.58505 15.4999 6.18568 15.6125C5.18108 15.8958 4.39596 16.681 4.11263 17.6856C4 18.0849 4 18.5732 4 19.5499L4 20.9999M16.2 7.06C16.2 9.30477 14.3196 11.1245 12 11.1245C9.6804 11.1245 7.8 9.30477 7.8 7.06C7.8 4.81523 9.6804 2.99548 12 2.99548C14.3196 2.99548 16.2 4.81523 16.2 7.06Z" />,
  ),
  chevR: make(<Path d="M9 6l6 6-6 6" />),
  chevD: make(<Path d="M6 9l6 6 6-6" />),
  search: make(
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M21 21l-5-5" />
    </>,
  ),
  bell: make(
    <>
      <Path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" />
      <Path d="M10 20a2 2 0 004 0" />
    </>,
  ),
  settings: make(
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>,
  ),
  key: make(
    <>
      <Circle cx="8" cy="15" r="4" />
      <Path d="M11 13l9-9M16 8l3 3M13 10l3 3" />
    </>,
  ),
  copy: make(
    <>
      <Rect x="9" y="9" width="13" height="13" rx="2" />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>,
  ),
  qr: make(
    <>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Path d="M14 14h3M14 17v4M17 17h4M21 14v4M17 21h4" />
    </>,
  ),
  scan: make(
    <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" />,
  ),
  dots: make((color) => (
    <>
      <Circle cx="12" cy="5" r="1.5" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      <Circle cx="12" cy="19" r="1.5" fill={color} stroke="none" />
    </>
  )),
  trend: make(<Path d="M3 17l5-5 4 4 9-9M15 7h6v6" />),
  gold: make(
    <>
      <Rect x="3" y="10" width="18" height="8" rx="1" />
      <Rect x="5" y="6" width="14" height="4" rx="1" />
      <Rect x="7" y="2" width="10" height="4" rx="1" />
    </>,
  ),
  sparkle: make(<Path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />),
  close: make(<Path d="M6 6l12 12M18 6L6 18" />),
  check: make(<Path d="M5 12l5 5 9-11" />),
  mail: make(
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>,
  ),
  info: make(
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4M12 8h.01" />
    </>,
  ),
  shieldOff: make(
    <>
      <Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />
      <Path d="M3 3l18 18" />
    </>,
  ),
  gift: make(
    <>
      <Path d="M20 12v10H4V12" />
      <Path d="M2 7h20v5H2z" />
      <Path d="M12 22V7" />
      <Path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </>,
  ),
  history: make(
    <>
      <Path d="M3 3v6h6" />
      <Path d="M3.05 13a9 9 0 105.28-8.46L3 9" />
      <Path d="M12 7v5l3 2" />
    </>,
  ),
  clock: make(
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>,
  ),
  folder: make(
    <Path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  ),
  refresh: make(
    <>
      <Path d="M21 12a9 9 0 11-3.05-6.74M21 4v5h-5" />
    </>,
  ),
  trash: make(
    <>
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
    </>,
  ),
} as const;

export type IconName = keyof typeof Icons;
