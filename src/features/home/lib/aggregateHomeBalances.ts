type UsdTotal = { totalUSD: number } | null | undefined;

export type HomeBalances = {
  /** `undefined` until *both* sides are known. A partial sum is not a smaller
   *  total, it's a wrong one: it would render as a real figure and then jump
   *  when the other half lands, which reads as money appearing. */
  totalUSD: number | undefined;
  /** `undefined` while unknown — never coerced to 0, or the screen can't tell
   *  an empty wallet from one that hasn't loaded. */
  bankUSD: number | undefined;
  encryptedUSD: number | undefined;
};

export function aggregateHomeBalances(input: {
  bank?: UsdTotal;
  encrypted?: UsdTotal;
}): HomeBalances {
  const bankUSD = input.bank?.totalUSD;
  const encryptedUSD = input.encrypted?.totalUSD;
  const totalUSD =
    bankUSD === undefined || encryptedUSD === undefined
      ? undefined
      : bankUSD + encryptedUSD;
  return { bankUSD, encryptedUSD, totalUSD };
}
