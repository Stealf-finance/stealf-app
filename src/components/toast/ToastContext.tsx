import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
};

export type ToastInit = Omit<Toast, 'id'>;

export type ToastApi = {
  toasts: Toast[];
  show: (init: ToastInit) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

// Errors stay until the user taps them — wallet-management failures
// usually need a deliberate "I read it" beat before retrying. Info /
// success carry no recovery action so they slide away on a timer.
const AUTO_DISMISS_MS: Record<ToastKind, number | null> = {
  info: 3000,
  success: 2500,
  error: null,
};

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast_${Date.now().toString(36)}_${counter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    (init) => {
      const id = nextId();
      setToasts((cur) => [...cur, { ...init, id }]);
      const ms = AUTO_DISMISS_MS[init.kind];
      if (ms !== null) {
        const t = setTimeout(() => {
          timers.current.delete(id);
          setToasts((cur) => cur.filter((t) => t.id !== id));
        }, ms);
        timers.current.set(id, t);
      }
      return id;
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({ toasts, show, dismiss }),
    [toasts, show, dismiss],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

// Surfaces the most recent toast, but errors win over info/success so a
// fresh failure isn't swallowed by an in-flight info message.
export function useTopToast(): Toast | null {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  const errors = toasts.filter((t) => t.kind === 'error');
  if (errors.length > 0) return errors[errors.length - 1];
  return toasts[toasts.length - 1];
}
