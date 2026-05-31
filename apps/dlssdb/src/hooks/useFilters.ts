import { useMemo } from "react";
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo, Filters, SortCol } from "../types";
import { getFrameGenLevel, getDlssVersionOrder, getHltbHours } from "../types";
import { useFilterState, sortComparator } from "@shared/hooks/useFilterState";
import { filterBySteam, filterByMetacritic, filterByHltb, filterByHide, filterByOwned, steamSortVal, metacriticSortVal, hltbSortVal, hideSortVal, ownedSortVal, countSteam, countMetacritic, countHltb, countHideOwned } from "@shared/filters";

const FEATURE_ORDER: Record<string, number> = { "NV, T": 3, "NV, U": 2, "✓ (NV)": 2, Yes: 1, "": 0 };
const RT_ORDER: Record<string, number> = { "Path Tracing": 3, "NV, T": 2, "NV, U": 2, "✓ (NV)": 2, Yes: 1, "": 0 };

const EMPTY_FILTERS: Filters = { search: "", framegen: "", dlssver: "", dlaa: "", sr: "", rr: "", rt: "", upscaling: "", steam: "", metacritic: "", release_date: "", tags: "", hltb: "", hide: "visible", owned: "" };

function fmatch(val: string, filt: string): boolean {
  if (!filt) return true;
  if (filt === "any") return !!val;
  if (filt === "none") return !val;
  return val === filt;
}

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

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();

    let result = games.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (!filterBySteam(steam[g.name], filters.steam)) return false;
      if (!filterByMetacritic(metacritic[g.name]?.score, filters.metacritic)) return false;
      if (!filterByHltb(getHltbHours(hltb[g.name]), filters.hltb)) return false;
      if (!filterByHide(hiddenGames.has(g.name), filters.hide)) return false;
      if (!filterByOwned(ownedGames.has(g.name), filters.owned)) return false;

      // Frame Gen filter
      if (filters.framegen) {
        const level = getFrameGenLevel(g);
        if (filters.framegen === "6x" && level !== 3) return false;
        if (filters.framegen === "4x" && level !== 2) return false;
        if (filters.framegen === "2x" && level !== 1) return false;
        if (filters.framegen === "any" && level === 0) return false;
        if (filters.framegen === "none" && level !== 0) return false;
      }

      // DLSS Version filter
      if (filters.dlssver) {
        const ver = getDlssVersionOrder(g);
        if (filters.dlssver === "4.5+" && ver < 5) return false;
        if (filters.dlssver === "4+" && ver < 4) return false;
        if (filters.dlssver === "3+" && ver < 2) return false;
      }

      if (!fmatch(g["dlss super resolution"] || "", filters.sr)) return false;
      if (!fmatch(g["dlss ray reconstruction"] || "", filters.rr)) return false;
      if (!fmatch(g.dlaa || "", filters.dlaa)) return false;
      if (!fmatch(g["ray tracing"] || "", filters.rt)) return false;

      // Upscaling filter
      if (filters.upscaling) {
        const u = upscaling[g.name];
        if (filters.upscaling === "fsr" && !u?.fsr_version) return false;
        if (filters.upscaling === "xess" && !u?.xess_version) return false;
        if (filters.upscaling === "both" && (!u?.fsr_version || !u?.xess_version)) return false;
        if (filters.upscaling === "any" && (!u?.fsr_version && !u?.xess_version)) return false;
        if (filters.upscaling === "none" && (u?.fsr_version || u?.xess_version)) return false;
      }

      // Tags filter
      if (filters.tags) {
        const tq = filters.tags.toLowerCase();
        const tags = steam[g.name]?.tags;
        if (!tags?.some((t) => t.toLowerCase().includes(tq))) return false;
      }

      // Release date filter
      if (filters.release_date) {
        const rd = steam[g.name]?.release_date;
        if (filters.release_date === "upcoming") {
          if (!rd) return false;
          const d = new Date(rd);
          const isNonDate = /^(to be announced|tba|coming soon|q[1-4]\s*\d{4})$/i.test(rd.trim());
          if (isNonDate) return true;
          if (isNaN(d.getTime())) return false;
          return d.getTime() > Date.now();
        }
        if (!rd) return false;
        const d = new Date(rd);
        if (isNaN(d.getTime())) return false;
        const now = Date.now();
        const age = now - d.getTime();
        const ONE_MONTH = 30 * 86400000;
        const THREE_MONTHS = 90 * 86400000;
        const ONE_YEAR = 365 * 86400000;
        if (filters.release_date === "month" && age > ONE_MONTH) return false;
        if (filters.release_date === "quarter" && age > THREE_MONTHS) return false;
        if (filters.release_date === "year" && (age > ONE_YEAR || age <= 0)) return false;
        if (filters.release_date === "old" && age <= ONE_YEAR) return false;
      }

      return true;
    });

    result.sort((a, b) => sortComparator(a, b, sortDir,
      (g) => getSortVal(g, sortCol, hltb, steam, metacritic, upscaling, hiddenGames, ownedGames),
    ));

    return result;
  }, [games, hltb, steam, metacritic, upscaling, hiddenGames, ownedGames, filters, sortCol, sortDir]);

  const filterCounts = useMemo(() => {
    const c: Record<string, Record<string, number>> = {};
    c.steam = countSteam(games, steam);
    c.metacritic = countMetacritic(games, metacritic);
    c.hltb = countHltb(games, hltb);
    const { hide, owned } = countHideOwned(games, hiddenGames, ownedGames);
    c.hide = hide;
    c.owned = owned;

    const fg: Record<string, number> = { "6x": 0, "4x": 0, "2x": 0, any: 0, none: 0 };
    const dv: Record<string, number> = { "4.5+": 0, "4+": 0, "3+": 0 };
    const sr: Record<string, number> = { "NV, T": 0, Yes: 0, any: 0, none: 0 };
    const rr: Record<string, number> = { any: 0, none: 0 };
    const dlaa: Record<string, number> = { any: 0, none: 0 };
    const rt: Record<string, number> = { "Path Tracing": 0, Yes: 0, "any": 0 };
    const up: Record<string, number> = { fsr: 0, xess: 0, both: 0, any: 0, none: 0 };
    const rd: Record<string, number> = { month: 0, quarter: 0, year: 0, old: 0, upcoming: 0 };
    const NOW = Date.now();
    const ONE_MONTH = 30 * 86400000;
    const THREE_MONTHS = 90 * 86400000;
    const ONE_YEAR = 365 * 86400000;
    const NON_DATE_RE = /^(to be announced|tba|coming soon|q[1-4]\s*\d{4})$/i;

    for (const g of games) {
      const level = getFrameGenLevel(g);
      if (level === 3) fg["6x"]++;
      if (level === 2) fg["4x"]++;
      if (level === 1) fg["2x"]++;
      if (level > 0) fg.any++;
      if (level === 0) fg.none++;

      const ver = getDlssVersionOrder(g);
      if (ver >= 5) dv["4.5+"]++;
      if (ver >= 4) dv["4+"]++;
      if (ver >= 2) dv["3+"]++;

      const srVal = g["dlss super resolution"] || "";
      if (srVal === "NV, T") sr["NV, T"]++;
      if (srVal === "Yes") sr.Yes++;
      if (srVal) sr.any++; else sr.none++;

      if (g["dlss ray reconstruction"]) rr.any++; else rr.none++;
      if (g.dlaa) dlaa.any++; else dlaa.none++;

      const rtVal = g["ray tracing"] || "";
      if (rtVal === "Path Tracing") rt["Path Tracing"]++;
      if (rtVal === "Yes") rt.Yes++;
      if (rtVal) rt.any++;

      const u = upscaling[g.name];
      const hasFsr = !!u?.fsr_version, hasXess = !!u?.xess_version;
      if (hasFsr) up.fsr++;
      if (hasXess) up.xess++;
      if (hasFsr && hasXess) up.both++;
      if (hasFsr || hasXess) up.any++;
      if (!hasFsr && !hasXess) up.none++;

      const rdVal = steam[g.name]?.release_date;
      if (rdVal) {
        if (NON_DATE_RE.test(rdVal.trim())) { rd.upcoming++; }
        else {
          const d = new Date(rdVal);
          if (!isNaN(d.getTime())) {
            const age = NOW - d.getTime();
            if (age < 0) rd.upcoming++;
            if (age >= 0 && age <= ONE_MONTH) rd.month++;
            if (age >= 0 && age <= THREE_MONTHS) rd.quarter++;
            if (age > 0 && age <= ONE_YEAR) rd.year++;
            if (age > ONE_YEAR) rd.old++;
          }
        }
      }
    }

    c.framegen = fg; c.dlssver = dv; c.sr = sr; c.rr = rr; c.dlaa = dlaa;
    c.rt = rt; c.upscaling = up; c.release_date = rd;
    return c;
  }, [games, hltb, steam, metacritic, upscaling, hiddenGames, ownedGames]);

  return { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort };
}

