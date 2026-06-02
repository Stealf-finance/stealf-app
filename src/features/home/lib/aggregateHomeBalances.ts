type UsdTotal = { totalUSD: number } | null | undefined;

export type HomeBalances = {
  totalUSD: number;
  bankUSD: number;
  stealfUSD: number;
  encryptedUSD: number;
};

export function aggregateHomeBalances(input: {
  bank?: UsdTotal;
  stealf?: UsdTotal;
  encrypted?: UsdTotal;
}): HomeBalances {
  const bankUSD = input.bank?.totalUSD ?? 0;
  const stealfUSD = input.stealf?.totalUSD ?? 0;
  const encryptedUSD = input.encrypted?.totalUSD ?? 0;
  return { bankUSD, stealfUSD, encryptedUSD, totalUSD: bankUSD + stealfUSD + encryptedUSD };
}
