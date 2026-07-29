import { ReactNode } from 'react';
import { toast } from 'sonner-native';

export type ToastKind = 'info' | 'success' | 'error';

export type ToastInit = {
  kind: ToastKind;
  title: string;
  message?: string;
};

export type Toast = ToastInit & { id: string | number };

export type ToastApi = {
  /** One-shot toast. Errors persist until dismissed; info/success auto-close. */
  show: (init: ToastInit) => string | number;
  dismiss: (id?: string | number) => void;
  /** A spinner toast. Update it later by passing its id back to show/dismiss,
   *  or drive it through `promise`. */
  loading: (title: string, message?: string) => string | number;
  /** Bind a toast to a promise's lifecycle (loading → success / error). */
  promise: <T>(
    p: Promise<T>,
    o: {
      loading: string;
      success: (result: T) => string;
      error: ((error: unknown) => string) | string;
    },
  ) => void;
};

// Sonner renders toasts itself via <AppToaster/> (its <Toaster/>), so this is
// a pass-through — kept only so the provider tree in app/_layout is unchanged.
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// The API is stateless (sonner holds the store), so one frozen object serves
// every caller — no context needed.
const TOAST_API: ToastApi = {
  show: ({ kind, title, message }) => {
    // Stable content id — a duplicate call (e.g. an effect that fires twice in
    // dev) updates the same toast instead of stacking a second copy.
    const id = `t:${kind}:${title}:${message ?? ''}`;
    const data = { id, description: message };
    if (kind === 'error') {
      // Failures need a deliberate "I read it" beat before a retry.
      return toast.error(title, { ...data, duration: Infinity });
    }
    if (kind === 'success') return toast.success(title, data);
    return toast.info(title, data);
  },
  dismiss: (id) => {
    toast.dismiss(id);
  },
  loading: (title, message) =>
    toast.loading(title, message ? { description: message } : undefined),
  promise: (p, o) => {
    toast.promise(p, o);
  },
};

export function useToast(): ToastApi {
  return TOAST_API;
}
