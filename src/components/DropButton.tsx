import { useGameState } from "../contexts/GameContext.tsx";

interface DropButtonProps {
  onDrop: () => void;
  isLoading?: boolean;
}

export default function DropButton({ onDrop, isLoading }: DropButtonProps) {
  const { risk, bet, balance } = useGameState();
  const disabled = balance < bet || !!isLoading;

  return (
    <button
      className={`btn btn-drop drop-${risk}`}
      onClick={onDrop}
      disabled={disabled}
    >
      {isLoading ? "Dropping..." : "Drop Ball"}
    </button>
  );
}
