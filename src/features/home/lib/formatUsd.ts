/** Split a USD amount into a grouped integer part and a 2-dp decimal part.
 *  Mirrors the formatting previously inlined in BalanceCard. */
export function splitUsd(usd: number): { int: string; dec: string } {
  const [int, dec = '00'] = Math.abs(usd).toFixed(2).split('.');
  const grouped = Number(int).toLocaleString('en-US');
  return { int: `${usd < 0 ? '-' : ''}${grouped}`, dec: `.${dec}` };
}
