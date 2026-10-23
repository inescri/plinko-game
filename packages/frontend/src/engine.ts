import { slotFromPath, type Risk, type Rows } from "@plinko/shared";
import {
  BALL_RADIUS,
  LANDING_FRAMES,
  MULTIPLIERS,
  PEG_RADIUS,
  ROW_FRAMES,
  SPAWN_JITTER_X,
  TRAIL_LENGTH,
  getScale,
} from "./constants.ts";

const RISK_COLORS: Record<Risk, string> = {
  low: "#00ff87",
  medium: "#ffc800",
  high: "#ff3250",
};

export interface Peg {
  x: number;
  y: number;
  glow: number;
}

export interface Slot {
  x: number;
  y: number;
  width: number;
  multiplier: number;
}

export interface Layout {
  pegs: Peg[];
  slots: Slot[];
  pegSpacingX: number;
  rowSpacing: number;
  topY: number;
  bottomY: number;
}

/** What the canister resolved for one bet; the ball just replays it. */
export interface BallSpawn {
  path: boolean[];
  rows: Rows;
  risk: Risk;
  multiplierX100: number;
  payout: bigint;
  /** Which drop (one `playMany` call) this ball belongs to. */
  dropId: number;
  /** Frames to wait before the ball appears, so a drop fans out. */
  delayFrames: number;
}

interface Point {
  x: number;
  y: number;
}

/** A ball waiting to be released; its geometry is built when it appears. */
export interface PendingBall {
  spawn: BallSpawn;
  /** Remaining frames before the ball appears. */
  delay: number;
}

export interface Ball extends BallSpawn {
  /** Waypoints: start, one per row (the gap below each peg row), then the slot. */
  points: Point[];
  /** Peg index to light up when the ball bounces at each row. */
  pegIndexes: number[];
  segment: number;
  t: number;
  x: number;
  y: number;
  trail: Point[];
  slot: number;
  active: boolean;
}

export interface SlotFlash {
  index: number;
  alpha: number;
}

export interface AnimationState {
  /** Balls not yet released; `createBall` runs on release so they always use the current layout. */
  pending: PendingBall[];
  balls: Ball[];
  pegs: Peg[];
  slots: Slot[];
  slotFlashes: SlotFlash[];
}

export interface Landing {
  dropId: number;
  slot: number;
  multiplierX100: number;
  payout: bigint;
}

export function computeLayout(rows: Rows, risk: Risk, W: number, H: number): Layout {
  const s = getScale(W);
  const padding = 20 * s;
  const topY = 50 * s;
  const bottomY = H - 60 * s;
  const availableH = bottomY - topY;
  const rowSpacing = availableH / (rows + 1);
  const pegSpacingX = (W - padding * 2) / (rows + 2);

  const pegs: Peg[] = [];
  for (let r = 0; r < rows; r++) {
    const pegsInRow = r + 3;
    const y = topY + (r + 1) * rowSpacing;
    for (let c = 0; c < pegsInRow; c++) {
      const x = W / 2 + (c - (pegsInRow - 1) / 2) * pegSpacingX;
      pegs.push({ x, y, glow: 0 });
    }
  }

  const numSlots = rows + 1;
  const slots: Slot[] = [];
  const mults = MULTIPLIERS[risk][rows];
  for (let i = 0; i < numSlots; i++) {
    const x = W / 2 + (i - (numSlots - 1) / 2) * pegSpacingX;
    slots.push({
      x,
      y: bottomY + 10,
      width: pegSpacingX - 4,
      multiplier: mults[i],
    });
  }

  return { pegs, slots, pegSpacingX, rowSpacing, topY, bottomY };
}

/**
 * Build a ball that replays `spawn.path` on the board. Row `i` has `i + 3`
 * pegs; after `k` right steps the ball sits in the gap at
 * `W/2 + (k - (i+1)/2) * pegSpacingX`, which at the last row is exactly the
 * slot position for slot `k`. So the landing slot is `slotFromPath(path)`.
 */
