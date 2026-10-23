import { useCallback, useRef, type RefObject } from "react";
import { useGameDispatch, useGameState } from "../contexts/GameContext.tsx";
import { useWallet } from "../contexts/WalletContext.tsx";
import { playLaunch } from "../sounds.js";
import { spawnStaggerFrames } from "../constants.ts";
import type { PlinkoCanvasRef } from "../components/PlinkoCanvas.tsx";

/**
 * Place one drop of `ballCount` balls: the canister resolves them in one
 * `playMany` call, then the canvas replays every returned path. Several drops
 * may be in flight at once; each ball carries its own result. The whole stake
 * (bet × ballCount) is debited optimistically and replaced by the canister's
 * answer when it arrives.
 */
export interface UsePlay {
  play: () => void;
  canPlay: boolean;
}

/** Per-ball stake the house limit allows for `count` balls (floor). */
export function perBallMaxBet(maxBet: bigint, count: number): bigint {
  return count > 0 ? maxBet / BigInt(count) : 0n;
}

/** True when `bet` per ball × `count` fits the balance and the house limit. */
export function canAffordDrop(
  bet: bigint,
  count: number,
  balance: bigint,
  maxBet: bigint,
): boolean {
  if (bet <= 0n || count < 1) return false;
  return bet * BigInt(count) <= balance && bet <= perBallMaxBet(maxBet, count);
}

let nextDropId = 1;

export function usePlay(canvasRef: RefObject<PlinkoCanvasRef | null>): UsePlay {
  const game = useGameState();
  const dispatch = useGameDispatch();
  const { actor, refreshInternal } = useWallet();

  // Latest values for the keyboard shortcut (no stale closure).
  const latest = useRef({ game, actor });
  latest.current = { game, actor };

  const play = useCallback(() => {
    const { game, actor } = latest.current;
    const { token, bet, balance, maxBet, rows, risk, ballCount } = game;
    if (!token || !actor) return;
    if (!canAffordDrop(bet, ballCount, balance, maxBet)) return;

    const totalBet = bet * BigInt(ballCount);
    dispatch({ type: "BET_STARTED", payload: totalBet });
    playLaunch();

    void (async () => {
      try {
        const result = await actor.playMany(token.id, bet, rows, risk, ballCount);
        const dropId = nextDropId++;
        const stagger = spawnStaggerFrames(result.outcomes.length);
        canvasRef.current?.spawnDrop({
          dropId,
          totalBet: result.total_bet,
          balls: result.outcomes.map((o, i) => ({
            path: o.path,
            rows,
            risk,
            multiplierX100: o.multiplier_x100,
            payout: o.payout,
            dropId,
            delayFrames: i * stagger,
          })),
        });
        dispatch({ type: "BET_SETTLED", payload: result.balance });
      } catch (err) {
        const message =
          err instanceof Error && err.message ? err.message : "Bet failed";
        dispatch({
          type: "BET_FAILED",
          payload: { bet: totalBet, error: message },
        });
        // The optimistic refund assumes the canister never saw the bet. A
        // timeout or lost response can mean it did settle, so resync the
        // real balance rather than trusting the local one.
        void refreshInternal();
      }
    })();
  }, [canvasRef, dispatch, refreshInternal]);

  const canPlay =
    game.token !== null &&
    actor !== null &&
    canAffordDrop(game.bet, game.ballCount, game.balance, game.maxBet);

  return { play, canPlay };
}
