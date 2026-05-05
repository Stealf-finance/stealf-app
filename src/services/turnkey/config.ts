import {
  AuthMethod,
  type TurnkeyProviderConfig,
  type TurnkeyCallbacks,
} from '@turnkey/react-native-wallet-kit';
import * as Sentry from '@sentry/react-native';
import { decodeOidcEmail } from '@/src/features/onboarding/lib/oidc';
import { setLastOauthEmail } from '@/src/features/onboarding/lib/oauthEmailStore';

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

export const TURNKEY_CONFIG: TurnkeyProviderConfig = {
  organizationId: process.env.EXPO_PUBLIC_ORGANIZATION_ID!,
  authProxyConfigId: process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID!,

  // Tells the provider to refresh `user` + `wallets` automatically after
  // every auth event. Without it the provider sets the session but
  // leaves user/wallets empty, so our post-auth effect can't read the
  // user's email and the backend rejects the signup.
  autoRefreshManagedState: true,

  auth: {
    otp: { email: true },
    oauth: {

      appScheme: 'stealf',

      redirectUri: process.env.EXPO_PUBLIC_REDIRECT_URI || undefined,
      google: { clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID },
      apple: { clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID },
    },

    createSuborgParams: {
      oauth: { customWallet: BANK_WALLET_CONFIG },
      emailOtpAuth: { customWallet: BANK_WALLET_CONFIG },
    },
    autoRefreshSession: true,
  },
};

export const TURNKEY_CALLBACKS: TurnkeyCallbacks = {
  beforeSessionExpiry: () => {
    if (__DEV__) console.log('[Turnkey] Session nearing expiry');
  },
  onSessionExpired: () => {
    if (__DEV__) console.log('[Turnkey] Session expired');
  },
  onAuthenticationSuccess: ({ action, method, identifier }) => {
    if (__DEV__) console.log('[Turnkey] Auth success:', { action, method });
    // For OAuth flows the SDK passes the raw OIDC id_token through
    // `identifier` (cf. TurnkeyProvider.mjs handlePostAuth call sites).
    // The SDK's `params.onOauthSuccess` callback on handleGoogleOauth /
    // handleAppleOauth is declared in the type signature but never
    // forwarded to completeOAuthFlow, so this provider-config callback
    // is the only OAuth-relevant hook that actually fires. Decode the
    // email claim here and stash it for `useAuthFlow` to consume during
    // its post-auth finalize effect.
    if (method === AuthMethod.Oauth) {
      const email = decodeOidcEmail(identifier);
      setLastOauthEmail(email);
      if (!email) {
        Sentry.addBreadcrumb({
          category: 'auth.oauth',
          level: 'warning',
          message: 'OIDC token had no email claim',
          data: { action },
        });
      }
    }
  },
  onError: (error) => {
    if (__DEV__) console.error('[Turnkey] Error:', error);
  },
};
