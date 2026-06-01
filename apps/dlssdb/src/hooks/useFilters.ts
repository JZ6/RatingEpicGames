import { useMemo } from "react";
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo, Filters, SortCol } from "../types";
import { useFilterState, sortComparator } from "@shared/hooks/useFilterState";
import { buildEmptyFilters } from "@shared/components/Column";
import type { FilterDeps } from "@shared/components/Column";
import { COLUMNS } from "../components/GameTable";

const EMPTY_FILTERS = buildEmptyFilters(COLUMNS) as Filters;

export function useFilters(
  games: DlssGame[],
  hltb: Record<string, HltbInfo>,
  steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo> = {},
  upscaling: Record<string, UpscalingInfo> = {},
  hiddenGames: Set<string> = new Set(),
  ownedGames: Set<string> = new Set(),
) {
  const { filters, setFilter, clearFilters, sortCol, sortDir, toggleSort } = useFilterState<Filters, SortCol>({
    emptyFilters: EMPTY_FILTERS,
    lsFiltersKey: "dlssdb-filters",
    lsSortKey: "dlssdb-sort",
    defaultSort: { col: "steam", dir: -1 },
  });

  const deps: FilterDeps = useMemo(
    () => ({ steam, hltb, metacritic, upscaling, hiddenGames, ownedGames }),
    [steam, hltb, metacritic, upscaling, hiddenGames, ownedGames],
  );

  const filtered = useMemo(() => {
    const f = filters as Record<string, string>;
    return games
      .filter((g) => COLUMNS.every((col) => col.filter(g, f[col.filterKey ?? col.key] ?? "", deps)))
      .sort((a, b) => {
        const col = COLUMNS.find((c) => c.key === sortCol);
        return sortComparator(a, b, sortDir, (g) => col?.sortValue(g, deps) ?? null);
      });
  }, [games, filters, sortCol, sortDir, deps]);

  const filterCounts = useMemo(
    () => Object.fromEntries(
      COLUMNS
        .map((col) => [col.filterKey ?? col.key, col.count(games, deps)] as const)
        .filter(([, c]) => Object.keys(c).length > 0),
    ),
    [games, deps],
  );

  return { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort };
}
