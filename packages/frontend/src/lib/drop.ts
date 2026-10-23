import { MAX_BALLS_PER_DROP } from "@plinko/shared";
import { minBigInt } from "./amounts.ts";

/**
 * Per-drop arithmetic shared by the reducer, the bet controls and the play
 * hook, so the Drop button, the percent buttons and the clamp on ball-count
 * changes can never disagree about what a player may stake.
 */

/** Clamp a typed ball count to 1..MAX_BALLS_PER_DROP (non-finite → 1). */
export function clampBallCount(raw: number): number {
  const n = Math.floor(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_BALLS_PER_DROP, Math.max(1, n));
}

/** Per-ball stake the house limit allows for `count` balls (floor). */
export function perBallMaxBet(maxBet: bigint, count: number): bigint {
  return count > 0 ? maxBet / BigInt(count) : 0n;
}

/**
 * Per-ball cap: the whole drop (bet × count) must fit both the balance and
 * the house limit.
 */
export function perBallCap(balance: bigint, maxBet: bigint, count: number): bigint {
  if (count < 1) return 0n;
  return minBigInt(balance / BigInt(count), perBallMaxBet(maxBet, count));
}

/** True when `bet` per ball × `count` fits the balance and the house limit. */
export function canAffordDrop(
  bet: bigint,
  count: number,
  balance: bigint,
  maxBet: bigint,
): boolean {
  if (bet <= 0n || count < 1) return false;
  return bet <= perBallCap(balance, maxBet, count);
}
