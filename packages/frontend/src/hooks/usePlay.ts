import { useCallback, useRef, type RefObject } from "react";
import { useGameDispatch, useGameState } from "../contexts/GameContext.tsx";
import { useWallet } from "../contexts/WalletContext.tsx";
import { playLaunch } from "../sounds.js";
import type { PlinkoCanvasRef } from "../components/PlinkoCanvas.tsx";

/**
 * Place one bet: the canister resolves it (`play`), then the canvas replays
 * the returned path. Several bets may be in flight at once; each ball
 * carries its own result. The balance is debited optimistically and
 * replaced by the canister's answer when it arrives.
 */
export interface UsePlay {
  play: () => void;
  canPlay: boolean;
}

export function usePlay(canvasRef: RefObject<PlinkoCanvasRef | null>): UsePlay {
  const game = useGameState();
  const dispatch = useGameDispatch();
  const { actor, refreshInternal } = useWallet();

  // Latest values for the keyboard shortcut (no stale closure).
  const latest = useRef({ game, actor });
  latest.current = { game, actor };

  const play = useCallback(() => {
    const { game, actor } = latest.current;
    const { token, bet, balance, maxBet, rows, risk } = game;
    if (!token || !actor) return;
    if (bet <= 0n || bet > balance || bet > maxBet) return;

    dispatch({ type: "BET_STARTED", payload: bet });
    playLaunch();

    void (async () => {
      try {
        const result = await actor.play(token.id, bet, rows, risk);
        canvasRef.current?.spawnBall({
          path: result.path,
          rows,
          risk,
          multiplierX100: result.multiplier_x100,
          payout: result.payout,
        });
        dispatch({ type: "BET_SETTLED", payload: result.balance });
      } catch (err) {
        const message =
          err instanceof Error && err.message ? err.message : "Bet failed";
        dispatch({ type: "BET_FAILED", payload: { bet, error: message } });
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
    game.bet > 0n &&
    game.bet <= game.balance &&
    game.bet <= game.maxBet;

  return { play, canPlay };
}
