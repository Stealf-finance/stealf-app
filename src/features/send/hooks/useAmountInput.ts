import { useState } from 'react';
import {
  applyAmountKey,
  floorTo,
  MAX_AMOUNT_DECIMALS,
} from '@/src/features/send/lib/amount';
import type { InputMode } from '@/src/features/send/components/SourceAssetCard';

type Params = {
  rate: number;
  maxSol: number;
  decimals?: number;
};

/** Fixed-decimal string with the trailing zeros dropped — "1.2300" reads "1.23". */
function trimAmount(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed || '0';
}

export function useAmountInput({ rate, maxSol, decimals = 9 }: Params) {
  const inputDecimals = Math.min(decimals, MAX_AMOUNT_DECIMALS);
  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('asset');

  const typedNum = Number(amount) || 0;
  const solAmount =
    inputMode === 'asset' ? typedNum : rate > 0 ? typedNum / rate : 0;
  const fiatAmount = inputMode === 'asset' ? typedNum * rate : typedNum;

  const primaryDisplay =
    inputMode === 'fiat' ? (amount === '0' ? '$0.00' : `$${amount}`) : amount;

  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k, decimals));

  // Both sides floor: rounding up would put MAX above what can be spent.
  const onPressPercent = (pct: number) => {
    const sol = floorTo(maxSol * pct, inputDecimals);
    if (inputMode === 'fiat') {
      if (rate <= 0) return;
      setAmount(floorTo(sol * rate, 2).toFixed(2));
    } else {
      setAmount(trimAmount(sol, inputDecimals));
    }
  };

  const onToggleMode = () => {
    if (rate <= 0) return;
    if (inputMode === 'asset') {
      const fiat = floorTo(typedNum * rate, 2);
      setAmount(fiat > 0 ? fiat.toFixed(2) : '0');
      setInputMode('fiat');
    } else {
      const sol = typedNum > 0 && rate > 0 ? typedNum / rate : 0;
      setAmount(trimAmount(floorTo(sol, inputDecimals), inputDecimals));
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
