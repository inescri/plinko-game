// ── Config ──────────────────────────────────────────────────────
const GRAVITY = 0.35;
const BOUNCE_DAMPEN = 0.6;
const RANDOM_BOUNCE = 1.8;
const PEG_RADIUS = 4;
const BALL_RADIUS = 6;
const TRAIL_LENGTH = 8;
const BALL_COLOR = '#ffd93d';

// ── Multiplier Tables ──────────────────────────────────────────
const MULTIPLIERS = {
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

// ── State ──────────────────────────────────────────────────────
const state = {
  balance: 1000,
  bet: 10,
  risk: 'low',
  rows: 12,
  balls: [],
  pegs: [],
  slots: [],
  slotFlashes: [], // { index, alpha, color }
};

// ── Canvas Setup ───────────────────────────────────────────────
const canvas = document.getElementById('plinko-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  const area = canvas.parentElement;
  const rect = area.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = rect.width;
  H = rect.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout();
}

window.addEventListener('resize', resize);

// ── Layout ─────────────────────────────────────────────────────
function computeLayout() {
  const rows = state.rows;
  const padding = 40;
  const topY = 50;
  const bottomY = H - 60;
  const availableH = bottomY - topY;
  const rowSpacing = availableH / (rows + 1);
  const pegSpacingX = Math.min(rowSpacing * 1.1, (W - padding * 2) / (rows + 2));

  state.pegs = [];
  for (let r = 0; r < rows; r++) {
    const pegsInRow = r + 3;
    const y = topY + (r + 1) * rowSpacing;
    for (let c = 0; c < pegsInRow; c++) {
      const x = W / 2 + (c - (pegsInRow - 1) / 2) * pegSpacingX;
      state.pegs.push({ x, y, glow: 0 });
    }
  }

  // Slots
  const numSlots = rows + 1;
  const lastRowPegs = rows + 2;
  state.slots = [];
  const mults = MULTIPLIERS[state.risk][rows];
  for (let i = 0; i < numSlots; i++) {
    const x = W / 2 + (i - (numSlots - 1) / 2) * pegSpacingX;
    state.slots.push({
      x,
      y: bottomY + 10,
      width: pegSpacingX - 4,
      multiplier: mults[i],
    });
  }
}

// ── Ball ───────────────────────────────────────────────────────
function spawnBall() {
  if (state.bet > state.balance) return;
  state.balance -= state.bet;
  updateBalanceDisplay();

  state.balls.push({
    x: W / 2 + (Math.random() - 0.5) * 20,
    y: 20,
    vx: 0,
    vy: 0,
    trail: [],
    bet: state.bet,
    risk: state.risk,
    rows: state.rows,
    active: true,
  });
}

// ── Physics Step ───────────────────────────────────────────────
function updateBalls() {
  const bottomY = H - 60;

  for (const ball of state.balls) {
    if (!ball.active) continue;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();

    // Gravity
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Peg collisions
    for (const peg of state.pegs) {
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = BALL_RADIUS + PEG_RADIUS;

      if (dist < minDist) {
        // Push ball out
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = peg.x + nx * minDist;
        ball.y = peg.y + ny * minDist;

        // Reflect velocity
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;

        // Dampen + randomize
        ball.vx *= BOUNCE_DAMPEN;
        ball.vy *= BOUNCE_DAMPEN;
        ball.vx += (Math.random() - 0.5) * RANDOM_BOUNCE;

        // Ensure ball moves downward
        if (ball.vy < 0.5) ball.vy = 0.5;

        peg.glow = 1;
      }
    }

    // Wall collisions
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * 0.5;
    }
    if (ball.x > W - BALL_RADIUS) {
      ball.x = W - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.5;
    }

    // Slot landing
    if (ball.y >= bottomY) {
      ball.active = false;
      let closestSlot = 0;
      let closestDist = Infinity;
      for (let i = 0; i < state.slots.length; i++) {
        const d = Math.abs(ball.x - state.slots[i].x);
        if (d < closestDist) {
          closestDist = d;
          closestSlot = i;
        }
      }
      const mult = state.slots[closestSlot].multiplier;
      const winnings = ball.bet * mult;
      state.balance += winnings;
      updateBalanceDisplay();
      showWin(mult, winnings);

      // Flash the slot
      const color = getMultColor(mult);
      state.slotFlashes.push({ index: closestSlot, alpha: 1, color });
    }
  }

  // Remove dead balls that have finished animating
  state.balls = state.balls.filter(b => b.active || b.trail.length > 0);

  // Decay inactive ball trails
  for (const ball of state.balls) {
    if (!ball.active && ball.trail.length > 0) {
      ball.trail.shift();
    }
  }

  // Decay peg glow
  for (const peg of state.pegs) {
    if (peg.glow > 0) peg.glow = Math.max(0, peg.glow - 0.05);
  }

  // Decay slot flashes
  for (const flash of state.slotFlashes) {
    flash.alpha -= 0.02;
  }
  state.slotFlashes = state.slotFlashes.filter(f => f.alpha > 0);
}

