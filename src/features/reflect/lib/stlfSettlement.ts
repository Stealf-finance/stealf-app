/**
 * Detects that a STLF mint/burn has landed, from the `balance:updated` socket
 * event the Helius webhook drives. The wallet room carries every tx touching
 * the bank wallet, so a trade is recognised by its effect on the STLF holding
 * rather than by the event itself.
 */
import { STLF_DECIMALS } from '../api/reflect';

type TokenLike = { tokenMint: string | null; balance: number };

/** The wallet's STLF holding in base units — 0 when the ATA doesn't exist. */
export function stlfBaseUnits(
  tokens: readonly TokenLike[],
  mint: string | undefined,
): number {
  if (!mint) return 0;
  const held = tokens.find((t) => t.tokenMint === mint);
  return held ? Math.round(held.balance * 10 ** STLF_DECIMALS) : 0;
}

/** True once the holding moved off the value recorded at submit time. */
export function hasStlfSettled(
  tokens: readonly TokenLike[],
  mint: string | undefined,
  baselineBaseUnits: number,
): boolean {
  if (!mint) return false;
  return stlfBaseUnits(tokens, mint) !== baselineBaseUnits;
}
