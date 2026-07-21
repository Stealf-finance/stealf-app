// Bridge from non-React session-death signals to the React teardown.
//
// Two producers emit here: Turnkey's `onSessionExpired` callback (module-scope
// config, outside the tree) and the API client's 401 branch (a plain function,
// also outside the tree). Both need to reach `useAuth().reset()`, which only
// exists inside <AuthProvider>. Same shape as `oauthAuthEvents`.
type SessionExpiredReason = 'turnkey_expired' | 'api_unauthorized';

type Listener = (reason: SessionExpiredReason) => void;

let listeners: Listener[] = [];

export function emitSessionExpired(reason: SessionExpiredReason): void {
  for (const listener of listeners) {
    try {
      listener(reason);
    } catch (err) {
      if (__DEV__) {
        console.error('[sessionEvents] listener threw synchronously:', err);
      }
    }
  }
}

export function subscribeSessionExpired(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export type { SessionExpiredReason };
