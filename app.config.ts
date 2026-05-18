import type { ExpoConfig } from 'expo/config';

// Dev builds allow arbitrary HTTP loads so we can talk to the local backend
// (`http://<LAN-ip>:5000`) and CDN debug surfaces from a physical device.
// Production builds force TLS — no HTTP traffic on any domain.
const allowArbitraryHttp =
  process.env.NODE_ENV !== 'production' &&
  process.env.EAS_BUILD_PROFILE !== 'production';

const config: ExpoConfig = {
  name: 'stealf',
  slug: 'stealf',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'stealf',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.stealf.app',
    associatedDomains: ['webcredentials:stealf.xyz'],
    appleTeamId: '63724CT6P8',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: allowArbitraryHttp,
        NSAllowsLocalNetworking: allowArbitraryHttp,
      },
    },
  },
  android: {
    package: 'com.stealf.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/icon.png',
      backgroundImage: './assets/images/icon.png',
      monochromeImage: './assets/images/icon.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0a0a0a',
        dark: {
          backgroundColor: '#0a0a0a',
        },
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Sansation/Sansation-Light.ttf',
          './assets/fonts/Sansation/Sansation-LightItalic.ttf',
          './assets/fonts/Sansation/Sansation-Regular.ttf',
          './assets/fonts/Sansation/Sansation-Italic.ttf',
          './assets/fonts/Sansation/Sansation-Bold.ttf',
          './assets/fonts/Sansation/Sansation-BoldItalic.ttf',
        ],
      },
    ],
    'expo-secure-store',
    [
      '@sentry/react-native',
      {
        organization: 'stealf',
        project: 'react-native',
        url: 'https://sentry.io/',
      },
    ],
    'expo-localization',
    'expo-asset',
    'expo-notifications',
    './plugins/withMoproExcludedArchs',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
