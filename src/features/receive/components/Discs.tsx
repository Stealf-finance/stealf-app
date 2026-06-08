import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

const STEALF_SIZE = 36;
const FLAG_SIZE = 36;
const USDC_DEFAULT_SIZE = 36;

export function StealfDisc() {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      contentFit="cover"
      cachePolicy="memory-disk"
      style={{
        width: STEALF_SIZE,
        height: STEALF_SIZE,
        borderRadius: STEALF_SIZE / 2,
      }}
    />
  );
}

/** Private-transfer (Umbra) icon — a square app-icon illustration, so it's
 *  rendered as a rounded square rather than a circular disc to avoid cropping. */
export function UmbraDisc() {
  return (
    <Image
      source={require('@/assets/images/umbra-transfer.png')}
      contentFit="cover"
      cachePolicy="memory-disk"
      style={{
        width: STEALF_SIZE,
        height: STEALF_SIZE,
        borderRadius: 9,
      }}
    />
  );
}

/** Simple-transfer icon — two overlapping token coins (wide, transparent),
 *  so it's rendered with `contain` and extra width to avoid clipping. */
export function SolanaTokenDisc() {
  return (
    <Image
      source={require('@/assets/images/solana-token.png')}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{ width: 44, height: STEALF_SIZE }}
    />
  );
}

/** Bank-transfer icon — a wide three-coin illustration (transparent), rendered
 *  with `contain` at the same width as the Simple tile for visual consistency.
 *  The "Soon" badge is absolutely positioned, so this can fill the row width. */
export function GlobeDisc() {
  return (
    <Image
      source={require('@/assets/images/globe.png')}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{ width: 70, height: 44 }}
    />
  );
}

const STRIPE_HEIGHT = 4;
const STRIPE_COUNT = Math.ceil(FLAG_SIZE / STRIPE_HEIGHT);

export function UsdFlagDisc() {
  return (
    <View
      style={{
        width: FLAG_SIZE,
        height: FLAG_SIZE,
        borderRadius: FLAG_SIZE / 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: T.hairline,
      }}
    >
      {Array.from({ length: STRIPE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={{
            height: STRIPE_HEIGHT,
            backgroundColor: i % 2 === 0 ? '#b22234' : '#ffffff',
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '50%',
          backgroundColor: '#3c3b6e',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontSize: 9,
            lineHeight: 9,
            includeFontPadding: false,
          }}
        >
          ★
        </Text>
      </View>
    </View>
  );
}

// Same canonical CDN-hosted logo the backend's WELL_KNOWN map points at
// (solana-labs/token-list registry), so this disc visually matches what
// the assets list renders for the live USDC token row.
const USDC_OFFICIAL_LOGO =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';

export function UsdcDisc({ size = USDC_DEFAULT_SIZE }: { size?: number } = {}) {
  return (
    <Image
      source={{ uri: USDC_OFFICIAL_LOGO }}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    />
  );
}

export function BankDisc() {
  return (
    <Image
      source={require('@/assets/images/bank-icon.png')}
      contentFit="cover"
      cachePolicy="memory-disk"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
      }}
    />
  );
}

/** Move ("Moove") icon disc — the move glyph in a glass circle. */
export function MoveDisc() {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: T.hairline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icons.move size={20} color={T.ink} />
    </View>
  );
}
