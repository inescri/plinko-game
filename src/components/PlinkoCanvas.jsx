import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useGameState, useGameDispatch } from '../contexts/GameContext.jsx';
import { useWallet } from '../contexts/WalletContext.jsx';
import { computeLayout, updateBalls, draw } from '../engine.js';

const PlinkoCanvas = forwardRef(function PlinkoCanvas(_, ref) {
  const canvasRef = useRef(null);
  const gameState = useGameState();
  const dispatch = useGameDispatch();
  const { connectedUser } = useWallet();

  // Refs for animation-frame data (never triggers re-renders)
  const animRef = useRef({ balls: [], pegs: [], slots: [], slotFlashes: [] });
  const dimsRef = useRef({ W: 0, H: 0 });

  // Sync React state into a ref so the rAF loop can read it without stale closures
  const settingsRef = useRef({
    balance: gameState.balance,
    bet: gameState.bet,
    risk: gameState.risk,
    rows: gameState.rows,
  });

  useEffect(() => {
    settingsRef.current = {
      balance: gameState.balance,
      bet: gameState.bet,
      risk: gameState.risk,
      rows: gameState.rows,
    };
  }, [gameState.balance, gameState.bet, gameState.risk, gameState.rows]);

  // Recompute layout when risk/rows change
  useEffect(() => {
    const { W, H } = dimsRef.current;
    if (W > 0 && H > 0) {
      const { pegs, slots } = computeLayout(gameState.rows, gameState.risk, W, H);
      animRef.current.pegs = pegs;
      animRef.current.slots = slots;
    }
  }, [gameState.rows, gameState.risk]);

  // Stable dispatch ref so callbacks don't go stale
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const connectedUserRef = useRef(connectedUser);
  connectedUserRef.current = connectedUser;

  // Spawn ball function exposed via imperative handle
  const spawnBall = useRef(() => {
    if (!connectedUserRef.current) return;
    const { balance, bet, risk, rows } = settingsRef.current;
    if (bet > balance) return;

    dispatchRef.current({ type: 'DEDUCT_BET', payload: bet });
    // Update local ref immediately so rapid clicks read correct balance
    settingsRef.current.balance -= bet;

    const { W } = dimsRef.current;
    animRef.current.balls.push({
      x: W / 2 + (Math.random() - 0.5) * 20,
      y: 20,
      vx: 0,
      vy: 0,
      trail: [],
      bet,
      risk,
      rows,
      active: true,
    });
  }).current;

  useImperativeHandle(ref, () => ({ spawnBall }), [spawnBall]);

  // Canvas setup + animation loop (runs once on mount)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;

    function resize() {
      const area = canvas.parentElement;
      const rect = area.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const W = rect.width;
      const H = rect.height;
      dimsRef.current = { W, H };
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { rows, risk } = settingsRef.current;
      const { pegs, slots } = computeLayout(rows, risk, W, H);
      animRef.current.pegs = pegs;
      animRef.current.slots = slots;
    }

    function loop() {
      const { W, H } = dimsRef.current;
      const landings = updateBalls(animRef.current, W, H);

      for (const { mult, winnings } of landings) {
        dispatchRef.current({ type: 'ADD_WINNINGS', payload: winnings });
        dispatchRef.current({ type: 'SET_LAST_WIN', payload: { mult, amount: winnings } });
        settingsRef.current.balance += winnings;
      }

      draw(ctx, animRef.current, W, H);
      rafId = requestAnimationFrame(loop);
    }

    resize();
    rafId = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="plinko-canvas" />;
});

export default PlinkoCanvas;
