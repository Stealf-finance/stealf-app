/** Human token amount → integer base-unit string, exact to `decimals` (no float
 *  drift). Rejects non-positive / non-finite. */
export function toBaseUnits(amount: number, decimals: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const [intPart, fracPart] = amount.toFixed(decimals).split('.');
  const raw = `${intPart}${fracPart ?? ''}`.replace(/^0+/, '');
  return raw === '' ? '0' : raw;
}

/** Integer base units → human amount (for display / estimates). */
export function fromBaseUnits(raw: string | number, decimals: number): number {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** decimals;
}
