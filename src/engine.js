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

// Snap a value to a pixel grid for crispy pixel art
function snap(v, grid) {
  return Math.round(v / grid) * grid;
}

export function draw(ctx, animState, W, H, risk = 'low') {
  const s = getScale(W);
  const pegR = PEG_RADIUS * s;
  const ballR = BALL_RADIUS * s;
  const pixel = Math.max(2, Math.round(2 * s)); // pixel grid size

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  // Pegs — pixel-art squares
  for (const peg of animState.pegs) {
    const size = snap(pegR * 2, pixel);
    const x = snap(peg.x - size / 2, pixel);
    const y = snap(peg.y - size / 2, pixel);

    if (peg.glow > 0) {
      // Glow: larger square behind
      const glowSize = size + pixel * 4;
      const gx = snap(peg.x - glowSize / 2, pixel);
      const gy = snap(peg.y - glowSize / 2, pixel);
      ctx.fillStyle = `rgba(255, 217, 61, ${peg.glow * 0.35})`;
      ctx.fillRect(gx, gy, glowSize, glowSize);
    }

    const brightness = Math.round(150 + peg.glow * 105);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, size, size);

    // Pixel highlight on top-left corner
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + peg.glow * 0.3})`;
    ctx.fillRect(x, y, pixel, pixel);
  }

  // Slots — pixel-art rectangles
  for (let i = 0; i < animState.slots.length; i++) {
    const slot = animState.slots[i];
    const color = RISK_COLORS[risk] || RISK_COLORS.low;

    let flashAlpha = 0;
    for (const f of animState.slotFlashes) {
      if (f.index === i) flashAlpha = Math.max(flashAlpha, f.alpha);
    }

    const slotH = snap(28 * s, pixel);
    const slotW = snap(slot.width, pixel);
    const sx = snap(slot.x - slotW / 2, pixel);
    const sy = snap(slot.y - slotH / 2, pixel);

    // Slot background
    ctx.fillStyle = color + (flashAlpha > 0
      ? Math.floor(40 + flashAlpha * 80).toString(16).padStart(2, '0')
      : '25');
    ctx.fillRect(sx, sy, slotW, slotH);

    // Pixel border
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = pixel;
    ctx.strokeRect(sx, sy, slotW, slotH);

    // Slot text
    ctx.fillStyle = color;
    const fontSize = Math.max(8, Math.round(10 * s));
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.multiplier, slot.x, slot.y + 1);
  }

  // Ball trails — pixel-art squares fading out
  for (const ball of animState.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const alpha = (i / ball.trail.length) * 0.5;
      const size = snap(ballR * 2 * (i / ball.trail.length) * 0.6, pixel);
      if (size < pixel) continue;
      const tx = snap(t.x - size / 2, pixel);
      const ty = snap(t.y - size / 2, pixel);
      ctx.fillStyle = `rgba(255, 217, 61, ${alpha})`;
      ctx.fillRect(tx, ty, size, size);
    }
  }

  // Balls — pixel-art squares
  for (const ball of animState.balls) {
    if (!ball.active) continue;
    const size = snap(ballR * 2, pixel);
    const bx = snap(ball.x - size / 2, pixel);
    const by = snap(ball.y - size / 2, pixel);

    // Main ball body
    ctx.fillStyle = BALL_COLOR;
    ctx.fillRect(bx, by, size, size);

    // Pixel highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(bx, by, pixel, pixel);

    // Pixel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(bx + size - pixel, by + size - pixel, pixel, pixel);
  }
}
