import type { SortCol } from "../types";
import { ColumnToggle } from "./ColumnToggle";

interface Props {
  columns?: { key: SortCol; label: string }[];
  visibleCols?: Set<SortCol>;
  onToggleCol?: (key: SortCol) => void;
  onClearFilters?: () => void;
  onImportLibrary?: () => void;
  ownedCount?: number;
}

export function Header({ columns, visibleCols, onToggleCol, onClearFilters, onImportLibrary, ownedCount }: Props) {
  const showActions = columns && visibleCols && onToggleCol && onClearFilters;

  return (
    <div className="top-bar">
      <header>
        <div className="header-left">
          <h1>Rating Epic Games</h1>
          <span className="subtitle">Every free Epic game. Rated. Reviewed. All in one place.</span>
        </div>
        {showActions && (
          <div className="header-actions">
            {onImportLibrary && (
              <button type="button" className="btn-clear btn-import-lib" onClick={onImportLibrary}>
                Import Library
                {ownedCount ? <span className="col-badge">{ownedCount}</span> : null}
              </button>
            )}
            <ColumnToggle columns={columns} visible={visibleCols} onToggle={onToggleCol} />
            <button type="button" className="btn-clear" onClick={onClearFilters}>
              Clear Filters
            </button>
          </div>
        )}
      </header>
    </div>
  );
}