export function createBall(spawn: BallSpawn, W: number, H: number): Ball {
  const s = getScale(W);
  const { pegSpacingX, rowSpacing, topY, bottomY } = computeLayout(
    spawn.rows,
    spawn.risk,
    W,
    H,
  );
  // Visual only: a small sideways offset at the start so the balls of one
  // drop read as separate balls. The first row pulls it back onto the path.
  const jitter = (Math.random() * 2 - 1) * SPAWN_JITTER_X * s;
  const points: Point[] = [{ x: W / 2 + jitter, y: 20 * s }];
  const pegIndexes: number[] = [];
  let rights = 0;
  for (let i = 0; i < spawn.rows; i++) {
    // Peg the ball lands on in row i: column `rights + 1` (0-based) because
    // the row has i + 3 pegs and the ball is at gap `rights` of the row above.
    pegIndexes.push((i * (i + 5)) / 2 + rights + 1);
    if (spawn.path[i]) rights++;
    const x = W / 2 + (rights - (i + 1) / 2) * pegSpacingX;
    const y = topY + (i + 1) * rowSpacing + (PEG_RADIUS + BALL_RADIUS) * s;
    points.push({ x, y });
  }
  const slot = slotFromPath(spawn.path);
  points.push({ x: points[points.length - 1].x, y: bottomY });

  return {
    ...spawn,
    points,
    pegIndexes,
    segment: 0,
    t: 0,
    x: points[0].x,
    y: points[0].y,
    trail: [],
    slot,
    active: true,
  };
}

/** Queue a ball; it is built against the live layout once its delay elapses. */
export function queueBall(animState: AnimationState, spawn: BallSpawn): void {
  animState.pending.push({
    spawn,
    delay: Math.max(0, Math.floor(spawn.delayFrames)),
  });
}

