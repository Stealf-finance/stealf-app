import type {
  TurnkeyProviderConfig,
  TurnkeyCallbacks,
} from '@turnkey/react-native-wallet-kit';
import { getEnv } from '../env';


export function getTurnkeyConfig(): TurnkeyProviderConfig {
  const env = getEnv();

  return {
    organizationId: process.env.EXPO_PUBLIC_ORGANIZATION_ID!,
    authProxyConfigId: process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID!,
    auth: {
      oauth: {
        // Must match the `scheme` in app.json so the in-app browser can
        // deep-link back to us once the OAuth provider redirects.
        appScheme: 'stealf',
        // You can also provide these values through the Turnkey dashboard:
        // Note: If no redirect URI is provided, the default redirect URI will be used `https://oauth-redirect.turnkey.com`
        redirectUri: process.env.EXPO_PUBLIC_REDIRECT_URI || "", // Eg: "https://myapp.com/home". This must match the redirect URI configured in your OAuth provider's dashboard.

        // You will typically get these from the OAuth provider's dashboard. Eg: Google developer console.
        google: { clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID },
        apple: { clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID },
      },
    },
  };
};

export const BANK_WALLET_CONFIG = {
  walletName: 'Cash Wallet',
  walletAccounts: [
    {
      curve: 'CURVE_ED25519' as const,
      pathFormat: 'PATH_FORMAT_BIP32' as const,
      path: "m/44'/501'/0'/0'",
      addressFormat: 'ADDRESS_FORMAT_SOLANA' as const,
    },
  ],
};

export const TURNKEY_CALLBACKS: TurnkeyCallbacks = {
  beforeSessionExpiry: () => {
    if (__DEV__) console.log('[Turnkey] Session nearing expiry');
  },
  onSessionExpired: () => {
    if (__DEV__) console.log('[Turnkey] Session expired');
  },
  onAuthenticationSuccess: ({ action, method }) => {
    if (__DEV__) console.log('[Turnkey] Auth success:', { action, method });
  },
  onError: (error) => {
    if (__DEV__) console.error('[Turnkey] Error:', error);
  },
};
