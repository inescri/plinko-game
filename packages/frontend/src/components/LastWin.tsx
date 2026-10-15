import { useGameState } from "../contexts/GameContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function LastWin() {
  const { lastWin, token } = useGameState();

  if (!lastWin || !token) return null;

  const mult = lastWin.multiplierX100 / 100;
  const amount = formatFixed(lastWin.payout, placesOf(token));

  return (
    <div className="last-win">
      <span className="last-win-label">Last Drop</span>
      <span className={`last-win-value ${mult >= 1 ? "win" : "loss"}`}>
        {amount} {token.ticker} ({mult}×)
      </span>
    </div>
  );
}
