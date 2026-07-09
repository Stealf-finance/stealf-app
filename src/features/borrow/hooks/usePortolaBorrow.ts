/**
 * usePortolaBorrow — orchestrates opening the Portola borrow flow:
 *   1. derive the borrower's EVM address (Turnkey, silent)
 *   2. mint an embed session on our backend → embedUrl
 *
 * Exposes `start()` (and `remint()` for the 24h session-expiry case). The
 * screen mounts the WebView at `embedUrl` once it's set.
 *
 * Each network step is bounded by a timeout and surfaces a step-named error so
 * a hang is diagnosable (Turnkey wallet vs Portola session mint) instead of an
 * indefinite "Preparing your loan…" spinner.
 */
import { useCallback, useState } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { mintPortolaSession } from '../api/session';
import { useEvmAddress } from './useEvmAddress';

/** Which network step the flow is on (drives the spinner label). */
export type BorrowStep = 'idle' | 'wallet' | 'session';

const STEP_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out — check your connection and retry.`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function usePortolaBorrow() {
  const { session } = useAuth();
  const { deriveEvmAddress } = useEvmAddress();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<BorrowStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    const token = session?.sessionToken;
    if (!token) {
      setError('Not authenticated');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStep('wallet');
      const address = await withTimeout(
        deriveEvmAddress(),
        STEP_TIMEOUT_MS,
        'Preparing your wallet',
      );

      setStep('session');
      const minted = await withTimeout(
        mintPortolaSession(token, address),
        STEP_TIMEOUT_MS,
        'Requesting your loan session',
      );
      setEmbedUrl(minted.embedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Portola');
      setEmbedUrl(null);
    } finally {
      setStep('idle');
      setLoading(false);
    }
  }, [session, deriveEvmAddress]);

  // Session expired (24h) → mint a fresh one and reload the WebView.
  const remint = useCallback(async () => {
    setEmbedUrl(null);
    await start();
  }, [start]);

  return { embedUrl, start, remint, loading, step, error };
}
