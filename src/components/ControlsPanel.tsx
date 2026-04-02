import WalletSection from './WalletSection.tsx';
import BalanceDisplay from './BalanceDisplay.tsx';
import BetControls from './BetControls.tsx';
import RiskSelector from './RiskSelector.tsx';

import DropButton from './DropButton.tsx';
import LastWin from './LastWin.tsx';

interface ControlsPanelProps {
  onDrop: () => void;
}

export default function ControlsPanel({ onDrop }: ControlsPanelProps) {
  return (
    <div className="controls-panel">
      <WalletSection />
      <h1 className="title">PLINKO</h1>
      <BalanceDisplay />
      <BetControls />
      <RiskSelector />
      <DropButton onDrop={onDrop} />
      <LastWin />
    </div>
  );
}
