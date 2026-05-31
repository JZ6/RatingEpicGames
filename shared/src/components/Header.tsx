import { ColumnToggle } from "./ColumnToggle";

interface Props {
  title: string;
  subtitle: string;
  columns?: { key: string; label: string; fullLabel?: string; tooltip?: string }[];
  visibleCols?: Set<string>;
  onToggleCol?: (key: string) => void;
  onClearFilters?: () => void;
  onImportLibrary?: () => void;
  ownedCount?: number;
}

export function Header({ title, subtitle, columns, visibleCols, onToggleCol, onClearFilters, onImportLibrary, ownedCount }: Props) {
  const showActions = columns && visibleCols && onToggleCol && onClearFilters;

  return (
    <div className="top-bar">
      <header>
        <div className="header-left">
          <h1>{title}</h1>
          <span className="subtitle">{subtitle}</span>
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
