import { useMemo } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo, Filters, SortCol } from "../types";
import { getHltbHours, getLatestFreeDate } from "../types";
import { useFilterState, sortComparator } from "@shared/hooks/useFilterState";
import { filterBySteam, filterByMetacritic, filterByHltb, filterByHide, filterByOwned, steamSortVal, metacriticSortVal, hltbSortVal, hideSortVal, ownedSortVal, countSteam, countMetacritic, countHltb, countHideOwned } from "@shared/filters";

const EMPTY_FILTERS: Filters = { search: "", steam: "", metacritic: "", userscore: "", hltb: "", year: "", epicrating: "", platform: "", hide: "visible", owned: "" };

export function useFilters(
  games: EpicGame[],
  hltb: Record<string, HltbInfo>,
  steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo> = {},
  epic: Record<string, EpicInfo> = {},
  hiddenGames: Set<string> = new Set(),
  ownedGames: Set<string> = new Set(),
) {
  const { filters, setFilter, clearFilters, sortCol, sortDir, toggleSort } = useFilterState<Filters, SortCol>({
    emptyFilters: EMPTY_FILTERS,
    lsFiltersKey: "epicdb-filters",
    lsSortKey: "epicdb-sort",
    defaultSort: { col: "epicdate", dir: -1 },
  });

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();

    let result = games.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (!filterBySteam(steam[g.name], filters.steam)) return false;
      if (!filterByMetacritic(metacritic[g.name]?.score, filters.metacritic)) return false;
      if (!filterByHltb(getHltbHours(hltb[g.name]), filters.hltb)) return false;
      if (!filterByHide(hiddenGames.has(g.name), filters.hide)) return false;
      if (!filterByOwned(ownedGames.has(g.name), filters.owned)) return false;

      // User Score filter
      if (filters.userscore) {
        const us = metacritic[g.name]?.user_score;
        if (filters.userscore === "unk") { if (us !== undefined) return false; }
        else {
          if (us === undefined) return false;
          if (filters.userscore === "8+" && us < 8) return false;
          if (filters.userscore === "6+" && us < 6) return false;
          if (filters.userscore === "4-" && us >= 4) return false;
        }
      }

      // Year filter
      if (filters.year) {
        const epicInfo = epic[g.name];
        const d = epicInfo?.free_dates?.[epicInfo.free_dates.length - 1];
        if (!d) return false;
        const year = new Date(d.start).getFullYear().toString();
        if (year !== filters.year) return false;
      }

      // Epic rating filter
      if (filters.epicrating) {
        const er = epic[g.name]?.epic_rating;
        if (er === undefined) return false;
        if (filters.epicrating === "4.5+" && er < 4.5) return false;
        if (filters.epicrating === "4+" && er < 4) return false;
        if (filters.epicrating === "3+" && er < 3) return false;
      }

      // Platform filter
      if (filters.platform) {
        const platforms = epic[g.name]?.platforms || ["pc"];
        if (filters.platform === "pc" && !platforms.includes("pc")) return false;
        if (filters.platform === "mobile" && !platforms.some((p) => p === "ios" || p === "android")) return false;
      }

      return true;
    });

    result.sort((a, b) => sortComparator(a, b, sortDir,
      (g) => getSortVal(g, sortCol, hltb, steam, metacritic, epic, hiddenGames, ownedGames),
    ));

    return result;
  }, [games, hltb, steam, metacritic, epic, hiddenGames, ownedGames, filters, sortCol, sortDir]);

  const filterCounts = useMemo(() => {
    const c: Record<string, Record<string, number>> = {};
    c.steam = countSteam(games, steam);
    c.metacritic = countMetacritic(games, metacritic);
    c.hltb = countHltb(games, hltb);
    const { hide, owned } = countHideOwned(games, hiddenGames, ownedGames);
    c.hide = hide;
    c.owned = owned;

    const us: Record<string, number> = { "8+": 0, "6+": 0, "4-": 0 };
    const yr: Record<string, number> = {};
    const er: Record<string, number> = { "4.5+": 0, "4+": 0, "3+": 0 };
    const pl: Record<string, number> = { pc: 0, mobile: 0 };

    for (const g of games) {
      const uScore = metacritic[g.name]?.user_score;
      if (uScore !== undefined) {
        if (uScore >= 8) us["8+"]++;
        if (uScore >= 6) us["6+"]++;
        if (uScore < 4) us["4-"]++;
      }

      const epicInfo = epic[g.name];
      const d = epicInfo?.free_dates?.[epicInfo.free_dates.length - 1];
      if (d) {
        const year = new Date(d.start).getFullYear().toString();
        yr[year] = (yr[year] || 0) + 1;
      }

      const epicRating = epic[g.name]?.epic_rating;
      if (epicRating !== undefined) {
        if (epicRating >= 4.5) er["4.5+"]++;
        if (epicRating >= 4) er["4+"]++;
        if (epicRating >= 3) er["3+"]++;
      }

      const platforms = epic[g.name]?.platforms || ["pc"];
      if (platforms.includes("pc")) pl.pc++;
      if (platforms.some((p) => p === "ios" || p === "android")) pl.mobile++;
    }

    c.userscore = us; c.year = yr; c.epicrating = er; c.platform = pl;
    return c;
  }, [games, hltb, steam, metacritic, epic, hiddenGames, ownedGames]);

  return { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort };
}

function getSortVal(
  g: EpicGame, col: SortCol,
  hltb: Record<string, HltbInfo>, steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo>, epic: Record<string, EpicInfo>,
  hiddenGames?: Set<string>,
  ownedGames?: Set<string>,
): string | number | null {
  switch (col) {
    case "name": return g.name.toLowerCase();
    case "steam": return steamSortVal(steam[g.name]);
    case "metacritic": return metacriticSortVal(metacritic[g.name]);
    case "userscore": return metacritic[g.name]?.user_score ?? null;
    case "hltb": return hltbSortVal(hltb[g.name]);
    case "epicdate": { const d = getLatestFreeDate(epic[g.name]); return d ? d.getTime() : null; }
    case "epicrating": return epic[g.name]?.epic_rating ?? null;
    case "platform": return (epic[g.name]?.platforms || ["pc"]).sort().join(",");
    case "hide": return hideSortVal(g.name, hiddenGames);
    case "owned": return ownedSortVal(g.name, ownedGames);
    default: return "";
  }
}
