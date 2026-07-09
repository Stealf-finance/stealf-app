/**
 * useEvmAddress — derive the borrower's EVM address from their existing Turnkey
 * HD wallet (same seed, same sub-org). Portola is EVM-only, so the borrower
 * wallet is an Ethereum account derived alongside the Solana bank wallet.
 *
 * Silent (signed by the active session, no prompt), idempotent on (walletId,
 * path) — Turnkey dedupes by derivation path, so re-calling returns the same
 * address. The user connects nothing.
 */
import { useCallback, useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';

// Standard Ethereum derivation path.
const ETH_PATH = "m/44'/60'/0'/0/0";
const ETH_ADDRESS_FORMAT = 'ADDRESS_FORMAT_ETHEREUM';

export function useEvmAddress() {
  const { httpClient, wallets, refreshWallets } = useTurnkey();
  const [loading, setLoading] = useState(false);

  const deriveEvmAddress = useCallback(async (): Promise<string> => {
    if (!httpClient) throw new Error('Turnkey client not ready');
    // The reactive `wallets` array is often still empty right after this screen
    // mounts (the Turnkey session hydrates asynchronously). Force a refresh
    // before giving up so the borrow flow doesn't fail with a spurious
    // "No Turnkey wallet available" on the first open.
    let wallet = wallets?.[0];
    if (!wallet?.walletId) {
      const refreshed = await refreshWallets();
      wallet = refreshed?.[0];
    }
    const walletId = wallet?.walletId;
    if (!walletId) throw new Error('No Turnkey wallet available');

    // Fast path: reuse an Ethereum account already present in the cached
    // wallet state (no network round-trip).
    const cached = wallet?.accounts?.find(
      (a) => a.addressFormat === ETH_ADDRESS_FORMAT,
    );
    if (cached?.address) return cached.address;

    setLoading(true);
    try {
      // The cached `wallet.accounts` can be stale — e.g. the ETH account was
      // created in a previous attempt but the local wallet state hasn't been
      // re-hydrated. Query Turnkey directly before trying to create, otherwise
      // `createWalletAccounts` throws "path already exists in wallet account".
      const fetchEthAddress = async (): Promise<string | undefined> => {
        const res = await httpClient.getWalletAccounts({ walletId });
        return res.accounts?.find(
          (a) => a.addressFormat === ETH_ADDRESS_FORMAT && a.path === ETH_PATH,
        )?.address;
      };

      const alreadyDerived = await fetchEthAddress();
      if (alreadyDerived) return alreadyDerived;

      try {
        const { addresses } = await httpClient.createWalletAccounts({
          walletId,
          accounts: [
            {
              curve: 'CURVE_SECP256K1',
              pathFormat: 'PATH_FORMAT_BIP32',
              path: ETH_PATH,
              addressFormat: ETH_ADDRESS_FORMAT,
            },
          ],
        });
        const addr = addresses[0];
        if (!addr) throw new Error('No EVM address returned');
        return addr;
      } catch (err) {
        // Race / stale state: the path exists after all → fetch and return it.
        const msg = err instanceof Error ? err.message : String(err);
        if (/already exists/i.test(msg)) {
          const addr = await fetchEthAddress();
          if (addr) return addr;
        }
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [httpClient, wallets, refreshWallets]);

  return { deriveEvmAddress, loading };
}
