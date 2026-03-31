import {
  GRAVITY, BOUNCE_DAMPEN, RANDOM_BOUNCE,
  PEG_RADIUS, BALL_RADIUS, TRAIL_LENGTH, BALL_COLOR,
  MULTIPLIERS,
} from './constants.js';

export function getMultColor(mult) {
  if (mult >= 10) return '#ff4757';
  if (mult >= 5) return '#ff6b6b';
  if (mult >= 2) return '#ffa502';
  if (mult >= 1) return '#ffd93d';
  return '#6bcb77';
}

export function computeLayout(rows, risk, W, H) {
  const padding = 40;
  const topY = 50;
  const bottomY = H - 60;
  const availableH = bottomY - topY;
  const rowSpacing = availableH / (rows + 1);
  const pegSpacingX = Math.min(rowSpacing * 1.1, (W - padding * 2) / (rows + 2));

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
  const bottomY = H - 60;
  const landings = [];

  for (const ball of animState.balls) {
    if (!ball.active) continue;

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();

    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    for (const peg of animState.pegs) {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = BALL_RADIUS + PEG_RADIUS;

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
        ball.vx += (Math.random() - 0.5) * RANDOM_BOUNCE;

        if (ball.vy < 0.5) ball.vy = 0.5;
        peg.glow = 1;
      }
    }

    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * 0.5;
    }
    if (ball.x > W - BALL_RADIUS) {
      ball.x = W - BALL_RADIUS;
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

      const color = getMultColor(mult);
      animState.slotFlashes.push({ index: closestSlot, alpha: 1, color });
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

  return landings;
}

export function draw(ctx, animState, W, H) {
  ctx.clearRect(0, 0, W, H);

  // Pegs
  for (const peg of animState.pegs) {
    const baseAlpha = 0.6;
    const glowAlpha = peg.glow * 0.4;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, PEG_RADIUS + peg.glow * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha + glowAlpha})`;
    ctx.fill();

    if (peg.glow > 0) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 217, 61, ${peg.glow * 0.2})`;
      ctx.fill();
    }
  }

  // Slots
  for (let i = 0; i < animState.slots.length; i++) {
    const slot = animState.slots[i];
    const color = getMultColor(slot.multiplier);

    let flashAlpha = 0;
    for (const f of animState.slotFlashes) {
      if (f.index === i) flashAlpha = Math.max(flashAlpha, f.alpha);
    }

    const slotH = 32;
    const slotW = slot.width;
    ctx.fillStyle = color + (flashAlpha > 0
      ? Math.floor(40 + flashAlpha * 80).toString(16)
      : '20');
    ctx.beginPath();
    ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.multiplier + '×', slot.x, slot.y);
  }

  // Ball trails
  for (const ball of animState.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const alpha = (i / ball.trail.length) * 0.4;
      const r = BALL_RADIUS * (i / ball.trail.length) * 0.6;
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
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 217, 61, 0.2)';
    ctx.fill();
  }
}
