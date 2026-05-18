import { Text, View } from 'react-native';
import { Image } from 'expo-image';
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
