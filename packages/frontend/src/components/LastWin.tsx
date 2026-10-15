import { useGameState } from "../contexts/GameContext.tsx";

export default function LastWin() {
  const { lastWin } = useGameState();

  return (
    <div className="last-win">
      <span className="last-win-label">Last Win</span>
      <span className="last-win-value" style={{ opacity: lastWin ? 1 : 0 }}>
        {lastWin ? `+${lastWin.amount.toFixed(2)} (${lastWin.mult}×)` : ""}
      </span>
    </div>
  );
}
