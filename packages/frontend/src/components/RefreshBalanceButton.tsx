import { useWallet } from "../contexts/WalletContext.tsx";

interface RefreshBalanceButtonProps {
  /** Extra reason to block a refresh (e.g. a bet or deposit in progress). */
  disabled?: boolean;
}

/** Re-fetches the wallet and canister balances; spins while in flight. */
export default function RefreshBalanceButton({ disabled = false }: RefreshBalanceButtonProps) {
  const { refreshBalances, isRefreshing } = useWallet();

  return (
    <button
      type="button"
      className={`btn-refresh${isRefreshing ? " is-refreshing" : ""}`}
      title="Refresh balance"
      aria-label="Refresh balance"
      disabled={disabled || isRefreshing}
      onClick={() => void refreshBalances()}
    >
      ↻
    </button>
  );
}
