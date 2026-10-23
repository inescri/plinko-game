import { MULTIPLIERS_X100, type Risk, type Rows } from "@plinko/shared";

// Reference width the original values were designed for
export const REF_WIDTH = 700;

// Base values (at REF_WIDTH)
export const PEG_RADIUS = 7;
export const BALL_RADIUS = 7;
export const TRAIL_LENGTH = 8;

/** Animation frames the ball spends on each peg row. */
export const ROW_FRAMES = 11;
/** Frames for the final fall from the last row into the slot. */
export const LANDING_FRAMES = 8;
/** Frames between successive balls of one multi-ball drop (small drops). */
export const SPAWN_STAGGER_FRAMES = 8;
/** Longest a drop may take to release all its balls, whatever the count. */
export const MAX_FANOUT_FRAMES = 300;
/** Max sideways offset (at REF_WIDTH) of a ball's start point, so balls of one drop don't stack. */
export const SPAWN_JITTER_X = 6;

/**
 * Tilt perspective: the board reads as leaning away at the top. Everything at
 * the top row (pegs, spacing, ball) is drawn at this fraction of its size at
 * the bottom row, growing linearly in between. 1 = flat board.
 */
export const PERSPECTIVE_TOP_SCALE = 0.62;

/**
 * Frames between successive balls of a `count`-ball drop: the usual stagger
 * for small drops, squeezed so a big drop still fans out within
 * `MAX_FANOUT_FRAMES` (several balls per frame at the cap).
 */
export function spawnStaggerFrames(count: number): number {
  if (count <= 1) return 0;
  return Math.min(SPAWN_STAGGER_FRAMES, MAX_FANOUT_FRAMES / (count - 1));
}

/** Returns a scale factor for the given canvas width */
export function getScale(W: number): number {
  return W / REF_WIDTH;
}

/**
 * Board multipliers as plain numbers for display, derived from the shared
 * x100 tables so the labels can never drift from what the canister pays.
 */
export const MULTIPLIERS: Record<Risk, Record<Rows, readonly number[]>> = {
  low: scale(MULTIPLIERS_X100.low),
  medium: scale(MULTIPLIERS_X100.medium),
  high: scale(MULTIPLIERS_X100.high),
};

function scale(table: Record<Rows, readonly number[]>): Record<Rows, readonly number[]> {
  return {
    8: table[8].map((m) => m / 100),
    10: table[10].map((m) => m / 100),
    12: table[12].map((m) => m / 100),
    14: table[14].map((m) => m / 100),
    16: table[16].map((m) => m / 100),
  };
}
