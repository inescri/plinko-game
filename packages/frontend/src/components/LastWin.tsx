import { useGameState } from "../contexts/GameContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function LastWin() {
  const { lastWin, lastDrop, token } = useGameState();

  if (!lastWin || !token) return null;

  const places = placesOf(token);
  const mult = lastWin.multiplierX100 / 100;
  const amount = formatFixed(lastWin.payout, places);

  // Drop tally: shown once every ball of a multi-ball drop has landed.
  const tally = lastDrop && lastDrop.count > 1 ? lastDrop : null;
  const tallyMult =
    tally && tally.totalBet > 0n
      ? Number((tally.totalPayout * 100n) / tally.totalBet) / 100
      : 0;

  return (
    <div className="last-win">
      <span className="last-win-label">Last Ball</span>
      <span className={`last-win-value ${mult >= 1 ? "win" : "loss"}`}>
        {amount} {token.ticker} ({mult}×)
      </span>
      {tally && (
        <span
          className={`last-win-total ${
            tally.totalPayout >= tally.totalBet ? "win" : "loss"
          }`}
        >
          Drop total: {formatFixed(tally.totalPayout, places)} {token.ticker} (
          {tallyMult}× · {tally.count} balls)
        </span>
      )}
    </div>
  );
}
