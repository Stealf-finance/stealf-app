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
  // Shield / Unshield tile icons (from assets/icons/shield.svg + shield-split.svg).
  shieldFull: make(
    <Path d="M5 7.69275C5 6.12811 5 5.34579 5.45114 4.79356C5.90228 4.24132 6.66888 4.08526 8.20208 3.77315L10.8031 3.24365C11.3995 3.12224 11.6977 3.06153 12 3.06153C12.3023 3.06153 12.6005 3.12224 13.1969 3.24365L15.7979 3.77315C17.3311 4.08526 18.0977 4.24132 18.5489 4.79356C19 5.34579 19 6.12811 19 7.69276V8.71739C19 11.5629 19 12.9856 18.5357 14.2883C18.4535 14.5191 18.3607 14.7459 18.2577 14.9681C17.6759 16.2228 16.6788 17.2377 14.6846 19.2674C13.5047 20.4684 12.9148 21.0689 12.1876 21.1374C12.0628 21.1491 11.9372 21.1491 11.8124 21.1374C11.0852 21.0689 10.4953 20.4684 9.31539 19.2674C7.3212 17.2377 6.32411 16.2228 5.74233 14.9681C5.63928 14.7459 5.54649 14.5191 5.46426 14.2883C5 12.9856 5 11.5629 5 8.71739V7.69275Z" />,
  ),
  shieldSplit: make(
    <>
      <Path
        d="M12 3.6L6.8 4Q5.2 4.3 5 6C5 9 5 12 6 15C7.2 17.5 9.2 19.2 12 20.9L10.5 14.6L13.1 10.8L10.7 7.5Z"
        transform="translate(-1.7 0)"
      />
      <Path
        d="M12 3.6L10.7 7.5L13.1 10.8L10.5 14.6L12 20.9C14.8 19.2 16.8 17.5 18 15C19 12 19 9 18 6Q18.8 4.3 17.2 4Z"
        transform="translate(1.7 0.4)"
      />
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
  // Bottom-bar tab icons. House is a clean single-weight outline (roof + body
  // + door); the others are single stroke paths lifted from assets/icons/*.svg.
  tabHome: make(
    <>
      <Path d="M3 11L10.5 4.2C11.4 3.4 12.6 3.4 13.5 4.2L21 11" />
      <Path d="M5 9.5V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V9.5" />
      <Path d="M9.5 20V15.5C9.5 14.6716 10.1716 14 11 14H13C13.8284 14 14.5 14.6716 14.5 15.5V20" />
    </>,
  ),
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
