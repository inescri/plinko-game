import { useGameState } from "../contexts/GameContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function BalanceDisplay() {
  const { balance, token } = useGameState();

  const formatted = token ? formatFixed(balance, placesOf(token)) : "0.00";

  return (
    <div className="balance-display">
      <span className="balance-label">Game Balance</span>
      <span className="balance-value">
        {formatted}
        {token ? ` ${token.ticker}` : ""}
      </span>
    </div>
  );
}
