import type { QueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { persister } from '@/src/services/queryClient';
import { purgeTurnkeyState } from './passkeyHelpers';

export type TeardownReason = 'user_signed_out' | 'session_expired';

export interface SessionTeardownDeps {
  turnkeyLogout: () => Promise<void>;
  reset: () => void;
  queryClient: QueryClient;
  capture?: (event: string) => void;
  resetAnalytics?: () => void;
}

// A 401 storm (several queries in flight when the JWT dies) emits one event
// per response. Without this guard each one would race a full teardown —
// concurrent SecureStore deletes and a double Turnkey logout.
let inFlight: Promise<void> | null = null;

async function run(
  reason: TeardownReason,
  deps: SessionTeardownDeps,
): Promise<void> {
  const { turnkeyLogout, reset, queryClient, capture, resetAnalytics } = deps;

  capture?.(reason === 'session_expired' ? 'auth_session_expired' : 'auth_signed_out');
  socketService.disconnect();
  clearStealthState();
  await umbraClearSeed();
  await walletKeyCache.clearAll();
  try {
    await turnkeyLogout();
  } catch {
    // Turnkey tears its own session down on expiry, so this throws on the
    // session_expired path. Never block the rest of the teardown on it.
  }
  await purgeTurnkeyState();
  queryClient.clear();
  // `clear()` only empties the in-memory cache. Without this the persisted
  // AsyncStorage blob survives and rehydrates the previous user's
  // wallet-balance / wallet-history / user-profile on next launch.
  try {
    await persister.removeClient();
  } catch {
    // ignore
  }
  reset();
  resetAnalytics?.();
}

export function performSessionTeardown(
  reason: TeardownReason,
  deps: SessionTeardownDeps,
): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = run(reason, deps).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
