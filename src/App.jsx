import { useCallback, useEffect, useRef } from 'react';
import PlinkoCanvas from './components/PlinkoCanvas.jsx';
import WalletSection from './components/WalletSection.jsx';
import TokenSelect from './components/TokenSelect.jsx';
import BalanceDisplay from './components/BalanceDisplay.jsx';
import BetControls from './components/BetControls.jsx';
import RowsSelector from './components/RowsSelector.jsx';
import RiskSelector from './components/RiskSelector.jsx';
import DropButton from './components/DropButton.jsx';
import LastWin from './components/LastWin.jsx';

export default function App() {
  const canvasRef = useRef(null);

  const handleDrop = useCallback(() => {
    canvasRef.current?.spawnBall();
  }, []);

  // Keyboard shortcut: Space to drop ball
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        canvasRef.current?.spawnBall();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="container">
      <div className="top-bar">
        <WalletSection />
        <TokenSelect />
        <div className="balance-row">
          <BalanceDisplay />
          <LastWin />
        </div>
      </div>
      <div className="game-area">
        <PlinkoCanvas ref={canvasRef} />
      </div>
      <div className="bottom-bar">
        <BetControls />
        <RowsSelector />
        <RiskSelector />
        <DropButton onDrop={handleDrop} />
      </div>
    </div>
  );
}
