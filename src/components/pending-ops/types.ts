import type { Tone } from '@/src/design-system/palettes';

export type PendingOpKind =
  | 'shield'
  | 'unshield'
  | 'move-bank-to-shielded'
  | 'move-shielded-to-bank'
  | 'move-stealth-to-bank'
  | 'send-private';

export type PendingOpPhase =
  | 'submitting'
  | 'proving'
  | 'broadcasting'
  | 'confirming'
  | 'done'
  | 'failed';

export type PendingOp = {
  id: string;
  kind: PendingOpKind;
  tone: Tone;
  amountSol: number;
  phase: PendingOpPhase;
  errorMessage?: string;
  startedAt: number;
  finishedAt?: number;
};

export type PendingOpsApi = {
  ops: PendingOp[];
  // Returns the assigned id so callers can drive phase updates.
  enqueue: (init: Omit<PendingOp, 'id' | 'phase' | 'startedAt'>) => string;
  setPhase: (id: string, phase: Exclude<PendingOpPhase, 'done' | 'failed'>) => void;
  complete: (id: string, outcome: 'done' | 'failed', errorMessage?: string) => void;
  dismiss: (id: string) => void;
};
