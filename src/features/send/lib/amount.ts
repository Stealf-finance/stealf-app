export const SOL_DECIMALS = 9;

/** SOL kept back for fees on a one-transaction op. See `maxSpendable`. */
export const SOL_FEE_RESERVE = 0.01;

/** Umbra chains several transactions and can pay rent, so it reserves more. */
export const PRIVATE_OP_SOL_FEE_RESERVE = 0.02;

export const PROTOCOL_FEE_RATE = 0.003;

export const NETWORK_FEE_SOL = 0.000005;

/** MAX never shows more precision than this — the dust below is not worth a digit. */
export const MAX_AMOUNT_DECIMALS = 6;

export const FEE_HEADROOM_MESSAGE = 'Not enough SOL for fees';

export function toRawAmount(human: number, decimals: number): bigint {
  if (!Number.isFinite(human) || human < 0) {
    throw new Error(`Invalid amount: ${human}`);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  const str = human.toFixed(decimals);
  const [intPart, fracPartRaw = ''] = str.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${intPart}${fracPart}`.replace(/^0+(?=\d)/, '');
  return BigInt(combined.length === 0 ? '0' : combined);
}

/** Rounds down to `decimals`, so a MAX can never land above the real ceiling. */
export function floorTo(value: number, decimals: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const rounded = Math.round(scaled);
  // A gap smaller than a millionth of a base unit is float noise, not money.
  const units =
    Math.abs(scaled - rounded) < 1e-6 ? rounded : Math.floor(scaled);
  return units / factor;
}

export type MaxSpendableParams = {
  balance: number;
  decimals: number;
  /** True when the amount is denominated in the same SOL that pays the fees. */
  spendsSol: boolean;
  reserve?: number;
  /** Umbra takes its 0.30% off the top. */
  hasProtocolFee?: boolean;
};

/** The most a user can actually send — what MAX fills in, and the ceiling the CTA guards. */
export function maxSpendable({
  balance,
  decimals,
  spendsSol,
  reserve = SOL_FEE_RESERVE,
  hasProtocolFee = false,
}: MaxSpendableParams): number {
  const afterProtocol = hasProtocolFee
    ? balance * (1 - PROTOCOL_FEE_RATE)
    : balance;
  const max = spendsSol ? afterProtocol - reserve : afterProtocol;
  return floorTo(Math.max(0, max), Math.min(decimals, MAX_AMOUNT_DECIMALS));
}

/** Same reserve, read the other way: a token op needs that much SOL on hand. */
export function hasFeeHeadroom(
  solBalance: number,
  reserve: number = SOL_FEE_RESERVE,
): boolean {
  return solBalance >= reserve;
}

type TokenLike = { tokenSymbol: string; balance: number };

/** The wallet's public SOL — what pays the fees, whatever the amount is denominated in. */
export function solBalanceOf(tokens: readonly TokenLike[] | undefined): number {
  return tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
}

/** Whether to block for want of fee SOL. A balance still in flight accuses nobody. */
export function isFeeShort(
  tokens: readonly TokenLike[] | undefined,
  reserve: number = SOL_FEE_RESERVE,
): boolean {
  if (!tokens) return false;
  return !hasFeeHeadroom(solBalanceOf(tokens), reserve);
}

export function protocolFeeSol(amountSol: number): number {
  return amountSol * PROTOCOL_FEE_RATE;
}

export function applyAmountKey(
  current: string,
  key: string,
  maxDecimals = SOL_DECIMALS,
): string {
  if (key === '⌫') return current.length > 1 ? current.slice(0, -1) : '0';
  if (key === '.') return current.includes('.') ? current : current + '.';

  const next = current === '0' ? key : current + key;
  const dotIdx = next.indexOf('.');

  if (dotIdx >= 0) {
    const fractional = next.length - dotIdx - 1;
    if (fractional > maxDecimals) return current;
  } else if (next.length > 12) {
    return current;
  }

  return next;
}
