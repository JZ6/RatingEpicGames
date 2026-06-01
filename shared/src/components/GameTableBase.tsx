export { Column, NameColumn, SteamColumn, MetacriticColumn, HltbColumn, OwnedColumn, HideColumn, buildEmptyFilters, STEAM_FILTERS, HLTB_FILTERS } from "./Column";
export type { FilterOption, FilterDeps, ColumnConfig } from "./Column";

import type { Column } from "./Column";

/** @deprecated Use Column instead */
export type ColumnDef = Column;

export function computePinnedSets(columns: Column[]): { pinnedFirst: Set<string>; pinnedLast: Set<string> } {
  return {
    pinnedFirst: new Set(columns.filter((c) => c.pinned === "first").map((c) => c.key)),
    pinnedLast: new Set(columns.filter((c) => c.pinned === "last").map((c) => c.key)),
  };
}

export function computeColWidths(cols: Column[], containerWidth: number): number[] {
  const isMobile = containerWidth > 0 && containerWidth <= 800;
  const minWidths = cols.map((c) => parseInt(isMobile ? c.mobileWidth : c.minWidth));
  const totalMin = minWidths.reduce((s, w) => s + w, 0);
  const extra = Math.max(0, containerWidth - totalMin);
  const share = cols.length > 0 ? Math.floor(extra / cols.length) : 0;
  return minWidths.map((w) => w + share);
}