// ── Rendering ──────────────────────────────────────────────────
function getMultColor(mult) {
  if (mult >= 10) return '#ff4757';
  if (mult >= 5) return '#ff6b6b';
  if (mult >= 2) return '#ffa502';
  if (mult >= 1) return '#ffd93d';
  return '#6bcb77';
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Pegs
  for (const peg of state.pegs) {
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

  // Slot backgrounds and labels
  for (let i = 0; i < state.slots.length; i++) {
    const slot = state.slots[i];
    const color = getMultColor(slot.multiplier);

    // Flash effect
    let flashAlpha = 0;
    for (const f of state.slotFlashes) {
      if (f.index === i) flashAlpha = Math.max(flashAlpha, f.alpha);
    }

    // Slot background
    const slotH = 32;
    const slotW = slot.width;
    ctx.fillStyle = color + (flashAlpha > 0
      ? Math.floor(40 + flashAlpha * 80).toString(16)
      : '20');
    ctx.beginPath();
    ctx.roundRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH, 6);
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.multiplier + '×', slot.x, slot.y);
  }

  // Ball trails
  for (const ball of state.balls) {
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
  for (const ball of state.balls) {
    if (!ball.active) continue;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 217, 61, 0.2)';
    ctx.fill();
  }
}

// ── Game Loop ──────────────────────────────────────────────────
function loop() {
  updateBalls();
  draw();
  requestAnimationFrame(loop);
}

// ── UI ─────────────────────────────────────────────────────────
function updateBalanceDisplay() {
  document.getElementById('balance').textContent =
    '$' + state.balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showWin(mult, amount) {
  const el = document.getElementById('last-win');
  el.textContent = `${mult}× — Won $${amount.toFixed(2)}`;
  el.style.opacity = 1;
  setTimeout(() => { el.style.opacity = 0.6; }, 1500);
}

// Controls
document.getElementById('btn-drop').addEventListener('click', spawnBall);

document.getElementById('btn-half').addEventListener('click', () => {
  state.bet = Math.max(1, Math.floor(state.bet / 2));
  document.getElementById('bet-input').value = state.bet;
});

document.getElementById('btn-double').addEventListener('click', () => {
  state.bet = Math.min(state.balance, state.bet * 2);
  document.getElementById('bet-input').value = state.bet;
});

document.getElementById('bet-input').addEventListener('change', (e) => {
  state.bet = Math.max(1, Math.min(state.balance, parseInt(e.target.value) || 1));
  e.target.value = state.bet;
});

// Risk buttons
document.querySelectorAll('.risk-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.risk = btn.dataset.risk;
    computeLayout();
  });
});

// Row buttons
document.querySelectorAll('.row-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.row-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.rows = parseInt(btn.dataset.rows);
    computeLayout();
  });
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    spawnBall();
  }
});

// ── Init ───────────────────────────────────────────────────────
resize();
loop();
