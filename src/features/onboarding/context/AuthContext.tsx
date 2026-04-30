import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  SECURE_STORE_KEYS,
  deleteSecure,
  getSecure,
  getSecureJson,
  setSecure,
  setSecureJson,
} from '@/src/services/auth/secureStore';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { UserSchema, type Session, type User } from '../types';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  reset: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Read the persisted stealf wallet address from SecureStore. Pattern mirrors
 * front-stealf where `userData.stealf_wallet` lives in storage and is merged
 * back into the auth user on next sign-in.
 */
export async function readPersistedStealfWallet(): Promise<string | null> {
  try {
    return await getSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS);
  } catch {
    return null;
  }
}

async function persistStealfWallet(address: string | null | undefined): Promise<void> {
  try {
    if (address) {
      await setSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS, address);
    } else {
      await deleteSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS);
    }
  } catch {
    // SecureStore failures shouldn't break the auth flow
  }
}

async function persistUser(user: User | null): Promise<void> {
  try {
    if (user) await setSecureJson(SECURE_STORE_KEYS.USER_DATA, user);
    else await deleteSecure(SECURE_STORE_KEYS.USER_DATA);
  } catch {
    // ignore
  }
}

async function persistSessionToken(token: string | null): Promise<void> {
  try {
    if (token) await setSecure(SECURE_STORE_KEYS.SESSION_TOKEN, token);
    else await deleteSecure(SECURE_STORE_KEYS.SESSION_TOKEN);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  // Block routing decisions in <AuthGuard> until we've finished restoring
  // persisted state from SecureStore (otherwise we briefly redirect to /welcome
  // on cold start before rehydration completes).
  const [isLoading, setLoading] = useState(true);

  // Cold-start rehydration: pull user + session token from Keychain so the
  // app stays signed in across refreshes / kills, until explicit logout.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedUserRaw, storedToken] = await Promise.all([
          getSecureJson<unknown>(SECURE_STORE_KEYS.USER_DATA),
          getSecure(SECURE_STORE_KEYS.SESSION_TOKEN),
        ]);
        if (cancelled) return;

        if (storedUserRaw) {
          const parsed = UserSchema.safeParse(storedUserRaw);
          if (parsed.success) {
            setUserState(parsed.data);
            if (__DEV__) console.log('[AuthContext] restored user from store');
          } else if (__DEV__) {
            console.warn('[AuthContext] stored user invalid, dropping');
          }
        }
        if (storedToken) {
          setSessionState({ sessionToken: storedToken });
          if (__DEV__) console.log('[AuthContext] restored session token');
        }

        // Pre-load the stealth signing key into RAM so the first signing op
        // on this session doesn't pay the Keychain hit.
        void walletKeyCache.warmup();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    void persistUser(next);
    void persistStealfWallet(next?.stealfWallet ?? null);
  }, []);

  const setSession = useCallback((next: Session | null) => {
    setSessionState(next);
    void persistSessionToken(next?.sessionToken ?? null);
  }, []);

  const reset = useCallback(() => {
    setUserState(null);
    setSessionState(null);
    void persistUser(null);
    void persistSessionToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: !!session && !!user,
      isLoading,
      setSession,
      setUser,
      reset,
    }),
    [user, session, isLoading, setSession, setUser, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
