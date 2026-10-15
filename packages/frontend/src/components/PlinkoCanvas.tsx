import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type Dispatch,
} from "react";
import { useGameState, useGameDispatch } from "../contexts/GameContext.tsx";
import {
  computeLayout,
  createBall,
  draw,
  updateBalls,
  type AnimationState,
  type BallSpawn,
} from "../engine.ts";
import { playPegHit, playLanding } from "../sounds.js";
import type { Risk, Rows, GameAction } from "../contexts/GameContext.tsx";

interface Dimensions {
  W: number;
  H: number;
}

export interface PlinkoCanvasRef {
  /** Animate a bet the canister already resolved. */
  spawnBall: (spawn: BallSpawn) => void;
}

const PlinkoCanvas = forwardRef<PlinkoCanvasRef>(function PlinkoCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameState = useGameState();
  const dispatch = useGameDispatch();

  const animRef = useRef<AnimationState>({
    balls: [],
    pegs: [],
    slots: [],
    slotFlashes: [],
  });
  const dimsRef = useRef<Dimensions>({ W: 0, H: 0 });
  const tableRef = useRef<{ risk: Risk; rows: Rows }>({
    risk: gameState.risk,
    rows: gameState.rows,
  });

  useEffect(() => {
    tableRef.current = { risk: gameState.risk, rows: gameState.rows };
    const { W, H } = dimsRef.current;
    if (W > 0 && H > 0) {
      const { pegs, slots } = computeLayout(gameState.rows, gameState.risk, W, H);
      animRef.current.pegs = pegs;
      animRef.current.slots = slots;
    }
  }, [gameState.rows, gameState.risk]);

  const dispatchRef = useRef<Dispatch<GameAction>>(dispatch);
  dispatchRef.current = dispatch;

  const spawnBall = useRef((spawn: BallSpawn) => {
    const { W, H } = dimsRef.current;
    if (W <= 0 || H <= 0) return;
    animRef.current.balls.push(createBall(spawn, W, H));
  }).current;

  useImperativeHandle(ref, () => ({ spawnBall }), [spawnBall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId: number;

    function resize() {
      if (!canvas || !ctx) return;
      const area = canvas.parentElement;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const W = rect.width;
      const H = rect.height;
      dimsRef.current = { W, H };
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { rows, risk } = tableRef.current;
      const { pegs, slots } = computeLayout(rows, risk, W, H);
      animRef.current.pegs = pegs;
      animRef.current.slots = slots;
    }

    function loop() {
      if (!ctx) return;
      const { W, H } = dimsRef.current;
      const { landings, pegHits } = updateBalls(animRef.current, W);

      if (pegHits > 0) playPegHit();

      for (const { multiplierX100, payout } of landings) {
        dispatchRef.current({
          type: "SET_LAST_WIN",
          payload: { multiplierX100, payout },
        });
        playLanding(multiplierX100 / 100);
      }

      draw(ctx, animRef.current, W, H, tableRef.current.risk);
      rafId = requestAnimationFrame(loop);
    }

    resize();
    rafId = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="plinko-canvas" />;
});

export default PlinkoCanvas;
