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
  hidden: boolean;
  setHidden: (next: boolean) => void;
  toggle: () => void;
};

const BalanceVisibilityCtx = createContext<Ctx | null>(null);

export function BalanceVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);

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
