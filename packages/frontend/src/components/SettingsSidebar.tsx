import { useEffect, type ReactElement } from "react";
import RowsSelector from "./RowsSelector.tsx";
import RiskSelector from "./RiskSelector.tsx";

interface SettingsSidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-in panel holding the board settings (rows, risk). Rendered always so
 * the open/close transition can animate; the backdrop and Escape close it.
 */
export default function SettingsSidebar({
  open,
  onClose,
}: SettingsSidebarProps): ReactElement {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Game settings"
        aria-hidden={!open}
      >
        <div className="sidebar-header">
          <h2 className="sidebar-title">Settings</h2>
          <button
            type="button"
            className="btn sidebar-close"
            onClick={onClose}
            aria-label="Close settings"
            tabIndex={open ? 0 : -1}
          >
            ×
          </button>
        </div>
        <div className="sidebar-body">
          <RowsSelector />
          <RiskSelector />
        </div>
      </aside>
    </>
  );
}
