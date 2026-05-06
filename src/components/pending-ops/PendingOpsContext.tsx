import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  PendingOp,
  PendingOpPhase,
  PendingOpsApi,
} from './types';

const PendingOpsContext = createContext<PendingOpsApi | null>(null);

let counter = 0;
function nextId(): string {
  counter += 1;
  return `op_${Date.now().toString(36)}_${counter}`;
}

export function PendingOpsProvider({ children }: { children: ReactNode }) {
  const [ops, setOps] = useState<PendingOp[]>([]);
  // Track auto-dismiss timers so we can cancel if the op is dismissed early.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setOps((cur) => cur.filter((o) => o.id !== id));
  }, []);

  const enqueue = useCallback<PendingOpsApi['enqueue']>((init) => {
    const id = nextId();
    const op: PendingOp = {
      ...init,
      id,
      phase: 'submitting',
      startedAt: Date.now(),
    };
    setOps((cur) => [...cur, op]);
    return id;
  }, []);

  const setPhase = useCallback<PendingOpsApi['setPhase']>((id, phase) => {
    setOps((cur) =>
      cur.map((o) => (o.id === id ? { ...o, phase } : o)),
    );
  }, []);

  const complete = useCallback<PendingOpsApi['complete']>(
    (id, outcome, errorMessage) => {
      // 'done' shows the success state ("Shielded 1.23 SOL" + green check) for
      // a short dwell, then auto-dismisses. 'failed' lingers until the user
      // taps to dismiss so the error message doesn't disappear unread.
      setOps((cur) =>
        cur.map((o) =>
          o.id === id
            ? {
                ...o,
                phase: outcome,
                errorMessage,
                finishedAt: Date.now(),
              }
            : o,
        ),
      );

      if (outcome === 'done') {
        const prev = timers.current.get(id);
        if (prev) clearTimeout(prev);
        const timer = setTimeout(() => {
          timers.current.delete(id);
          setOps((cur) => cur.filter((o) => o.id !== id));
        }, 2400);
        timers.current.set(id, timer);
      }
    },
    [],
  );

  const api = useMemo<PendingOpsApi>(
    () => ({ ops, enqueue, setPhase, complete, dismiss }),
    [ops, enqueue, setPhase, complete, dismiss],
  );

  return (
    <PendingOpsContext.Provider value={api}>
      {children}
    </PendingOpsContext.Provider>
  );
}

export function usePendingOps(): PendingOpsApi {
  const ctx = useContext(PendingOpsContext);
  if (!ctx) {
    throw new Error('usePendingOps must be used inside <PendingOpsProvider>');
  }
  return ctx;
}

// Selects the most recent op to surface in the pill. Failed ops outrank
// in-flight ones so a fresh failure isn't hidden behind a new submission.
export function useTopPendingOp(): PendingOp | null {
  const { ops } = usePendingOps();
  if (ops.length === 0) return null;
  const failed = ops.filter((o) => o.phase === 'failed');
  if (failed.length > 0) return failed[failed.length - 1];
  return ops[ops.length - 1];
}

export function phaseLabel(phase: PendingOpPhase): string {
  switch (phase) {
    case 'submitting':
      return 'Submitting…';
    case 'proving':
      return 'Generating proof…';
    case 'broadcasting':
      return 'Broadcasting…';
    case 'confirming':
      return 'Confirming…';
    case 'done':
      return 'Done';
    case 'failed':
      return 'Failed';
  }
}

// Compact verbs per kind. Keep these short — they're the entire pill text
// alongside the amount, so every extra char widens the pill.
const VERBS: Record<
  import('./types').PendingOpKind,
  { ing: string; ed: string; noun: string }
> = {
  shield: { ing: 'Shielding', ed: 'Shielded', noun: 'Shield' },
  unshield: { ing: 'Unshielding', ed: 'Unshielded', noun: 'Unshield' },
  'move-bank-to-shielded': { ing: 'Moving', ed: 'Moved', noun: 'Move' },
  'move-shielded-to-bank': { ing: 'Moving', ed: 'Moved', noun: 'Move' },
  'move-stealth-to-bank': { ing: 'Moving', ed: 'Moved', noun: 'Move' },
  'send-private': { ing: 'Sending', ed: 'Sent', noun: 'Send' },
  'claim-to-bank': { ing: 'Claiming', ed: 'Claimed', noun: 'Claim' },
  'claim-to-shielded': { ing: 'Claiming', ed: 'Claimed', noun: 'Claim' },
};

function formatSolShort(sol: number): string {
  if (sol === 0) return '0';

  return `${Number(sol.toFixed(4))}`;
}


function sourceAssetSymbol(kind: import('./types').PendingOpKind): string {
  switch (kind) {
    case 'unshield':
    case 'move-shielded-to-bank':
    case 'send-private':
      return 'WSOL';
    case 'shield':
    case 'move-bank-to-shielded':
    case 'move-stealth-to-bank':
    case 'claim-to-bank':
    case 'claim-to-shielded':
      return 'SOL';
  }
}


export function formatPillText(op: import('./types').PendingOp): string {
  const v = VERBS[op.kind];
  if (op.kind === 'claim-to-bank' || op.kind === 'claim-to-shielded') {
    if (op.phase === 'done') return v.ed;
    if (op.phase === 'failed') return `${v.noun} failed`;
    return `${v.ing}…`;
  }
  const amount = `${formatSolShort(op.amountSol)} ${sourceAssetSymbol(op.kind)}`;
  if (op.phase === 'done') return `${v.ed} ${amount}`;
  if (op.phase === 'failed') return `${v.noun} failed`;
  return `${v.ing} ${amount}…`;
}
