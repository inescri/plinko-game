import { useWallet } from '../contexts/WalletContext.tsx';

interface WalletSectionProps {
  onDeposit?: () => void;
}

export default function WalletSection({ onDeposit }: WalletSectionProps) {
  const { connectedUser, principal, isConnecting, connectWallet, disconnectWallet } = useWallet();

  if (connectedUser) {
    return (
      <div className="wallet-section">
        <div className="wallet-connected" style={{ display: 'flex' }}>
          <div className="wallet-info">
            <span className="wallet-status">Connected</span>
            <span className="wallet-principal">{principal}</span>
          </div>
          <div className="wallet-actions">
            <button className="btn btn-open-deposit" onClick={onDeposit}>
              Deposit
            </button>
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
      <button className="btn btn-connect" onClick={connectWallet} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect Odin Account'}
      </button>
    </div>
  );
}
