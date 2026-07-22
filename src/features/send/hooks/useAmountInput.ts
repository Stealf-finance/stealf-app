import { useState } from 'react';
import { applyAmountKey } from '@/src/features/send/lib/amount';
import type { InputMode } from '@/src/features/send/components/SourceAssetCard';

type Params = {
  rate: number;
  maxSol: number;
  decimals?: number;
};

export function useAmountInput({ rate, maxSol, decimals = 9 }: Params) {
  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('asset');

  const typedNum = Number(amount) || 0;
  const solAmount =
    inputMode === 'asset' ? typedNum : rate > 0 ? typedNum / rate : 0;
  const fiatAmount = inputMode === 'asset' ? typedNum * rate : typedNum;

  const primaryDisplay =
    inputMode === 'fiat'
      ? amount === '0'
        ? '$0.00'
        : `$${amount}`
      : amount;

  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k, decimals));

  const onPressPercent = (pct: number) => {
    const sol = maxSol * pct;
    // Floor (never round up): toFixed rounds to nearest, so "Max" on a balance
    // like 1.23456 produced 1.2346 > balance and the guard blocked the send.
    if (inputMode === 'fiat') {
      if (rate <= 0) return;
      setAmount((Math.floor(sol * rate * 100) / 100).toFixed(2));
    } else {
      const floored = Math.floor(sol * 1e4) / 1e4;
      setAmount(floored.toFixed(4).replace(/\.?0+$/, '') || '0');
    }
  };

  const onToggleMode = () => {
    if (rate <= 0) return;
    if (inputMode === 'asset') {
      const fiat = typedNum * rate;
      setAmount(fiat > 0 ? fiat.toFixed(2) : '0');
      setInputMode('fiat');
    } else {
      const sol = typedNum > 0 && rate > 0 ? typedNum / rate : 0;
      const trimmed = sol > 0 ? sol.toFixed(4).replace(/\.?0+$/, '') : '0';
      setAmount(trimmed || '0');
      setInputMode('asset');
    }
  };

  return {
    amount,
    setAmount,
    inputMode,
    typedNum,
    solAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  };
}
