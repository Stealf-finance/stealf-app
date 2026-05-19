import {
  AuthMethod,
  type TurnkeyProviderConfig,
  type TurnkeyCallbacks,
} from '@turnkey/react-native-wallet-kit';
import { Buffer } from 'buffer';
import * as Sentry from '@sentry/react-native';
import { decodeOidcEmail } from '@/src/features/onboarding/lib/oidc';
import { emitOauthAuthSuccess } from './oauthAuthEvents';

export const BANK_WALLET_CONFIG = {
  walletName: 'Bank Wallet',
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
    if (method === AuthMethod.Oauth && session?.token) {
      const email = decodeOidcEmail(identifier);
      if (__DEV__) {
        const tokenParts = (identifier ?? '').split('.');
        console.log('[Turnkey] Auth success:', {
          action,
          method,
          hasIdentifier: !!identifier,
          tokenSegments: tokenParts.length,
          tokenLen: identifier?.length ?? 0,
          hasDecodedEmail: !!email,
        });
        // TEMP DIAG — full decoded JWT payload so we can see exactly which
        // claims Apple+Turnkey actually included. Remove once the missing-email
        // Apple flow is understood.
        try {
          if (tokenParts.length === 3) {
            const b64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
            const payload = JSON.parse(
              Buffer.from(padded, 'base64').toString('utf8'),
            );
            console.log(
              '[Turnkey] OAuth JWT payload (DEV):',
              JSON.stringify(payload, null, 2),
            );
          }
        } catch (err) {
          console.warn('[Turnkey] OAuth JWT payload decode failed:', err);
        }
      }
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
    } else if (__DEV__) {
      console.log('[Turnkey] Auth success (non-OAuth or no session):', {
        action,
        method,
        hasSession: !!session?.token,
      });
    }
  },
  onError: (error) => {
    if (__DEV__) console.error('[Turnkey] Error:', error);
  },
};
