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

// `done` ops live for this long in the list so the pill can show a success
// state before sliding away. `failed` ops stay until dismissed manually.
const DONE_LINGER_MS = 2500;

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
        const t = setTimeout(() => {
          timers.current.delete(id);
          setOps((cur) => cur.filter((o) => o.id !== id));
        }, DONE_LINGER_MS);
        timers.current.set(id, t);
      }
      // 'failed' lingers until user dismisses or app teardown.
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
};

function formatSolShort(sol: number): string {
  if (sol === 0) return '0';
  // Up to 4 decimals, strip trailing zeros so "0.5 SOL" reads tighter than
  // "0.5000 SOL". Cap at 4 to keep the pill narrow.
  return `${Number(sol.toFixed(4))}`;
}

/**
 * Single-line text shown inside the pill. Derived from the op so the pill
 * never has to truncate — the text is sized to fit ~24 chars at fontSize 12,
 * which comfortably matches our 280-pt cap.
 */
export function formatPillText(op: import('./types').PendingOp): string {
  const v = VERBS[op.kind];
  const sol = `${formatSolShort(op.amountSol)} SOL`;
  if (op.phase === 'done') return `${v.ed} ${sol}`;
  if (op.phase === 'failed') return `${v.noun} failed`;
  return `${v.ing} ${sol}…`;
}
