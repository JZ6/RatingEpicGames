import type { SteamInfo, HltbInfo, MetacriticInfo } from "../types";
import { SteamBadge, MetacriticBadge, HltbBadge, HideBadge, OwnedBadge } from "./Badge";

export interface FilterOption {
  value: string;
  label: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  fullLabel?: string;
  minWidth: string;
  mobileWidth?: string;
  tooltip: string;
  icon?: React.JSX.Element;
  render?: (game: any, data: any) => React.JSX.Element;
  filters?: FilterOption[];
  filterType?: "select" | "input";
  filterKey?: string;
}

/** @deprecated Use ColumnDef instead */
export type Column = ColumnDef;

export function defineColumn(def: Omit<ColumnDef, "filterType"> & { filterType?: "select" | "input" }): ColumnDef {
  return { filterType: "select", mobileWidth: def.minWidth, ...def };
}

export const PINNED_FIRST = new Set(["name"]);
export const PINNED_LAST = new Set(["owned", "hide"]);

const STEAM_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "op+", label: "Ov. Positive +" },
  { value: "vp+", label: "Very Positive +" },
  { value: "mp+", label: "M. Positive +" },
  { value: "neg", label: "Negative" },
  { value: "nos", label: "Not On Steam" },
];

const HLTB_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "u10", label: "< 10 h" },
  { value: "u60", label: "< 60 h" },
  { value: "u100", label: "< 100 h" },
  { value: "100+", label: "> 100 h" },
];

const OWNED_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "not", label: "Not Owned" },
];

const HIDE_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden Only" },
];

export const SHARED_COLUMN_FILTERS: Record<string, FilterOption[]> = {
  steam: STEAM_FILTERS,
  hltb: HLTB_FILTERS,
  owned: OWNED_FILTERS,
  hide: HIDE_FILTERS,
};

export function nameColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "name",
    label: "Game",
    minWidth: "360px",
    mobileWidth: "140px",
    tooltip: "Click to view on store",
    filterType: "input",
    filterKey: "search",
    ...overrides,
  });
}

export function steamColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "steam",
    label: "Steam Rating",
    minWidth: "240px",
    mobileWidth: "120px",
    tooltip: "Steam user review rating\nwith positive review percentage",
    render: (_: any, data: { steam?: SteamInfo }) => <SteamBadge info={data.steam} />,
    filters: STEAM_FILTERS,
    ...overrides,
  });
}

export function metacriticColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "metacritic",
    label: "MC",
    fullLabel: "Metacritic",
    minWidth: "90px",
    mobileWidth: "70px",
    tooltip: "Metacritic critic score\nGreen = 75+\nYellow = 50–74\nRed = below 50",
    render: (_: any, data: { metacritic?: MetacriticInfo }) => <MetacriticBadge info={data.metacritic} />,
    filters: [
      { value: "", label: "All" },
      { value: "90+", label: "90+" },
      { value: "75+", label: "75+" },
    ],
    ...overrides,
  });
}

export function hltbColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "hltb",
    label: "Playtime",
    minWidth: "125px",
    mobileWidth: "90px",
    tooltip: "Average playtime from HowLongToBeat\n(Main Story + Extras + Completionist)\nHover a value for full breakdown",
    render: (_: any, data: { hltb?: HltbInfo }) => <HltbBadge data={data.hltb} />,
    filters: HLTB_FILTERS,
    ...overrides,
  });
}

export function ownedColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "owned",
    label: "Own",
    fullLabel: "Owned",
    minWidth: "90px",
    mobileWidth: "60px",
    tooltip: "Games you own\nImport your library via the header button",
    render: (_: any, data: any) => <OwnedBadge owned={data.owned} />,
    filters: OWNED_FILTERS,
    ...overrides,
  });
}

export function hideColumn(overrides?: Partial<ColumnDef>): ColumnDef {
  return defineColumn({
    key: "hide",
    label: "Hide",
    minWidth: "90px",
    mobileWidth: "60px",
    tooltip: "Toggle game visibility\nHidden games are saved in your browser",
    render: (_: any, data: any) => <HideBadge hidden={data.hidden} onToggle={data.onToggleHide} />,
    filters: HIDE_FILTERS,
    ...overrides,
  });
}

export function computeColWidths(cols: ColumnDef[], containerWidth: number): number[] {
  const isMobile = containerWidth > 0 && containerWidth <= 800;
  const minWidths = cols.map((c) => parseInt(isMobile && c.mobileWidth ? c.mobileWidth : c.minWidth));
  const totalMin = minWidths.reduce((s, w) => s + w, 0);
  const extra = Math.max(0, containerWidth - totalMin);
  const share = cols.length > 0 ? Math.floor(extra / cols.length) : 0;
  return minWidths.map((w) => w + share);
}
