import type { Column } from "./Column";

interface TableHeaderProps {
  cols: Column[];
  colWidths: number[];
  filters: Record<string, string>;
  filterCounts: Record<string, Record<string, number>>;
  onFilter: (key: string, value: string) => void;
  sortCol: string;
  sortDir: 1 | -1;
  onSort: (key: string) => void;
}

export function TableHeader({ cols, colWidths, filters, filterCounts, onFilter, sortCol, sortDir, onSort }: TableHeaderProps) {
  return (
    <thead>
      <tr>
        {cols.map((col, colIdx) => {
          const filterKey = col.filterKey ?? col.key;
          const filterOpts = col.resolveFilters(filterCounts[filterKey] ?? {});
          return (
            <th
              key={col.key}
              className={sortCol === col.key ? "sorted" : ""}
              aria-sort={sortCol === col.key ? (sortDir === 1 ? "ascending" : "descending") : "none"}
            >
              <div
                className="th-label"
                role="button"
                tabIndex={0}
                onClick={() => onSort(col.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col.key); } }}
              >
                <span className="si">
                  <span className={`si-up ${sortCol === col.key && sortDir === 1 ? "si-on" : "si-off"}`} />
                  <span className={`si-down ${sortCol === col.key && sortDir === -1 ? "si-on" : "si-off"}`} />
                </span>
                {col.fullLabel && colWidths[colIdx] >= col.fullLabel.length * 11 + 60 ? col.fullLabel : col.label}
                <span className="th-info" data-tip={col.tooltip} tabIndex={0} onClick={(e) => e.stopPropagation()}>ⓘ</span>
              </div>
              {col.filterType === "input" ? (
                <input
                  className="th-filter-input"
                  type="text"
                  aria-label={col.ariaLabel ?? `Filter ${col.label}`}
                  placeholder={
                    window.innerWidth <= 800
                      ? (col.mobilePlaceholder ?? col.placeholder ?? `Filter ${col.label.toLowerCase()}...`)
                      : (col.placeholder ?? `Filter ${col.label.toLowerCase()}...`)
                  }
                  value={filters[filterKey] ?? ""}
                  onChange={(e) => onFilter(filterKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : filterOpts.length > 0 ? (
                <select
                  className="th-filter-select"
                  value={filters[filterKey] ?? ""}
                  onChange={(e) => onFilter(filterKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {filterOpts.map((o) => {
                    const count = o.value ? filterCounts[filterKey]?.[o.value] : undefined;
                    return (
                      <option key={o.value} value={o.value}>
                        {o.label}{count !== undefined ? ` (${count})` : ""}
                      </option>
                    );
                  })}
                </select>
              ) : null}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
