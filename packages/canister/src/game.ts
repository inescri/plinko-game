/**
 * Pure bet resolution — no IC/Azle runtime dependency so it is unit-testable.
 * Randomness is injected as bytes; the canister feeds `crypto.getRandomValues`
 * (seeded from the management canister's `raw_rand`, see index.ts).
 */
import {
  type Risk,
  type Rows,
  houseExposure,
  houseExposureMany,
  isBallCount,
  MAX_BALLS_PER_DROP,
  multiplierX100,
  payoutFor,
  slotFromPath,
} from "@plinko/shared";

export { houseExposure, houseExposureMany };

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

/** Bytes needed to draw `count` independent paths. */
export function randomBytesForMany(rows: Rows, count: number): number {
  if (!isBallCount(count)) {
    throw new Error(`count must be between 1 and ${MAX_BALLS_PER_DROP}`);
  }
  return randomBytesFor(rows) * count;
}

export interface BatchOutcome {
  outcomes: BetOutcome[];
  /** Sum of every ball's payout, what the house pays the caller in total. */
  totalPayout: bigint;
}

/**
 * Resolve `count` balls at the same bet. Ball `i` reads its own slice of
 * `bytes` (`randomBytesFor(rows)` bytes each) so outcomes are independent.
 */
export function resolveBets(
  bet: bigint,
  rows: Rows,
  risk: Risk,
  count: number,
  bytes: Uint8Array,
): BatchOutcome {
  const perBall = randomBytesFor(rows);
  if (bytes.length < randomBytesForMany(rows, count)) {
    throw new Error("not enough random bytes");
  }
  const outcomes: BetOutcome[] = [];
  let totalPayout = 0n;
  for (let i = 0; i < count; i++) {
    const outcome = resolveBet(
      bet,
      rows,
      risk,
      bytes.subarray(i * perBall, (i + 1) * perBall),
    );
    outcomes.push(outcome);
    totalPayout += outcome.payout;
  }
  return { outcomes, totalPayout };
}
