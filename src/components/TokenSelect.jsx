import { useWallet } from '../contexts/WalletContext.jsx';

export default function TokenSelect() {
  const { connectedUser, tokenBalances, selectedTokenId, selectToken } = useWallet();

  const disabled = !connectedUser || tokenBalances.length === 0;

  return (
    <div className="control-group">
      <label>Token</label>
      <select
        id="token-select"
        disabled={disabled}
        value={selectedTokenId}
        onChange={(e) => selectToken(e.target.value)}
      >
        <option value="" disabled>
          {connectedUser ? 'Select a token' : 'Connect wallet first'}
        </option>
        {tokenBalances.map((token) => (
          <option key={token.id} value={token.id}>
            {token.id} {token.ticker}
          </option>
        ))}
      </select>
    </div>
  );
}
