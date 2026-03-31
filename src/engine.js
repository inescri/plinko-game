import {
  GRAVITY, BOUNCE_DAMPEN, RANDOM_BOUNCE,
  PEG_RADIUS, BALL_RADIUS, TRAIL_LENGTH, BALL_COLOR,
  MULTIPLIERS, getScale,
} from './constants.js';

const RISK_COLORS = {
  low: '#6bcb77',
  medium: '#ffa502',
  high: '#ff4757',
};

export function computeLayout(rows, risk, W, H) {
  const s = getScale(W);
  const padding = 20 * s;
  const topY = 50 * s;
  const bottomY = H - 60 * s;
  const availableH = bottomY - topY;
  const rowSpacing = availableH / (rows + 1);
  const pegSpacingX = (W - padding * 2) / (rows + 2);

  const pegs = [];
  for (let r = 0; r < rows; r++) {
    const pegsInRow = r + 3;
    const y = topY + (r + 1) * rowSpacing;
    for (let c = 0; c < pegsInRow; c++) {
      const x = W / 2 + (c - (pegsInRow - 1) / 2) * pegSpacingX;
      pegs.push({ x, y, glow: 0 });
    }
  }

  const numSlots = rows + 1;
  const slots = [];
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

  return { pegs, slots };
}

// Mutates animState in place. Returns array of landing events: [{ mult, winnings }]
export function updateBalls(animState, W, H) {
  const s = getScale(W);
  const bottomY = H - 60 * s;
  const ballR = BALL_RADIUS * s;
  const pegR = PEG_RADIUS * s;
  const gravity = GRAVITY * s;
  const randomBounce = RANDOM_BOUNCE * s;
  const minVy = 0.5 * s;
  const landings = [];
  let pegHits = 0;

  for (const ball of animState.balls) {
    if (!ball.active) continue;

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();

    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    for (const peg of animState.pegs) {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ballR + pegR;

      if (dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = peg.x + nx * minDist;
        ball.y = peg.y + ny * minDist;

        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;

        ball.vx *= BOUNCE_DAMPEN;
        ball.vy *= BOUNCE_DAMPEN;
        ball.vx += (Math.random() - 0.5) * randomBounce;

        if (ball.vy < minVy) ball.vy = minVy;
        peg.glow = 1;
        pegHits++;
      }
    }

    if (ball.x < ballR) {
      ball.x = ballR;
      ball.vx = Math.abs(ball.vx) * 0.5;
    }
    if (ball.x > W - ballR) {
      ball.x = W - ballR;
      ball.vx = -Math.abs(ball.vx) * 0.5;
    }

    if (ball.y >= bottomY) {
      ball.active = false;
      let closestSlot = 0;
      let closestDist = Infinity;
      for (let i = 0; i < animState.slots.length; i++) {
        const d = Math.abs(ball.x - animState.slots[i].x);
        if (d < closestDist) {
          closestDist = d;
          closestSlot = i;
        }
      }
      const mult = animState.slots[closestSlot].multiplier;
      const winnings = ball.bet * mult;
      landings.push({ mult, winnings });

      animState.slotFlashes.push({ index: closestSlot, alpha: 1 });
    }
  }

  animState.balls = animState.balls.filter(b => b.active || b.trail.length > 0);

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
  animState.slotFlashes = animState.slotFlashes.filter(f => f.alpha > 0);

  return { landings, pegHits };
}

export function draw(ctx, animState, W, H, risk = 'low') {
  const s = getScale(W);
  const pegR = PEG_RADIUS * s;
  const ballR = BALL_RADIUS * s;

  ctx.clearRect(0, 0, W, H);

  // Pegs
  for (const peg of animState.pegs) {
    const baseAlpha = 0.6;
    const glowAlpha = peg.glow * 0.4;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, pegR + peg.glow * 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha + glowAlpha})`;
    ctx.fill();

    if (peg.glow > 0) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, pegR + 8 * s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 217, 61, ${peg.glow * 0.2})`;
      ctx.fill();
    }
  }

  // Slots
  for (let i = 0; i < animState.slots.length; i++) {
    const slot = animState.slots[i];
    const color = RISK_COLORS[risk] || RISK_COLORS.low;

    let flashAlpha = 0;
    for (const f of animState.slotFlashes) {
      if (f.index === i) flashAlpha = Math.max(flashAlpha, f.alpha);
    }

    const slotH = 32 * s;
    const slotW = slot.width;
    ctx.fillStyle = color + (flashAlpha > 0
      ? Math.floor(40 + flashAlpha * 80).toString(16)
      : '20');
    ctx.beginPath();
    ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6 * s);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(14 * s)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.multiplier, slot.x, slot.y);
  }

  // Ball trails
  for (const ball of animState.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const alpha = (i / ball.trail.length) * 0.4;
      const r = ballR * (i / ball.trail.length) * 0.6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 217, 61, ${alpha})`;
      ctx.fill();
    }
  }

  // Balls
  for (const ball of animState.balls) {
    if (!ball.active) continue;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR + 4 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 217, 61, 0.2)';
    ctx.fill();
  }
}
