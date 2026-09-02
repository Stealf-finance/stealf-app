import { describe, expect, it } from 'vitest';
import {
  feeRows,
  tradeRows,
  transferRows,
  PRIVATE_BALANCE,
  PUBLIC_BALANCE,
} from '../rows';

describe('transferRows', () => {
  it('reads From / To / Amount', () => {
    const rows = transferRows({
      from: PUBLIC_BALANCE,
      fromSub: '7xKq…9fPz',
      to: PRIVATE_BALANCE,
      amount: '1.5 SOL',
      amountUsd: 300,
    });

    expect(rows.map((r) => r.label)).toEqual(['From', 'To', 'Amount']);
    expect(rows[0]).toEqual({
      label: 'From',
      value: 'Public balance',
      sub: '7xKq…9fPz',
    });
    expect(rows[2].sub).toBe('$300.00');
  });

  it('omits the USD sub when the value is unknown', () => {
    const [, , amount] = transferRows({
      from: PUBLIC_BALANCE,
      to: 'abc',
      amount: '1.5 SOL',
    });
    expect(amount.sub).toBeUndefined();
  });
});

describe('tradeRows', () => {
  it('reads You pay / You receive / Rate', () => {
    const rows = tradeRows({
      pay: '1.5 SOL',
      receive: '≈ 1.4821 JitoSOL',
      rate: '1 JitoSOL ≈ 1.012 SOL',
    });
    expect(rows.map((r) => r.label)).toEqual([
      'You pay',
      'You receive',
      'Rate',
    ]);
  });

  it('drops the rate row when no rate is known', () => {
    const rows = tradeRows({ pay: '1.5 SOL', receive: '≈ 1.48 JitoSOL' });
    expect(rows).toHaveLength(2);
  });
});

describe('feeRows', () => {
  it('shows the network fee at 4 decimals', () => {
    expect(feeRows({ networkFeeUsd: 0.00123 })).toEqual([
      { label: 'Network fee', value: '$0.0012' },
    ]);
  });

  it('adds the privacy fee only when one applies', () => {
    const rows = feeRows({ networkFeeUsd: 0.001, privacyFeeUsd: 0.9 });
    expect(rows[1]).toEqual({ label: 'Privacy fee · 0.30%', value: '$0.90' });
  });
});
