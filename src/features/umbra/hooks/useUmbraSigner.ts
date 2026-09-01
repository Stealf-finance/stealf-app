import { useEffect, useMemo, useRef } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import {
  createTurnkeyUmbraSigner,
  type TurnkeySignMessageFn,
  type TurnkeySignTransactionFn,
  type TurnkeyWalletAccount,
} from '@/src/services/umbra/signers/turnkey';
import {
  clearActiveSigner,
  setActiveSigner,
} from '@/src/services/umbra/signers/active';

/**
 * Installs the Turnkey-backed Umbra signer so the service layer can reach it
 * without React. Mounted once, from `DataBootstrap`.
 *
 * The installed signer is **stable per address**: its `signTransaction` /
 * `signMessage` delegate through refs to whatever `useTurnkey()` currently
 * exposes. That matters because the assembled Umbra client is cached by
 * address and holds onto the signer object — binding today's callbacks into it
 * directly would leave the cached client calling a stale closure after a
 * session refresh, and rebuilding the client on every callback identity change
 * would re-create the sharded UTXO stores on each render.
 */
export function useUmbraSigner(): void {
  const { signTransaction, signMessage, wallets } = useTurnkey();
  const walletAccount = wallets?.[0]?.accounts?.[0] ?? null;
  const address = walletAccount?.address ?? null;

  const accountRef = useRef(walletAccount);
  const signTxRef = useRef(signTransaction);
  const signMsgRef = useRef(signMessage);
  // Refreshed after commit, not during render: a ref write in render blocks
  // React Compiler from memoizing the hook.
  useEffect(() => {
    accountRef.current = walletAccount;
    signTxRef.current = signTransaction;
    signMsgRef.current = signMessage;
  });

  const signer = useMemo(() => {
    if (!address) return null;
    return createTurnkeyUmbraSigner({
      walletAccount: { address } as TurnkeyWalletAccount,
      // Turnkey types its own `WalletAccount`; the signer only ever reads
      // `.address` off it, so hand back whatever the hook currently holds.
      signTransaction: ((params) =>
        signTxRef.current!({
          ...params,
          walletAccount: accountRef.current,
        } as never)) as TurnkeySignTransactionFn,
      signMessage: ((params) =>
        signMsgRef.current!({
          ...params,
          walletAccount: accountRef.current,
        } as never)) as TurnkeySignMessageFn,
    });
  }, [address]);

  useEffect(() => {
    if (!signer) return;
    setActiveSigner(signer);
    return () => clearActiveSigner();
  }, [signer]);
}
