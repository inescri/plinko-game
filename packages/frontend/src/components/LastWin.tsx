import { useGameState } from "../contexts/GameContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function LastWin() {
  const { lastWin, lastDrop, token } = useGameState();

  if (!lastWin || !token) return null;

  const places = placesOf(token);
  const mult = lastWin.multiplierX100 / 100;
  const amount = formatFixed(lastWin.payout, places);
  const ballText = `${amount} ${token.ticker} (${mult}×)`;
  const ballWon = mult >= 1;

  // Drop tally: shown once every ball of a multi-ball drop has landed. It is
  // the headline number then; the last ball drops to a secondary line.
  const tally = lastDrop && lastDrop.count > 1 ? lastDrop : null;

  if (!tally) {
    return (
      <div className="last-win">
        <span className="last-win-label">Last Ball</span>
        <span className={`last-win-value ${ballWon ? "win" : "loss"}`}>
          {ballText}
        </span>
      </div>
    );
  }

  const tallyMult =
    tally.totalBet > 0n
      ? Number((tally.totalPayout * 100n) / tally.totalBet) / 100
      : 0;
  const tallyWon = tally.totalPayout >= tally.totalBet;

  return (
    <div className="last-win">
      <span className="last-win-label">Drop Total</span>
      <span className={`last-win-value ${tallyWon ? "win" : "loss"}`}>
        {formatFixed(tally.totalPayout, places)} {token.ticker} ({tallyMult}×
        · {tally.count} balls)
      </span>
      <span className={`last-win-total ${ballWon ? "win" : "loss"}`}>
        Last ball: {ballText}
      </span>
    </div>
  );
}
