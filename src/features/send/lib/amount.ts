export const SOL_DECIMALS = 9;

export const SOL_FEE_RESERVE = 0.01;

export const PROTOCOL_FEE_RATE = 0.003;

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

export function maxSpendableSol(
  balance: number,
  sourcePaysFees: boolean,
  hasProtocolFee = false,
): number {
  let max = hasProtocolFee ? balance * (1 - PROTOCOL_FEE_RATE) : balance;
  if (sourcePaysFees) max -= SOL_FEE_RESERVE;
  return Math.max(0, max);
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
