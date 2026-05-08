import type { Tone } from '@/src/design-system/palettes';

export type PendingOpKind =
  | 'shield'
  | 'unshield'
  | 'move-bank-to-shielded'
  | 'move-shielded-to-bank'
  | 'move-stealth-to-bank'
  | 'send-private'
  | 'claim-to-bank'
  | 'claim-to-shielded';

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
  /** Humanized amount in token units (despite the legacy "Sol" suffix the
   * field carries the asset's amount, not strictly SOL). */
  amountSol: number;
  /** Optional asset symbol — overrides the kind-based SOL/WSOL fallback so
   * a USDC/JUP/etc. shield surfaces the right token in the pill text. */
  assetSymbol?: string;
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
