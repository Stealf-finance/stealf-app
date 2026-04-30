import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  SECURE_STORE_KEYS,
  deleteSecure,
  getSecure,
  setSecure,
} from '@/src/services/auth/secureStore';
import type { Session, User } from '../types';

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

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    // Mirror the stealf wallet to SecureStore so it survives app restarts.
    // Cleared explicitly on logout via deleteSecure(STEALF_WALLET_ADDRESS).
    void persistStealfWallet(next?.stealfWallet ?? null);
  }, []);

  const reset = useCallback(() => {
    setUserState(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: !!session && !!user,
      isLoading: false,
      setSession,
      setUser,
      reset,
    }),
    [user, session, setUser, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
