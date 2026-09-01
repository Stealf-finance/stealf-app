import { useSyncExternalStore } from 'react';
import {
  hasActiveSigner,
  subscribeToActiveSigner,
} from '@/src/services/umbra/signers/active';

/**
 * Whether Turnkey has hydrated far enough for the Umbra service layer to sign.
 *
 * Any query whose `queryFn` reaches `getActiveClient()` must gate its `enabled`
 * on this. Without it the query fires before `useUmbraSigner` has installed
 * anything, `getActiveSigner()` throws synchronously, and React Query records
 * a genuine-looking fetch error for what is really "not ready yet" — a state
 * that resolves on its own a moment later, but only if something re-runs.
 */
export function useHasActiveSigner(): boolean {
  return useSyncExternalStore(subscribeToActiveSigner, hasActiveSigner);
}
