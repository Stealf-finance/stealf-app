import { ReactNode } from 'react';
import { toast } from 'sonner-native';
import type { PendingOp, PendingOpKind, PendingOpsApi } from './types';

// One toast per operation, from spinner to outcome: sonner updates a toast in
// place when it is re-added under the same id, so the op id is the toast id.
// This provider is a pass-through — op metadata lives in a module map by id.
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
const VERBS: Record<PendingOpKind, { ing: string; ed: string; noun: string }> =
  {
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

function pendingTitle(init: OpInit): string {
  const v = VERBS[init.kind];
  return isClaim(init.kind) ? v.ing : `${v.ing} ${amountLabel(init)}`;
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
    // Same shape as the outcome toast below — title + description — so the
    // update swaps the content without resizing the toast.
    toast.loading(pendingTitle(init), {
      id,
      description: 'Pending',
      duration: Infinity,
    });
    return id;
  },
  // Phases no longer surface individually — the spinner toast covers the whole
  // in-flight window.
  setPhase: () => {},
  complete: (id, outcome, errorMessage) => {
    const init = OPS.get(id);
    if (!init) return;
    OPS.delete(id);
    if (outcome === 'done') {
      toast.success(doneTitle(init), {
        id,
        description: 'Confirmed',
        duration: 2600,
      });
    } else {
      // Failures linger until dismissed so the message is read.
      toast.error(failedTitle(init), {
        id,
        description: errorMessage,
        duration: Infinity,
      });
    }
  },
  dismiss: (id) => {
    if (OPS.delete(id)) toast.dismiss(id);
  },
};

/** True while an op's spinner toast is up. It cannot be dismissed by hand, so
 *  the toast layer renders it touch-through. */
export function isOpPending(id: string | number): boolean {
  return typeof id === 'string' && OPS.has(id);
}

export function usePendingOps(): PendingOpsApi {
  return API;
}
