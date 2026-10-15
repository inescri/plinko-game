/**
 * Pure bet resolution — no IC/Azle runtime dependency so it is unit-testable.
 * Randomness is injected as bytes; the canister feeds `crypto.getRandomValues`
 * (seeded from the management canister's `raw_rand`, see index.ts).
 */
import {
  type Risk,
  type Rows,
  houseExposure,
  multiplierX100,
  payoutFor,
  slotFromPath,
} from "@plinko/shared";

export { houseExposure };

/**
 * Owner string under which the house bankroll is stored in the ledger. It
 * contains no `-`, so it can never collide with a principal's text form.
 */
export const HOUSE_OWNER = "house";

/** Bytes needed to draw one bit per row. */
export function randomBytesFor(rows: Rows): number {
  return Math.ceil(rows / 8);
}

/** One left/right step per row from the low bits of `bytes`, LSB first. */
export function drawPath(rows: Rows, bytes: Uint8Array): boolean[] {
  if (bytes.length < randomBytesFor(rows)) {
    throw new Error("not enough random bytes");
  }
  const path: boolean[] = [];
  for (let i = 0; i < rows; i++) {
    const byte = bytes[i >> 3];
    path.push(((byte >> (i & 7)) & 1) === 1);
  }
  return path;
}

export interface BetOutcome {
  path: boolean[];
  slot: number;
  multiplierX100: number;
  payout: bigint;
}

export function resolveBet(
  bet: bigint,
  rows: Rows,
  risk: Risk,
  bytes: Uint8Array,
): BetOutcome {
  const path = drawPath(rows, bytes);
  const slot = slotFromPath(path);
  const mult = multiplierX100(risk, rows, slot);
  return { path, slot, multiplierX100: mult, payout: payoutFor(bet, mult) };
}
