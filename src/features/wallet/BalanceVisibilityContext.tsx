import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'stealf:balance-hidden';

type Ctx = {
  /** True = balances are masked (****), false = visible. */
  hidden: boolean;
  setHidden: (next: boolean) => void;
  toggle: () => void;
};

const BalanceVisibilityCtx = createContext<Ctx | null>(null);

/**
 * App-wide toggle for masking dollar balances. The toggle on either tab
 * (Bank or Stealth) flips the same flag, and the choice persists across
 * launches via AsyncStorage. We start with `hidden = false` so the user
 * sees their balance on first ever launch — the persisted value rehydrates
 * asynchronously and overrides this default if it exists.
 */
export function BalanceVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);

  // Hydrate from storage on mount. Failures are silent — worst case is a
  // visible balance the first frame, which is exactly the default anyway.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === '1') setHiddenState(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setHiddenState((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ hidden, setHidden, toggle }),
    [hidden, setHidden, toggle],
  );

  return (
    <BalanceVisibilityCtx.Provider value={value}>
      {children}
    </BalanceVisibilityCtx.Provider>
  );
}

export function useBalanceVisibility() {
  const ctx = useContext(BalanceVisibilityCtx);
  if (!ctx) {
    throw new Error(
      'useBalanceVisibility must be used inside BalanceVisibilityProvider',
    );
  }
  return ctx;
}
