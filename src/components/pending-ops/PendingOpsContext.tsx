import { ReactNode } from 'react';
import { toast } from 'sonner-native';
import type { PendingOp, PendingOpKind, PendingOpsApi } from './types';
import { startPendingTx, endPendingTx } from './pendingTxStore';

// Transaction progress splits between two surfaces: the in-flight spinner lives
// in the bottom TabBar (driven by pendingTxStore); the confirmed / failed
// result surfaces as a toast. This provider is a pass-through — op metadata
// lives in a module map keyed by id.
export function PendingOpsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type OpInit = Omit<PendingOp, 'id' | 'phase' | 'startedAt'>;

const OPS = new Map<string, OpInit>();

let counter = 0;
function nextId(): string {
  counter += 1;
  return `op_${Date.now().toString(36)}_${counter}`;
}

// Compact verbs per kind.
const VERBS: Record<
  PendingOpKind,
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

function isClaim(kind: PendingOpKind): boolean {
  return kind === 'claim-to-bank' || kind === 'claim-to-shielded';
}

function amountLabel(init: OpInit): string {
  const n = init.amountSol === 0 ? '0' : `${Number(init.amountSol.toFixed(4))}`;
  return `${n} ${init.assetSymbol ?? 'SOL'}`;
}

function doneTitle(init: OpInit): string {
  const v = VERBS[init.kind];
  // Confirmed reads amount-first: "2 SOL shielded", "2 SOL sent", …
  return isClaim(init.kind)
    ? v.ed
    : `${amountLabel(init)} ${v.ed.toLowerCase()}`;
}

function failedTitle(init: OpInit): string {
  return `${VERBS[init.kind].noun} failed`;
}

const API: PendingOpsApi = {
  ops: [],
  enqueue: (init) => {
    const id = nextId();
    OPS.set(id, init);
    startPendingTx();
    return id;
  },
  // Phases no longer surface individually — the TabBar spinner covers the whole
  // in-flight window.
  setPhase: () => {},
  complete: (id, outcome, errorMessage) => {
    const init = OPS.get(id);
    if (!init) return;
    OPS.delete(id);
    endPendingTx();
    if (outcome === 'done') {
      toast.success(doneTitle(init), {
        description: 'Confirmed',
        duration: 2600,
      });
    } else {
      // Failures linger until dismissed so the message is read.
      toast.error(failedTitle(init), {
        description: errorMessage,
        duration: Infinity,
      });
    }
  },
  dismiss: (id) => {
    if (OPS.has(id)) {
      OPS.delete(id);
      endPendingTx();
    }
  },
};

export function usePendingOps(): PendingOpsApi {
  return API;
}
