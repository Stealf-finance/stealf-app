import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

export interface AuthSession {
  token: string;
  expiresAt: number;
}

export interface AuthUser {
  userId: string;
  email: string | null;
  bankWalletAddress: string | null;
  subOrgId: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const DEFAULT_VALUE: AuthContextValue = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  logout: async () => {},
};

const AuthContext = createContext<AuthContextValue>(DEFAULT_VALUE);

export function AuthProvider({ children }: PropsWithChildren) {
  // Slice 1 will replace this with real Turnkey-driven state.
  const value = useMemo<AuthContextValue>(() => DEFAULT_VALUE, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
