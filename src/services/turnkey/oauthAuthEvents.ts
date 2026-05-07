// Bridge from Turnkey's `onAuthenticationSuccess` callback to useAuthFlow.
// Callback-as-trigger (not React-state-gated) avoids racing the SDK's
// post-auth state commits.
type OauthAuthSuccess = {
  email: string | undefined;
  sessionToken: string;
  identifier: string;
};

type Listener = (event: OauthAuthSuccess) => void | Promise<void>;

let listeners: Listener[] = [];

export function emitOauthAuthSuccess(event: OauthAuthSuccess): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      if (__DEV__) {
        console.error('[oauthAuthEvents] listener threw synchronously:', err);
      }
    }
  }
}

export function subscribeOauthAuthSuccess(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
