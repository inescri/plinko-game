import type { ReactElement } from "react";
import { useGameState } from "../contexts/GameContext.tsx";

interface SettingsButtonProps {
  onOpen: () => void;
}

/** Opens the settings sidebar; shows the current rows / risk at a glance. */
export default function SettingsButton({
  onOpen,
}: SettingsButtonProps): ReactElement {
  const { rows, risk } = useGameState();
  const riskLabel = risk.charAt(0).toUpperCase() + risk.slice(1);

  return (
    <button
      type="button"
      className="btn btn-settings"
      onClick={onOpen}
      aria-label="Open game settings"
      aria-haspopup="dialog"
    >
      <span className="btn-settings-icon" aria-hidden="true">
        ⚙
      </span>
      <span className="btn-settings-summary">
        {rows} rows · <span className={`risk-text risk-${risk}`}>{riskLabel}</span>
      </span>
    </button>
  );
}
