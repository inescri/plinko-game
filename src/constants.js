// Reference width the original values were designed for
export const REF_WIDTH = 700;

// Base values (at REF_WIDTH)
export const GRAVITY = 0.35;
export const BOUNCE_DAMPEN = 0.6;
export const RANDOM_BOUNCE = 1.8;
export const PEG_RADIUS = 4;
export const BALL_RADIUS = 6;
export const TRAIL_LENGTH = 8;
export const BALL_COLOR = '#ffd93d';

/** Returns a scale factor for the given canvas width */
export function getScale(W) {
  return W / REF_WIDTH;
}

export const MULTIPLIERS = {
  low: {
    8:  [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    14: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    14: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.2, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8:  [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    14: [420, 56, 12, 3, 1.3, 0.4, 0.2, 0.2, 0.2, 0.4, 1.3, 3, 12, 56, 420],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};
