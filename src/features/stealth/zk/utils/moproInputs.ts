import type { MoproInputs } from '../types';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) =>
      Array.isArray(v) ? toStringArray(v) : [String((v as { toString(): string }).toString())],
    );
  }
  return [String((value as { toString(): string }).toString())];
}

/**
 * Mopro provers expect every circuit input to be a flat `string[]` of
 * decimal field elements. Some inputs in the Umbra SDK come through as
 * `bigint`, others as nested arrays — this normaliser handles both.
 */
export function convertToMoproInputs(
  inputs: Record<string, unknown>,
): MoproInputs {
  return Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [key, toStringArray(value)]),
  );
}
