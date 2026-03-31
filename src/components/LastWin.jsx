import { useGameState } from '../contexts/GameContext.jsx';

export default function LastWin() {
  const { lastWin } = useGameState();

  return (
    <div className="last-win" style={{ opacity: lastWin ? 1 : 0 }}>
      {lastWin ? `${lastWin.mult}× — Won ${lastWin.amount.toFixed(2)}` : ''}
    </div>
  );
}
