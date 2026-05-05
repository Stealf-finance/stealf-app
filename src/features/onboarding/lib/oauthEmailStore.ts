// Bridge between the Turnkey provider's `onAuthenticationSuccess` callback
// (where the OIDC token first becomes observable) and the `useAuthFlow`
// hook's finalize effect (which runs after React commits the post-auth
// state). Module-level so the callback — which lives outside React — can
// write into it; `consume` clears on read so a stale value can't leak
// across sessions if a previous attempt aborted before being read.
let lastOauthEmail: string | undefined;

export function setLastOauthEmail(email: string | undefined): void {
  lastOauthEmail = email;
}

export function consumeLastOauthEmail(): string | undefined {
  const email = lastOauthEmail;
  lastOauthEmail = undefined;
  return email;
}
