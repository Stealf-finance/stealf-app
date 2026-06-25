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
  const { httpClient, wallets } = useTurnkey();
  const [loading, setLoading] = useState(false);

  const deriveEvmAddress = useCallback(async (): Promise<string> => {
    if (!httpClient) throw new Error('Turnkey client not ready');
    const wallet = wallets?.[0];
    const walletId = wallet?.walletId;
    if (!walletId) throw new Error('No Turnkey wallet available');

    // Fast path: reuse an Ethereum account already derived on this wallet.
    const existing = wallet?.accounts?.find(
      (a) => a.addressFormat === ETH_ADDRESS_FORMAT,
    );
    if (existing?.address) return existing.address;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [httpClient, wallets]);

  return { deriveEvmAddress, loading };
}
