import { useWallet } from "../contexts/WalletContext.tsx";

interface WalletSectionProps {
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onFundHouse?: () => void;
}

export default function WalletSection({
  onDeposit,
  onWithdraw,
  onFundHouse,
}: WalletSectionProps) {
  const {
    connectedUser,
    principal,
    isConnecting,
    connectionError,
    connectWallet,
    disconnectWallet,
    internalBalances,
    isHouseAdmin,
  } = useWallet();

  if (connectedUser) {
    const canWithdraw = internalBalances.some((b) => b.amount > 0n);
    return (
      <div className="wallet-section">
        <div className="wallet-connected" style={{ display: "flex" }}>
          <div className="wallet-info">
            <span className="wallet-status">Connected</span>
            <span className="wallet-principal">{principal}</span>
          </div>
          <div className="wallet-actions">
            <button className="btn btn-open-deposit" onClick={onDeposit}>
              Deposit
            </button>
            <button
              className="btn btn-open-deposit"
              onClick={onWithdraw}
              disabled={!canWithdraw}
            >
              Withdraw
            </button>
            {isHouseAdmin && (
              <button className="btn btn-open-deposit" onClick={onFundHouse}>
                Fund house
              </button>
            )}
            <button className="btn btn-disconnect" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-section">
      <button
        className="btn btn-connect"
        onClick={connectWallet}
        disabled={isConnecting}
      >
        {isConnecting ? "Connecting..." : "Connect Odin Account"}
      </button>
      {connectionError && <div className="wallet-error">{connectionError}</div>}
    </div>
  );
}
