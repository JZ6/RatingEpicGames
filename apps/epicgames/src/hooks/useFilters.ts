import { useMemo } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo, Filters, SortCol, SortDir } from "../types";
import { getHltbHours, getLatestFreeDate } from "../types";
import { STEAM_ORDER } from "@shared/types";
import { useFilterState, sortComparator } from "@shared/hooks/useFilterState";

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

      // Steam filter
      if (filters.steam) {
        const si = steam[g.name];
        const sr = (si?.rating && STEAM_ORDER[si.rating]) ?? -1;
        if (filters.steam === "op+" && sr < 7) return false;
        if (filters.steam === "vp+" && sr < 6) return false;
        if (filters.steam === "mp+" && sr < 4) return false;
        if (filters.steam === "neg" && (sr < 0 || sr > 3)) return false;
        if (filters.steam === "nos" && si) return false;
      }

      // Metacritic filter
      if (filters.metacritic) {
        const mc = metacritic[g.name]?.score;
        if (filters.metacritic === "unk") { if (mc !== undefined) return false; }
        else {
          if (mc === undefined) return false;
          if (filters.metacritic === "90+" && mc < 90) return false;
          if (filters.metacritic === "75+" && mc < 75) return false;
          if (filters.metacritic === "50-" && mc >= 50) return false;
        }
      }

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

      // HLTB filter
      if (filters.hltb) {
        const hours = getHltbHours(hltb[g.name]);
        if (filters.hltb === "u10" && (hours === undefined || hours >= 10)) return false;
        if (filters.hltb === "u60" && (hours === undefined || hours >= 60)) return false;
        if (filters.hltb === "u100" && (hours === undefined || hours >= 100)) return false;
        if (filters.hltb === "100+" && (hours === undefined || hours < 100)) return false;
        if (filters.hltb === "unk" && hours !== undefined) return false;
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

      // Hide filter
      const isHidden = hiddenGames.has(g.name);
      if (filters.hide === "visible" && isHidden) return false;
      if (filters.hide === "hidden" && !isHidden) return false;

      // Owned filter
      if (filters.owned) {
        const isOwned = ownedGames.has(g.name);
        if (filters.owned === "owned" && !isOwned) return false;
        if (filters.owned === "not" && isOwned) return false;
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

    const st: Record<string, number> = { "op+": 0, "vp+": 0, "mp+": 0, neg: 0, nos: 0 };
    const mc: Record<string, number> = { "90+": 0, "75+": 0, "50-": 0 };
    const us: Record<string, number> = { "8+": 0, "6+": 0, "4-": 0 };
    const hl: Record<string, number> = { u10: 0, u60: 0, u100: 0, "100+": 0, unk: 0 };
    const yr: Record<string, number> = {};
    const er: Record<string, number> = { "4.5+": 0, "4+": 0, "3+": 0 };
    const pl: Record<string, number> = { pc: 0, mobile: 0 };
    const hi: Record<string, number> = { hidden: 0, all: 0 };
    const ow: Record<string, number> = { owned: 0, not: 0 };

    for (const g of games) {
      const si = steam[g.name];
      const sOrder = (si?.rating && STEAM_ORDER[si.rating]) ?? -1;
      if (sOrder >= 7) st["op+"]++;
      if (sOrder >= 6) st["vp+"]++;
      if (sOrder >= 4) st["mp+"]++;
      if (sOrder >= 0 && sOrder <= 3) st.neg++;
      if (!steam[g.name]) st.nos++;

      const mScore = metacritic[g.name]?.score;
      if (mScore !== undefined) {
        if (mScore >= 90) mc["90+"]++;
        if (mScore >= 75) mc["75+"]++;
        if (mScore < 50) mc["50-"]++;
      }

      const uScore = metacritic[g.name]?.user_score;
      if (uScore !== undefined) {
        if (uScore >= 8) us["8+"]++;
        if (uScore >= 6) us["6+"]++;
        if (uScore < 4) us["4-"]++;
      }

      const hours = getHltbHours(hltb[g.name]);
      if (hours !== undefined) {
        if (hours < 10) hl.u10++;
        if (hours < 60) hl.u60++;
        if (hours < 100) hl.u100++;
        if (hours >= 100) hl["100+"]++;
      } else { hl.unk++; }

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

      if (hiddenGames.has(g.name)) hi.hidden++;
      hi.all++;

      if (ownedGames.has(g.name)) ow.owned++; else ow.not++;
    }

    c.steam = st; c.metacritic = mc; c.userscore = us; c.hltb = hl; c.year = yr;
    c.epicrating = er; c.platform = pl; c.hide = hi; c.owned = ow;
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
    case "name":
      return g.name.toLowerCase();
    case "steam": {
      const si = steam[g.name];
      if (!si?.rating) return null;
      const tier = STEAM_ORDER[si.rating] ?? 0;
      return tier * 1000 + (si.pct ?? 0);
    }
    case "metacritic":
      return metacritic[g.name]?.score ?? null;
    case "userscore":
      return metacritic[g.name]?.user_score ?? null;
    case "hltb":
      return getHltbHours(hltb[g.name]) ?? null;
    case "epicdate": {
      const d = getLatestFreeDate(epic[g.name]);
      return d ? d.getTime() : null;
    }
    case "epicrating":
      return epic[g.name]?.epic_rating ?? null;
    case "platform":
      return (epic[g.name]?.platforms || ["pc"]).sort().join(",");
    case "hide":
      return hiddenGames?.has(g.name) ? 1 : 0;
    case "owned":
      return ownedGames?.has(g.name) ? 1 : 0;
    default:
      return "";
  }
}
