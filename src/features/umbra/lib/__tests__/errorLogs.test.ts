import { describe, it, expect } from 'vitest';
import { collectSimulationLogs, describeErrorChain } from '../errorLogs';

const LOGS = ['Program X invoke [1]', 'Program X failed'];

describe('collectSimulationLogs', () => {
  it('reads the kit shape one level down, as the old helper did', () => {
    expect(collectSimulationLogs({ cause: { context: { logs: LOGS } } })).toEqual(LOGS);
  });

  it('reads logs on the top-level error — the sendTransaction path has no cause', () => {
    expect(collectSimulationLogs({ logs: LOGS })).toEqual(LOGS);
  });

  it('reads the raw JSON-RPC shape', () => {
    expect(collectSimulationLogs({ data: { logs: LOGS } })).toEqual(LOGS);
  });

  it('digs through several causes', () => {
    const err = { cause: { cause: { cause: { context: { logs: LOGS } } } } };
    expect(collectSimulationLogs(err)).toEqual(LOGS);
  });

  it('returns the outermost logs when more than one link carries them', () => {
    const err = { context: { logs: ['outer'] }, cause: { logs: ['inner'] } };
    expect(collectSimulationLogs(err)).toEqual(['outer']);
  });

  it('skips an empty array and keeps digging', () => {
    expect(collectSimulationLogs({ logs: [], cause: { logs: LOGS } })).toEqual(LOGS);
  });

  it('drops non-string entries', () => {
    expect(collectSimulationLogs({ logs: [1, 'kept', null] })).toEqual(['kept']);
  });

  it('survives a cycle', () => {
    const a: Record<string, unknown> = {};
    a.cause = a;
    expect(collectSimulationLogs(a)).toEqual([]);
  });

  it('gives up rather than recursing forever on a long chain', () => {
    let node: Record<string, unknown> = { context: { logs: LOGS } };
    for (let i = 0; i < 20; i++) node = { cause: node };
    expect(collectSimulationLogs(node)).toEqual([]);
  });

  it('returns nothing for a plain error', () => {
    expect(collectSimulationLogs(new Error('boom'))).toEqual([]);
    expect(collectSimulationLogs(undefined)).toEqual([]);
  });
});

describe('describeErrorChain', () => {
  it('names every link so an UNKNOWN still says where it came from', () => {
    const inner = Object.assign(new Error('Program failed to complete'), {
      name: 'SolanaError',
      code: 'SOLANA_ERROR__INSTRUCTION_ERROR__PROGRAM_FAILED_TO_COMPLETE',
    });
    const outer = Object.assign(new Error('transfer failed'), { cause: inner });
    expect(describeErrorChain(outer)).toEqual([
      'Error: transfer failed',
      'SolanaError [SOLANA_ERROR__INSTRUCTION_ERROR__PROGRAM_FAILED_TO_COMPLETE]: Program failed to complete',
    ]);
  });
});
