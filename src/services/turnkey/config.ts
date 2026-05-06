import {
  AuthMethod,
  type TurnkeyProviderConfig,
  type TurnkeyCallbacks,
} from '@turnkey/react-native-wallet-kit';
import * as Sentry from '@sentry/react-native';
import { decodeOidcEmail } from '@/src/features/onboarding/lib/oidc';
import { emitOauthAuthSuccess } from './oauthAuthEvents';

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
  onAuthenticationSuccess: ({ session, action, method, identifier }) => {
    if (__DEV__) console.log('[Turnkey] Auth success:', { action, method });
    // For OAuth flows the SDK passes the raw OIDC id_token through
    // `identifier` (cf. TurnkeyProvider.mjs handlePostAuth call sites).
    // The SDK's `params.onOauthSuccess` callback on handleGoogleOauth /
    // handleAppleOauth is declared in the type signature but never
    // forwarded to completeOAuthFlow, so this provider-config callback
    // is the only OAuth-relevant hook that actually fires. We emit a
    // subscriber event from here — see oauthAuthEvents.ts for why this
    // can't be a React-state-gated effect (callback fires AFTER React
    // commits the session/user/wallets state, so any effect gated on
    // those values would run before the callback and miss the email).
    if (method === AuthMethod.Oauth && session?.token) {
      const email = decodeOidcEmail(identifier);
      Sentry.addBreadcrumb({
        category: 'auth.oauth',
        level: email ? 'info' : 'warning',
        message: email
          ? 'OAuth callback fired with decoded email'
          : 'OIDC token had no email claim',
        data: { action, hasEmail: !!email },
      });
      emitOauthAuthSuccess({
        email,
        sessionToken: session.token,
        identifier,
      });
    }
  },
  onError: (error) => {
    if (__DEV__) console.error('[Turnkey] Error:', error);
  },
};
