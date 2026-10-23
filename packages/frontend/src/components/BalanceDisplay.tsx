import { useGameState } from "../contexts/GameContext.tsx";
import { useWallet } from "../contexts/WalletContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";
import { useTweenedBigInt } from "../hooks/useTweenedBigInt.ts";
import RefreshBalanceButton from "./RefreshBalanceButton.tsx";

export default function BalanceDisplay() {
  const { balance, token, inFlight } = useGameState();
  const { connectedUser, refreshError } = useWallet();

  // Count from the old balance to the new one; a token switch snaps instead.
  const shown = useTweenedBigInt(balance, 700, token === null);
  const formatted = token ? formatFixed(shown, placesOf(token)) : "0.00";

  return (
    <div className="balance-display">
      <span className="balance-label">Game Balance</span>
      <span className="balance-value">
        {formatted}
        {token ? ` ${token.ticker}` : ""}
        {/* Don't refetch mid-drop: the mirrored balance is frozen while a bet is pending. */}
        {connectedUser && <RefreshBalanceButton disabled={inFlight > 0} />}
      </span>
      {refreshError && <div className="deposit-error">{refreshError}</div>}
    </div>
  );
}
