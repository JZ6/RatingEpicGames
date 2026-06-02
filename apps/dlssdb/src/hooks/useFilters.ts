import { useMemo } from "react";
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo } from "../types";
import { useColumnFilters } from "@shared/hooks/useColumnFilters";
import type { FilterDeps } from "@shared/components/Column";
import { COLUMNS } from "../components/GameTable";

export function useFilters(
  games: DlssGame[],
  hltb: Record<string, HltbInfo>,
  steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo> = {},
  upscaling: Record<string, UpscalingInfo> = {},
  hiddenGames: Set<string> = new Set(),
  ownedGames: Set<string> = new Set(),
) {
  const deps: FilterDeps = useMemo(
    () => ({ steam, hltb, metacritic, upscaling, hiddenGames, ownedGames }),
    [steam, hltb, metacritic, upscaling, hiddenGames, ownedGames],
  );
  return useColumnFilters(COLUMNS, games, deps, {
    lsFiltersKey: "dlssdb-filters",
    lsSortKey: "dlssdb-sort",
    defaultSort: { col: "steam", dir: -1 },
  });
}
