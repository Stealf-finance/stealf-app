import { useEffect, useState } from 'react';

// Number of transactions currently in flight. While > 0 the bottom TabBar
// shows a spinner (the loading indicator lives there, not in a toast).
let count = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function startPendingTx(): void {
  count += 1;
  emit();
}

export function endPendingTx(): void {
  count = Math.max(0, count - 1);
  emit();
}

export function usePendingTxActive(): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return count > 0;
}
