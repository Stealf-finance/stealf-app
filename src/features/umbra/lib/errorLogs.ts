const MAX_DEPTH = 8;

type ErrorNode = {
  logs?: unknown;
  context?: { logs?: unknown };
  data?: { logs?: unknown };
  cause?: unknown;
  name?: unknown;
  code?: unknown;
  message?: unknown;
};

function logsAt(node: ErrorNode): string[] | null {
  for (const candidate of [node.logs, node.context?.logs, node.data?.logs]) {
    if (Array.isArray(candidate) && candidate.length) {
      const strings = candidate.filter((l): l is string => typeof l === 'string');
      if (strings.length) return strings;
    }
  }
  return null;
}

function* chain(err: unknown): Generator<ErrorNode> {
  const seen = new Set<unknown>();
  let node = err;
  for (let depth = 0; node && typeof node === 'object' && depth < MAX_DEPTH; depth++) {
    if (seen.has(node)) return;
    seen.add(node);
    yield node as ErrorNode;
    node = (node as ErrorNode).cause;
  }
}

/** Kit, web3.js and raw JSON-RPC each nest simulation logs differently. */
export function collectSimulationLogs(err: unknown): string[] {
  for (const node of chain(err)) {
    const found = logsAt(node);
    if (found) return found;
  }
  return [];
}

/** One line per link, so an UNKNOWN with no logs still says where it came from. */
export function describeErrorChain(err: unknown): string[] {
  const described: string[] = [];
  for (const node of chain(err)) {
    const name = typeof node.name === 'string' ? node.name : 'Error';
    const code = node.code === undefined ? '' : ` [${String(node.code)}]`;
    const message = typeof node.message === 'string' ? node.message : '';
    described.push(`${name}${code}: ${message}`);
  }
  return described;
}
