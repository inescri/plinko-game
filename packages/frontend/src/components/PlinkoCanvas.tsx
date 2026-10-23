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
  queueBall,
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

/** One resolved `playMany` call: every ball shares `dropId`. */
export interface DropSpawn {
  dropId: number;
  totalBet: bigint;
  balls: BallSpawn[];
}

export interface PlinkoCanvasRef {
  /** Animate a drop the canister already resolved. */
  spawnDrop: (drop: DropSpawn) => void;
}

/** Balls of a drop still falling, and the tally so far. */
interface PendingDrop {
  remaining: number;
  count: number;
  totalBet: bigint;
  totalPayout: bigint;
}

const PlinkoCanvas = forwardRef<PlinkoCanvasRef>(function PlinkoCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameState = useGameState();
  const dispatch = useGameDispatch();

  const animRef = useRef<AnimationState>({
    pending: [],
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

  const dropsRef = useRef(new Map<number, PendingDrop>());

  /** Publish a finished drop's tally. */
  const reportDrop = useRef((pending: PendingDrop) => {
    dispatchRef.current({
      type: "SET_LAST_DROP",
      payload: {
        count: pending.count,
        totalBet: pending.totalBet,
        totalPayout: pending.totalPayout,
      },
    });
  }).current;

  const spawnDrop = useRef((drop: DropSpawn) => {
    if (drop.balls.length === 0) return;
    const { W, H } = dimsRef.current;
    const pending: PendingDrop = {
      remaining: drop.balls.length,
      count: drop.balls.length,
      totalBet: drop.totalBet,
      totalPayout: drop.balls.reduce((sum, b) => sum + b.payout, 0n),
    };
    if (W <= 0 || H <= 0) {
      // Nothing to animate on, but the result is settled: still report it,
      // last ball included, so the player sees why the balance moved.
      const last = drop.balls[drop.balls.length - 1];
      dispatchRef.current({
        type: "SET_LAST_WIN",
        payload: { multiplierX100: last.multiplierX100, payout: last.payout },
      });
      reportDrop(pending);
      return;
    }
    dropsRef.current.set(drop.dropId, pending);
    for (const spawn of drop.balls) {
      queueBall(animRef.current, spawn);
    }
  }).current;

  useImperativeHandle(ref, () => ({ spawnDrop }), [spawnDrop]);

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
      const { landings, pegHits } = updateBalls(animRef.current, W, H);

      if (pegHits > 0) playPegHit();

      // Big drops land several balls per frame: report once per frame (the
      // last ball, and the loudest sound) instead of once per ball, so the
      // reducer and the audio graph are not hit hundreds of times a second.
      if (landings.length > 0) {
        const last = landings[landings.length - 1];
        dispatchRef.current({
          type: "SET_LAST_WIN",
          payload: { multiplierX100: last.multiplierX100, payout: last.payout },
        });
        let loudest = 0;
        for (const l of landings) {
          if (l.multiplierX100 > loudest) loudest = l.multiplierX100;
        }
        playLanding(loudest / 100);

        for (const { dropId } of landings) {
          const pending = dropsRef.current.get(dropId);
          if (!pending) continue;
          pending.remaining--;
          if (pending.remaining <= 0) {
            dropsRef.current.delete(dropId);
            reportDrop(pending);
          }
        }
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
