import { useMemo } from "react";
import type { Column, FilterDeps } from "../components/Column";
import { buildEmptyFilters } from "../components/Column";
import { useFilterState, sortComparator } from "./useFilterState";
import type { SortDir } from "./useFilterState";

interface ColumnFiltersConfig {
  lsFiltersKey: string;
  lsSortKey: string;
  defaultSort: { col: string; dir: SortDir };
}

export function useColumnFilters<G extends { name: string }>(
  columns: Column[],
  games: G[],
  deps: FilterDeps,
  config: ColumnFiltersConfig,
) {
  // columns is always a module-level constant — stable across renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emptyFilters = useMemo(() => buildEmptyFilters(columns), []);

  const { filters, setFilter, clearFilters, sortCol, sortDir, toggleSort } = useFilterState({
    emptyFilters,
    ...config,
  });

  const filtered = useMemo(
    () =>
      games
        .filter((g) => columns.every((col) => col.filter(g, filters[col.filterKey ?? col.key] ?? "", deps)))
        .sort((a, b) => {
          const col = columns.find((c) => c.key === sortCol);
          return sortComparator(a, b, sortDir, (g) => col?.sortValue(g, deps) ?? null);
        }),
    [games, filters, sortCol, sortDir, deps],
  );

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        columns
          .map((col) => [col.filterKey ?? col.key, col.count(games, deps)] as const)
          .filter(([, c]) => Object.keys(c).length > 0),
      ),
    [games, deps],
  );

  return { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort };
}
