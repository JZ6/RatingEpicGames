import { useState, useRef, useEffect } from "react";
import type { SortCol } from "../types";

interface Props {
  columns: { key: SortCol; label: string; tooltip?: string }[];
  visible: Set<SortCol>;
  onToggle: (key: SortCol) => void;
}

export function ColumnToggle({ columns, visible, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const hiddenCount = columns.filter((c) => !visible.has(c.key)).length;

  return (
    <div className="col-toggle" ref={ref}>
      <button type="button" className="btn-columns" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        Columns{hiddenCount > 0 && <span className="col-badge">{hiddenCount} hidden</span>}
      </button>
      {open && (
        <div className="col-dropdown">
          {columns.map((col) => (
            <label key={col.key} className="col-option" data-tip={col.tooltip} tabIndex={0}>
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => onToggle(col.key)}
                disabled={col.key === "name"}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
