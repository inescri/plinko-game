import { useGameState } from "../contexts/GameContext.tsx";
import { useWallet } from "../contexts/WalletContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function BalanceDisplay() {
  const { balance, token, inFlight } = useGameState();
  const { refreshBalances, isRefreshing } = useWallet();

  const formatted = token ? formatFixed(balance, placesOf(token)) : "0.00";
  // Don't refetch mid-drop: the mirrored balance is frozen while a bet is pending.
  const disabled = isRefreshing || inFlight > 0;

  return (
    <div className="balance-display">
      <span className="balance-label">Game Balance</span>
      <span className="balance-value">
        {formatted}
        {token ? ` ${token.ticker}` : ""}
        <button
          type="button"
          className={`btn-refresh${isRefreshing ? " is-refreshing" : ""}`}
          title="Refresh balance"
          aria-label="Refresh balance"
          disabled={disabled}
          onClick={() => void refreshBalances()}
        >
          ↻
        </button>
      </span>
    </div>
  );
}
