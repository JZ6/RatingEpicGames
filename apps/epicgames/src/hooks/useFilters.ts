import { useMemo } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo } from "../types";
import { useColumnFilters } from "@shared/hooks/useColumnFilters";
import type { FilterDeps } from "@shared/components/Column";
import { COLUMNS } from "../components/GameTable";

export function useFilters(
  games: EpicGame[],
  hltb: Record<string, HltbInfo>,
  steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo> = {},
  epic: Record<string, EpicInfo> = {},
  hiddenGames: Set<string> = new Set(),
  ownedGames: Set<string> = new Set(),
) {
  const deps: FilterDeps = useMemo(
    () => ({ steam, hltb, metacritic, epic, hiddenGames, ownedGames }),
    [steam, hltb, metacritic, epic, hiddenGames, ownedGames],
  );
  return useColumnFilters(COLUMNS, games, deps, {
    lsFiltersKey: "epicdb-filters",
    lsSortKey: "epicdb-sort",
    defaultSort: { col: "epicdate", dir: -1 },
  });
}
