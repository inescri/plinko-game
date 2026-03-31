import { useGameState } from '../contexts/GameContext.jsx';

export default function BalanceDisplay() {
  const { balance } = useGameState();

  const formatted = balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <div className="balance-display">
      <span className="balance-label">Token Balance</span>
      <span className="balance-value">{formatted}</span>
    </div>
  );
}
