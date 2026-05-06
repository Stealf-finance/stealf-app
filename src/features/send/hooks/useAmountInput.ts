import { useState } from 'react';
import { applyAmountKey } from '@/src/features/send/lib/amount';
import type { InputMode } from '@/src/features/send/components/SourceAssetCard';

type Params = {
  /** SOL → USD rate. 0 disables the fiat toggle. */
  rate: number;
  /** Spendable SOL after fee/protocol-fee carve-outs. Drives the percent shortcuts. */
  maxSol: number;
};

/**
 * Centralizes the dual-mode (SOL / USD) amount-entry behavior shared
 * between Shield, Unshield, and Move flows.
 *
 * The Numpad writes a single string; what it represents depends on
 * `inputMode`. `solAmount` is always SOL — that's what tx logic should
 * consume regardless of how the user typed.
 */
export function useAmountInput({ rate, maxSol }: Params) {
  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('asset');

  const typedNum = Number(amount) || 0;
  const solAmount =
    inputMode === 'asset' ? typedNum : rate > 0 ? typedNum / rate : 0;
  const fiatAmount = inputMode === 'asset' ? typedNum * rate : typedNum;

  // Fiat primary always reads as currency — '$0.00' for the empty state,
  // '$<typed>' once the user starts entering digits. The state itself
  // stays a plain numeric string so applyAmountKey works unchanged.
  const primaryDisplay =
    inputMode === 'fiat'
      ? amount === '0'
        ? '$0.00'
        : `$${amount}`
      : amount;

  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k));

  const onPressPercent = (pct: number) => {
    const sol = maxSol * pct;
    if (inputMode === 'fiat') {
      if (rate <= 0) return;
      setAmount((sol * rate).toFixed(2));
    } else {
      setAmount(sol.toFixed(4).replace(/\.?0+$/, '') || '0');
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
