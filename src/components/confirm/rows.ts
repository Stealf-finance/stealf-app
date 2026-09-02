/** Row builders for ConfirmSheet — transfers read From/To/Amount, trades read You pay/You receive/Rate. */

export type ConfirmRow = { label: string; value: string; sub?: string };

/** The two money buckets, as the UI names them. */
export const PUBLIC_BALANCE = 'Public balance';
export const PRIVATE_BALANCE = 'Private balance';

const usd = (n: number, decimals = 2) => `$${n.toFixed(decimals)}`;

export function transferRows(p: {
  from: string;
  fromSub?: string;
  to: string;
  toSub?: string;
  amount: string;
  amountUsd?: number;
}): ConfirmRow[] {
  return [
    { label: 'From', value: p.from, sub: p.fromSub },
    { label: 'To', value: p.to, sub: p.toSub },
    {
      label: 'Amount',
      value: p.amount,
      sub: p.amountUsd === undefined ? undefined : usd(p.amountUsd),
    },
  ];
}

export function tradeRows(p: {
  pay: string;
  receive: string;
  rate?: string;
}): ConfirmRow[] {
  const rows: ConfirmRow[] = [
    { label: 'You pay', value: p.pay },
    { label: 'You receive', value: p.receive },
  ];
  if (p.rate) rows.push({ label: 'Rate', value: p.rate });
  return rows;
}

export function feeRows(p: {
  networkFeeUsd: number;
  privacyFeeUsd?: number;
}): ConfirmRow[] {
  const rows: ConfirmRow[] = [
    { label: 'Network fee', value: usd(p.networkFeeUsd, 4) },
  ];
  if (p.privacyFeeUsd !== undefined) {
    rows.push({ label: 'Privacy fee · 0.30%', value: usd(p.privacyFeeUsd) });
  }
  return rows;
}
