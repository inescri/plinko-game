import { OdinUtils } from "odin-connect";

/** Token metadata needed to convert between base units and display units. */
export interface TokenInfo {
  id: string;
  ticker: string;
  decimals: number;
  divisibility: number;
}

/** Number of decimal places between base units and display units. */
export function placesOf(token: Pick<TokenInfo, "decimals" | "divisibility">) {
  return token.decimals + token.divisibility;
}

/** Base units → display string, trailing zeros trimmed. */
export function formatTokenAmount(raw: bigint, places: number): string {
  if (places <= 0) return raw.toString();
  const base = 10n ** BigInt(places);
  const whole = raw / base;
  const frac = raw % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac
    .toString()
    .padStart(places, "0")
    .replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

/** Base units → display string with a fixed number of fraction digits. */
export function formatFixed(raw: bigint, places: number, digits = 2): string {
  const text = formatTokenAmount(raw, places);
  const [whole, frac = ""] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (digits === 0) return grouped;
  return `${grouped}.${frac.slice(0, digits).padEnd(digits, "0")}`;
}

/** Display string (user input) → base units; 0n for unparsable input. */
export function parseTokenAmount(
  value: string | number,
  token: Pick<TokenInfo, "decimals" | "divisibility">,
): bigint {
  try {
    return OdinUtils.convertToOdinAmount(value, token);
  } catch {
    return 0n;
  }
}

/** Base units × a percentage, floored. */
export function percentOf(raw: bigint, pct: number): bigint {
  return (raw * BigInt(pct)) / 100n;
}

export function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