function getSortVal(
  g: DlssGame, col: SortCol,
  hltb: Record<string, HltbInfo>, steam: Record<string, SteamInfo>,
  metacritic: Record<string, MetacriticInfo>, upscaling: Record<string, UpscalingInfo>,
  hiddenGames?: Set<string>,
  ownedGames?: Set<string>,
): string | number | null {
  switch (col) {
    case "name": return g.name.toLowerCase();
    case "steam": return steamSortVal(steam[g.name]);
    case "metacritic": return metacriticSortVal(metacritic[g.name]);
    case "hltb": return hltbSortVal(hltb[g.name]);
    case "hide": return hideSortVal(g.name, hiddenGames);
    case "owned": return ownedSortVal(g.name, ownedGames);
    case "dlssver": return getDlssVersionOrder(g);
    case "framegen": return getFrameGenLevel(g) || null;
    case "sr": return FEATURE_ORDER[g["dlss super resolution"] || ""] || null;
    case "rr": return FEATURE_ORDER[g["dlss ray reconstruction"] || ""] || null;
    case "dlaa": return FEATURE_ORDER[g.dlaa || ""] || null;
    case "rt": return RT_ORDER[g["ray tracing"] || ""] || null;
    case "upscaling": {
      const u = upscaling[g.name];
      if (!u) return null;
      const v = (u.fsr_version ? 1 : 0) + (u.xess_version ? 1 : 0);
      return v || null;
    }
    case "release_date": {
      const rd = steam[g.name]?.release_date;
      if (!rd) return null;
      const d = new Date(rd);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    case "tags": return steam[g.name]?.tags?.[0] ?? null;
    default: return "";
  }
}
