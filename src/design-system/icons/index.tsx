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
  shield: make(<Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />),
  shieldCheck: make(
    <>
      <Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />
      <Path d="M9 12l2 2 4-4" />
    </>,
  ),
  // Shield / Unshield tile icons (from assets/icons/shield.svg + shield-split.svg).
  shieldFull: make(
    <Path d="M5 7.69C5 6.13 5 5.35 5.45 4.79C5.9 4.24 6.67 4.09 8.2 3.77L10.8 3.24C11.4 3.12 11.7 3.06 12 3.06C12.3 3.06 12.6 3.12 13.2 3.24L15.8 3.77C17.33 4.09 18.1 4.24 18.55 4.79C19 5.35 19 6.13 19 7.69V8.72C19 11.56 19 12.99 18.54 14.29C18.45 14.52 18.36 14.75 18.26 14.97C17.68 16.22 16.68 17.24 14.68 19.27C13.5 20.47 12.91 21.07 12.19 21.14C12.06 21.15 11.94 21.15 11.81 21.14C11.09 21.07 10.5 20.47 9.32 19.27C7.32 17.24 6.32 16.22 5.74 14.97C5.64 14.75 5.55 14.52 5.46 14.29C5 12.99 5 11.56 5 8.72V7.69Z" />,
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
  store: make(
    <>
      <Path d="M4 3h16l2 5a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0l2-5z" />
      <Path d="M5 10v10h14V10" />
      <Path d="M10 20v-6h4v6" />
    </>,
  ),
  /** Shopping cart — the Store header's cart button. */
  cart: make(
    <>
      <Path d="M3 4h2l2.4 11.4a2 2 0 002 1.6h7.7a2 2 0 002-1.6L21 8H6" />
      <Circle cx="9" cy="20" r="1.4" />
      <Circle cx="18" cy="20" r="1.4" />
    </>,
  ),
  /** Favourite, unset. */
  heart: make(<Path d="M12 20.3l-1.35-1.24C6.4 15.22 4 13.05 4 10.4 4 8.05 5.84 6.2 8.2 6.2c1.33 0 2.6.62 3.43 1.6h.74A4.55 4.55 0 0115.8 6.2c2.36 0 4.2 1.85 4.2 4.2 0 2.65-2.4 4.82-6.65 8.66L12 20.3z" />),
  /** Favourite, set — filled with the current colour. */
  heartFilled: make((c) => <Path d="M12 20.3l-1.35-1.24C6.4 15.22 4 13.05 4 10.4 4 8.05 5.84 6.2 8.2 6.2c1.33 0 2.6.62 3.43 1.6h.74A4.55 4.55 0 0115.8 6.2c2.36 0 4.2 1.85 4.2 4.2 0 2.65-2.4 4.82-6.65 8.66L12 20.3z" fill={c} stroke={c} />),
  /** Sliders — the Store header's filter button. */
  filter: make(
    <>
      <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
      <Circle cx="16" cy="6" r="2" />
      <Circle cx="10" cy="12" r="2" />
      <Circle cx="16" cy="18" r="2" />
    </>,
  ),
  dollar: make(
    <>
      <Path d="M12 2v20" />
      <Path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </>,
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
      <Path d="M5 11.2V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V11.2" />
    </>,
  ),
  tabPayment: make(
    <Path d="M5.64 18.36L18.36 5.64M9 5.64L18.36 5.64V15" />,
  ),
  tabProfile: make(
    <Path d="M19 21L19 19.55C19 18.57 19 18.08 18.89 17.69C18.6 16.68 17.82 15.9 16.81 15.61C16.41 15.5 15.93 15.5 14.95 15.5H8.05C7.07 15.5 6.59 15.5 6.19 15.61C5.18 15.9 4.4 16.68 4.11 17.69C4 18.08 4 18.57 4 19.55L4 21M16.2 7.06C16.2 9.3 14.32 11.12 12 11.12C9.68 11.12 7.8 9.3 7.8 7.06C7.8 4.82 9.68 3 12 3C14.32 3 16.2 4.82 16.2 7.06Z" />,
  ),
  chevR: make(<Path d="M9 6l6 6-6 6" />),
  chevL: make(<Path d="M15 6l-6 6 6 6" />),
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
  pencil: make(
    <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
  ),
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
  globe: make(
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18" />
      <Path d="M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9s1.3-6.6 3.8-9Z" />
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
  hourglass: make(<Path d="M6 3h12M6 21h12M8 3l4 9 4-9M8 21l4-9 4 9" />),
  folder: make(
    <Path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  ),
  refresh: make(
    <>
      <Path d="M21 12a9 9 0 11-3.05-6.74M21 4v5h-5" />
    </>,
  ),
  // Two chasing arcs — the shape loader.png drew, as a stroke glyph. Rotated
  // by LoaderRefreshButton, so it has to read the same at every angle: both
  // arcs span 135° and sit 180° apart.
  loader: make(
    <>
      <Path d="M4 12a8 8 0 0113.66-5.66" />
      <Path d="M18 3v3.5h-3.5" />
      <Path d="M20 12a8 8 0 01-13.66 5.66" />
      <Path d="M6 21v-3.5h3.5" />
    </>,
  ),
  trash: make(
    <>
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
    </>,
  ),
} as const;

export type IconName = keyof typeof Icons;
