// Plinko sound effects using Web Audio API (no external files)

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Cooldown tracking to prevent overlapping sounds
let lastPegHitTime = 0;
let lastLaunchTime = 0;
let lastLandingTime = 0;

const PEG_HIT_COOLDOWN = 60;   // ms between peg hit sounds
const LAUNCH_COOLDOWN = 100;    // ms between launch sounds
const LANDING_COOLDOWN = 80;    // ms between landing sounds

/** Short tick when ball hits a peg — throttled to avoid overlap */
export function playPegHit() {
  const now = performance.now();
  if (now - lastPegHitTime < PEG_HIT_COOLDOWN) return;
  lastPegHitTime = now;

  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = 800 + Math.random() * 600; // 800-1400 Hz
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

/** Pop sound when ball is launched — throttled for rapid clicks */
export function playLaunch() {
  const now = performance.now();
  if (now - lastLaunchTime < LAUNCH_COOLDOWN) return;
  lastLaunchTime = now;

  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/** Landing sound — pitch/tone varies by multiplier, throttled */
export function playLanding(mult) {
  const now = performance.now();
  if (now - lastLandingTime < LANDING_COOLDOWN) return;
  lastLandingTime = now;

  const ctx = getCtx();

  // Base tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (mult >= 5) {
    // Big win — bright rising tone
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    // Second harmonic for big wins
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.3);
    gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
  } else if (mult >= 1) {
    // Moderate win — pleasant ding
    osc.type = 'sine';
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } else {
    // Loss — low thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }
}
