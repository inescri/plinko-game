import { useWallet } from '../contexts/WalletContext.jsx';

export default function WalletSection() {
  const { connectedUser, principal, isConnecting, connectWallet, disconnectWallet } = useWallet();

  if (connectedUser) {
    return (
      <div className="wallet-section">
        <div className="wallet-connected" style={{ display: 'flex' }}>
          <div className="wallet-info">
            <span className="wallet-status">Connected</span>
            <span className="wallet-principal">{principal}</span>
          </div>
          <button className="btn btn-disconnect" onClick={disconnectWallet}>
            Disconnect
          </button>
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
