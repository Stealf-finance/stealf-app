type UsdTotal = { totalUSD: number } | null | undefined;

export type HomeBalances = {
  totalUSD: number;
  bankUSD: number;
  encryptedUSD: number;
};

export function aggregateHomeBalances(input: {
  bank?: UsdTotal;
  encrypted?: UsdTotal;
}): HomeBalances {
  const bankUSD = input.bank?.totalUSD ?? 0;
  const encryptedUSD = input.encrypted?.totalUSD ?? 0;
  return { bankUSD, encryptedUSD, totalUSD: bankUSD + encryptedUSD };
}
