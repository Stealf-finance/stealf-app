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
  owner: 'stealf-back',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'stealf',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  // EAS Update (OTA): JS-only changes ship instantly to installed builds with
  // the same runtimeVersion — no 30-min rebuild. Native changes still need a build.
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/9a158029-d062-48ff-b7b7-33854514570f',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.stealf.app',
    associatedDomains: ['webcredentials:stealf.xyz'],
    appleTeamId: '63724CT6P8',
    // Native Sign in with Apple (expo-apple-authentication) — adds the
    // com.apple.developer.applesignin entitlement on prebuild.
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Portola's KYC (in the borrow WebView) captures a document + selfie.
      NSCameraUsageDescription:
        'Stealf uses the camera to verify your identity when you take out a loan.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: allowArbitraryHttp,
        NSAllowsLocalNetworking: allowArbitraryHttp,
      },
    },
  },
  android: {
    package: 'com.stealf.app',
    // Camera for Portola KYC capture in the borrow WebView.
    permissions: ['android.permission.CAMERA'],
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
  extra: {
    eas: {
      projectId: '9a158029-d062-48ff-b7b7-33854514570f',
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
