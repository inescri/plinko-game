export default function DropButton({ onDrop }) {
  return (
    <button className="btn btn-drop" onClick={onDrop}>
      Drop Ball
    </button>
  );
}