function easeIn(t: number): number {
  return t * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Fraction of a row segment at which the ball touches the peg. */
const BOUNCE_AT = 0.45;

// Mutates animState in place. Returns landing events and peg-hit count.
export function updateBalls(
  animState: AnimationState,
  W: number,
  H: number,
): { landings: Landing[]; pegHits: number } {
  const s = getScale(W);
  const landings: Landing[] = [];
  let pegHits = 0;

  // Release due balls. Geometry is computed here, not at spawn time, so a
  // resize or table change while a drop is still fanning out is honoured.
  if (animState.pending.length > 0) {
    const still: PendingBall[] = [];
    for (const p of animState.pending) {
      if (p.delay <= 0) {
        animState.balls.push(createBall(p.spawn, W, H));
      } else {
        p.delay--;
        still.push(p);
      }
    }
    animState.pending = still;
  }

  for (const ball of animState.balls) {
    if (!ball.active) continue;

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();

    const from = ball.points[ball.segment];
    const to = ball.points[ball.segment + 1];
    const isLanding = ball.segment === ball.rows;
    const frames = isLanding ? LANDING_FRAMES : ROW_FRAMES;
    const prevT = ball.t;
    ball.t = Math.min(1, ball.t + 1 / frames);
    const t = ball.t;

    if (isLanding) {
      ball.x = to.x;
      ball.y = from.y + (to.y - from.y) * easeIn(t);
    } else {
      // Fall straight onto the peg, then kick sideways into the next gap
      // with a small hop so the bounce reads as a bounce.
      ball.y = from.y + (to.y - from.y) * easeIn(t);
      if (t < BOUNCE_AT) {
        ball.x = from.x;
      } else {
        const u = easeOut((t - BOUNCE_AT) / (1 - BOUNCE_AT));
        ball.x = from.x + (to.x - from.x) * u;
        ball.y -= Math.sin(u * Math.PI) * 4 * s;
      }
      if (prevT < BOUNCE_AT && t >= BOUNCE_AT) {
        const peg = animState.pegs[ball.pegIndexes[ball.segment]];
        if (peg) peg.glow = 1;
        pegHits++;
      }
    }

    if (t >= 1) {
      ball.segment++;
      ball.t = 0;
      if (ball.segment >= ball.points.length - 1) {
        ball.active = false;
        landings.push({
          dropId: ball.dropId,
          slot: ball.slot,
          multiplierX100: ball.multiplierX100,
          payout: ball.payout,
        });
        animState.slotFlashes.push({ index: ball.slot, alpha: 1 });
      }
    }
  }

  animState.balls = animState.balls.filter(
    (b) => b.active || b.trail.length > 0,
  );

  for (const ball of animState.balls) {
    if (!ball.active && ball.trail.length > 0) {
      ball.trail.shift();
    }
  }

  for (const peg of animState.pegs) {
    if (peg.glow > 0) peg.glow = Math.max(0, peg.glow - 0.05);
  }

  for (const flash of animState.slotFlashes) {
    flash.alpha -= 0.02;
  }
  animState.slotFlashes = animState.slotFlashes.filter((f) => f.alpha > 0);

  return { landings, pegHits };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  animState: AnimationState,
  W: number,
  H: number,
  risk: Risk = "low",
): void {
  const s = getScale(W);
  const pegR = PEG_RADIUS * s;
  const ballR = BALL_RADIUS * s;

  ctx.clearRect(0, 0, W, H);

  // Pegs — neon cyan dots
  for (const peg of animState.pegs) {
    const glowStrength = peg.glow;

    if (glowStrength > 0) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, pegR + 12 * s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(188, 19, 254, ${glowStrength * 0.25})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(peg.x, peg.y, pegR + glowStrength * 4 * s, 0, Math.PI * 2);
    ctx.fillStyle =
      glowStrength > 0
        ? `rgba(188, 19, 254, ${0.5 + glowStrength * 0.5})`
        : "rgba(100, 80, 180, 0.5)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(peg.x, peg.y, pegR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle =
      glowStrength > 0
        ? `rgba(220, 180, 255, ${0.8 + glowStrength * 0.2})`
        : "rgba(150, 130, 200, 0.6)";
    ctx.fill();
  }

  // Slots — neon outlined with likelihood-based bottom border
  const color = RISK_COLORS[risk] || RISK_COLORS.low;
  const numSlots = animState.slots.length;
  const rows = numSlots - 1;

  const probs: number[] = [];
  for (let i = 0; i < numSlots; i++) {
    let logProb = -rows * Math.log(2);
    for (let k = 1; k <= i; k++) {
      logProb += Math.log(rows - k + 1) - Math.log(k);
    }
    probs.push(Math.exp(logProb));
  }
  const maxProb = Math.max(...probs);

  for (let i = 0; i < numSlots; i++) {
    const slot = animState.slots[i];

    let flashAlpha = 0;
    for (const f of animState.slotFlashes) {
      if (f.index === i) flashAlpha = Math.max(flashAlpha, f.alpha);
    }

    const slotH = 32 * s;
    const slotW = slot.width;

    if (flashAlpha > 0) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * flashAlpha;
      ctx.fillStyle =
        color + Math.floor(flashAlpha * 60).toString(16).padStart(2, "0");
      ctx.beginPath();
      ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6 * s);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = color + "15";
    ctx.beginPath();
    ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6 * s);
    ctx.fill();

    ctx.strokeStyle = color + "60";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6 * s);
    ctx.stroke();

    const likelihood = probs[i] / maxProb;
    let r: number, g: number, b: number;
    if (likelihood < 0.5) {
      const t = likelihood / 0.5;
      r = 255;
      g = Math.round(200 * t);
      b = Math.round(60 * (1 - t));
    } else {
      const t = (likelihood - 0.5) / 0.5;
      r = Math.round(255 * (1 - t));
      g = Math.round(200 + 55 * t);
      b = Math.round(60 * t);
    }
    const borderColor = `rgb(${r}, ${g}, ${b})`;
    const borderHeight = 3 * s;
    const bottomY = slot.y + slotH / 2;

    ctx.save();
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8 * s;
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(
      slot.x - slotW / 2,
      bottomY - borderHeight,
      slotW,
      borderHeight,
      [0, 0, 6 * s, 6 * s],
    );
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(14 * s)}px 'Orbitron', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(slot.multiplier), slot.x, slot.y);
    ctx.restore();
  }

  // Ball trails — neon cyan
  for (const ball of animState.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const progress = i / ball.trail.length;
      const alpha = progress * 0.5;
      const r = ballR * progress * 0.6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
      ctx.fill();
    }
  }

  // Balls — neon glow
  for (const ball of animState.balls) {
    if (!ball.active) continue;

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR + 8 * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 220, 255, 0.12)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR + 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 220, 255, 0.25)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
    ctx.fillStyle = "#00dcff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fill();
  }
}
