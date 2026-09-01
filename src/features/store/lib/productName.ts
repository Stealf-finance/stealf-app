/** Trailing market words Bitrefill appends to a brand. */
const MARKET_SUFFIX =
  /\s+(United Kingdom|United States|Ireland|France|Germany|Spain|Italy|Netherlands|Belgium|Portugal|Austria|Poland|Sweden|Denmark|Finland|Norway|Switzerland|Canada|Australia|International|Europe|EU|Global)$/i;

/** Country-coded TLDs worth keeping, because the card's market differs. */
const TLD_CODE: Record<string, string> = {
  'co.uk': 'UK',
  ie: 'IE',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  nl: 'NL',
};

/** Tile display name: "Amazon.co.uk United Kingdom" -> "Amazon UK". */
export function shortProductName(name: string): string {
  const trimmed = name.trim();
  let out = trimmed.replace(MARKET_SUFFIX, '').trim();

  const domain = out.match(/^(.+?)\.((?:co\.)?[a-z]{2,3})$/i);
  if (domain) {
    const code = TLD_CODE[domain[2].toLowerCase()];
    out = code ? `${domain[1]} ${code}` : domain[1];
  }

  return out.length > 0 ? out : trimmed;
}
