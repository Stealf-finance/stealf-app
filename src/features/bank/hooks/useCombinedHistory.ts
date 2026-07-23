import { useHistory } from './useHistory';
import type { Transaction } from '../types';

/** Merged bank + stealth wallet history, newest first (by slot). Used by the
 *  Home History tab; the modal keeps its per-wallet view. A transfer between
 *  the user's own wallets keeps both rows (sent + received perspectives). */
export function useCombinedHistory(
  bankAddress: string | null | undefined,
  stealthAddress: string | null | undefined,
) {
  const bank = useHistory(bankAddress);
  const stealth = useHistory(stealthAddress);

  const transactions: Transaction[] = [
    ...(bank.data?.transactions ?? []),
    ...(stealth.data?.transactions ?? []),
  ].sort((a, b) => b.slot - a.slot);

  return {
    transactions,
    isLoading: bank.isLoading || stealth.isLoading,
  };
}
