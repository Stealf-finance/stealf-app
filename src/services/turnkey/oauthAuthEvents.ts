// Subscriber-pattern bridge between Turnkey's `onAuthenticationSuccess`
// provider callback and useAuthFlow's finalize step.
//
// We can't gate finalize on React state (`turnkey.user?.userId` etc.)
// because Turnkey's `handlePostAuth` (TurnkeyProvider.mjs:363-396) awaits
// `setSession` / `setAllSessions` / `maybeRefreshWallets` /
// `maybeRefreshUser` BEFORE invoking `onAuthenticationSuccess`. By the
// time that synchronous callback fires, React has already committed the
// session/user/wallets state — so any effect gated on those values would
// run BEFORE the callback and miss the email decoded from the OIDC
// token. Making the callback the trigger (not React state) eliminates
// the race.
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
