import { useGameState } from "../contexts/GameContext.tsx";

interface DropButtonProps {
  onDrop: () => void;
}

export default function DropButton({ onDrop }: DropButtonProps) {
  const { risk, bet, balance } = useGameState();
  const disabled = balance < bet;

  return (
    <button
      className={`btn btn-drop drop-${risk}`}
      onClick={onDrop}
      disabled={disabled}
    >
      Drop Ball
    </button>
  );
}
