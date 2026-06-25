/**
 * usePortolaBorrow — orchestrates opening the Portola borrow flow:
 *   1. derive the borrower's EVM address (Turnkey, silent)
 *   2. mint an embed session on our backend → embedUrl
 *
 * Exposes `start()` (and `remint()` for the 24h session-expiry case). The
 * screen mounts the WebView at `embedUrl` once it's set.
 */
import { useCallback, useState } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { mintPortolaSession } from '../api/session';
import { useEvmAddress } from './useEvmAddress';

export function usePortolaBorrow() {
  const { session } = useAuth();
  const { deriveEvmAddress } = useEvmAddress();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      const address = await deriveEvmAddress();
      const minted = await mintPortolaSession(token, address);
      setEmbedUrl(minted.embedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Portola');
      setEmbedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [session, deriveEvmAddress]);

  // Session expired (24h) → mint a fresh one and reload the WebView.
  const remint = useCallback(async () => {
    setEmbedUrl(null);
    await start();
  }, [start]);

  return { embedUrl, start, remint, loading, error };
}
