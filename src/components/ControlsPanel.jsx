import WalletSection from './WalletSection.jsx';
import TokenSelect from './TokenSelect.jsx';
import BalanceDisplay from './BalanceDisplay.jsx';
import BetControls from './BetControls.jsx';
import RiskSelector from './RiskSelector.jsx';
import RowSelector from './RowSelector.jsx';
import DropButton from './DropButton.jsx';
import LastWin from './LastWin.jsx';

export default function ControlsPanel({ onDrop }) {
  return (
    <div className="controls-panel">
      <WalletSection />
      <h1 className="title">PLINKO</h1>
      <TokenSelect />
      <BalanceDisplay />
      <BetControls />
      <RiskSelector />
      <RowSelector />
      <DropButton onDrop={onDrop} />
      <LastWin />
    </div>
  );
}
