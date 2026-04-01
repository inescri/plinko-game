import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext.jsx';

export default function TokenSelect() {
  const { connectedUser, tokenBalances, selectedTokenId, selectToken } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const disabled = !connectedUser || tokenBalances.length === 0;
  const selectedToken = tokenBalances.find((t) => t.id === selectedTokenId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="control-group">
      <label>Token</label>
      <div className="custom-select" ref={ref}>
        <button
          className="custom-select-trigger"
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          {selectedToken ? (
            <span className="token-option">
              <img
                src={`https://images.odin.fun/dev/token/${selectedToken.id}`}
                alt={selectedToken.ticker}
                className="token-image"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <span className="token-image-placeholder" style={{ display: 'none' }}>
                {selectedToken.ticker.charAt(0)}
              </span>
              {selectedToken.ticker}
            </span>
          ) : (
            <span>{connectedUser ? 'Select a token' : 'Connect odin first'}</span>
          )}
          <span className="select-arrow">▾</span>
        </button>
        {open && (
          <ul className="custom-select-dropdown">
            {tokenBalances.map((token) => (
              <li
                key={token.id}
                className={`custom-select-option${token.id === selectedTokenId ? ' selected' : ''}`}
                onClick={() => {
                  selectToken(token.id);
                  setOpen(false);
                }}
              >
                <img
                  src={`https://images.odin.fun/dev/token/${token.id}`}
                  alt={token.ticker}
                  className="token-image"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <span className="token-image-placeholder" style={{ display: 'none' }}>
                  {token.ticker.charAt(0)}
                </span>
                {token.ticker}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
